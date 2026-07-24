import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { dateOnlyToUtcDate } from '../../../common/date-only';
import { QueryAdminBookingsDto } from './dto/query-admin-bookings.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';

const bookingInclude = {
  category: true,
  comboOffer: true,
  birthProfile: true,
  user: true,
  payments: { orderBy: { createdAt: 'desc' as const } },
};

@Injectable()
export class AdminBookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryAdminBookingsDto) {
    const { bookingStatus, paymentStatus, date, page, limit } = query;

    const where: Prisma.BookingWhereInput = {
      ...(bookingStatus ? { bookingStatus } : {}),
      ...(paymentStatus ? { paymentStatus } : {}),
      ...(date ? { bookingDate: dateOnlyToUtcDate(date) } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: bookingInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: bookingInclude,
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    return booking;
  }

  async updateStatus(id: string, dto: UpdateBookingStatusDto) {
    await this.findById(id);

    await this.prisma.$transaction(async (tx) => {
      if (dto.bookingStatus) {
        await tx.booking.update({
          where: { id },
          data: { bookingStatus: dto.bookingStatus },
        });
      }
      if (dto.paymentStatus) {
        await tx.booking.update({
          where: { id },
          data: { paymentStatus: dto.paymentStatus },
        });
        const latestPayment = await tx.bookingPayment.findFirst({
          where: { bookingId: id },
          orderBy: { createdAt: 'desc' },
        });
        if (latestPayment) {
          await tx.bookingPayment.update({
            where: { id: latestPayment.id },
            data: { status: dto.paymentStatus },
          });
        }
      }
    });

    return this.findById(id);
  }
}
