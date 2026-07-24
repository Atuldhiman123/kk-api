import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ConsultationService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.consultationCategory.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.consultationCategory.findFirst({
      where: { slug, isActive: true },
    });
    if (!category) {
      throw new NotFoundException('Consultation category not found');
    }
    return category;
  }
}
