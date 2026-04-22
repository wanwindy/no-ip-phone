import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorCode } from '../../common/constants/error-codes';
import { AppException } from '../../common/exceptions/app.exception';
import {
  DialPrefixConfigEntity,
  DialPrefixStatus,
} from './entities/dial-prefix-config.entity';
import {
  NoticeEntity,
  NoticeStatus,
  NoticeType,
} from './entities/notice.entity';

export interface DialPrefixResponse {
  id: string;
  countryCode: string;
  carrierName: string;
  prefix: string;
  remark: string | null;
  priority: number;
}

export interface NoticeResponse {
  id: string;
  title: string;
  content: string;
  type: string;
}

export interface AdminDialPrefixResponse extends DialPrefixResponse {
  status: DialPrefixStatus;
  updatedAt: string;
  createdAt: string;
}

export interface AdminNoticeResponse extends NoticeResponse {
  status: NoticeStatus;
  startAt: string | null;
  endAt: string | null;
  createdAt: string;
}

export interface UpsertDialPrefixInput {
  countryCode: string;
  carrierName: string;
  prefix: string;
  priority?: number;
  status?: DialPrefixStatus;
  remark?: string | null;
}

export interface UpdateDialPrefixInput {
  carrierName?: string;
  prefix?: string;
  priority?: number;
  status?: DialPrefixStatus;
  remark?: string | null;
}

export interface CreateNoticeInput {
  title: string;
  content: string;
  type?: NoticeEntity['type'];
  status?: NoticeStatus;
  startAt?: string | null;
  endAt?: string | null;
}

export interface UpdateNoticeInput {
  title?: string;
  content?: string;
  type?: NoticeEntity['type'];
  status?: NoticeStatus;
  startAt?: string | null;
  endAt?: string | null;
}

@Injectable()
export class AppConfigService {
  constructor(
    @InjectRepository(DialPrefixConfigEntity)
    private readonly dialPrefixRepository: Repository<DialPrefixConfigEntity>,
    @InjectRepository(NoticeEntity)
    private readonly noticeRepository: Repository<NoticeEntity>,
  ) {}

  async getActiveDialPrefixes(
    countryCode = 'CN',
  ): Promise<DialPrefixResponse[]> {
    const rows = await this.dialPrefixRepository.find({
      where: {
        countryCode,
        status: DialPrefixStatus.Active,
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

  async getActiveNotices(): Promise<NoticeResponse[]> {
    const now = new Date();
    const rows = await this.noticeRepository
      .createQueryBuilder('notice')
      .where('notice.status = :status', { status: NoticeStatus.Active })
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

  async listDialPrefixes(countryCode?: string): Promise<AdminDialPrefixResponse[]> {
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

  async createDialPrefix(input: UpsertDialPrefixInput): Promise<AdminDialPrefixResponse> {
    const entity = await this.dialPrefixRepository.save(
      this.dialPrefixRepository.create({
        countryCode: input.countryCode.trim().toUpperCase(),
        carrierName: input.carrierName.trim() || '*',
        prefix: input.prefix.trim(),
        priority: input.priority ?? 0,
        status: input.status ?? DialPrefixStatus.Active,
        remark: input.remark?.trim() || null,
      }),
    );

    return this.toAdminDialPrefix(entity);
  }

  async updateDialPrefix(
    id: string,
    input: UpdateDialPrefixInput,
  ): Promise<AdminDialPrefixResponse> {
    const entity = await this.dialPrefixRepository.findOne({ where: { id } });
    if (!entity) {
      throw new AppException(
        ErrorCode.INTERNAL_ERROR,
        '前缀配置不存在',
        404,
      );
    }

    entity.carrierName = input.carrierName?.trim() || entity.carrierName;
    entity.prefix = input.prefix?.trim() || entity.prefix;
    entity.priority = input.priority ?? entity.priority;
    entity.status = input.status ?? entity.status;
    entity.remark = input.remark === undefined ? entity.remark : input.remark?.trim() || null;

    return this.toAdminDialPrefix(await this.dialPrefixRepository.save(entity));
  }

  async listNotices(): Promise<AdminNoticeResponse[]> {
    const rows = await this.noticeRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });

    return rows.map((item) => this.toAdminNotice(item));
  }

  async createNotice(input: CreateNoticeInput): Promise<AdminNoticeResponse> {
    const entity = await this.noticeRepository.save(
      this.noticeRepository.create({
        title: input.title.trim(),
        content: input.content.trim(),
        type: input.type ?? NoticeType.Info,
        status: input.status ?? NoticeStatus.Active,
        startAt: this.parseDate(input.startAt),
        endAt: this.parseDate(input.endAt),
      }),
    );

    return this.toAdminNotice(entity);
  }

  async updateNotice(id: string, input: UpdateNoticeInput): Promise<AdminNoticeResponse> {
    const entity = await this.noticeRepository.findOne({ where: { id } });
    if (!entity) {
      throw new AppException(
        ErrorCode.INTERNAL_ERROR,
        '公告不存在',
        404,
      );
    }

    entity.title = input.title?.trim() || entity.title;
    entity.content = input.content?.trim() || entity.content;
    entity.type = input.type ?? entity.type;
    entity.status = input.status ?? entity.status;
    entity.startAt = input.startAt === undefined ? entity.startAt : this.parseDate(input.startAt);
    entity.endAt = input.endAt === undefined ? entity.endAt : this.parseDate(input.endAt);

    return this.toAdminNotice(await this.noticeRepository.save(entity));
  }

  private toAdminDialPrefix(entity: DialPrefixConfigEntity): AdminDialPrefixResponse {
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

  private toAdminNotice(entity: NoticeEntity): AdminNoticeResponse {
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

  private parseDate(value?: string | null): Date | null {
    if (value == null || value.trim().length == 0) {
      return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
}
