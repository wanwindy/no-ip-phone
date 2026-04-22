import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { ErrorCode } from '../../common/constants/error-codes';
import { AppException } from '../../common/exceptions/app.exception';
import {
  AccountProfile,
  AccountRole,
  AccountService,
} from '../account/account.service';
import { AccountRefreshTokenEntity } from '../account/entities/account-refresh-token.entity';
import { RateLimitService } from '../rate-limit/rate-limit.service';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly accountService: AccountService,
    private readonly rateLimitService: RateLimitService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(AccountRefreshTokenEntity)
    private readonly refreshTokensRepository: Repository<AccountRefreshTokenEntity>,
  ) {}

  async loginWithRole(
    username: string,
    password: string,
    deviceId: string,
    role: AccountRole,
  ): Promise<TokenPair> {
    const loginKey = username.trim().toLowerCase();
    try {
      const account = await this.accountService.validateCredentials(
        loginKey,
        password,
        role,
      );
      await this.accountService.touchLastLoginAt(account.id);
      await this.rateLimitService.resetFailedAttempts(loginKey);
      return this.issueTokens(account.id, account.username, deviceId, role);
    } catch (error) {
      if (
        error instanceof AppException &&
        error.code === ErrorCode.ACCOUNT_CREDENTIALS_INVALID
      ) {
        await this.rateLimitService.recordFailedAttempt(loginKey);
      }
      throw error;
    }
  }

  async refreshWithRole(
    refreshToken: string,
    deviceId: string,
    role: AccountRole,
  ): Promise<TokenPair> {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.refreshTokensRepository.findOne({
      where: { tokenHash, revokedAt: IsNull(), role },
      order: { createdAt: 'DESC' },
    });

    if (!stored || stored.expiredAt.getTime() < Date.now()) {
      throw new AppException(
        ErrorCode.REFRESH_TOKEN_INVALID,
        'Refresh Token 无效或已过期',
        401,
      );
    }

    if (stored.deviceId && stored.deviceId !== deviceId) {
      throw new AppException(
        ErrorCode.REFRESH_TOKEN_INVALID,
        'Refresh Token 无效或已过期',
        401,
      );
    }

    stored.revokedAt = new Date();
    await this.refreshTokensRepository.save(stored);

    const account = await this.accountService.findById(stored.accountId);
    if (!account) {
      throw new AppException(
        ErrorCode.REFRESH_TOKEN_INVALID,
        'Refresh Token 无效或已过期',
        401,
      );
    }

    if (account.status === 'disabled') {
      throw new AppException(ErrorCode.ACCOUNT_DISABLED, '账号已停用', 403);
    }

    if (account.status === 'banned') {
      throw new AppException(ErrorCode.ACCOUNT_BANNED, '账号已被封禁', 403);
    }

    return this.issueTokens(account.id, account.username, deviceId, role);
  }

  async logoutWithRole(
    accountId: string,
    refreshToken: string,
    role: AccountRole,
  ): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.refreshTokensRepository.findOne({
      where: { accountId, tokenHash, role, revokedAt: IsNull() },
    });

    if (!stored) {
      throw new AppException(
        ErrorCode.REFRESH_TOKEN_INVALID,
        'Refresh Token 无效或已过期',
        401,
      );
    }

    stored.revokedAt = new Date();
    await this.refreshTokensRepository.save(stored);
  }

  async me(accountId: string): Promise<AccountProfile> {
    const profile = await this.accountService.getProfile(accountId);
    if (!profile) {
      throw new UnauthorizedException();
    }

    return profile;
  }

  private async issueTokens(
    accountId: string,
    username: string,
    deviceId: string,
    role: AccountRole,
  ): Promise<TokenPair> {
    const expiresInText = this.resolveAccessExpires(role);
    const refreshDays = this.resolveRefreshDays(role);
    const accessToken = this.jwtService.sign(
      { sub: accountId, username, role, deviceId },
      {
        secret: this.resolveJwtSecret(role),
        expiresIn: expiresInText,
      },
    );

    const refreshToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(refreshToken);

    await this.refreshTokensRepository.save(
      this.refreshTokensRepository.create({
        accountId,
        role,
        tokenHash,
        deviceId,
        expiredAt: new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000),
        revokedAt: null,
      }),
    );

    const expiresIn = this.parseExpiresInSeconds(expiresInText);
    return { accessToken, refreshToken, expiresIn };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private resolveJwtSecret(role: AccountRole): string {
    if (role === AccountRole.Admin) {
      return this.configService.get<string>(
        'ADMIN_JWT_SECRET',
        this.configService.get<string>('JWT_SECRET', 'replace-me'),
      );
    }

    return this.configService.get<string>('JWT_SECRET', 'replace-me');
  }

  private resolveAccessExpires(role: AccountRole): string {
    if (role === AccountRole.Admin) {
      return this.configService.get<string>('ADMIN_JWT_ACCESS_EXPIRES', '2h');
    }

    return this.configService.get<string>('JWT_ACCESS_EXPIRES', '2h');
  }

  private resolveRefreshDays(role: AccountRole): number {
    if (role === AccountRole.Admin) {
      return Number(
        this.configService.get<string>('ADMIN_JWT_REFRESH_DAYS', '30'),
      );
    }

    return Number(this.configService.get<string>('JWT_REFRESH_DAYS', '30'));
  }

  private parseExpiresInSeconds(value: string): number {
    if (value.endsWith('h')) {
      return Number(value.slice(0, -1)) * 60 * 60;
    }

    if (value.endsWith('m')) {
      return Number(value.slice(0, -1)) * 60;
    }

    if (value.endsWith('s')) {
      return Number(value.slice(0, -1));
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 7200;
  }
}
