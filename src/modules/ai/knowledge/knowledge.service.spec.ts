import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeService } from './knowledge.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { EmbeddingService } from '../embeddings/embedding.service';
import { ChunkingService } from './chunking.service';

describe('KnowledgeService', () => {
  let service: KnowledgeService;
  let prisma: PrismaService;

  const mockPrisma = {
    $executeRawUnsafe: jest.fn().mockResolvedValue(1),
    $queryRawUnsafe: jest.fn().mockResolvedValue([
      {
        id: 'mock-uuid-1',
        title: '7th House in Vedic Astrology',
        content: 'The 7th house represents marriage and partnerships.',
        category: 'house',
        source: 'Vedic Knowledge',
        similarity: 0.88,
      },
    ]),
    astrologyKnowledge: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue({
        id: 'mock-uuid-1',
        title: '7th House in Vedic Astrology',
        content: 'The 7th house represents marriage and partnerships.',
        category: 'house',
      }),
      count: jest.fn().mockResolvedValue(0),
    },
  };

  const mockEmbeddingService = {
    generateEmbedding: jest.fn().mockResolvedValue(new Array(1536).fill(0.01)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeService,
        ChunkingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmbeddingService, useValue: mockEmbeddingService },
      ],
    }).compile();

    service = module.get<KnowledgeService>(KnowledgeService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should insert knowledge and execute pgvector insert query', async () => {
    const result = await service.create({
      title: '7th House',
      content: 'The 7th house is associated with marriage.',
      category: 'house',
    });

    expect(result).toBeDefined();
    expect(result.title).toBe('7th House');
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalled();
  });

  it('should perform vector similarity search and return matching results', async () => {
    const res = await service.search('What does 7th house represent?');
    expect(res).toBeDefined();
    expect(res.results.length).toBeGreaterThan(0);
    expect(res.results[0].title).toContain('7th House');
    expect(res.results[0].similarity).toBeCloseTo(0.88);
  });
});
