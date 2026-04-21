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
exports.DialPrefixConfigEntity = exports.DialPrefixStatus = void 0;
const typeorm_1 = require("typeorm");
var DialPrefixStatus;
(function (DialPrefixStatus) {
    DialPrefixStatus["Active"] = "active";
    DialPrefixStatus["Disabled"] = "disabled";
})(DialPrefixStatus || (exports.DialPrefixStatus = DialPrefixStatus = {}));
let DialPrefixConfigEntity = class DialPrefixConfigEntity {
    id;
    countryCode;
    carrierName;
    prefix;
    status;
    priority;
    remark;
    createdAt;
    updatedAt;
};
exports.DialPrefixConfigEntity = DialPrefixConfigEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid', { name: 'id' }),
    __metadata("design:type", String)
], DialPrefixConfigEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'country_code',
        type: 'varchar',
        length: 10,
        default: 'CN',
    }),
    __metadata("design:type", String)
], DialPrefixConfigEntity.prototype, "countryCode", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'carrier_name',
        type: 'varchar',
        length: 50,
        default: '*',
    }),
    __metadata("design:type", String)
], DialPrefixConfigEntity.prototype, "carrierName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'prefix', type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], DialPrefixConfigEntity.prototype, "prefix", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'status',
        type: 'varchar',
        length: 20,
        default: DialPrefixStatus.Active,
    }),
    __metadata("design:type", String)
], DialPrefixConfigEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'priority', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], DialPrefixConfigEntity.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'remark', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], DialPrefixConfigEntity.prototype, "remark", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], DialPrefixConfigEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], DialPrefixConfigEntity.prototype, "updatedAt", void 0);
exports.DialPrefixConfigEntity = DialPrefixConfigEntity = __decorate([
    (0, typeorm_1.Entity)('dial_prefix_configs'),
    (0, typeorm_1.Index)('idx_dial_prefix_country_status', [
        'countryCode',
        'status',
        'priority',
    ])
], DialPrefixConfigEntity);
