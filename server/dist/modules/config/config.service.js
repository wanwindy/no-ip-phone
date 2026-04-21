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
};
exports.AppConfigService = AppConfigService;
exports.AppConfigService = AppConfigService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(dial_prefix_config_entity_1.DialPrefixConfigEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(notice_entity_1.NoticeEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], AppConfigService);
