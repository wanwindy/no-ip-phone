"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModule = void 0;
const common_1 = require("@nestjs/common");
const account_module_1 = require("../account/account.module");
const auth_module_1 = require("../auth/auth.module");
const admin_accounts_controller_1 = require("./admin-accounts.controller");
const admin_auth_controller_1 = require("./admin-auth.controller");
const admin_config_controller_1 = require("./admin-config.controller");
const admin_jwt_auth_guard_1 = require("./guards/admin-jwt-auth.guard");
const admin_jwt_strategy_1 = require("./strategies/admin-jwt.strategy");
const config_module_1 = require("../config/config.module");
let AdminModule = class AdminModule {
};
exports.AdminModule = AdminModule;
exports.AdminModule = AdminModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule, account_module_1.AccountModule, config_module_1.ConfigAppModule],
        controllers: [admin_auth_controller_1.AdminAuthController, admin_accounts_controller_1.AdminAccountsController, admin_config_controller_1.AdminConfigController],
        providers: [admin_jwt_strategy_1.AdminJwtStrategy, admin_jwt_auth_guard_1.AdminJwtAuthGuard],
    })
], AdminModule);
