import { IsString, Matches } from 'class-validator';

export class LoginDto {
  @IsString()
  phone!: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'code must be a 6 digit string' })
  code!: string;

  @IsString()
  deviceId!: string;
}
