import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ConsultationService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    try {
      return await this.prisma.consultationCategory.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });
    } catch (err) {
      console.error('Failed to fetch consultation categories:', err);
      return [];
    }
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
