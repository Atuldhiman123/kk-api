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
import { AdminGemstonesService } from './admin-gemstones.service';
import { CreateGemstoneDto } from './dto/create-gemstone.dto';
import { UpdateGemstoneDto } from './dto/update-gemstone.dto';

@ApiTags('admin-gemstones')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/gemstones')
export class AdminGemstonesController {
  constructor(private readonly adminGemstonesService: AdminGemstonesService) {}

  @Get()
  findAll() {
    return this.adminGemstonesService.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.adminGemstonesService.findById(id);
  }

  @Post()
  create(@Body() dto: CreateGemstoneDto) {
    return this.adminGemstonesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateGemstoneDto) {
    return this.adminGemstonesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.adminGemstonesService.remove(id);
  }
}
