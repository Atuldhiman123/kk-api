import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import dayjs from 'dayjs';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

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
  async sendMetaWhatsAppMessage(to: string, text: string, overridePhoneId?: string): Promise<boolean> {
    const token = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');
    let phoneId = overridePhoneId || this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID') || '1351113624747250';
    if (phoneId === '1335965001676633' || !phoneId) {
      phoneId = '1351113624747250';
    }

    if (!token) {
      this.logger.error('Missing WHATSAPP_ACCESS_TOKEN in config');
      return false;
    }

    try {
      let formattedTo = to.replace(/[^0-9]/g, '');
      if (formattedTo.length === 11 && formattedTo.startsWith('0')) {
        formattedTo = formattedTo.substring(1);
      }
      if (formattedTo.length === 10) {
        formattedTo = '91' + formattedTo;
      }
      this.logger.log(`Dispatching WhatsApp message to ${formattedTo} using phoneId ${phoneId}...`);
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
  async handleIncomingMessage(from: string, text: string, phoneId?: string): Promise<void> {
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
      try {
        const [categories, comboOffers] = await Promise.all([
          this.prisma.consultationCategory.findMany({
            where: { isActive: true },
            orderBy: { price: 'asc' },
          }),
          this.prisma.comboOffer.findMany({
            where: { isActive: true },
            orderBy: { discountedPrice: 'asc' },
          }),
        ]);

        if (categories && categories.length > 0) {
          replyText = `✨ *Kundli Kendra - सेवाएं और शुल्क सूची* ✨\n\n`;

          const numEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

          categories.forEach((cat, index) => {
            const num = numEmojis[index] || `•`;
            const duration = cat.durationMinutes ? ` (${cat.durationMinutes} मिनट)` : '';
            replyText += `${num} *${cat.name}:* ₹${Number(cat.price)}${duration}\n`;
          });

          if (comboOffers && comboOffers.length > 0) {
            replyText += `\n🎁 *विशेष कॉम्बो ऑफर्स (Combo Offers):*\n`;
            comboOffers.forEach((combo) => {
              replyText += `🏷️ *${combo.name}:* ₹${Number(combo.discountedPrice)}\n`;
            });
          }

          replyText +=
            `\n📅 अभी स्लॉट बुक करें:\n` +
            `👉 https://kundlikendra.netlify.app\n\n` +
            `धन्यवाद! 🙏`;
        } else {
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
      } catch (dbErr: any) {
        this.logger.error(`Failed to fetch dynamic prices from DB: ${dbErr.message}`);
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
    }

    await this.sendMetaWhatsAppMessage(from, replyText, phoneId);
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

  /**
   * Sends automated WhatsApp booking confirmation to the Client/Customer
   */
  async sendCustomerBookingConfirmation(booking: any): Promise<boolean> {
    const customerPhone = booking.user?.phone;
    if (!customerPhone) {
      this.logger.warn(`Cannot send WhatsApp confirmation: No customer phone found for booking ${booking.id}`);
      return false;
    }

    const consultationTitle =
      booking.category?.name ||
      (booking.comboOffer ? `${booking.comboOffer.name} (Combo Offer)` : 'Astro Consultation');

    const formattedDate = dayjs(booking.bookingDate).format('DD MMM YYYY');
    const customerName = booking.user?.name || booking.birthProfile?.profileName || 'प्रिय ग्राहक';
    const profileName = booking.birthProfile?.profileName || customerName;

    const messageText =
      `🙏 *नमस्कार ${customerName} जी!* ✨\n\n` +
      `Kundli Kendra में आपकी परामर्श बुकिंग सफलतापूर्वक दर्ज हो गई है। ✅\n\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `✨ *परामर्श:* ${consultationTitle}\n` +
      `📅 *दिनांक:* ${formattedDate}\n` +
      `⏰ *समय (स्लॉट):* ${booking.slotTime}\n` +
      `🕉️ *नाम:* ${profileName}\n` +
      `💰 *राशि:* ₹${booking.amount}\n` +
      `🆔 *Booking ID:* ${booking.id}\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `📞 हमारे ज्योतिषाचार्य निर्धारित समय पर आपसे संपर्क करेंगे।\n` +
      `किसी भी प्रश्न या सहायता के लिए WhatsApp/कॉल करें: +91 93171 17001\n\n` +
      `धन्यवाद! 🙏\n*Kundli Kendra Team*`;

    const sent = await this.sendMetaWhatsAppMessage(customerPhone, messageText);
    if (sent) {
      this.logger.log(`WhatsApp booking confirmation sent to client (${customerPhone}) for booking ${booking.id}`);
      return true;
    } else {
      this.logger.warn(`Failed to send WhatsApp booking confirmation to client (${customerPhone})`);
      return false;
    }
  }
}