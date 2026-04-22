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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelephonyController = void 0;
const common_1 = require("@nestjs/common");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const telephony_service_1 = require("./telephony.service");
let TelephonyController = class TelephonyController {
    telephonyService;
    constructor(telephonyService) {
        this.telephonyService = telephonyService;
    }
    async inboundCall(request, body, response) {
        await this.handle(response, () => this.telephonyService.handleInboundCall(request, body));
    }
    async callStatus(request, body, response) {
        await this.handle(response, () => this.telephonyService.handleCallStatus(request, body));
    }
    async recordingReady(request, body, response) {
        await this.handle(response, () => this.telephonyService.handleRecordingReady(request, body));
    }
    async handle(response, handler) {
        try {
            const payload = await handler();
            response.status(200).json(payload);
        }
        catch (error) {
            if (error instanceof telephony_service_1.TelephonyWebhookError) {
                response.status(error.status).json(error.body);
                return;
            }
            const fallback = {
                accepted: false,
                error_code: 'internal_error',
                retryable: true,
            };
            response.status(500).json(fallback);
        }
    }
};
exports.TelephonyController = TelephonyController;
__decorate([
    (0, common_1.Post)('inbound-call'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], TelephonyController.prototype, "inboundCall", null);
__decorate([
    (0, common_1.Post)('call-status'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], TelephonyController.prototype, "callStatus", null);
__decorate([
    (0, common_1.Post)('recording-ready'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], TelephonyController.prototype, "recordingReady", null);
exports.TelephonyController = TelephonyController = __decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Controller)('webhooks'),
    __metadata("design:paramtypes", [telephony_service_1.TelephonyService])
], TelephonyController);
