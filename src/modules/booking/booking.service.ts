import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { dateOnlyToUtcDate } from '../../common/date-only';

const ACTIVE_BOOKING_STATUSES = ['Pending', 'Confirmed', 'Completed'] as const;

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availabilityService: AvailabilityService,
  ) {}

  async create(dto: CreateBookingDto) {
    if (
      (!dto.categoryId && !dto.comboOfferId) ||
      (dto.categoryId && dto.comboOfferId)
    ) {
      throw new BadRequestException(
        'Select exactly one consultation category or combo offer',
      );
    }

    let durationMinutes: number;
    let amount: number;

    if (dto.categoryId) {
      const category = await this.prisma.consultationCategory.findFirst({
        where: { id: dto.categoryId, isActive: true },
      });
      if (!category) {
        throw new NotFoundException('Consultation category not found');
      }
      durationMinutes = category.durationMinutes;
      amount = Number(category.price);
    } else {
      const combo = await this.prisma.comboOffer.findFirst({
        where: { id: dto.comboOfferId, isActive: true },
        include: { categories: { include: { category: true } } },
      });
      if (!combo) {
        throw new NotFoundException('Combo offer not found');
      }
      durationMinutes = combo.categories.reduce(
        (sum, entry) => sum + entry.category.durationMinutes,
        0,
      );
      amount = Number(combo.discountedPrice);
    }

    const availableSlots = await this.availabilityService.getSlotsForDate(
      dto.bookingDate,
    );
    if (!availableSlots.includes(dto.slot)) {
      throw new ConflictException(
        'Selected slot is no longer available, please choose another slot',
      );
    }

    const bookingDate = dateOnlyToUtcDate(dto.bookingDate);

    const booking = await this.prisma.$transaction(async (tx) => {
      const clash = await tx.booking.findFirst({
        where: {
          bookingDate,
          slotTime: dto.slot,
          bookingStatus: { in: [...ACTIVE_BOOKING_STATUSES] },
        },
      });
      if (clash) {
        throw new ConflictException(
          'Selected slot was just booked by someone else, please choose another slot',
        );
      }

      const user = await tx.user.upsert({
        where: { phone: dto.phone },
        update: { name: dto.name, ...(dto.email ? { email: dto.email } : {}) },
        create: { name: dto.name, phone: dto.phone, email: dto.email },
      });

      const birthProfile = await tx.birthProfile.create({
        data: {
          userId: user.id,
          profileName: dto.profileName,
          dob: new Date(dto.dob),
          timeOfBirth: dto.birthTime,
          birthPlace: dto.birthPlace,
          gender: dto.gender,
        },
      });

      const created = await tx.booking.create({
        data: {
          userId: user.id,
          birthProfileId: birthProfile.id,
          categoryId: dto.categoryId,
          comboOfferId: dto.comboOfferId,
          bookingDate,
          slotTime: dto.slot,
          durationMinutes,
          amount,
          notes: dto.notes,
        },
      });

      await tx.bookingPayment.create({
        data: {
          bookingId: created.id,
          amount,
          paymentMethod: 'UPI',
          transactionId: dto.transactionId,
          paymentScreenshot: dto.paymentScreenshot,
        },
      });

      return created;
    });

    return this.findById(booking.id);
  }

  async findById(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        category: true,
        comboOffer: true,
        birthProfile: true,
        user: true,
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    return booking;
  }
}
