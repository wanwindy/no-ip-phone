import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DialPrefixConfigEntity,
  DialPrefixStatus,
} from './entities/dial-prefix-config.entity';
import {
  NoticeEntity,
  NoticeStatus,
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
}
