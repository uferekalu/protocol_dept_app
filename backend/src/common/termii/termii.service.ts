import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface TermiiSendSmsResponse {
  code?: string;
  message?: string;
}

// Best-effort SMS sender — every failure mode (missing config, network error, a
// non-ok response from Termii) is caught and logged here, never thrown, because a
// notification going undelivered must never fail the business operation that
// triggered it (e.g. creating an Assignment).
@Injectable()
export class TermiiService {
  private readonly logger = new Logger(TermiiService.name);

  constructor(private configService: ConfigService) {}

  async sendSms(to: string, message: string): Promise<void> {
    const apiKey = this.configService.get<string>('termiiApiKey');
    if (!apiKey) {
      this.logger.warn('TERMII_API_KEY is not configured — skipping SMS send');
      return;
    }

    try {
      const response = await fetch(
        `${this.configService.get<string>('termiiBaseUrl')}/api/sms/send`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: apiKey,
            // Termii expects international format without a leading '+'
            // (e.g. "2348022223333"), but phone numbers are stored with one.
            to: to.replace(/^\+/, ''),
            from: this.configService.get<string>('termiiSenderId'),
            sms: message,
            type: 'plain',
            channel: this.configService.get<string>('termiiChannel'),
          }),
        },
      );

      const body = (await response.json()) as TermiiSendSmsResponse;
      if (!response.ok || body.code !== 'ok') {
        this.logger.error(`Termii SMS send failed: ${JSON.stringify(body)}`);
      }
    } catch (error) {
      this.logger.error(
        `Termii SMS send threw: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
