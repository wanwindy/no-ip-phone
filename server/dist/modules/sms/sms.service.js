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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
class NoopSmsProvider {
    logger = new common_1.Logger(NoopSmsProvider.name);
    async send(phone, code) {
        this.logger.warn(`noop SMS provider used for ${phone}, code=${code}`);
    }
}
let SmsService = class SmsService {
    configService;
    provider;
    constructor(configService) {
        this.configService = configService;
        const providerName = this.configService.get('SMS_PROVIDER', 'noop');
        this.provider = providerName === 'noop' ? new NoopSmsProvider() : new NoopSmsProvider();
    }
    async send(phone, code) {
        await this.provider.send(phone, code);
    }
};
exports.SmsService = SmsService;
exports.SmsService = SmsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], SmsService);
