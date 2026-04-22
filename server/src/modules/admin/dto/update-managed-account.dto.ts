import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AccountStatus } from '../../account/entities/account.entity';

export class UpdateManagedAccountDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;
}
