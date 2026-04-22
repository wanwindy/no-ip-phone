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
exports.AppConfigService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const error_codes_1 = require("../../common/constants/error-codes");
const app_exception_1 = require("../../common/exceptions/app.exception");
const dial_prefix_config_entity_1 = require("./entities/dial-prefix-config.entity");
const notice_entity_1 = require("./entities/notice.entity");
let AppConfigService = class AppConfigService {
    dialPrefixRepository;
    noticeRepository;
    constructor(dialPrefixRepository, noticeRepository) {
        this.dialPrefixRepository = dialPrefixRepository;
        this.noticeRepository = noticeRepository;
    }
    async getActiveDialPrefixes(countryCode = 'CN') {
        const rows = await this.dialPrefixRepository.find({
            where: {
                countryCode,
                status: dial_prefix_config_entity_1.DialPrefixStatus.Active,
            },
            order: {
                priority: 'DESC',
                carrierName: 'ASC',
            },
        });
        if (rows.length === 0) {
            return [
                {
                    id: 'seed-cn-default',
                    countryCode: 'CN',
                    carrierName: '*',
                    prefix: '#31#',
                    remark: '中国通用 CLIR 前缀，GSM 标准',
                    priority: 100,
                },
            ];
        }
        return rows.map((item) => ({
            id: item.id,
            countryCode: item.countryCode,
            carrierName: item.carrierName,
            prefix: item.prefix,
            remark: item.remark,
            priority: item.priority,
        }));
    }
    async getActiveNotices() {
        const now = new Date();
        const rows = await this.noticeRepository
            .createQueryBuilder('notice')
            .where('notice.status = :status', { status: notice_entity_1.NoticeStatus.Active })
            .andWhere('(notice.start_at IS NULL OR notice.start_at <= :now)', {
            now,
        })
            .andWhere('(notice.end_at IS NULL OR notice.end_at >= :now)', { now })
            .orderBy('notice.created_at', 'DESC')
            .getMany();
        if (rows.length === 0) {
            return [
                {
                    id: 'seed-notice',
                    title: '功能说明',
                    content: '隐私拨打效果受运营商、地区和终端环境影响，实际结果可能不同。',
                    type: 'info',
                },
            ];
        }
        return rows.map((item) => ({
            id: item.id,
            title: item.title,
            content: item.content,
            type: item.type,
        }));
    }
    async listDialPrefixes(countryCode) {
        const rows = await this.dialPrefixRepository.find({
            where: countryCode ? { countryCode } : {},
            order: {
                countryCode: 'ASC',
                priority: 'DESC',
                carrierName: 'ASC',
            },
        });
        return rows.map((item) => ({
            id: item.id,
            countryCode: item.countryCode,
            carrierName: item.carrierName,
            prefix: item.prefix,
            remark: item.remark,
            priority: item.priority,
            status: item.status,
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
        }));
    }
    async createDialPrefix(input) {
        const entity = await this.dialPrefixRepository.save(this.dialPrefixRepository.create({
            countryCode: input.countryCode.trim().toUpperCase(),
            carrierName: input.carrierName.trim() || '*',
            prefix: input.prefix.trim(),
            priority: input.priority ?? 0,
            status: input.status ?? dial_prefix_config_entity_1.DialPrefixStatus.Active,
            remark: input.remark?.trim() || null,
        }));
        return this.toAdminDialPrefix(entity);
    }
    async updateDialPrefix(id, input) {
        const entity = await this.dialPrefixRepository.findOne({ where: { id } });
        if (!entity) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCode.INTERNAL_ERROR, '前缀配置不存在', 404);
        }
        entity.carrierName = input.carrierName?.trim() || entity.carrierName;
        entity.prefix = input.prefix?.trim() || entity.prefix;
        entity.priority = input.priority ?? entity.priority;
        entity.status = input.status ?? entity.status;
        entity.remark = input.remark === undefined ? entity.remark : input.remark?.trim() || null;
        return this.toAdminDialPrefix(await this.dialPrefixRepository.save(entity));
    }
    async listNotices() {
        const rows = await this.noticeRepository.find({
            order: {
                createdAt: 'DESC',
            },
        });
        return rows.map((item) => this.toAdminNotice(item));
    }
    async createNotice(input) {
        const entity = await this.noticeRepository.save(this.noticeRepository.create({
            title: input.title.trim(),
            content: input.content.trim(),
            type: input.type ?? notice_entity_1.NoticeType.Info,
            status: input.status ?? notice_entity_1.NoticeStatus.Active,
            startAt: this.parseDate(input.startAt),
            endAt: this.parseDate(input.endAt),
        }));
        return this.toAdminNotice(entity);
    }
    async updateNotice(id, input) {
        const entity = await this.noticeRepository.findOne({ where: { id } });
        if (!entity) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCode.INTERNAL_ERROR, '公告不存在', 404);
        }
        entity.title = input.title?.trim() || entity.title;
        entity.content = input.content?.trim() || entity.content;
        entity.type = input.type ?? entity.type;
        entity.status = input.status ?? entity.status;
        entity.startAt = input.startAt === undefined ? entity.startAt : this.parseDate(input.startAt);
        entity.endAt = input.endAt === undefined ? entity.endAt : this.parseDate(input.endAt);
        return this.toAdminNotice(await this.noticeRepository.save(entity));
    }
    toAdminDialPrefix(entity) {
        return {
            id: entity.id,
            countryCode: entity.countryCode,
            carrierName: entity.carrierName,
            prefix: entity.prefix,
            remark: entity.remark,
            priority: entity.priority,
            status: entity.status,
            createdAt: entity.createdAt.toISOString(),
            updatedAt: entity.updatedAt.toISOString(),
        };
    }
    toAdminNotice(entity) {
        return {
            id: entity.id,
            title: entity.title,
            content: entity.content,
            type: entity.type,
            status: entity.status,
            startAt: entity.startAt?.toISOString() ?? null,
            endAt: entity.endAt?.toISOString() ?? null,
            createdAt: entity.createdAt.toISOString(),
        };
    }
    parseDate(value) {
        if (value == null || value.trim().length == 0) {
            return null;
        }
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
};
exports.AppConfigService = AppConfigService;
exports.AppConfigService = AppConfigService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(dial_prefix_config_entity_1.DialPrefixConfigEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(notice_entity_1.NoticeEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], AppConfigService);
