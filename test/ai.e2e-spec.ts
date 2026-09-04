import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/modules/ai/ai.service';
import { KnowledgeService } from '../src/modules/ai/knowledge/knowledge.service';

describe('AI & RAG Knowledge Module (e2e)', () => {
  let app: INestApplication;
  let aiService: AiService;
  let knowledgeService: KnowledgeService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    aiService = moduleFixture.get<AiService>(AiService);
    knowledgeService = moduleFixture.get<KnowledgeService>(KnowledgeService);
  }, 40000);

  afterAll(async () => {
    await app.close();
  });

  describe('POST /ai/knowledge/search', () => {
    it('should search knowledge base and return matching entries', async () => {
      const res = await request(app.getHttpServer())
        .post('/ai/knowledge/search')
        .send({
          query: 'What does the 7th house represent in marriage?',
          topK: 3,
        })
        .expect(200);

      expect(res.body).toHaveProperty('results');
      expect(Array.isArray(res.body.results)).toBe(true);
      expect(res.body.results.length).toBeGreaterThan(0);
      expect(
        res.body.results.some(
          (r: any) =>
            r.title.includes('7th House') ||
            r.category === 'house' ||
            r.category === 'marriage',
        ),
      ).toBe(true);
    }, 25000);
  });

  describe('POST /ai/chat with RAG', () => {
    it('should retrieve knowledge and return an AI answer for general question', async () => {
      jest.spyOn(aiService as any, 'callAiProvider').mockResolvedValue(
        'The 7th house in Vedic astrology represents marriage, partnerships, and public alliances.',
      );

      const res = await request(app.getHttpServer())
        .post('/ai/chat')
        .send({
          message: 'What does the 7th house represent in Vedic astrology?',
        })
        .expect(200);

      expect(res.body).toHaveProperty('conversationId');
      expect(res.body).toHaveProperty('message');
      expect(res.body.usedBirthChart).toBe(false);
      expect(res.body.message).toContain('7th house');
    }, 25000);

    it('should retrieve knowledge + generate birth chart for personalized question', async () => {
      jest.spyOn(aiService as any, 'callAiProvider').mockResolvedValue(
        'Based on your chart with Taurus Ascendant and Saturn in Capricorn influencing your 9th house, Saturn brings grounding wisdom.',
      );

      const res = await request(app.getHttpServer())
        .post('/ai/chat')
        .send({
          message: 'What does Saturn in my 7th house mean?',
          conversationId: 'test-conv-e2e',
          birthDetails: {
            dateOfBirth: '1990-04-15',
            timeOfBirth: '08:30',
            latitude: 28.6139,
            longitude: 77.209,
            timezone: 5.5,
          },
        })
        .expect(200);

      expect(res.body.conversationId).toBe('test-conv-e2e');
      expect(res.body.usedBirthChart).toBe(true);
      expect(res.body.message).toContain('Taurus');
    }, 30000);
  });
});
