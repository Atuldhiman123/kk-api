import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import dayjs from 'dayjs';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(private readonly configService: ConfigService) {}

  private getAdminPhone(): string {
    const raw = this.configService.get<string>('ADMIN_WHATSAPP_PHONE') || '919317117001';
    return raw.replace(/[^0-9]/g, '');
  }

  private getApiKey(): string | undefined {
    return this.configService.get<string>('CALLMEBOT_API_KEY')?.trim();
  }

  /**
   * Sends automated WhatsApp alert to the Admin's WhatsApp Business number
   */
  async sendAdminBookingAlert(booking: any): Promise<boolean> {
    const apiKey = this.getApiKey();
    const phone = this.getAdminPhone();

    const consultationTitle =
      booking.category?.name ||
      (booking.comboOffer ? `${booking.comboOffer.name} (Combo)` : 'Astro Consultation');

    const formattedDate = dayjs(booking.bookingDate).format('DD MMM YYYY');
    const formattedDob = booking.birthProfile?.dob
      ? dayjs(booking.birthProfile.dob).format('DD MMM YYYY')
      : '-';

    const messageText =
      `🔔 *नई बुकिंग अलर्ट (Kundli Kendra)*\n\n` +
      `👤 *ग्राहक:* ${booking.user?.name || 'N/A'}\n` +
      `📞 *फ़ोन:* ${booking.user?.phone || 'N/A'}\n` +
      `📧 *ईमेल:* ${booking.user?.email || 'N/A'}\n` +
      `✨ *परामर्श:* ${consultationTitle}\n` +
      `📅 *दिनांक:* ${formattedDate}\n` +
      `⏰ *समय (स्लॉट):* ${booking.slotTime}\n` +
      `🎂 *जन्म तिथि:* ${formattedDob}\n` +
      `🕒 *जन्म समय:* ${booking.birthProfile?.timeOfBirth || 'N/A'}\n` +
      `📍 *जन्म स्थान:* ${booking.birthProfile?.birthPlace || 'N/A'}\n` +
      `💰 *राशि:* ₹${booking.amount} (${booking.paymentStatus || 'Pending'})\n` +
      `🆔 *ID:* ${booking.id}`;

    if (!apiKey) {
      this.logger.warn(
        `[WhatsApp Alert Simulation] CALLMEBOT_API_KEY not configured in .env. Message content:\n${messageText}`,
      );
      return false;
    }

    try {
      const encodedText = encodeURIComponent(messageText);
      const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodedText}&apikey=${apiKey}`;

      const response = await fetch(url);
      const responseText = await response.text();

      if (response.ok && !responseText.toLowerCase().includes('error')) {
        this.logger.log(`WhatsApp booking alert successfully sent to Admin (${phone})`);
        return true;
      } else {
        this.logger.error(`CallMeBot WhatsApp response: ${responseText}`);
        return false;
      }
    } catch (error: any) {
      this.logger.error(`Failed to send WhatsApp alert to Admin: ${error.message}`);
      return false;
    }
  }
}