import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaymentService } from './payment.service';

@ApiTags('payment-config')
@Controller('payment-config')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get()
  getConfig() {
    return this.paymentService.getActiveConfig();
  }
}
