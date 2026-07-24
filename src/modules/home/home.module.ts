import { Module } from '@nestjs/common';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';
import { ConsultationModule } from '../consultation/consultation.module';
import { ComboOfferModule } from '../combo-offer/combo-offer.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [ConsultationModule, ComboOfferModule, PaymentModule],
  controllers: [HomeController],
  providers: [HomeService],
})
export class HomeModule {}
