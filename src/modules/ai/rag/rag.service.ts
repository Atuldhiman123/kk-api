import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { KnowledgeRecord } from '../knowledge/interfaces/knowledge.interfaces';

export interface RagContextResult {
  hasKnowledge: boolean;
  formattedContext: string;
  chunks: KnowledgeRecord[];
}

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly knowledgeService: KnowledgeService,
  ) {}

  /**
   * Retrieves relevant astrology knowledge and formats it as reference context for the AI prompt
   */
  async retrieveContext(query: string, options?: { topK?: number; minSimilarity?: number; category?: string }): Promise<RagContextResult> {
    const defaultTopK = Number(this.configService.get<number>('RAG_TOP_K') || 5);
    const defaultMinSimilarity = Number(this.configService.get<number>('RAG_SIMILARITY_THRESHOLD') || 0.42);

    const topK = options?.topK ?? defaultTopK;
    const minSimilarity = options?.minSimilarity ?? defaultMinSimilarity;

    try {
      const searchResult = await this.knowledgeService.search(query, topK, minSimilarity, options?.category);
      const chunks = searchResult.results;

      if (chunks.length === 0) {
        return {
          hasKnowledge: false,
          formattedContext: '',
          chunks: [],
        };
      }

      const formattedLines = chunks.map((c, i) => {
        const similarityNote = c.similarity ? ` [Relevance: ${(c.similarity * 100).toFixed(1)}%]` : '';
        const sourceNote = c.source ? ` (Source: ${c.source})` : '';
        return `--- Knowledge Document ${i + 1}: "${c.title}"${sourceNote}${similarityNote} ---\n${c.content}`;
      });

      const formattedContext = [
        'RELEVANT ASTROLOGY KNOWLEDGE BASE (Verified Reference Material):',
        ...formattedLines,
      ].join('\n\n');

      return {
        hasKnowledge: true,
        formattedContext,
        chunks,
      };
    } catch (err: any) {
      this.logger.warn(`RAG retrieval failed gracefully: ${err.message}`);
      return {
        hasKnowledge: false,
        formattedContext: '',
        chunks: [],
      };
    }
  }
}
