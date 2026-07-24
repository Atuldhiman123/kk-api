import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../common/guards/admin-jwt.guard';
import { AdminBookingsService } from './admin-bookings.service';
import { QueryAdminBookingsDto } from './dto/query-admin-bookings.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';

@ApiTags('admin-bookings')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/bookings')
export class AdminBookingsController {
  constructor(private readonly adminBookingsService: AdminBookingsService) {}

  @Get()
  findAll(@Query() query: QueryAdminBookingsDto) {
    return this.adminBookingsService.findAll(query);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.adminBookingsService.findById(id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateBookingStatusDto) {
    return this.adminBookingsService.updateStatus(id, dto);
  }
}
