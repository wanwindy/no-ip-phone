import { IsOptional, IsString } from 'class-validator';

export class DialPrefixQueryDto {
  @IsOptional()
  @IsString()
  countryCode?: string;
}
