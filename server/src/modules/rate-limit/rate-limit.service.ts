import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { RATE_LIMIT_STORE } from './rate-limit.constants';
import { RateLimitStore } from './rate-limit.store';

@Injectable()
export class RateLimitService {
  private static readonly SEND_CODE_COOLDOWN_MS = 60_000;
  private static readonly SEND_CODE_HOURLY_LIMIT_MS = 3_600_000;
  private static readonly SEND_CODE_HOURLY_LIMIT = 5;
  private static readonly SEND_CODE_IP_LIMIT = 20;
  private static readonly LOGIN_FAILED_LIMIT_MS = 30 * 60_000;
  private static readonly LOGIN_FAILED_LIMIT = 5;

  constructor(
    @Inject(RATE_LIMIT_STORE)
    private readonly store: RateLimitStore,
  ) {}

  async checkSendCode(phone: string, ip: string): Promise<void> {
    const cooldownOk = await this.store.reserveOnce(
      `send-code:cooldown:${phone}`,
      RateLimitService.SEND_CODE_COOLDOWN_MS,
    );

    if (!cooldownOk) {
      throw new HttpException('请 60 秒后再试', HttpStatus.TOO_MANY_REQUESTS);
    }

    const phoneCount = await this.store.increment(
      `send-code:hourly:${phone}`,
      RateLimitService.SEND_CODE_HOURLY_LIMIT_MS,
    );

    if (phoneCount > RateLimitService.SEND_CODE_HOURLY_LIMIT) {
      throw new HttpException(
        '验证码发送次数已达上限，请 1 小时后再试',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const ipCount = await this.store.increment(
      `send-code:ip:${ip}`,
      RateLimitService.SEND_CODE_HOURLY_LIMIT_MS,
    );

    if (ipCount > RateLimitService.SEND_CODE_IP_LIMIT) {
      throw new HttpException('请求过于频繁', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  async recordFailedAttempt(phone: string): Promise<void> {
    const count = await this.store.increment(
      `login:failed:${phone}`,
      RateLimitService.LOGIN_FAILED_LIMIT_MS,
    );

    if (count >= RateLimitService.LOGIN_FAILED_LIMIT) {
      throw new HttpException('验证码错误次数过多，请 30 分钟后再试', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  async resetFailedAttempts(phone: string): Promise<void> {
    await this.store.delete(`login:failed:${phone}`);
  }
}
