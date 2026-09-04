import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString, Length } from 'class-validator';

export class CreateKnowledgeDto {
  @ApiProperty({
    example: '7th House in Vedic Astrology',
    description: 'Title of the astrology knowledge entry',
  })
  @IsNotEmpty()
  @IsString()
  @Length(2, 200)
  title!: string;

  @ApiProperty({
    example: 'The 7th house (Jaya Bhava) represents marriage, spouse, partnerships, business alliances, and public relations.',
    description: 'Body content of the astrological rule, interpretation, or guidance',
  })
  @IsNotEmpty()
  @IsString()
  @Length(10, 10000)
  content!: string;

  @ApiPropertyOptional({
    example: 'house',
    description: 'Category (planet, house, rashi, nakshatra, lagna, dasha, yoga, dosha, marriage, career, finance, business, gemstone, remedy, kundli_kendra, general)',
    default: 'general',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    example: 'Kundli Kendra Astrology Knowledge',
    description: 'Reference source or author',
  })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({
    example: { tags: ['marriage', 'partnerships', '7th_house'] },
    description: 'Optional structured metadata',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
