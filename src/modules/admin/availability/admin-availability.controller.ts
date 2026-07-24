import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../common/guards/admin-jwt.guard';
import { AdminAvailabilityService } from './admin-availability.service';
import { CreateWeeklyAvailabilityDto } from './dto/create-weekly-availability.dto';
import { UpdateWeeklyAvailabilityDto } from './dto/update-weekly-availability.dto';

@ApiTags('admin-availability')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/availability')
export class AdminAvailabilityController {
  constructor(
    private readonly adminAvailabilityService: AdminAvailabilityService,
  ) {}

  @Get()
  findAll() {
    return this.adminAvailabilityService.findAll();
  }

  @Post()
  create(@Body() dto: CreateWeeklyAvailabilityDto) {
    return this.adminAvailabilityService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWeeklyAvailabilityDto) {
    return this.adminAvailabilityService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.adminAvailabilityService.remove(id);
  }
}
