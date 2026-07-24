import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PaymentService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveConfig() {
    const config = await this.prisma.paymentConfig.findFirst({
      where: { isActive: true },
    });
    if (!config) {
      throw new NotFoundException('Payment configuration is not set up yet');
    }
    return config;
  }
}
