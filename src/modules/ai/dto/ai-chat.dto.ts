import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { GenerateChartDto } from '../../astrology/dto/generate-chart.dto';

export class AiChatDto {
  @ApiProperty({
    example: 'What does Saturn in my 7th house mean?',
    description: 'User astrology question or inquiry',
  })
  @IsNotEmpty()
  @IsString()
  message!: string;

  @ApiPropertyOptional({
    example: 'a7b3c2d1-e4f5-4a6b-8c9d-0e1f2a3b4c5d',
    description: 'Optional conversation identifier. If omitted, a UUID will be generated.',
  })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiPropertyOptional({
    type: () => GenerateChartDto,
    description: 'Optional birth details for personalized Vedic astrology chart computation',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => GenerateChartDto)
  birthDetails?: GenerateChartDto;
}
