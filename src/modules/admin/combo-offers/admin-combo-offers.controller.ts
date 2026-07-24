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
import { AdminComboOffersService } from './admin-combo-offers.service';
import { CreateComboOfferDto } from './dto/create-combo-offer.dto';
import { UpdateComboOfferDto } from './dto/update-combo-offer.dto';

@ApiTags('admin-combo-offers')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/combo-offers')
export class AdminComboOffersController {
  constructor(
    private readonly adminComboOffersService: AdminComboOffersService,
  ) {}

  @Get()
  findAll() {
    return this.adminComboOffersService.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.adminComboOffersService.findById(id);
  }

  @Post()
  create(@Body() dto: CreateComboOfferDto) {
    return this.adminComboOffersService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateComboOfferDto) {
    return this.adminComboOffersService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.adminComboOffersService.remove(id);
  }
}
