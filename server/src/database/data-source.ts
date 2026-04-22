import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { UserEntity } from '../modules/user/entities/user.entity';
import { DialPrefixConfigEntity } from '../modules/config/entities/dial-prefix-config.entity';
import { NoticeEntity } from '../modules/config/entities/notice.entity';
import { AccountEntity } from '../modules/account/entities/account.entity';
import { AccountRefreshTokenEntity } from '../modules/account/entities/account-refresh-token.entity';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? '5432'),
  username: process.env.DB_USER ?? 'app',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'privacy_dialer',
  entities: [
    UserEntity,
    AccountEntity,
    AccountRefreshTokenEntity,
    DialPrefixConfigEntity,
    NoticeEntity,
  ],
  migrations: ['src/database/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: false,
});
