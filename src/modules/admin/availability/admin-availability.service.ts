import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateWeeklyAvailabilityDto } from './dto/create-weekly-availability.dto';
import { UpdateWeeklyAvailabilityDto } from './dto/update-weekly-availability.dto';

@Injectable()
export class AdminAvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.weeklyAvailability.findMany({
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async findById(id: string) {
    const entry = await this.prisma.weeklyAvailability.findUnique({
      where: { id },
    });
    if (!entry) {
      throw new NotFoundException('Availability entry not found');
    }
    return entry;
  }

  create(dto: CreateWeeklyAvailabilityDto) {
    return this.prisma.weeklyAvailability.create({ data: dto });
  }

  async update(id: string, dto: UpdateWeeklyAvailabilityDto) {
    await this.findById(id);
    return this.prisma.weeklyAvailability.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findById(id);
    await this.prisma.weeklyAvailability.delete({ where: { id } });
    return { success: true };
  }
}
