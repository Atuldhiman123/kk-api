import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConsultationService } from './consultation.service';

@ApiTags('consultation-categories')
@Controller('consultation-categories')
export class ConsultationController {
  constructor(private readonly consultationService: ConsultationService) {}

  @Get()
  findAll() {
    return this.consultationService.findAll();
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.consultationService.findBySlug(slug);
  }
}
