import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminBookingsController } from './bookings/admin-bookings.controller';
import { AdminBookingsService } from './bookings/admin-bookings.service';
import { AdminCategoriesController } from './categories/admin-categories.controller';
import { AdminCategoriesService } from './categories/admin-categories.service';
import { AdminComboOffersController } from './combo-offers/admin-combo-offers.controller';
import { AdminComboOffersService } from './combo-offers/admin-combo-offers.service';
import { AdminGemstonesController } from './gemstones/admin-gemstones.controller';
import { AdminGemstonesService } from './gemstones/admin-gemstones.service';
import { AdminAvailabilityController } from './availability/admin-availability.controller';
import { AdminAvailabilityService } from './availability/admin-availability.service';
import { AdminPaymentConfigController } from './payment-config/admin-payment-config.controller';
import { AdminPaymentConfigService } from './payment-config/admin-payment-config.service';

@Module({
  imports: [AuthModule],
  controllers: [
    AdminBookingsController,
    AdminCategoriesController,
    AdminComboOffersController,
    AdminGemstonesController,
    AdminAvailabilityController,
    AdminPaymentConfigController,
  ],
  providers: [
    AdminBookingsService,
    AdminCategoriesService,
    AdminComboOffersService,
    AdminGemstonesService,
    AdminAvailabilityService,
    AdminPaymentConfigService,
  ],
})
export class AdminModule {}
