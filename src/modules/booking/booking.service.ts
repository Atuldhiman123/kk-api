import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { MailService } from '../mail/mail.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { dateOnlyToUtcDate } from '../../common/date-only';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';

const ACTIVE_BOOKING_STATUSES = ['Pending', 'Confirmed', 'Completed'] as const;

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availabilityService: AvailabilityService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly whatsappService: WhatsappService,
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
    const paymentMethod = dto.paymentMethod ?? 'UPI';

    const booking = await this.prisma.$transaction(async (tx) => {
      const clash = await tx.booking.findFirst({
        where: {
          bookingDate,
          slotTime: dto.slot,
          OR: [
            { bookingStatus: { in: ['Confirmed', 'Completed'] } },
            {
              bookingStatus: 'Pending',
              createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
            },
          ],
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
          paymentMethod,
          status: 'Pending',
        },
      });

      return created;
    });

    if (paymentMethod === 'Razorpay') {
      const razorpay = new Razorpay({
        key_id: this.configService.get<string>('RAZORPAY_KEY_ID') || '',
        key_secret: this.configService.get<string>('RAZORPAY_KEY_SECRET') || '',
      });

      try {
        const order = await razorpay.orders.create({
          amount: Math.round(amount * 100),
          currency: 'INR',
          receipt: booking.id,
        });

        await this.prisma.bookingPayment.updateMany({
          where: { bookingId: booking.id, status: 'Pending' },
          data: { transactionId: order.id },
        });

        const fullBooking = await this.findById(booking.id);

        return {
          ...fullBooking,
          razorpayOrder: {
            id: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: this.configService.get<string>('RAZORPAY_KEY_ID') || '',
          },
        };
      } catch (err: any) {
        await this.prisma.booking.update({
          where: { id: booking.id },
          data: { bookingStatus: 'Cancelled' },
        });
        throw new BadRequestException(`Failed to initialize payment gateway: ${err.message}`);
      }
    } else {
      await this.prisma.bookingPayment.updateMany({
        where: { bookingId: booking.id, status: 'Pending' },
        data: {
          transactionId: dto.transactionId,
          paymentScreenshot: dto.paymentScreenshot,
        },
      });
    }

    const fullBooking = await this.findById(booking.id);

    // Send customer confirmation & admin alert (Email + WhatsApp)
    this.mailService.sendBookingConfirmation(fullBooking).catch(() => {});
    this.mailService.sendAdminBookingAlert(fullBooking).catch(() => {});
    this.whatsappService.sendAdminBookingAlert(fullBooking).catch(() => {});

    return fullBooking;
  }

  async verifyPayment(dto: VerifyPaymentDto) {
    const { bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = dto;

    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
    if (!keySecret) {
      throw new BadRequestException('Razorpay credentials not configured');
    }

    const hmac = crypto.createHmac('sha256', keySecret);
    hmac.update(`${razorpayOrderId}|${razorpayPaymentId}`);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature !== razorpaySignature) {
      throw new BadRequestException('Invalid payment signature');
    }

    const payment = await this.prisma.bookingPayment.findFirst({
      where: {
        bookingId,
        transactionId: razorpayOrderId,
        status: 'Pending',
      },
    });

    if (!payment) {
      throw new NotFoundException('Pending payment record not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          bookingStatus: 'Confirmed',
          paymentStatus: 'Paid',
        },
      });

      await tx.bookingPayment.update({
        where: { id: payment.id },
        data: {
          status: 'Paid',
          transactionId: razorpayPaymentId,
        },
      });
    });

    // Notify user & admin of verified payment & confirmed booking (Email + WhatsApp)
    const confirmedBooking = await this.findById(bookingId);
    this.mailService.sendBookingConfirmation(confirmedBooking).catch(() => {});
    this.mailService.sendPaymentSuccessNotification(confirmedBooking).catch(() => {});
    this.mailService.sendAdminBookingAlert(confirmedBooking).catch(() => {});
    this.whatsappService.sendAdminBookingAlert(confirmedBooking).catch(() => {});

    return { success: true, message: 'Payment verified and booking confirmed' };
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