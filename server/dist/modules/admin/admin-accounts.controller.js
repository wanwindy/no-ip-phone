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
exports.AdminAccountsController = void 0;
const common_1 = require("@nestjs/common");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const account_service_1 = require("../account/account.service");
const account_entity_1 = require("../account/entities/account.entity");
const create_managed_account_dto_1 = require("./dto/create-managed-account.dto");
const update_managed_account_dto_1 = require("./dto/update-managed-account.dto");
const admin_jwt_auth_guard_1 = require("./guards/admin-jwt-auth.guard");
let AdminAccountsController = class AdminAccountsController {
    accountService;
    constructor(accountService) {
        this.accountService = accountService;
    }
    async list() {
        return this.accountService.listAccounts(account_service_1.AccountRole.AppUser);
    }
    async create(body) {
        return this.accountService.createAccount({
            username: body.username,
            displayName: body.displayName,
            password: body.password,
            role: account_service_1.AccountRole.AppUser,
            status: body.status ?? account_entity_1.AccountStatus.Active,
        });
    }
    async update(accountId, body) {
        return this.accountService.updateAccount(accountId, {
            displayName: body.displayName,
            password: body.password,
            status: body.status,
        });
    }
};
exports.AdminAccountsController = AdminAccountsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminAccountsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_managed_account_dto_1.CreateManagedAccountDto]),
    __metadata("design:returntype", Promise)
], AdminAccountsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':accountId'),
    __param(0, (0, common_1.Param)('accountId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_managed_account_dto_1.UpdateManagedAccountDto]),
    __metadata("design:returntype", Promise)
], AdminAccountsController.prototype, "update", null);
exports.AdminAccountsController = AdminAccountsController = __decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    (0, common_1.Controller)('admin/accounts'),
    __metadata("design:paramtypes", [account_service_1.AccountService])
], AdminAccountsController);
