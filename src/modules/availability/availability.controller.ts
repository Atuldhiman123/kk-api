import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AvailabilityService } from './availability.service';

@ApiTags('availability')
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get()
  async getSlots(@Query('date') date: string) {
    const slots = await this.availabilityService.getSlotsForDate(date);
    return { date, slots };
  }
}
