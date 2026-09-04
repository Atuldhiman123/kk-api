import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class GenerateChartDto {
  @ApiProperty({
    example: '1990-04-15',
    description: 'Date of birth in YYYY-MM-DD format',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'dateOfBirth must be in YYYY-MM-DD format',
  })
  dateOfBirth!: string;

  @ApiProperty({
    example: '08:30',
    description: 'Time of birth in HH:MM format (24-hour clock)',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'timeOfBirth must be in HH:MM 24-hour format',
  })
  timeOfBirth!: string;

  @ApiProperty({
    example: 28.6139,
    description: 'Latitude of birth place (-90 to 90)',
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(-90, { message: 'latitude must be between -90 and 90' })
  @Max(90, { message: 'latitude must be between -90 and 90' })
  latitude!: number;

  @ApiProperty({
    example: 77.209,
    description: 'Longitude of birth place (-180 to 180)',
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(-180, { message: 'longitude must be between -180 and 180' })
  @Max(180, { message: 'longitude must be between -180 and 180' })
  longitude!: number;

  @ApiProperty({
    example: 5.5,
    description: 'Timezone offset in hours from UTC (e.g. 5.5 for IST)',
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(-12, { message: 'timezone must be between -12 and 14' })
  @Max(14, { message: 'timezone must be between -12 and 14' })
  timezone!: number;
}
