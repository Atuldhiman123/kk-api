import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { MailService } from './modules/mail/mail.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly mailService: MailService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('test-email')
  async testEmail(@Query('to') to?: string) {
    const target = to || 'kundlikendra1998@gmail.com';
    return await this.mailService.sendDirectTestEmail(target);
  }
}
