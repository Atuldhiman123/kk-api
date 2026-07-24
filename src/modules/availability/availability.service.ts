import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import dayjs from '../../common/dayjs';
import { dateOnlyToUtcDate } from '../../common/date-only';
import { PrismaService } from '../../prisma/prisma.service';

const SLOT_STEP_MINUTES = 30;
const ACTIVE_BOOKING_STATUSES = ['Pending', 'Confirmed', 'Completed'] as const;

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getSlotsForDate(dateStr: string): Promise<string[]> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new BadRequestException('date must be in YYYY-MM-DD format');
    }

    const date = dayjs(dateStr, 'YYYY-MM-DD', true);
    if (!date.isValid()) {
      throw new BadRequestException('date is not a valid calendar date');
    }

    const dayOfWeek = date.day();

    const ranges = await this.prisma.weeklyAvailability.findMany({
      where: { dayOfWeek, isActive: true },
    });

    if (ranges.length === 0) {
      return [];
    }

    const allSlots = new Set<string>();
    for (const range of ranges) {
      for (const slot of this.generateSlots(
        date,
        range.startTime,
        range.endTime,
      )) {
        allSlots.add(slot);
      }
    }

    const bookings = await this.prisma.booking.findMany({
      where: {
        bookingDate: dateOnlyToUtcDate(dateStr),
        bookingStatus: { in: [...ACTIVE_BOOKING_STATUSES] },
      },
      select: { slotTime: true },
    });
    const bookedSlots = new Set(bookings.map((b) => b.slotTime));

    const leadTimeMinutes = Number(
      this.configService.get('SLOT_LEAD_TIME_MINUTES') ?? 30,
    );
    const earliestBookableAt = dayjs().add(leadTimeMinutes, 'minute');
    const isToday = date.isSame(dayjs(), 'day');

    const slots = Array.from(allSlots)
      .filter((slot) => !bookedSlots.has(slot))
      .filter((slot) => {
        if (!isToday) return true;
        const slotDateTime = dayjs(`${dateStr} ${slot}`, 'YYYY-MM-DD hh:mm A');
        return slotDateTime.isAfter(earliestBookableAt);
      })
      .sort((a, b) =>
        dayjs(`2000-01-01 ${a}`, 'YYYY-MM-DD hh:mm A').diff(
          dayjs(`2000-01-01 ${b}`, 'YYYY-MM-DD hh:mm A'),
        ),
      );

    return slots;
  }

  private generateSlots(
    date: ReturnType<typeof dayjs>,
    startTime: string,
    endTime: string,
  ): string[] {
    const slots: string[] = [];
    let cursor = dayjs(
      `${date.format('YYYY-MM-DD')} ${startTime}`,
      'YYYY-MM-DD HH:mm',
    );
    const end = dayjs(
      `${date.format('YYYY-MM-DD')} ${endTime}`,
      'YYYY-MM-DD HH:mm',
    );

    while (cursor.isBefore(end)) {
      slots.push(cursor.format('hh:mm A'));
      cursor = cursor.add(SLOT_STEP_MINUTES, 'minute');
    }

    return slots;
  }
}
