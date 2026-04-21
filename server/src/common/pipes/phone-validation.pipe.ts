import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { AppException } from '../exceptions/app.exception';
import { ErrorCode } from '../constants/error-codes';

const PHONE_REGEXP = /^1[3-9]\d{9}$/;

@Injectable()
export class PhoneValidationPipe implements PipeTransform {
  transform(value: unknown) {
    if (value === null || value === undefined) {
      throw new BadRequestException('手机号格式不正确');
    }

    if (typeof value === 'string') {
      return this.normalize(value);
    }

    if (typeof value === 'object' && 'phone' in value) {
      const record = value as Record<string, unknown>;
      record.phone = this.normalize(record.phone);
      return record;
    }

    return value;
  }

  private normalize(input: unknown): string {
    if (typeof input !== 'string') {
      throw new AppException(
        ErrorCode.PHONE_INVALID,
        '手机号格式不正确',
        400,
      );
    }

    const normalized = input.replace(/[\s\-()（）]/g, '').trim();
    if (!PHONE_REGEXP.test(normalized)) {
      throw new AppException(
        ErrorCode.PHONE_INVALID,
        '手机号格式不正确',
        400,
      );
    }

    return normalized;
  }
}
