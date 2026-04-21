"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const app_exception_1 = require("../exceptions/app.exception");
const error_codes_1 = require("../constants/error-codes");
let HttpExceptionFilter = class HttpExceptionFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const payload = this.toPayload(exception);
        response.status(payload.status).json({
            code: payload.code,
            message: payload.message,
            data: null,
        });
    }
    toPayload(exception) {
        if (exception instanceof app_exception_1.AppException) {
            return {
                status: exception.getStatus(),
                code: exception.code,
                message: exception.message,
            };
        }
        if (exception instanceof common_1.UnauthorizedException) {
            return {
                status: common_1.HttpStatus.UNAUTHORIZED,
                code: error_codes_1.ErrorCode.ACCESS_TOKEN_INVALID,
                message: 'Access Token 无效或已过期',
            };
        }
        if (exception instanceof common_1.ForbiddenException) {
            return {
                status: common_1.HttpStatus.FORBIDDEN,
                code: error_codes_1.ErrorCode.ACCOUNT_BANNED,
                message: '账户已被封禁',
            };
        }
        if (exception instanceof common_1.BadRequestException) {
            const message = this.extractMessage(exception);
            const normalized = message.toLowerCase();
            if (normalized.includes('code')) {
                return {
                    status: common_1.HttpStatus.BAD_REQUEST,
                    code: error_codes_1.ErrorCode.CODE_INVALID,
                    message: '验证码格式错误',
                };
            }
            return {
                status: common_1.HttpStatus.BAD_REQUEST,
                code: error_codes_1.ErrorCode.PHONE_INVALID,
                message: '手机号格式不正确',
            };
        }
        if (exception instanceof common_1.HttpException) {
            const message = this.extractMessage(exception);
            if (exception.getStatus() === common_1.HttpStatus.TOO_MANY_REQUESTS) {
                if (message.includes('30 分钟')) {
                    return {
                        status: common_1.HttpStatus.TOO_MANY_REQUESTS,
                        code: error_codes_1.ErrorCode.CODE_FAILED_TOO_MANY,
                        message,
                    };
                }
                if (message.includes('请求过于频繁')) {
                    return {
                        status: common_1.HttpStatus.TOO_MANY_REQUESTS,
                        code: error_codes_1.ErrorCode.IP_TOO_FREQUENT,
                        message,
                    };
                }
                return {
                    status: common_1.HttpStatus.TOO_MANY_REQUESTS,
                    code: error_codes_1.ErrorCode.SMS_SEND_TOO_FREQUENT,
                    message,
                };
            }
            return {
                status: exception.getStatus(),
                code: error_codes_1.ErrorCode.INTERNAL_ERROR,
                message,
            };
        }
        return {
            status: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
            code: error_codes_1.ErrorCode.INTERNAL_ERROR,
            message: '服务内部错误',
        };
    }
    extractMessage(exception) {
        const response = exception.getResponse();
        if (typeof response === 'string') {
            return response;
        }
        if (response && typeof response === 'object') {
            const message = response.message;
            if (Array.isArray(message)) {
                return message.join(', ');
            }
            if (typeof message === 'string') {
                return message;
            }
        }
        return exception.message;
    }
};
exports.HttpExceptionFilter = HttpExceptionFilter;
exports.HttpExceptionFilter = HttpExceptionFilter = __decorate([
    (0, common_1.Catch)()
], HttpExceptionFilter);
