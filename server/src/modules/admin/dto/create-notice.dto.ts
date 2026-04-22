import { IsEnum, IsOptional, IsString } from 'class-validator';
import { NoticeStatus, NoticeType } from '../../config/entities/notice.entity';

export class CreateNoticeDto {
  @IsString()
  title!: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsEnum(NoticeType)
  type?: NoticeType;

  @IsOptional()
  @IsEnum(NoticeStatus)
  status?: NoticeStatus;

  @IsOptional()
  @IsString()
  startAt?: string | null;

  @IsOptional()
  @IsString()
  endAt?: string | null;
}
