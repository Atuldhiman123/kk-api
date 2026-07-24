import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
} from 'class-validator';

export class CreateBookingDto {
  // Step 1 - personal details
  @ApiProperty()
  @IsString()
  @Length(2, 100)
  name!: string;

  @ApiProperty()
  @Matches(/^[+]?[0-9\s-]{7,15}$/, {
    message: 'phone must be a valid mobile number',
  })
  phone!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  // Step 2 - birth details
  @ApiProperty()
  @IsString()
  @Length(2, 100)
  profileName!: string;

  @ApiProperty()
  @IsDateString()
  dob!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  birthTime?: string;

  @ApiProperty()
  @IsString()
  @Length(2, 150)
  birthPlace!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gender?: string;

  // Step 3 - consultation (exactly one of these two, checked in service)
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  comboOfferId?: string;

  // Step 4 - slot
  @ApiProperty({ example: '2026-07-25' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'bookingDate must be in YYYY-MM-DD format',
  })
  bookingDate!: string;

  @ApiProperty({ example: '09:00 AM' })
  @IsString()
  slot!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  // Step 5 - payment
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentScreenshot?: string;
}
