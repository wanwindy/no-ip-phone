import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/constants/error-codes';
import {
  AccountEntity,
  AccountRole,
  AccountStatus,
} from './entities/account.entity';

export { AccountRole, AccountStatus } from './entities/account.entity';

export interface AccountProfile {
  id: string;
  username: string;
  displayName: string;
  role: AccountRole;
  status: AccountStatus;
  createdAt: string;
}

export interface CreateAccountInput {
  username: string;
  displayName: string;
  password: string;
  role: AccountRole;
  status?: AccountStatus;
}

export interface UpdateAccountInput {
  displayName?: string;
  password?: string;
  status?: AccountStatus;
}

@Injectable()
export class AccountService implements OnModuleInit {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountsRepository: Repository<AccountEntity>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.bootstrapFromEnv(
      AccountRole.Admin,
      this.configService.get<string>('ADMIN_BOOTSTRAP_USERNAME'),
      this.configService.get<string>('ADMIN_BOOTSTRAP_PASSWORD'),
      this.configService.get<string>('ADMIN_BOOTSTRAP_DISPLAY_NAME', '系统管理员'),
    );

    await this.bootstrapFromEnv(
      AccountRole.AppUser,
      this.configService.get<string>('APP_BOOTSTRAP_USERNAME'),
      this.configService.get<string>('APP_BOOTSTRAP_PASSWORD'),
      this.configService.get<string>('APP_BOOTSTRAP_DISPLAY_NAME', '演示账号'),
    );
  }

  async validateCredentials(
    username: string,
    password: string,
    role: AccountRole,
  ): Promise<AccountEntity> {
    const normalizedUsername = this.normalizeUsername(username);
    this.ensureValidUsername(normalizedUsername);
    this.ensureValidPassword(password, false);

    const account = await this.accountsRepository.findOne({
      where: {
        username: normalizedUsername,
        role,
      },
    });

    if (!account) {
      throw new AppException(
        ErrorCode.ACCOUNT_CREDENTIALS_INVALID,
        '账号或密码错误',
        401,
      );
    }

    const matched = await bcrypt.compare(password, account.passwordHash);
    if (!matched) {
      throw new AppException(
        ErrorCode.ACCOUNT_CREDENTIALS_INVALID,
        '账号或密码错误',
        401,
      );
    }

    if (account.status === AccountStatus.Disabled) {
      throw new AppException(
        ErrorCode.ACCOUNT_DISABLED,
        '账号已停用',
        403,
      );
    }

    if (account.status === AccountStatus.Banned) {
      throw new AppException(
        ErrorCode.ACCOUNT_BANNED,
        '账号已被封禁',
        403,
      );
    }

    return account;
  }

  async findById(accountId: string): Promise<AccountEntity | null> {
    return this.accountsRepository.findOne({ where: { id: accountId } });
  }

  async getProfile(accountId: string): Promise<AccountProfile | null> {
    const account = await this.findById(accountId);
    if (!account) {
      return null;
    }

    return {
      id: account.id,
      username: account.username,
      displayName: account.displayName,
      role: account.role,
      status: account.status,
      createdAt: account.createdAt.toISOString(),
    };
  }

  async touchLastLoginAt(accountId: string): Promise<void> {
    await this.accountsRepository.update(accountId, {
      lastLoginAt: new Date(),
    });
  }

  async listAccounts(role = AccountRole.AppUser): Promise<AccountProfile[]> {
    const rows = await this.accountsRepository.find({
      where: { role },
      order: {
        createdAt: 'ASC',
        username: 'ASC',
      },
    });

    return rows.map((item) => ({
      id: item.id,
      username: item.username,
      displayName: item.displayName,
      role: item.role,
      status: item.status,
      createdAt: item.createdAt.toISOString(),
    }));
  }

  async createAccount(input: CreateAccountInput): Promise<AccountProfile> {
    const username = this.normalizeUsername(input.username);
    const displayName = this.normalizeDisplayName(input.displayName, username);
    this.ensureValidUsername(username);
    this.ensureValidPassword(input.password, true);
    this.ensureValidStatus(input.status ?? AccountStatus.Active);

    const existing = await this.accountsRepository.findOne({
      where: { username, role: input.role },
    });
    if (existing) {
      throw new AppException(
        ErrorCode.USERNAME_INVALID,
        '账号名已存在',
        409,
      );
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const account = await this.accountsRepository.save(
      this.accountsRepository.create({
        username,
        displayName,
        passwordHash,
        role: input.role,
        status: input.status ?? AccountStatus.Active,
        lastLoginAt: null,
      }),
    );

    return {
      id: account.id,
      username: account.username,
      displayName: account.displayName,
      role: account.role,
      status: account.status,
      createdAt: account.createdAt.toISOString(),
    };
  }

  async updateAccount(
    accountId: string,
    input: UpdateAccountInput,
  ): Promise<AccountProfile> {
    const account = await this.findById(accountId);
    if (!account) {
      throw new AppException(ErrorCode.INTERNAL_ERROR, '账号不存在', 404);
    }

    const nextDisplayName =
      input.displayName == null
        ? account.displayName
        : this.normalizeDisplayName(input.displayName, account.username);
    const nextStatus = input.status ?? account.status;

    this.ensureValidStatus(nextStatus);

    account.displayName = nextDisplayName;
    account.status = nextStatus;

    if (input.password != null && input.password.length > 0) {
      this.ensureValidPassword(input.password, true);
      account.passwordHash = await bcrypt.hash(input.password, 10);
    }

    const saved = await this.accountsRepository.save(account);
    return {
      id: saved.id,
      username: saved.username,
      displayName: saved.displayName,
      role: saved.role,
      status: saved.status,
      createdAt: saved.createdAt.toISOString(),
    };
  }

  private async bootstrapFromEnv(
    role: AccountRole,
    username?: string,
    password?: string,
    displayName?: string,
  ): Promise<void> {
    if (!username || !password) {
      return;
    }

    const normalizedUsername = this.normalizeUsername(username);
    const existing = await this.accountsRepository.findOne({
      where: {
        username: normalizedUsername,
        role,
      },
    });
    if (existing) {
      return;
    }

    const profile = await this.createAccount({
      username: normalizedUsername,
      password,
      displayName: displayName ?? normalizedUsername,
      role,
      status: AccountStatus.Active,
    });
    this.logger.log(`Bootstrapped ${role} account: ${profile.username}`);
  }

  private normalizeUsername(value: string): string {
    return value.trim().toLowerCase();
  }

  private normalizeDisplayName(value: string, fallback: string): string {
    const trimmed = value.trim();
    return trimmed.length == 0 ? fallback : trimmed;
  }

  private ensureValidUsername(username: string): void {
    if (!/^[a-z0-9._-]{4,32}$/.test(username)) {
      throw new AppException(
        ErrorCode.USERNAME_INVALID,
        '账号名需为 4-32 位小写字母、数字或 ._- 组合',
        400,
      );
    }
  }

  private ensureValidPassword(password: string, strictLength: boolean): void {
    const trimmed = password.trim();
    if (trimmed.length < (strictLength ? 8 : 1) || trimmed.length > 64) {
      throw new AppException(
        ErrorCode.PASSWORD_INVALID,
        strictLength ? '密码长度需为 8-64 位' : '请输入密码',
        400,
      );
    }
  }

  private ensureValidStatus(status: AccountStatus): void {
    if (!Object.values(AccountStatus).includes(status)) {
      throw new AppException(
        ErrorCode.INTERNAL_ERROR,
        '账号状态不合法',
        400,
      );
    }
  }
}
