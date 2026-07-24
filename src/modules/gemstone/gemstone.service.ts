import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryGemstonesDto } from './dto/query-gemstones.dto';

@Injectable()
export class GemstoneService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryGemstonesDto) {
    const { search, page, limit } = query;

    const where: Prisma.GemstoneWhereInput = {
      isActive: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { shortDescription: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.gemstone.findMany({
        where,
        include: { images: { orderBy: { sortOrder: 'asc' } } },
        orderBy: [{ isFeatured: 'desc' }, { name: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.gemstone.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findBySlug(slug: string) {
    const gemstone = await this.prisma.gemstone.findFirst({
      where: { slug, isActive: true },
      include: { images: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!gemstone) {
      throw new NotFoundException('Gemstone not found');
    }

    const related = await this.prisma.gemstone.findMany({
      where: { isActive: true, id: { not: gemstone.id } },
      include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
      orderBy: { isFeatured: 'desc' },
      take: 4,
    });

    return { ...gemstone, related };
  }
}
