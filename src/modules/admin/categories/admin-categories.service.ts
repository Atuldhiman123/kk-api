import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class AdminCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.consultationCategory.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const category = await this.prisma.consultationCategory.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException('Consultation category not found');
    }
    return category;
  }

  create(dto: CreateCategoryDto) {
    return this.prisma.consultationCategory.create({ data: dto });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findById(id);
    return this.prisma.consultationCategory.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findById(id);
    await this.prisma.consultationCategory.update({
      where: { id },
      data: { isActive: false },
    });
    return { success: true };
  }
}
