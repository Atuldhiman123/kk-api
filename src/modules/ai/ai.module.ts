import { Module } from '@nestjs/common';
import { AstrologyModule } from '../astrology/astrology.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { EmbeddingService } from './embeddings/embedding.service';
import { ChunkingService } from './knowledge/chunking.service';
import { KnowledgeService } from './knowledge/knowledge.service';
import { KnowledgeController } from './knowledge/knowledge.controller';
import { RagService } from './rag/rag.service';

@Module({
  imports: [AstrologyModule, PrismaModule],
  controllers: [AiController, KnowledgeController],
  providers: [
    AiService,
    EmbeddingService,
    ChunkingService,
    KnowledgeService,
    RagService,
  ],
  exports: [AiService, KnowledgeService, EmbeddingService, RagService],
})
export class AiModule {}
