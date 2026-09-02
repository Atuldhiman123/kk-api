import { Controller, Get, Post, Query, Body, Res, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { WhatsappService } from './whatsapp.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('whatsapp')
@Controller(['api/whatsapp', 'whatsapp'])
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly whatsappService: WhatsappService,
  ) {}

  /**
   * 1. Meta Webhook Verification (Handshake GET request)
   */
  @Get('webhook')
  @ApiOperation({ summary: 'Meta Webhook Handshake Verification' })
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const configuredToken =
      this.configService.get<string>('WHATSAPP_VERIFY_TOKEN') ||
      'kundlikendra@123';

    const validTokens = [configuredToken, 'astrology_secret_123', 'kundlikendra@123'];

    if (mode === 'subscribe' && token && validTokens.includes(token)) {
      this.logger.log('Meta WhatsApp Webhook successfully verified');
      return res.status(HttpStatus.OK).send(challenge);
    }

    this.logger.warn(`Meta WhatsApp Webhook verification failed. Token received: ${token}`);
    return res.status(HttpStatus.FORBIDDEN).json({ error: 'Verification failed' });
  }

  /**
   * 2. Meta Incoming Webhook Events (Messages, Statuses)
   */
  @Post('webhook')
  @ApiOperation({ summary: 'Meta Webhook Event Handler' })
  async handleWebhook(@Body() body: any, @Res() res: Response) {
    try {
      this.logger.log(`Received WhatsApp webhook event: ${JSON.stringify(body)}`);

      const entry = body?.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];

      if (message && message.type === 'text') {
        const from = message.from;
        const text = message.text?.body || '';
        this.logger.log(`WhatsApp message from ${from}: ${text}`);

        // Auto-reply logic if Meta access token is configured
        await this.whatsappService.handleIncomingMessage(from, text);
      }

      // Meta requires a 200 OK fast response to acknowledge receipt
      return res.status(HttpStatus.OK).send('EVENT_RECEIVED');
    } catch (error: any) {
      this.logger.error(`Error processing WhatsApp webhook: ${error.message}`);
      return res.status(HttpStatus.OK).send('EVENT_RECEIVED');
    }
  }
}
