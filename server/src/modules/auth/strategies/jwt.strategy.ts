import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { ErrorCode } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';
import { AccountRole } from '../../account/entities/account.entity';
import {
  TenantMemberEntity,
  TenantMemberRole,
  TenantMemberStatus,
} from '../../tenant/entities/tenant-member.entity';

const TENANT_SELECTION_HEADER = 'x-tenant-id';

export interface JwtPayload {
  sub: string;
  username: string;
  role: AccountRole;
  deviceId?: string;
}

export interface AuthenticatedAppUser {
  accountId: string;
  username: string;
  role: AccountRole;
  deviceId?: string;
  tenantId: string | null;
  tenantMemberId: string | null;
  tenantRole: TenantMemberRole | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(TenantMemberEntity)
    private readonly tenantMembersRepository: Repository<TenantMemberEntity>,
  ) {
    super({
      passReqToCallback: true,
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'replace-me'),
    });
  }

  async validate(
    request: Request,
    payload: JwtPayload,
  ): Promise<AuthenticatedAppUser> {
    if (payload.role !== AccountRole.AppUser) {
      throw new UnauthorizedException();
    }

    const tenantMembers = await this.tenantMembersRepository.find({
      where: {
        accountId: payload.sub,
        status: TenantMemberStatus.Active,
      },
      order: {
        joinedAt: 'ASC',
        createdAt: 'ASC',
      },
    });
    const requestedTenantId = this.extractTenantId(request);
    const tenantMember = requestedTenantId
      ? tenantMembers.find((item) => item.tenantId === requestedTenantId) ?? null
      : tenantMembers[0] ?? null;

    if (requestedTenantId && !tenantMember) {
      throw new AppException(
        ErrorCode.INTERNAL_ERROR,
        '当前账号不属于所选租户，无法在该租户上下文中继续操作',
        403,
      );
    }

    return {
      accountId: payload.sub,
      username: payload.username,
      role: payload.role,
      deviceId: payload.deviceId,
      tenantId: tenantMember?.tenantId ?? null,
      tenantMemberId: tenantMember?.id ?? null,
      tenantRole: tenantMember?.tenantRole ?? null,
    };
  }

  private extractTenantId(request: Request): string | null {
    const raw = request.headers[TENANT_SELECTION_HEADER];
    const value = Array.isArray(raw) ? raw[0] : raw;
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }
}
