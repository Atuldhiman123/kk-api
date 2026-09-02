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
   * Send WhatsApp message via Meta Cloud API (Graph API)
   */
  async sendMetaWhatsAppMessage(to: string, text: string): Promise<boolean> {
    const token = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');
    const phoneId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');

    if (!token || !phoneId) {
      return false;
    }

    try {
      const formattedTo = to.replace(/[^0-9]/g, '');
      const res = await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedTo,
          type: 'text',
          text: { body: text },
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        this.logger.error(`Meta Graph API error: ${JSON.stringify(errorData)}`);
        return false;
      }

      this.logger.log(`WhatsApp message sent successfully via Meta Graph API to ${to}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to send WhatsApp message via Meta API: ${err.message}`);
      return false;
    }
  }

  /**
   * Handle incoming messages from customers via Meta Webhook
   */
  async handleIncomingMessage(from: string, text: string): Promise<void> {
    const lowerText = (text || '').toLowerCase().trim();

    let replyText =
      `🙏 *नमस्कार! Kundli Kendra में आपका स्वागत है।* ✨\n\n` +
      `आपकी ज्योतिषीय सेवा या परामर्श के लिए हमारे पोर्टल पर जाएँ:\n` +
      `👉 https://kundlikendra.netlify.app\n\n` +
      `💰 सेवा शुल्क व मूल्य सूची देखने के लिए *PRICE* लिखकर भेजें।\n` +
      `📞 सीधे संपर्क के लिए: +91 93171 17001`;

    if (
      lowerText.includes('price') ||
      lowerText.includes('rate') ||
      lowerText.includes('cost') ||
      lowerText.includes('fees') ||
      lowerText.includes('charges') ||
      lowerText.includes('रेट') ||
      lowerText.includes('फीस')
    ) {
      replyText =
        `✨ *Kundli Kendra - सेवाएं और शुल्क सूची* ✨\n\n` +
        `1️⃣ *कुंडली मिलान (Kundli Matching):* ₹500\n` +
        `2️⃣ *विस्तृत कुंडली विश्लेषण (Horoscope Analysis):* ₹1100\n` +
        `3️⃣ *लाइव ज्योतिष परामर्श (30 Min Live Consultation):* ₹2100\n` +
        `4️⃣ *रत्न परामर्श एवं वैदिक उपाय (Gemstone Advice):* ₹750\n\n` +
        `📅 अभी स्लॉट बुक करें:\n` +
        `👉 https://kundlikendra.netlify.app\n\n` +
        `धन्यवाद! 🙏`;
    }

    await this.sendMetaWhatsAppMessage(from, replyText);
  }

  /**
   * Sends automated WhatsApp alert to the Admin's WhatsApp Business number
   */
  async sendAdminBookingAlert(booking: any): Promise<boolean> {
    const apiKey = this.getApiKey();
    const phone = this.getAdminPhone();

    const consultationTitle =
      booking.category?.name ||
      (booking.comboOffer ? `${booking.comboOffer.name} (Combo Offer)` : 'Astro Consultation');

    const formattedDate = dayjs(booking.bookingDate).format('DD MMM YYYY');
    const formattedDob = booking.birthProfile?.dob
      ? dayjs(booking.birthProfile.dob).format('DD MMM YYYY')
      : '-';

    const customerPhone = booking.user?.phone || 'N/A';
    const cleanCustomerPhone = customerPhone.replace(/[^0-9]/g, '');
    const birthTime = booking.birthProfile?.timeOfBirth || 'उपलब्ध नहीं';
    const birthPlace = booking.birthProfile?.birthPlace || 'N/A';
    const profileName = booking.birthProfile?.profileName || booking.user?.name || '-';
    const paymentStatus = booking.paymentStatus || 'Paid';

    const messageText =
      `🌟 *नई परामर्श बुकिंग (Kundli Kendra)* 🌟\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `👤 *ग्राहक:* ${booking.user?.name || 'N/A'}\n` +
      `📞 *फ़ोन:* ${customerPhone}\n` +
      `📧 *ईमेल:* ${booking.user?.email || 'N/A'}\n\n` +
      `✨ *परामर्श:* ${consultationTitle}\n` +
      `📅 *दिनांक:* ${formattedDate}\n` +
      `⏰ *समय (स्लॉट):* ${booking.slotTime}\n\n` +
      `🕉️ *कुंडली विवरण:*\n` +
      `🏷️ *नाम:* ${profileName}\n` +
      `🎂 *जन्म तिथि:* ${formattedDob}\n` +
      `🕒 *जन्म समय:* ${birthTime}\n` +
      `📍 *जन्म स्थान:* ${birthPlace}\n\n` +
      `💳 *भुगतान स्थिति:*\n` +
      `💰 *राशि:* ₹${booking.amount} (${paymentStatus} ✅)\n` +
      `🆔 *Booking ID:* ${booking.id}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      (cleanCustomerPhone
        ? `💬 *ग्राहक से चैट करें:*\nhttps://wa.me/91${cleanCustomerPhone}`
        : '');

    // Try Meta Graph API first if configured, else CallMeBot
    const metaSent = await this.sendMetaWhatsAppMessage(phone, messageText);
    if (metaSent) return true;

    if (!apiKey) {
      this.logger.warn(
        `[WhatsApp Alert Simulation] CALLMEBOT_API_KEY / META credentials not configured. Message content:\n${messageText}`,
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