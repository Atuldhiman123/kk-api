import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EmbeddingService } from '../embeddings/embedding.service';
import { ChunkingService } from './chunking.service';
import { CreateKnowledgeDto } from './dto/create-knowledge.dto';
import { UpdateKnowledgeDto } from './dto/update-knowledge.dto';
import { QueryKnowledgeDto } from './dto/query-knowledge.dto';
import { KnowledgeRecord, KnowledgeSearchResult } from './interfaces/knowledge.interfaces';
import { randomUUID } from 'crypto';

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
    private readonly chunkingService: ChunkingService,
  ) {}

  /**
   * Formats embedding number array into PostgreSQL vector literal '[0.1, 0.2, ...]'
   */
  private formatVector(vector: number[]): string {
    return `[${vector.join(',')}]`;
  }

  /**
   * Ingests a new astrology knowledge record with pgvector embedding
   */
  async create(dto: CreateKnowledgeDto): Promise<KnowledgeRecord> {
    const id = randomUUID();
    const category = dto.category?.toLowerCase().trim() || 'general';
    const source = dto.source?.trim() || 'Kundli Kendra Knowledge Base';
    const metadata = dto.metadata || {};

    let embeddingVector: string | null = null;
    try {
      const vector = await this.embeddingService.generateEmbedding(`${dto.title}: ${dto.content}`);
      embeddingVector = this.formatVector(vector);
    } catch (err: any) {
      this.logger.warn(`Could not generate embedding for knowledge '${dto.title}': ${err.message}`);
    }

    if (embeddingVector) {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO astrology_knowledge (id, title, content, category, source, metadata, embedding, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::vector, NOW(), NOW())`,
        id,
        dto.title,
        dto.content,
        category,
        source,
        JSON.stringify(metadata),
        embeddingVector,
      );
    } else {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO astrology_knowledge (id, title, content, category, source, metadata, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW(), NOW())`,
        id,
        dto.title,
        dto.content,
        category,
        source,
        JSON.stringify(metadata),
      );
    }

    return {
      id,
      title: dto.title,
      content: dto.content,
      category,
      source,
      metadata,
    };
  }

  /**
   * Ingests a long document by automatically chunking it
   */
  async ingestLongDocument(dto: CreateKnowledgeDto): Promise<KnowledgeRecord[]> {
    const chunks = this.chunkingService.chunkText(dto.content);
    const records: KnowledgeRecord[] = [];

    for (const chunkItem of chunks) {
      const title = chunks.length > 1 ? `${dto.title} (Part ${chunkItem.chunkIndex + 1}/${chunkItem.totalChunks})` : dto.title;
      const metadata = {
        ...(dto.metadata || {}),
        chunkIndex: chunkItem.chunkIndex,
        totalChunks: chunkItem.totalChunks,
        parentTitle: dto.title,
      };
      const rec = await this.create({
        title,
        content: chunkItem.chunk,
        category: dto.category,
        source: dto.source,
        metadata,
      });
      records.push(rec);
    }

    return records;
  }

  /**
   * Performs semantic vector similarity search via pgvector, with intelligent fallback
   */
  async search(query: string, topK = 5, minSimilarity = 0.42, category?: string): Promise<KnowledgeSearchResult> {
    let vector: number[] | null = null;
    try {
      vector = await this.embeddingService.generateEmbedding(query);
    } catch (err: any) {
      this.logger.warn(`Vector embedding unavailable for search query: ${err.message}. Falling back to keyword search.`);
    }

    let results: KnowledgeRecord[] = [];

    if (vector) {
      const vectorStr = this.formatVector(vector);
      let rawRows: any[] = [];
      try {
        if (category) {
          rawRows = await this.prisma.$queryRawUnsafe(
            `SELECT id, title, content, category, source, metadata,
                    (1 - (embedding <=> $1::vector)) as similarity
             FROM astrology_knowledge
             WHERE embedding IS NOT NULL
               AND category = $4
               AND (1 - (embedding <=> $1::vector)) >= $2
             ORDER BY similarity DESC
             LIMIT $3`,
            vectorStr,
            minSimilarity,
            topK,
            category.toLowerCase(),
          );
        } else {
          rawRows = await this.prisma.$queryRawUnsafe(
            `SELECT id, title, content, category, source, metadata,
                    (1 - (embedding <=> $1::vector)) as similarity
             FROM astrology_knowledge
             WHERE embedding IS NOT NULL
               AND (1 - (embedding <=> $1::vector)) >= $2
             ORDER BY similarity DESC
             LIMIT $3`,
            vectorStr,
            minSimilarity,
            topK,
          );
        }

        results = rawRows.map((r) => ({
          id: r.id,
          title: r.title,
          content: r.content,
          category: r.category,
          source: r.source,
          metadata: r.metadata,
          similarity: r.similarity !== undefined ? Number(Number(r.similarity).toFixed(4)) : undefined,
        }));
      } catch (dbErr: any) {
        this.logger.warn(`Vector query execution error: ${dbErr.message}`);
      }
    }

    // Fallback if vector search yielded no results or vector was unavailable
    if (results.length === 0) {
      const stopwords = new Set([
        'what', 'does', 'the', 'in', 'for', 'about', 'is', 'are', 'and', 'with', 'tell', 'me', 'how', 'why', 'can', 'explain', 'significance', 'meaning'
      ]);
      const words = query
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !stopwords.has(w));

      const orConditions: any[] = [];
      for (const w of words) {
        orConditions.push({ title: { contains: w, mode: 'insensitive' } });
        orConditions.push({ content: { contains: w, mode: 'insensitive' } });
      }

      const whereClause: any = {};
      if (orConditions.length > 0) {
        whereClause.OR = orConditions;
      }
      if (category) {
        whereClause.category = category.toLowerCase();
      }

      const fallbackItems = await this.prisma.astrologyKnowledge.findMany({
        where: whereClause,
        take: topK,
        orderBy: { createdAt: 'desc' },
      });

      results = fallbackItems.map((item) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        category: item.category,
        source: item.source,
        metadata: (item.metadata as any) || undefined,
        similarity: 0.75,
      }));
    }

    return {
      query,
      totalResults: results.length,
      results,
    };
  }

  /**
   * Lists all knowledge entries for Admin management
   */
  async findAll(dto: QueryKnowledgeDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const offset = (page - 1) * limit;

    const where: any = {};
    if (dto.category) {
      where.category = dto.category.toLowerCase();
    }
    if (dto.search) {
      where.OR = [
        { title: { contains: dto.search, mode: 'insensitive' } },
        { content: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.astrologyKnowledge.findMany({
        where,
        select: {
          id: true,
          title: true,
          category: true,
          source: true,
          content: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.astrologyKnowledge.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<KnowledgeRecord> {
    const item = await this.prisma.astrologyKnowledge.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        content: true,
        category: true,
        source: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!item) {
      throw new NotFoundException(`Knowledge record with ID ${id} not found`);
    }
    return item as any;
  }

  async update(id: string, dto: UpdateKnowledgeDto): Promise<KnowledgeRecord> {
    const existing = await this.findById(id);
    const newTitle = dto.title || existing.title;
    const newContent = dto.content || existing.content;
    const newCategory = (dto.category || existing.category).toLowerCase();
    const newSource = dto.source !== undefined ? dto.source : existing.source;
    const newMetadata = dto.metadata !== undefined ? dto.metadata : existing.metadata;

    if (dto.title || dto.content) {
      try {
        const vector = await this.embeddingService.generateEmbedding(`${newTitle}: ${newContent}`);
        const vectorStr = this.formatVector(vector);
        await this.prisma.$executeRawUnsafe(
          `UPDATE astrology_knowledge
           SET title = $1, content = $2, category = $3, source = $4, metadata = $5::jsonb, embedding = $6::vector, updated_at = NOW()
           WHERE id = $7`,
          newTitle,
          newContent,
          newCategory,
          newSource,
          JSON.stringify(newMetadata || {}),
          vectorStr,
          id,
        );
      } catch (err) {
        await this.prisma.$executeRawUnsafe(
          `UPDATE astrology_knowledge
           SET title = $1, content = $2, category = $3, source = $4, metadata = $5::jsonb, updated_at = NOW()
           WHERE id = $6`,
          newTitle,
          newContent,
          newCategory,
          newSource,
          JSON.stringify(newMetadata || {}),
          id,
        );
      }
    } else {
      await this.prisma.$executeRawUnsafe(
        `UPDATE astrology_knowledge
         SET category = $1, source = $2, metadata = $3::jsonb, updated_at = NOW()
         WHERE id = $4`,
        newCategory,
        newSource,
        JSON.stringify(newMetadata || {}),
        id,
      );
    }

    return this.findById(id);
  }

  async remove(id: string): Promise<{ success: boolean; id: string }> {
    await this.findById(id);
    await this.prisma.$executeRawUnsafe(`DELETE FROM astrology_knowledge WHERE id = $1`, id);
    return { success: true, id };
  }

  async regenerateEmbedding(id: string): Promise<KnowledgeRecord> {
    const existing = await this.findById(id);
    const vector = await this.embeddingService.generateEmbedding(`${existing.title}: ${existing.content}`);
    const vectorStr = this.formatVector(vector);
    await this.prisma.$executeRawUnsafe(
      `UPDATE astrology_knowledge SET embedding = $1::vector, updated_at = NOW() WHERE id = $2`,
      vectorStr,
      id,
    );
    return this.findById(id);
  }
}
