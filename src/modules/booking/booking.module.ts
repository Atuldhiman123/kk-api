import { Module } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { AvailabilityModule } from '../availability/availability.module';
import { MailModule } from '../mail/mail.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [AvailabilityModule, MailModule, WhatsappModule],
  controllers: [BookingController],
  providers: [BookingService],
})
export class BookingModule {}