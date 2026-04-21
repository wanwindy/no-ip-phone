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
exports.AuthCodeEntity = void 0;
const typeorm_1 = require("typeorm");
let AuthCodeEntity = class AuthCodeEntity {
    id;
    phone;
    codeHash;
    expiredAt;
    usedAt;
    sendIp;
    createdAt;
};
exports.AuthCodeEntity = AuthCodeEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid', { name: 'id' }),
    __metadata("design:type", String)
], AuthCodeEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'phone', type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], AuthCodeEntity.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'code_hash', type: 'varchar', length: 128 }),
    __metadata("design:type", String)
], AuthCodeEntity.prototype, "codeHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expired_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], AuthCodeEntity.prototype, "expiredAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'used_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], AuthCodeEntity.prototype, "usedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'send_ip', type: 'varchar', length: 45, nullable: true }),
    __metadata("design:type", Object)
], AuthCodeEntity.prototype, "sendIp", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], AuthCodeEntity.prototype, "createdAt", void 0);
exports.AuthCodeEntity = AuthCodeEntity = __decorate([
    (0, typeorm_1.Entity)('auth_codes'),
    (0, typeorm_1.Index)('idx_auth_codes_phone_created', ['phone', 'createdAt']),
    (0, typeorm_1.Index)('idx_auth_codes_expired', ['expiredAt'])
], AuthCodeEntity);
