import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  ForbiddenException,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { AppException } from '../exceptions/app.exception';
import { ErrorCode } from '../constants/error-codes';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const payload = this.toPayload(exception);
    response.status(payload.status).json({
      code: payload.code,
      message: payload.message,
      data: null,
    });
  }

  private toPayload(exception: unknown): {
    status: number;
    code: ErrorCode;
    message: string;
  } {
    if (exception instanceof AppException) {
      return {
        status: exception.getStatus(),
        code: exception.code,
        message: exception.message,
      };
    }

    if (exception instanceof UnauthorizedException) {
      return {
        status: HttpStatus.UNAUTHORIZED,
        code: ErrorCode.ACCESS_TOKEN_INVALID,
        message: 'Access Token 无效或已过期',
      };
    }

    if (exception instanceof ForbiddenException) {
      return {
        status: HttpStatus.FORBIDDEN,
        code: ErrorCode.ACCOUNT_BANNED,
        message: '账户已被封禁',
      };
    }

    if (exception instanceof BadRequestException) {
      const message = this.extractMessage(exception);
      const normalized = message.toLowerCase();
      if (normalized.includes('code')) {
        return {
          status: HttpStatus.BAD_REQUEST,
          code: ErrorCode.CODE_INVALID,
          message: '验证码格式错误',
        };
      }

      return {
        status: HttpStatus.BAD_REQUEST,
        code: ErrorCode.PHONE_INVALID,
        message: '手机号格式不正确',
      };
    }

    if (exception instanceof HttpException) {
      const message = this.extractMessage(exception);
      if (exception.getStatus() === HttpStatus.TOO_MANY_REQUESTS) {
        if (message.includes('30 分钟')) {
          return {
            status: HttpStatus.TOO_MANY_REQUESTS,
            code: ErrorCode.CODE_FAILED_TOO_MANY,
            message,
          };
        }

        if (message.includes('请求过于频繁')) {
          return {
            status: HttpStatus.TOO_MANY_REQUESTS,
            code: ErrorCode.IP_TOO_FREQUENT,
            message,
          };
        }

        return {
          status: HttpStatus.TOO_MANY_REQUESTS,
          code: ErrorCode.SMS_SEND_TOO_FREQUENT,
          message,
        };
      }

      return {
        status: exception.getStatus(),
        code: ErrorCode.INTERNAL_ERROR,
        message,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: '服务内部错误',
    };
  }

  private extractMessage(exception: HttpException): string {
    const response = exception.getResponse();
    if (typeof response === 'string') {
      return response;
    }

    if (response && typeof response === 'object') {
      const message = (response as { message?: string | string[] }).message;
      if (Array.isArray(message)) {
        return message.join(', ');
      }
      if (typeof message === 'string') {
        return message;
      }
    }

    return exception.message;
  }
}
