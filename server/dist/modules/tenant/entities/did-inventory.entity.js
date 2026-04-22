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
exports.DidInventoryEntity = exports.DidInventoryStatus = void 0;
const typeorm_1 = require("typeorm");
var DidInventoryStatus;
(function (DidInventoryStatus) {
    DidInventoryStatus["Available"] = "available";
    DidInventoryStatus["Assigned"] = "assigned";
    DidInventoryStatus["Reserved"] = "reserved";
    DidInventoryStatus["Disabled"] = "disabled";
    DidInventoryStatus["Retired"] = "retired";
})(DidInventoryStatus || (exports.DidInventoryStatus = DidInventoryStatus = {}));
let DidInventoryEntity = class DidInventoryEntity {
    id;
    providerCode;
    phoneNumberE164;
    countryCode;
    areaCode;
    displayLabel;
    capabilities;
    status;
    monthlyCost;
    currency;
    metadata;
    purchasedAt;
    releasedAt;
    createdAt;
    updatedAt;
};
exports.DidInventoryEntity = DidInventoryEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid', { name: 'id' }),
    __metadata("design:type", String)
], DidInventoryEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'provider_code', type: 'varchar', length: 50 }),
    __metadata("design:type", String)
], DidInventoryEntity.prototype, "providerCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'phone_number_e164', type: 'varchar', length: 32 }),
    __metadata("design:type", String)
], DidInventoryEntity.prototype, "phoneNumberE164", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'country_code', type: 'varchar', length: 8 }),
    __metadata("design:type", String)
], DidInventoryEntity.prototype, "countryCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'area_code', type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", Object)
], DidInventoryEntity.prototype, "areaCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'display_label', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], DidInventoryEntity.prototype, "displayLabel", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'capabilities',
        type: 'jsonb',
        default: () => "'[]'::jsonb",
    }),
    __metadata("design:type", Array)
], DidInventoryEntity.prototype, "capabilities", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'status',
        type: 'varchar',
        length: 20,
        default: DidInventoryStatus.Available,
    }),
    __metadata("design:type", String)
], DidInventoryEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'monthly_cost',
        type: 'numeric',
        precision: 12,
        scale: 2,
        nullable: true,
    }),
    __metadata("design:type", Object)
], DidInventoryEntity.prototype, "monthlyCost", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'currency', type: 'varchar', length: 3, nullable: true }),
    __metadata("design:type", Object)
], DidInventoryEntity.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'metadata',
        type: 'jsonb',
        default: () => "'{}'::jsonb",
    }),
    __metadata("design:type", Object)
], DidInventoryEntity.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'purchased_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], DidInventoryEntity.prototype, "purchasedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'released_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], DidInventoryEntity.prototype, "releasedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], DidInventoryEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], DidInventoryEntity.prototype, "updatedAt", void 0);
exports.DidInventoryEntity = DidInventoryEntity = __decorate([
    (0, typeorm_1.Entity)('did_inventory'),
    (0, typeorm_1.Index)('uk_did_inventory_phone_number', ['phoneNumberE164'], { unique: true }),
    (0, typeorm_1.Index)('idx_did_inventory_country_status', ['countryCode', 'status']),
    (0, typeorm_1.Index)('idx_did_inventory_provider_status', ['providerCode', 'status'])
], DidInventoryEntity);
