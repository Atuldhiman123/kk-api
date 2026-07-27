import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const comboInclude = {
  categories: {
    include: { category: true },
  },
} as const;

@Injectable()
export class ComboOfferService {
  constructor(private readonly prisma: PrismaService) {}

  private withOriginalPrice<
    T extends { categories: { category: { price: any } }[] },
  >(combo: T) {
    const originalPrice = combo.categories.reduce(
      (sum, entry) => sum + Number(entry.category.price),
      0,
    );
    return { ...combo, originalPrice };
  }

  async findAll() {
    try {
      const combos = await this.prisma.comboOffer.findMany({
        where: { isActive: true },
        include: comboInclude,
        orderBy: { name: 'asc' },
      });
      return combos.map((combo) => this.withOriginalPrice(combo));
    } catch (err) {
      console.error('Failed to fetch combo offers:', err);
      return [];
    }
  }

  async findBySlug(slug: string) {
    const combo = await this.prisma.comboOffer.findFirst({
      where: { slug, isActive: true },
      include: comboInclude,
    });
    if (!combo) {
      throw new NotFoundException('Combo offer not found');
    }
    return this.withOriginalPrice(combo);
  }
}
