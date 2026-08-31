import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import dayjs from 'dayjs';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const user = this.configService.get<string>('SMTP_USER')?.trim();
    const rawPass = this.configService.get<string>('SMTP_PASS') || '';
    const pass = rawPass.replace(/\s+/g, '').trim();
    const host = this.configService.get<string>('SMTP_HOST') || 'smtp.gmail.com';
    const port = Number(this.configService.get<number>('SMTP_PORT')) || 465;
    const secure = this.configService.get<string>('SMTP_SECURE') !== 'false';

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      });
      this.logger.log(`MailService initialized with SMTP host: ${host} (User: ${user})`);
    } else {
      this.logger.warn(
        'MailService: SMTP_USER or SMTP_PASS not set in .env. Automated emails will be logged only.',
      );
    }
  }

  private getFromHeader(): string {
    const user = this.configService.get<string>('SMTP_USER') || 'kundlikendra1998@gmail.com';
    return (
      this.configService.get<string>('SMTP_FROM') ||
      `"Kundli Kendra" <${user}>`
    );
  }

  private getAdminEmail(): string {
    return (
      this.configService.get<string>('ADMIN_NOTIFICATION_EMAIL') ||
      this.configService.get<string>('SMTP_USER') ||
      'kundlikendra1998@gmail.com'
    );
  }

  /**
   * Sends booking confirmation email to the client
   */
  async sendBookingConfirmation(booking: any) {
    const recipient = booking.user?.email;
    if (!recipient) {
      this.logger.log(`No client email provided for booking ${booking.id}. Skipping customer email.`);
      return;
    }

    const consultationTitle =
      booking.category?.name ||
      (booking.comboOffer ? `${booking.comboOffer.name} (Combo)` : 'Astro Consultation');

    const formattedDate = dayjs(booking.bookingDate).format('DD MMMM YYYY');
    const formattedDob = booking.birthProfile?.dob
      ? dayjs(booking.birthProfile.dob).format('DD MMM YYYY')
      : '-';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #FFFDF9; margin: 0; padding: 20px; color: #262626; }
          .card { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #fed7aa; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(234, 88, 12, 0.08); }
          .header { background: linear-gradient(135deg, #ea580c, #c2410c); padding: 30px 20px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
          .header p { margin: 8px 0 0; font-size: 14px; opacity: 0.9; }
          .content { padding: 25px; }
          .greeting { font-size: 16px; font-weight: 600; color: #431407; }
          .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; background: #fffaf5; border-radius: 8px; overflow: hidden; border: 1px solid #ffedd5; }
          .details-table td { padding: 12px 16px; border-bottom: 1px solid #ffedd5; font-size: 14px; }
          .details-table tr:last-child td { border-bottom: none; }
          .label { color: #78716c; font-weight: 500; width: 40%; }
          .value { color: #1c1917; font-weight: 600; text-align: right; }
          .highlight { color: #ea580c; font-weight: bold; }
          .note-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 4px; font-size: 13px; color: #92400e; margin-top: 20px; }
          .footer { background: #fcfbf9; padding: 20px; text-align: center; font-size: 12px; color: #a8a29e; border-top: 1px solid #f5f5f4; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1>🕉️ Kundli Kendra</h1>
            <p>परामर्श बुकिंग की पुष्टि (Booking Confirmation)</p>
          </div>
          <div class="content">
            <p class="greeting">नमस्ते ${booking.user?.name || 'Customer'},</p>
            <p>आपकी ज्योतिषीय परामर्श बुकिंग सफलतापूर्वक दर्ज कर ली गई है। हमारे ज्योतिषी तय समय पर आपसे संपर्क करेंगे।</p>
            
            <table class="details-table">
              <tr>
                <td class="label">Booking ID</td>
                <td class="value">${booking.id}</td>
              </tr>
              <tr>
                <td class="label">Consultation</td>
                <td class="value highlight">${consultationTitle}</td>
              </tr>
              <tr>
                <td class="label">दिनांक (Date)</td>
                <td class="value">${formattedDate}</td>
              </tr>
              <tr>
                <td class="label">समय (Slot)</td>
                <td class="value highlight">${booking.slotTime}</td>
              </tr>
              <tr>
                <td class="label">कुंडली विवरण (Profile)</td>
                <td class="value">${booking.birthProfile?.profileName || booking.user?.name} (DOB: ${formattedDob})</td>
              </tr>
              <tr>
                <td class="label">स्थान (Birth Place)</td>
                <td class="value">${booking.birthProfile?.birthPlace || '-'}</td>
              </tr>
              <tr>
                <td class="label">शुल्क (Amount)</td>
                <td class="value">₹${booking.amount}</td>
              </tr>
              <tr>
                <td class="label">भुगतान स्थिति (Status)</td>
                <td class="value">${booking.paymentStatus || 'Pending'}</td>
              </tr>
            </table>

            <div class="note-box">
              📌 <strong>महत्वपूर्ण सूचना:</strong> कृपया परामर्श समय से 5 मिनट पहले तैयार रहें।
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Kundli Kendra • Vedic Astrology Services</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendMail({
      to: recipient,
      subject: `🕉️ Booking Confirmed: ${consultationTitle} (${formattedDate}, ${booking.slotTime})`,
      html: htmlContent,
    });
  }

  /**
   * Sends instant booking notification alert to Admin / Astrologer
   */
  async sendAdminBookingAlert(booking: any) {
    const adminEmail = this.getAdminEmail();
    if (!adminEmail) {
      this.logger.warn('No admin email configured. Skipping admin booking alert.');
      return;
    }

    const consultationTitle =
      booking.category?.name ||
      (booking.comboOffer ? `${booking.comboOffer.name} (Combo)` : 'Astro Consultation');

    const formattedDate = dayjs(booking.bookingDate).format('DD MMMM YYYY');
    const formattedDob = booking.birthProfile?.dob
      ? dayjs(booking.birthProfile.dob).format('DD MMM YYYY')
      : '-';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: sans-serif; background-color: #f8fafc; padding: 20px; color: #334155; }
          .card { max-width: 600px; margin: auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; }
          .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; background: #ea580c; color: white; font-weight: bold; font-size: 12px; }
          .table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          .table td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
          .bold { font-weight: bold; color: #0f172a; }
        </style>
      </head>
      <body>
        <div class="card">
          <span class="badge">🔔 नई बुकिंग अलर्ट (New Booking Alert)</span>
          <h2 style="color: #0f172a; margin-top: 12px;">एक नई ज्योतिषीय परामर्श बुकिंग प्राप्त हुई है!</h2>
          
          <table class="table">
            <tr><td><strong>Booking ID:</strong></td><td class="bold">${booking.id}</td></tr>
            <tr><td><strong>ग्राहक का नाम:</strong></td><td class="bold">${booking.user?.name}</td></tr>
            <tr><td><strong>फ़ोन नंबर:</strong></td><td class="bold"><a href="tel:${booking.user?.phone}">${booking.user?.phone}</a> / <a href="https://wa.me/91${booking.user?.phone}">WhatsApp</a></td></tr>
            <tr><td><strong>ईमेल:</strong></td><td>${booking.user?.email || 'N/A'}</td></tr>
            <tr><td><strong>परामर्श:</strong></td><td class="bold" style="color: #ea580c;">${consultationTitle}</td></tr>
            <tr><td><strong>दिनांक व समय:</strong></td><td class="bold">${formattedDate} | ${booking.slotTime}</td></tr>
            <tr><td><strong>कुंडली नाम:</strong></td><td>${booking.birthProfile?.profileName}</td></tr>
            <tr><td><strong>जन्म तिथि व समय:</strong></td><td>${formattedDob} at ${booking.birthProfile?.timeOfBirth || 'Not specified'}</td></tr>
            <tr><td><strong>जन्म स्थान:</strong></td><td>${booking.birthProfile?.birthPlace || 'N/A'}</td></tr>
            <tr><td><strong>राशि / फीस:</strong></td><td class="bold">₹${booking.amount} (${booking.paymentStatus || 'Pending'})</td></tr>
          </table>
        </div>
      </body>
      </html>
    `;

    await this.sendMail({
      to: adminEmail,
      subject: `🔔 New Booking Alert: ${booking.user?.name} - ${consultationTitle} (${booking.slotTime})`,
      html: htmlContent,
    });
  }

  /**
   * Sends payment verified email to client
   */
  async sendPaymentSuccessNotification(booking: any) {
    const recipient = booking.user?.email;
    if (!recipient) return;

    const formattedDate = dayjs(booking.bookingDate).format('DD MMMM YYYY');

    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #bbf7d0; border-radius: 12px; background: #f0fdf4;">
        <h2 style="color: #16a34a; margin-top: 0;">✅ भुगतान सफल (Payment Confirmed)!</h2>
        <p>नमस्ते ${booking.user?.name}, आपकी बुकिंग <strong>${booking.id}</strong> के लिए भुगतान ₹${booking.amount} सफलतापूर्वक प्राप्त हो गया है।</p>
        <p><strong>परामर्श समय:</strong> ${formattedDate} को <strong>${booking.slotTime}</strong> बजे।</p>
        <p>धन्यवाद,<br><strong>Kundli Kendra</strong></p>
      </div>
    `;

    await this.sendMail({
      to: recipient,
      subject: `✅ Payment Confirmed for Booking #${booking.id} - Kundli Kendra`,
      html: htmlContent,
    });
  }

  private async sendMail(options: { to: string; subject: string; html: string }) {
    if (!this.transporter) {
      this.logger.log(
        `[Mail Simulation] To: ${options.to} | Subject: ${options.subject}`,
      );
      return;
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.getFromHeader(),
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      this.logger.log(`Email successfully sent to ${options.to}: ${info.messageId}`);
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${options.to}: ${error.message}`);
    }
  }
}