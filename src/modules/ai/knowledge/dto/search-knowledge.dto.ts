import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class SearchKnowledgeDto {
  @ApiProperty({
    example: 'What does Saturn in the 7th house indicate for marriage?',
    description: 'Search inquiry for vector semantic matching',
  })
  @IsNotEmpty()
  @IsString()
  query!: string;

  @ApiPropertyOptional({
    example: 5,
    description: 'Number of top matching records to retrieve (default: 5)',
    default: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  topK?: number;

  @ApiPropertyOptional({
    example: 0.45,
    description: 'Minimum cosine similarity threshold (0.0 to 1.0, default: 0.45)',
    default: 0.45,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minSimilarity?: number;

  @ApiPropertyOptional({
    example: 'house',
    description: 'Optional category filter',
  })
  @IsOptional()
  @IsString()
  category?: string;
}
