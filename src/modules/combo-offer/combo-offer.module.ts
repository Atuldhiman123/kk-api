import { Module } from '@nestjs/common';
import { ComboOfferController } from './combo-offer.controller';
import { ComboOfferService } from './combo-offer.service';

@Module({
  controllers: [ComboOfferController],
  providers: [ComboOfferService],
  exports: [ComboOfferService],
})
export class ComboOfferModule {}
