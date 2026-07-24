import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateComboOfferDto } from './dto/create-combo-offer.dto';
import { UpdateComboOfferDto } from './dto/update-combo-offer.dto';

const comboInclude = { categories: { include: { category: true } } };

@Injectable()
export class AdminComboOffersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.comboOffer.findMany({
      include: comboInclude,
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const combo = await this.prisma.comboOffer.findUnique({
      where: { id },
      include: comboInclude,
    });
    if (!combo) {
      throw new NotFoundException('Combo offer not found');
    }
    return combo;
  }

  create(dto: CreateComboOfferDto) {
    const { categoryIds, ...rest } = dto;
    return this.prisma.comboOffer.create({
      data: {
        ...rest,
        categories: {
          create: categoryIds.map((categoryId) => ({ categoryId })),
        },
      },
      include: comboInclude,
    });
  }

  async update(id: string, dto: UpdateComboOfferDto) {
    await this.findById(id);
    const { categoryIds, ...rest } = dto;

    return this.prisma.$transaction(async (tx) => {
      if (categoryIds) {
        await tx.comboOfferCategory.deleteMany({ where: { comboOfferId: id } });
      }
      return tx.comboOffer.update({
        where: { id },
        data: {
          ...rest,
          ...(categoryIds
            ? {
                categories: {
                  create: categoryIds.map((categoryId) => ({ categoryId })),
                },
              }
            : {}),
        },
        include: comboInclude,
      });
    });
  }

  async remove(id: string) {
    await this.findById(id);
    await this.prisma.comboOffer.update({
      where: { id },
      data: { isActive: false },
    });
    return { success: true };
  }
}
