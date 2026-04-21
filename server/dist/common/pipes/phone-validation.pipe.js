"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhoneValidationPipe = void 0;
const common_1 = require("@nestjs/common");
const app_exception_1 = require("../exceptions/app.exception");
const error_codes_1 = require("../constants/error-codes");
const PHONE_REGEXP = /^1[3-9]\d{9}$/;
let PhoneValidationPipe = class PhoneValidationPipe {
    transform(value) {
        if (value === null || value === undefined) {
            throw new common_1.BadRequestException('手机号格式不正确');
        }
        if (typeof value === 'string') {
            return this.normalize(value);
        }
        if (typeof value === 'object' && 'phone' in value) {
            const record = value;
            record.phone = this.normalize(record.phone);
            return record;
        }
        return value;
    }
    normalize(input) {
        if (typeof input !== 'string') {
            throw new app_exception_1.AppException(error_codes_1.ErrorCode.PHONE_INVALID, '手机号格式不正确', 400);
        }
        const normalized = input.replace(/[\s\-()（）]/g, '').trim();
        if (!PHONE_REGEXP.test(normalized)) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCode.PHONE_INVALID, '手机号格式不正确', 400);
        }
        return normalized;
    }
};
exports.PhoneValidationPipe = PhoneValidationPipe;
exports.PhoneValidationPipe = PhoneValidationPipe = __decorate([
    (0, common_1.Injectable)()
], PhoneValidationPipe);
