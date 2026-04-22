import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AccountRole } from '../../account/entities/account.entity';

interface AdminJwtPayload {
  sub: string;
  username: string;
  role: AccountRole;
  deviceId?: string;
}

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'ADMIN_JWT_SECRET',
        configService.get<string>('JWT_SECRET', 'replace-me'),
      ),
    });
  }

  validate(payload: AdminJwtPayload): {
    accountId: string;
    username: string;
    role: AccountRole;
    deviceId?: string;
  } {
    if (payload.role !== AccountRole.Admin) {
      throw new UnauthorizedException();
    }

    return {
      accountId: payload.sub,
      username: payload.username,
      role: payload.role,
      deviceId: payload.deviceId,
    };
  }
}
