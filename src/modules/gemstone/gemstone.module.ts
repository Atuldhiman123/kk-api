import { Module } from '@nestjs/common';
import { GemstoneController } from './gemstone.controller';
import { GemstoneService } from './gemstone.service';

@Module({
  controllers: [GemstoneController],
  providers: [GemstoneService],
  exports: [GemstoneService],
})
export class GemstoneModule {}
