import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorCode } from '../../common/constants/error-codes';
import { AppException } from '../../common/exceptions/app.exception';
import {
  isImplementedSmsProvider,
  isNoopSmsProvider,
  resolveSmsProviderName,
  SMS_PROVIDER_NOOP,
} from './sms.constants';

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
  private readonly logger = new Logger(SmsService.name);
  private readonly provider: SmsProvider;

  constructor(private readonly configService: ConfigService) {
    const providerName = resolveSmsProviderName(
      this.configService.get<string>('SMS_PROVIDER', SMS_PROVIDER_NOOP),
    );
    const nodeEnv = this.configService
      .get<string>('NODE_ENV', 'development')
      .trim()
      .toLowerCase();

    if (nodeEnv === 'production' && isNoopSmsProvider(providerName)) {
      throw new Error(
        'SMS_PROVIDER=noop is not allowed in production. Configure a real SMS provider before startup.',
      );
    }

    if (!isImplementedSmsProvider(providerName)) {
      throw new Error(
        `SMS provider "${providerName}" is not implemented in this build yet. Integrate the provider before enabling it.`,
      );
    }

    this.provider = this.createProvider(providerName);
    this.logger.log(`SMS provider initialized: ${providerName}`);
  }

  async send(phone: string, code: string): Promise<void> {
    try {
      await this.provider.send(phone, code);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }

      this.logger.error(
        `SMS provider send failed for ${phone}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new AppException(
        ErrorCode.SMS_SEND_FAILED,
        '短信发送失败，请稍后重试',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private createProvider(providerName: string): SmsProvider {
    switch (providerName) {
      case SMS_PROVIDER_NOOP:
        return new NoopSmsProvider();
      default:
        throw new Error(
          `SMS provider "${providerName}" is not implemented in this build yet.`,
        );
    }
  }
}
