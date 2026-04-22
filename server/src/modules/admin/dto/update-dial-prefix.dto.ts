import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { DialPrefixStatus } from '../../config/entities/dial-prefix-config.entity';

export class UpdateDialPrefixDto {
  @IsOptional()
  @IsString()
  carrierName?: string;

  @IsOptional()
  @IsString()
  prefix?: string;

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsEnum(DialPrefixStatus)
  status?: DialPrefixStatus;

  @IsOptional()
  @IsString()
  remark?: string | null;
}
