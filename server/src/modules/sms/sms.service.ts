import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SmsProvider {
  send(phone: string, code: string): Promise<void>;
}

class NoopSmsProvider implements SmsProvider {
  private readonly logger = new Logger(NoopSmsProvider.name);

  async send(phone: string, code: string): Promise<void> {
    this.logger.warn(`noop SMS provider used for ${phone}, code=${code}`);
  }
}

@Injectable()
export class SmsService {
  private readonly provider: SmsProvider;

  constructor(private readonly configService: ConfigService) {
    const providerName = this.configService.get<string>('SMS_PROVIDER', 'noop');
    this.provider = providerName === 'noop' ? new NoopSmsProvider() : new NoopSmsProvider();
  }

  async send(phone: string, code: string): Promise<void> {
    await this.provider.send(phone, code);
  }
}
