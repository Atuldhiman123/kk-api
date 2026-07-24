import { PartialType } from '@nestjs/swagger';
import { CreateWeeklyAvailabilityDto } from './create-weekly-availability.dto';

export class UpdateWeeklyAvailabilityDto extends PartialType(
  CreateWeeklyAvailabilityDto,
) {}
