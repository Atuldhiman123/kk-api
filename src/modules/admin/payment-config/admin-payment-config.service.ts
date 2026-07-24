import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UpdatePaymentConfigDto } from './dto/update-payment-config.dto';

@Injectable()
export class AdminPaymentConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    return this.prisma.paymentConfig.findFirst({ orderBy: { id: 'asc' } });
  }

  async upsert(dto: UpdatePaymentConfigDto) {
    const existing = await this.get();
    if (!existing) {
      return this.prisma.paymentConfig.create({ data: dto });
    }
    return this.prisma.paymentConfig.update({
      where: { id: existing.id },
      data: dto,
    });
  }
}
