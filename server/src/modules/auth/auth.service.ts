import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/constants/error-codes';
import { SmsService } from '../sms/sms.service';
import { UserService } from '../user/user.service';
import { RateLimitService } from '../rate-limit/rate-limit.service';
import { UserStatus } from '../user/entities/user.entity';
import { AuthCodeEntity } from './entities/auth-code.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly smsService: SmsService,
    private readonly userService: UserService,
    private readonly rateLimitService: RateLimitService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(AuthCodeEntity)
    private readonly authCodesRepository: Repository<AuthCodeEntity>,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokensRepository: Repository<RefreshTokenEntity>,
  ) {}

  async sendCode(phone: string, ip: string): Promise<{ cooldown: number }> {
    await this.rateLimitService.checkSendCode(phone, ip);

    const code = this.resolveCodeForCurrentEnvironment();
    const codeHash = await bcrypt.hash(code, 10);

    await this.authCodesRepository.save(
      this.authCodesRepository.create({
        phone,
        codeHash,
        expiredAt: new Date(Date.now() + 5 * 60 * 1000),
        usedAt: null,
        sendIp: ip,
      }),
    );

    await this.smsService.send(phone, code);

    return { cooldown: 60 };
  }

  async login(phone: string, code: string, deviceId: string): Promise<TokenPair> {
    const authCode = await this.authCodesRepository.findOne({
      where: { phone, usedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });

    if (!authCode || authCode.expiredAt.getTime() < Date.now()) {
      throw new AppException(
        ErrorCode.CODE_EXPIRED,
        '验证码已过期',
        401,
      );
    }

    const matched = await bcrypt.compare(code, authCode.codeHash);
    if (!matched) {
      await this.rateLimitService.recordFailedAttempt(phone);
      throw new AppException(ErrorCode.CODE_WRONG, '验证码错误', 401);
    }

    authCode.usedAt = new Date();
    await this.authCodesRepository.save(authCode);

    const user = await this.userService.findOrCreate(phone);
    if (user.status !== UserStatus.Active) {
      throw new AppException(ErrorCode.ACCOUNT_BANNED, '账户已被封禁', 403);
    }

    await this.userService.touchLastLoginAt(user.id);
    await this.rateLimitService.resetFailedAttempts(phone);
    return this.issueTokens(user.id, deviceId);
  }

  async refresh(refreshToken: string, deviceId: string): Promise<TokenPair> {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.refreshTokensRepository.findOne({
      where: { tokenHash, revokedAt: IsNull() },
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

    return this.issueTokens(stored.userId, deviceId);
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.refreshTokensRepository.findOne({
      where: { userId, tokenHash, revokedAt: IsNull() },
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

  async me(userId: string) {
    const profile = await this.userService.getPublicProfile(userId);
    if (!profile) {
      throw new UnauthorizedException();
    }

    return profile;
  }

  private async issueTokens(userId: string, deviceId: string): Promise<TokenPair> {
    const expiresInText = this.configService.get<string>('JWT_ACCESS_EXPIRES', '2h');
    const refreshDays = Number(this.configService.get<string>('JWT_REFRESH_DAYS', '30'));
    const accessToken = this.jwtService.sign(
      { sub: userId, deviceId },
      {
        secret: this.configService.get<string>('JWT_SECRET', 'replace-me'),
        expiresIn: expiresInText,
      },
    );

    const refreshToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(refreshToken);

    await this.refreshTokensRepository.save(
      this.refreshTokensRepository.create({
        userId,
        tokenHash,
        deviceId,
        expiredAt: new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000),
        revokedAt: null,
      }),
    );

    const expiresIn = this.parseExpiresInSeconds(expiresInText);
    return { accessToken, refreshToken, expiresIn };
  }

  private generateCode(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  private resolveCodeForCurrentEnvironment(): string {
    if (this.isFixedCodeFlowEnabled()) {
      return this.normalizeFixedCode(
        this.configService.get<string>('AUTH_FIXED_CODE', '123456'),
      );
    }

    return this.generateCode();
  }

  private isFixedCodeFlowEnabled(): boolean {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const smsProvider = this.configService.get<string>('SMS_PROVIDER', 'noop');
    return nodeEnv !== 'production' && smsProvider === 'noop';
  }

  private normalizeFixedCode(value: string): string {
    if (/^\d{6}$/.test(value)) {
      return value;
    }

    return '123456';
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
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
