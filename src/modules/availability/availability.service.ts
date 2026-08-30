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

    const dayOfWeek = date.day(); // 0 is Sunday, 1-5 is Mon-Fri, 6 is Sat
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const startHour = isWeekday ? 20 : 10; // Weekdays: 8 PM, Weekends: 10 AM

    const allSlots = new Set<string>();
    let current = date.hour(startHour).minute(0).second(0);
    const end = date.hour(23).minute(30).second(0); // Last slot starts at 11:30 PM (ends at 12:00 AM)

    while (current.isBefore(end) || current.isSame(end)) {
      allSlots.add(current.format('hh:mm A'));
      current = current.add(SLOT_STEP_MINUTES, 'minute');
    }

    const bookings = await this.prisma.booking.findMany({
      where: {
        bookingDate: dateOnlyToUtcDate(dateStr),
        OR: [
          { bookingStatus: { in: ['Confirmed', 'Completed'] } },
          {
            bookingStatus: 'Pending',
            createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
          },
        ],
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
}
