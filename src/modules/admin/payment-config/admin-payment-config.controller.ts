import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../common/guards/admin-jwt.guard';
import { AdminPaymentConfigService } from './admin-payment-config.service';
import { UpdatePaymentConfigDto } from './dto/update-payment-config.dto';

@ApiTags('admin-payment-config')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/payment-config')
export class AdminPaymentConfigController {
  constructor(
    private readonly adminPaymentConfigService: AdminPaymentConfigService,
  ) {}

  @Get()
  get() {
    return this.adminPaymentConfigService.get();
  }

  @Put()
  upsert(@Body() dto: UpdatePaymentConfigDto) {
    return this.adminPaymentConfigService.upsert(dto);
  }
}
