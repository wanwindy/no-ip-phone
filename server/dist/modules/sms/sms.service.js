"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SmsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const error_codes_1 = require("../../common/constants/error-codes");
const app_exception_1 = require("../../common/exceptions/app.exception");
const sms_constants_1 = require("./sms.constants");
class NoopSmsProvider {
    logger = new common_1.Logger(NoopSmsProvider.name);
    async send(phone, code) {
        this.logger.warn(`noop SMS provider used for ${phone}, code=${code}`);
    }
}
let SmsService = SmsService_1 = class SmsService {
    configService;
    logger = new common_1.Logger(SmsService_1.name);
    provider;
    constructor(configService) {
        this.configService = configService;
        const providerName = (0, sms_constants_1.resolveSmsProviderName)(this.configService.get('SMS_PROVIDER', sms_constants_1.SMS_PROVIDER_NOOP));
        const nodeEnv = this.configService
            .get('NODE_ENV', 'development')
            .trim()
            .toLowerCase();
        if (nodeEnv === 'production' && (0, sms_constants_1.isNoopSmsProvider)(providerName)) {
            throw new Error('SMS_PROVIDER=noop is not allowed in production. Configure a real SMS provider before startup.');
        }
        if (!(0, sms_constants_1.isImplementedSmsProvider)(providerName)) {
            throw new Error(`SMS provider "${providerName}" is not implemented in this build yet. Integrate the provider before enabling it.`);
        }
        this.provider = this.createProvider(providerName);
        this.logger.log(`SMS provider initialized: ${providerName}`);
    }
    async send(phone, code) {
        try {
            await this.provider.send(phone, code);
        }
        catch (error) {
            if (error instanceof app_exception_1.AppException) {
                throw error;
            }
            this.logger.error(`SMS provider send failed for ${phone}: ${error instanceof Error ? error.message : String(error)}`);
            throw new app_exception_1.AppException(error_codes_1.ErrorCode.SMS_SEND_FAILED, '短信发送失败，请稍后重试', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    createProvider(providerName) {
        switch (providerName) {
            case sms_constants_1.SMS_PROVIDER_NOOP:
                return new NoopSmsProvider();
            default:
                throw new Error(`SMS provider "${providerName}" is not implemented in this build yet.`);
        }
    }
};
exports.SmsService = SmsService;
exports.SmsService = SmsService = SmsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], SmsService);
