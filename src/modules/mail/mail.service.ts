import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import dayjs from 'dayjs';
import * as dns from 'dns';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private cachedIpv4Host: string = 'smtp.gmail.com';

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
  }

  private async getIPv4Host(): Promise<string> {
    try {
      const res = await dns.promises.lookup('smtp.gmail.com', { family: 4 });
      if (res?.address) {
        this.cachedIpv4Host = res.address;
        return res.address;
      }
    } catch (err: any) {
      this.logger.warn(`IPv4 DNS lookup warning: ${err.message}`);
    }
    return this.cachedIpv4Host || 'smtp.gmail.com';
  }

  public async getTransporter(): Promise<nodemailer.Transporter | null> {
    const user = this.configService.get<string>('SMTP_USER')?.trim();
    const rawPass = this.configService.get<string>('SMTP_PASS') || '';
    const pass = rawPass.replace(/['"]+/g, '').replace(/\s+/g, '').trim();

    if (!user || !pass) {
      return null;
    }

    const hostIp = await this.getIPv4Host();

    this.transporter = nodemailer.createTransport({
      host: hostIp,
      port: 587,
      secure: false,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false,
        servername: 'smtp.gmail.com',
      },
      connectionTimeout: 10000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
    });

    return this.transporter;
  }

  public initializeTransporter() {
    this.getTransporter().catch(() => {});
  }

  private getFromHeader(): string {
    const user = this.configService.get<string>('SMTP_USER') || 'kundlikendra1998@gmail.com';
    return `"Kundli Kendra" <${user}>`;
  }

  private getAdminEmail(): string {
    return (
      this.configService.get<string>('ADMIN_NOTIFICATION_EMAIL') ||
      this.configService.get<string>('SMTP_USER') ||
      'kundlikendra1998@gmail.com'
    );
  }

  /**
   * Sends email via Brevo (Sendinblue) HTTPS API (300 Free emails/day to ANY email address)
   */
  private async sendViaBrevo(options: { to: string; subject: string; html: string }): Promise<boolean> {
    const apiKey = this.configService.get<string>('BREVO_API_KEY')?.trim();
    if (!apiKey) return false;

    try {
      const senderEmail = this.configService.get<string>('SMTP_USER') || 'kundlikendra1998@gmail.com';
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'Kundli Kendra', email: senderEmail },
          to: [{ email: options.to }],
          subject: options.subject,
          htmlContent: options.html,
        }),
      });

      const data = await res.json();
      if (res.ok && data?.messageId) {
        this.logger.log(`Email successfully sent via Brevo to ${options.to}: ${data.messageId}`);
        return true;
      } else {
        this.logger.error(`Brevo API error: ${JSON.stringify(data)}`);
        return false;
      }
    } catch (err: any) {
      this.logger.error(`Failed to send via Brevo API: ${err.message}`);
      return false;
    }
  }

  /**
   * Sends email via Resend HTTPS API
   */
  private async sendViaResend(options: { to: string; subject: string; html: string }): Promise<boolean> {
    const apiKey = this.configService.get<string>('RESEND_API_KEY')?.trim();
    if (!apiKey) return false;

    try {
      const fromEmail = this.configService.get<string>('RESEND_FROM') || 'Kundli Kendra <onboarding@resend.dev>';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [options.to],
          subject: options.subject,
          html: options.html,
        }),
      });

      const data = await res.json();
      if (res.ok && data?.id) {
        this.logger.log(`Email successfully delivered via Resend API to ${options.to}: ${data.id}`);
        return true;
      } else {
        this.logger.warn(`Resend API response (Sandbox mode restricts external emails): ${JSON.stringify(data)}`);
        return false;
      }
    } catch (err: any) {
      this.logger.error(`Failed to send via Resend API: ${err.message}`);
      return false;
    }
  }

  /**
   * Universal email dispatcher supporting Brevo, Resend, and Direct IPv4 SMTP
   */
  private async sendMail(options: { to: string; subject: string; html: string }) {
    // 1. Try Brevo HTTPS API (Sends to ANY customer email + admin without domain requirement)
    const brevoSent = await this.sendViaBrevo(options);
    if (brevoSent) return;

    // 2. Try Resend HTTPS API
    const resendSent = await this.sendViaResend(options);
    if (resendSent) return;

    // 3. Fallback to Direct IPv4 SMTP
    const transporter = await this.getTransporter();
    if (!transporter) {
      this.logger.log(
        `[Mail Simulation] To: ${options.to} | Subject: ${options.subject}`,
      );
      return;
    }

    try {
      const info = await transporter.sendMail({
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

  /**
   * Diagnostic test email endpoint to test live email on Render
   */
  async sendDirectTestEmail(toEmail: string): Promise<{ success: boolean; messageId?: string; error?: string; config: any }> {
    const brevoKey = this.configService.get<string>('BREVO_API_KEY');
    const resendKey = this.configService.get<string>('RESEND_API_KEY');
    const user = this.configService.get<string>('SMTP_USER');

    const configSummary = {
      brevoConfigured: Boolean(brevoKey),
      resendConfigured: Boolean(resendKey),
      smtpUser: user || 'NOT_SET',
      adminEmail: this.getAdminEmail(),
    };

    const testHtml = `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #fed7aa; border-radius: 12px; background: #fffaf5;">
        <h2 style="color: #ea580c;">🕉️ Kundli Kendra Email System Test</h2>
        <p>Congratulations! Your email system is working smoothly.</p>
        <p><strong>Recipient:</strong> ${toEmail}</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
      </div>
    `;

    // 1. Brevo
    if (brevoKey) {
      const brevoSent = await this.sendViaBrevo({
        to: toEmail,
        subject: '🧪 Kundli Kendra - Live Test Email (Brevo HTTPS)',
        html: testHtml,
      });
      if (brevoSent) {
        return { success: true, messageId: 'DELIVERED_VIA_BREVO_HTTPS', config: configSummary };
      }
    }

    // 2. Resend
    if (resendKey) {
      const resendSent = await this.sendViaResend({
        to: toEmail,
        subject: '🧪 Kundli Kendra - Live Test Email (Resend HTTPS)',
        html: testHtml,
      });
      if (resendSent) {
        return { success: true, messageId: 'DELIVERED_VIA_RESEND_HTTPS', config: configSummary };
      }
    }

    // 3. SMTP
    const transporter = await this.getTransporter();
    if (!transporter) {
      return {
        success: false,
        error: 'No email service configured (BREVO_API_KEY, RESEND_API_KEY, or SMTP missing).',
        config: configSummary,
      };
    }

    try {
      const info = await transporter.sendMail({
        from: this.getFromHeader(),
        to: toEmail,
        subject: '🧪 Kundli Kendra - SMTP Live Test Email',
        html: testHtml,
      });

      this.logger.log(`Test email successfully sent to ${toEmail}: ${info.messageId}`);
      return { success: true, messageId: info.messageId, config: configSummary };
    } catch (err: any) {
      this.logger.error(`Test email failed to ${toEmail}: ${err.message}`);
      return { success: false, error: err.message, config: configSummary };
    }
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
      (booking.comboOffer ? `${booking.comboOffer.name} (Combo Offer)` : 'Astro Consultation');

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
                <td class="label">कुंडली नाम (Profile)</td>
                <td class="value">${booking.birthProfile?.profileName || booking.user?.name}</td>
              </tr>
              <tr>
                <td class="label">जन्म विवरण</td>
                <td class="value">${formattedDob} (${booking.birthProfile?.timeOfBirth || 'Time N/A'})</td>
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
                <td class="value" style="color: #16a34a; font-weight: bold;">${booking.paymentStatus || 'Paid'} ✅</td>
              </tr>
            </table>

            <div class="note-box">
              📌 <strong>महत्वपूर्ण सूचना:</strong> कृपया परामर्श समय से 5 मिनट पहले तैयार रहें। ज्योतिषी आपसे फ़ोन/व्हाट्सएप पर संपर्क करेंगे।
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

    const customerPhone = booking.user?.phone || '';
    const cleanPhone = customerPhone.replace(/[^0-9]/g, '');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; padding: 20px; color: #334155; }
          .card { max-width: 600px; margin: auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .badge { display: inline-block; padding: 6px 12px; border-radius: 9999px; background: #ea580c; color: white; font-weight: bold; font-size: 13px; }
          .table { width: 100%; border-collapse: collapse; margin-top: 16px; background: #f8fafc; border-radius: 8px; overflow: hidden; }
          .table td { padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
          .bold { font-weight: bold; color: #0f172a; }
          .btn { display: inline-block; padding: 10px 18px; margin-top: 15px; border-radius: 8px; background: #25D366; color: white; text-decoration: none; font-weight: bold; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="card">
          <span class="badge">🔔 नई बुकिंग अलर्ट (New Booking Alert)</span>
          <h2 style="color: #0f172a; margin-top: 14px;">एक नई परामर्श बुकिंग प्राप्त हुई है!</h2>
          
          <table class="table">
            <tr><td><strong>Booking ID:</strong></td><td class="bold">${booking.id}</td></tr>
            <tr><td><strong>ग्राहक का नाम:</strong></td><td class="bold">${booking.user?.name}</td></tr>
            <tr><td><strong>फ़ोन नंबर:</strong></td><td class="bold"><a href="tel:${customerPhone}">${customerPhone}</a></td></tr>
            <tr><td><strong>ईमेल:</strong></td><td>${booking.user?.email || 'N/A'}</td></tr>
            <tr><td><strong>परामर्श:</strong></td><td class="bold" style="color: #ea580c;">${consultationTitle}</td></tr>
            <tr><td><strong>दिनांक व समय:</strong></td><td class="bold">${formattedDate} | ${booking.slotTime}</td></tr>
            <tr><td><strong>कुंडली नाम:</strong></td><td>${booking.birthProfile?.profileName || booking.user?.name}</td></tr>
            <tr><td><strong>जन्म तिथि:</strong></td><td>${formattedDob}</td></tr>
            <tr><td><strong>जन्म समय:</strong></td><td>${booking.birthProfile?.timeOfBirth || 'उपलब्ध नहीं'}</td></tr>
            <tr><td><strong>जन्म स्थान:</strong></td><td>${booking.birthProfile?.birthPlace || 'N/A'}</td></tr>
            <tr><td><strong>राशि:</strong></td><td class="bold" style="color: #16a34a;">₹${booking.amount} (${booking.paymentStatus || 'Paid'}) ✅</td></tr>
          </table>

          <div style="margin-top: 20px; text-align: center;">
            <a href="https://wa.me/91${cleanPhone}" class="btn" target="_blank">💬 WhatsApp पर ग्राहक से चैट करें</a>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendMail({
      to: adminEmail,
      subject: `🔔 New Booking Alert: ${booking.user?.name} - ${consultationTitle} (${formattedDate}, ${booking.slotTime})`,
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
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #bbf7d0; border-radius: 12px; background: #f0fdf4;">
        <h2 style="color: #16a34a; margin-top: 0;">✅ भुगतान सफल (Payment Confirmed)!</h2>
        <p>नमस्ते <strong>${booking.user?.name}</strong>,</p>
        <p>आपकी बुकिंग (ID: <strong>${booking.id}</strong>) के लिए <strong>₹${booking.amount}</strong> का भुगतान सफलतापूर्वक प्राप्त हो गया है।</p>
        <p><strong>परामर्श समय:</strong> ${formattedDate} को <strong>${booking.slotTime}</strong> बजे।</p>
        <p style="margin-top: 20px;">धन्यवाद,<br><strong>Kundli Kendra टीम</strong></p>
      </div>
    `;

    await this.sendMail({
      to: recipient,
      subject: `✅ Payment Received: ₹${booking.amount} - Kundli Kendra`,
      html: htmlContent,
    });
  }
}