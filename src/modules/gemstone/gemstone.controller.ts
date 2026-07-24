import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GemstoneService } from './gemstone.service';
import { QueryGemstonesDto } from './dto/query-gemstones.dto';

@ApiTags('gemstones')
@Controller('gemstones')
export class GemstoneController {
  constructor(private readonly gemstoneService: GemstoneService) {}

  @Get()
  findAll(@Query() query: QueryGemstonesDto) {
    return this.gemstoneService.findAll(query);
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.gemstoneService.findBySlug(slug);
  }
}
