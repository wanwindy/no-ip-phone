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
exports.NoticeEntity = exports.NoticeType = exports.NoticeStatus = void 0;
const typeorm_1 = require("typeorm");
var NoticeStatus;
(function (NoticeStatus) {
    NoticeStatus["Active"] = "active";
    NoticeStatus["Disabled"] = "disabled";
})(NoticeStatus || (exports.NoticeStatus = NoticeStatus = {}));
var NoticeType;
(function (NoticeType) {
    NoticeType["Info"] = "info";
    NoticeType["Warning"] = "warning";
    NoticeType["Urgent"] = "urgent";
})(NoticeType || (exports.NoticeType = NoticeType = {}));
let NoticeEntity = class NoticeEntity {
    id;
    title;
    content;
    type;
    status;
    startAt;
    endAt;
    createdAt;
};
exports.NoticeEntity = NoticeEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid', { name: 'id' }),
    __metadata("design:type", String)
], NoticeEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'title', type: 'varchar', length: 200 }),
    __metadata("design:type", String)
], NoticeEntity.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'content', type: 'text' }),
    __metadata("design:type", String)
], NoticeEntity.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'type',
        type: 'varchar',
        length: 20,
        default: NoticeType.Info,
    }),
    __metadata("design:type", String)
], NoticeEntity.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'status',
        type: 'varchar',
        length: 20,
        default: NoticeStatus.Active,
    }),
    __metadata("design:type", String)
], NoticeEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'start_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], NoticeEntity.prototype, "startAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'end_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], NoticeEntity.prototype, "endAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], NoticeEntity.prototype, "createdAt", void 0);
exports.NoticeEntity = NoticeEntity = __decorate([
    (0, typeorm_1.Entity)('notices'),
    (0, typeorm_1.Index)('idx_notices_active', ['status', 'startAt', 'endAt'])
], NoticeEntity);
