import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateGemstoneDto } from './dto/create-gemstone.dto';
import { UpdateGemstoneDto } from './dto/update-gemstone.dto';

const gemstoneInclude = { images: { orderBy: { sortOrder: 'asc' as const } } };

@Injectable()
export class AdminGemstonesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.gemstone.findMany({
      include: gemstoneInclude,
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const gemstone = await this.prisma.gemstone.findUnique({
      where: { id },
      include: gemstoneInclude,
    });
    if (!gemstone) {
      throw new NotFoundException('Gemstone not found');
    }
    return gemstone;
  }

  create(dto: CreateGemstoneDto) {
    const { images, ...rest } = dto;
    return this.prisma.gemstone.create({
      data: {
        ...rest,
        images: images
          ? {
              create: images.map((imageUrl, sortOrder) => ({
                imageUrl,
                sortOrder,
              })),
            }
          : undefined,
      },
      include: gemstoneInclude,
    });
  }

  async update(id: string, dto: UpdateGemstoneDto) {
    await this.findById(id);
    const { images, ...rest } = dto;

    return this.prisma.$transaction(async (tx) => {
      if (images) {
        await tx.gemstoneImage.deleteMany({ where: { gemstoneId: id } });
      }
      return tx.gemstone.update({
        where: { id },
        data: {
          ...rest,
          ...(images
            ? {
                images: {
                  create: images.map((imageUrl, sortOrder) => ({
                    imageUrl,
                    sortOrder,
                  })),
                },
              }
            : {}),
        },
        include: gemstoneInclude,
      });
    });
  }

  async remove(id: string) {
    await this.findById(id);
    await this.prisma.gemstone.update({
      where: { id },
      data: { isActive: false },
    });
    return { success: true };
  }
}
