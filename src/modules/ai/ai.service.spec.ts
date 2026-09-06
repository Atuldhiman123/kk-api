import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { AiService } from './ai.service';
import { AstrologyService } from '../astrology/astrology.service';
import { RagService } from './rag/rag.service';
import { AiChatDto } from './dto/ai-chat.dto';

describe('AiService', () => {
  let service: AiService;
  let astrologyService: AstrologyService;
  let ragService: RagService;
  let configService: ConfigService;

  const mockAstrologyService = {
    generateChart: jest.fn().mockResolvedValue({
      birthDetails: {
        dateOfBirth: '1990-04-15',
        timeOfBirth: '08:30',
        latitude: 28.6139,
        longitude: 77.209,
        timezone: 5.5,
      },
      ascendant: { sign: 'Taurus', degree: 15.83, nakshatra: 'Rohini' },
      planets: [{ name: 'Saturn', sign: 'Capricorn', house: 9, isRetrograde: false }],
      houses: [{ house: 1, sign: 'Taurus' }],
      dashas: { mahadashas: [] },
    }),
  };

  const mockRagService = {
    retrieveContext: jest.fn().mockResolvedValue({
      hasKnowledge: true,
      formattedContext: 'RELEVANT ASTROLOGY KNOWLEDGE BASE:\nEmerald/Panna suits Mercury and Opal suits Venus.',
      chunks: [{ id: 'k1', title: 'Gemstone Guidance' }],
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'AI_API_KEY') return 'test-key';
              if (key === 'AI_MODEL') return 'gpt-4o-mini';
              if (key === 'AI_BASE_URL') return 'https://api.openai.com/v1';
              return undefined;
            }),
          },
        },
        { provide: AstrologyService, useValue: mockAstrologyService },
        { provide: RagService, useValue: mockRagService },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    astrologyService = module.get<AstrologyService>(AstrologyService);
    ragService = module.get<RagService>(RagService);
    configService = module.get<ConfigService>(ConfigService);

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: 'Aapke liye lucky gemstone Opal ya Heera shubh rahega.',
            },
          },
        ],
      }),
    } as any);
  });

  it('should redirect non-gemstone general question politely without calling AstrologyService or RAG', async () => {
    const dto: AiChatDto = {
      message: 'Meri shadi kab hogi?',
    };

    const res = await service.chat(dto);

    expect(res).toBeDefined();
    expect(res.usedBirthChart).toBe(false);
    expect(res.message).toContain('Lucky Gemstone');
    expect(mockAstrologyService.generateChart).not.toHaveBeenCalled();
  });

  it('should answer gemstone question with RAG + in-memory Kundli chart', async () => {
    const dto: AiChatDto = {
      message: 'Meri kundli ke hisab se lucky gemstone kaunsa hai?',
      conversationId: 'custom-conv-123',
      birthDetails: {
        dateOfBirth: '1990-04-15',
        timeOfBirth: '08:30',
        latitude: 28.6139,
        longitude: 77.209,
        timezone: 5.5,
      },
    };

    const res = await service.chat(dto);

    expect(res).toBeDefined();
    expect(res.conversationId).toBe('custom-conv-123');
    expect(res.usedBirthChart).toBe(true);
    expect(mockRagService.retrieveContext).toHaveBeenCalledWith(dto.message);
    expect(mockAstrologyService.generateChart).toHaveBeenCalledWith(dto.birthDetails);
  });

  it('should throw ServiceUnavailableException if AI_API_KEY is missing on gemstone query', async () => {
    jest.spyOn(configService, 'get').mockReturnValue(undefined);

    await expect(
      service.chat({ message: 'Lucky ratna / gemstone guidance batao' }),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});
