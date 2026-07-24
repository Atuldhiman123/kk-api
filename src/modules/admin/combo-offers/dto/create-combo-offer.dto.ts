import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';

export class CreateComboOfferDto {
  @ApiProperty()
  @IsString()
  @Length(2, 100)
  name!: string;

  @ApiProperty()
  @IsString()
  @Length(2, 120)
  slug!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  discountedPrice!: number;

  @ApiProperty({
    type: [String],
    description: 'ConsultationCategory ids included in this combo',
  })
  @IsArray()
  @ArrayMinSize(2)
  @IsUUID('4', { each: true })
  categoryIds!: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
