import { Test, TestingModule } from '@nestjs/testing';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiChatDto } from './dto/ai-chat.dto';

describe('AiController', () => {
  let controller: AiController;
  let aiService: AiService;

  const mockAiService = {
    chat: jest.fn().mockResolvedValue({
      conversationId: 'mock-conv-id',
      message: 'According to Vedic astrology, Jupiter brings wisdom.',
      usedBirthChart: false,
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [
        {
          provide: AiService,
          useValue: mockAiService,
        },
      ],
    }).compile();

    controller = module.get<AiController>(AiController);
    aiService = module.get<AiService>(AiService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call aiService.chat and return response', async () => {
    const dto: AiChatDto = { message: 'What is Jupiter?' };
    const result = await controller.chat(dto);

    expect(result).toBeDefined();
    expect(result.conversationId).toBe('mock-conv-id');
    expect(result.message).toContain('Jupiter');
    expect(mockAiService.chat).toHaveBeenCalledWith(dto);
  });
});
