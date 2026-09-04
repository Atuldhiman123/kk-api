import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RagService } from './rag.service';
import { KnowledgeService } from '../knowledge/knowledge.service';

describe('RagService', () => {
  let service: RagService;
  let knowledgeService: KnowledgeService;

  const mockKnowledgeService = {
    search: jest.fn().mockResolvedValue({
      query: 'Saturn in 7th house',
      totalResults: 1,
      results: [
        {
          id: 'k-1',
          title: 'Saturn (Shani)',
          content: 'Saturn brings discipline, maturity, and karma in partnerships.',
          category: 'planet',
          similarity: 0.85,
        },
      ],
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RagService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(undefined),
          },
        },
        {
          provide: KnowledgeService,
          useValue: mockKnowledgeService,
        },
      ],
    }).compile();

    service = module.get<RagService>(RagService);
    knowledgeService = module.get<KnowledgeService>(KnowledgeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should retrieve and format knowledge context', async () => {
    const res = await service.retrieveContext('Saturn in 7th house');
    expect(res.hasKnowledge).toBe(true);
    expect(res.formattedContext).toContain('RELEVANT ASTROLOGY KNOWLEDGE BASE');
    expect(res.formattedContext).toContain('Saturn (Shani)');
    expect(res.chunks.length).toBe(1);
  });
});
