import { Module } from '@nestjs/common';
import { AstrologyController } from './astrology.controller';
import { AstrologyService } from './astrology.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AstrologyController],
  providers: [AstrologyService],
  exports: [AstrologyService],
})
export class AstrologyModule {}
