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
exports.AccountEntity = exports.AccountStatus = exports.AccountRole = void 0;
const typeorm_1 = require("typeorm");
var AccountRole;
(function (AccountRole) {
    AccountRole["AppUser"] = "app_user";
    AccountRole["Admin"] = "admin";
})(AccountRole || (exports.AccountRole = AccountRole = {}));
var AccountStatus;
(function (AccountStatus) {
    AccountStatus["Active"] = "active";
    AccountStatus["Disabled"] = "disabled";
    AccountStatus["Banned"] = "banned";
})(AccountStatus || (exports.AccountStatus = AccountStatus = {}));
let AccountEntity = class AccountEntity {
    id;
    username;
    displayName;
    passwordHash;
    role;
    status;
    createdAt;
    lastLoginAt;
};
exports.AccountEntity = AccountEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid', { name: 'id' }),
    __metadata("design:type", String)
], AccountEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'username', type: 'varchar', length: 50 }),
    __metadata("design:type", String)
], AccountEntity.prototype, "username", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'display_name', type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], AccountEntity.prototype, "displayName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'password_hash', type: 'varchar', length: 128 }),
    __metadata("design:type", String)
], AccountEntity.prototype, "passwordHash", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'role',
        type: 'varchar',
        length: 20,
        default: AccountRole.AppUser,
    }),
    __metadata("design:type", String)
], AccountEntity.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'status',
        type: 'varchar',
        length: 20,
        default: AccountStatus.Active,
    }),
    __metadata("design:type", String)
], AccountEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], AccountEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_login_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], AccountEntity.prototype, "lastLoginAt", void 0);
exports.AccountEntity = AccountEntity = __decorate([
    (0, typeorm_1.Entity)('accounts'),
    (0, typeorm_1.Index)('uk_accounts_username', ['username'], { unique: true })
], AccountEntity);
