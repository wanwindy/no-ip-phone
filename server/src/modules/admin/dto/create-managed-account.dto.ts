import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AccountStatus } from '../../account/entities/account.entity';

export class CreateManagedAccountDto {
  @IsString()
  username!: string;

  @IsString()
  displayName!: string;

  @IsString()
  password!: string;

  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;
}
