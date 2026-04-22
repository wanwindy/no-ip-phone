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
exports.AdminConfigController = void 0;
const common_1 = require("@nestjs/common");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const config_service_1 = require("../config/config.service");
const create_dial_prefix_dto_1 = require("./dto/create-dial-prefix.dto");
const create_notice_dto_1 = require("./dto/create-notice.dto");
const update_dial_prefix_dto_1 = require("./dto/update-dial-prefix.dto");
const update_notice_dto_1 = require("./dto/update-notice.dto");
const admin_jwt_auth_guard_1 = require("./guards/admin-jwt-auth.guard");
let AdminConfigController = class AdminConfigController {
    configService;
    constructor(configService) {
        this.configService = configService;
    }
    async getDialPrefixes(countryCode) {
        return this.configService.listDialPrefixes(countryCode?.trim().toUpperCase());
    }
    async createDialPrefix(body) {
        return this.configService.createDialPrefix(body);
    }
    async updateDialPrefix(id, body) {
        return this.configService.updateDialPrefix(id, body);
    }
    async getNotices() {
        return this.configService.listNotices();
    }
    async createNotice(body) {
        return this.configService.createNotice(body);
    }
    async updateNotice(id, body) {
        return this.configService.updateNotice(id, body);
    }
};
exports.AdminConfigController = AdminConfigController;
__decorate([
    (0, common_1.Get)('dial-prefixes'),
    __param(0, (0, common_1.Query)('countryCode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminConfigController.prototype, "getDialPrefixes", null);
__decorate([
    (0, common_1.Post)('dial-prefixes'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_dial_prefix_dto_1.CreateDialPrefixDto]),
    __metadata("design:returntype", Promise)
], AdminConfigController.prototype, "createDialPrefix", null);
__decorate([
    (0, common_1.Patch)('dial-prefixes/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_dial_prefix_dto_1.UpdateDialPrefixDto]),
    __metadata("design:returntype", Promise)
], AdminConfigController.prototype, "updateDialPrefix", null);
__decorate([
    (0, common_1.Get)('notices'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminConfigController.prototype, "getNotices", null);
__decorate([
    (0, common_1.Post)('notices'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_notice_dto_1.CreateNoticeDto]),
    __metadata("design:returntype", Promise)
], AdminConfigController.prototype, "createNotice", null);
__decorate([
    (0, common_1.Patch)('notices/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_notice_dto_1.UpdateNoticeDto]),
    __metadata("design:returntype", Promise)
], AdminConfigController.prototype, "updateNotice", null);
exports.AdminConfigController = AdminConfigController = __decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    (0, common_1.Controller)('admin/config'),
    __metadata("design:paramtypes", [config_service_1.AppConfigService])
], AdminConfigController);
