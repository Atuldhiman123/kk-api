import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { HomeModule } from './modules/home/home.module';
import { ConsultationModule } from './modules/consultation/consultation.module';
import { ComboOfferModule } from './modules/combo-offer/combo-offer.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { PaymentModule } from './modules/payment/payment.module';
import { UploadModule } from './modules/upload/upload.module';
import { BookingModule } from './modules/booking/booking.module';
import { GemstoneModule } from './modules/gemstone/gemstone.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { MailModule } from './modules/mail/mail.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    HomeModule,
    ConsultationModule,
    ComboOfferModule,
    AvailabilityModule,
    PaymentModule,
    UploadModule,
    BookingModule,
    GemstoneModule,
    AuthModule,
    AdminModule,
    MailModule,
    WhatsappModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}