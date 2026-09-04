import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { AiChatDto } from './dto/ai-chat.dto';
import { AiChatResponse } from './interfaces/ai.interfaces';

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Chat with Vedic Astrology AI Assistant',
    description:
      'Receives a user question and optional birth details, retrieves astrological chart data if applicable, and returns an AI-generated Vedic astrology response.',
  })
  @ApiResponse({
    status: 200,
    description: 'AI response generated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input message or birth details provided',
  })
  @ApiResponse({
    status: 502,
    description: 'AI provider error or upstream service failure',
  })
  @ApiResponse({
    status: 503,
    description: 'AI Chatbot service unavailable (missing API configuration)',
  })
  @ApiResponse({
    status: 504,
    description: 'AI provider request timed out',
  })
  chat(@Body() dto: AiChatDto): Promise<AiChatResponse> {
    return this.aiService.chat(dto);
  }
}
