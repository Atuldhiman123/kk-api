import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ComboOfferService } from './combo-offer.service';

@ApiTags('combo-offers')
@Controller('combo-offers')
export class ComboOfferController {
  constructor(private readonly comboOfferService: ComboOfferService) {}

  @Get()
  findAll() {
    return this.comboOfferService.findAll();
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.comboOfferService.findBySlug(slug);
  }
}
