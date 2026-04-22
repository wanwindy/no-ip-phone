"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../modules/user/entities/user.entity");
const dial_prefix_config_entity_1 = require("../modules/config/entities/dial-prefix-config.entity");
const notice_entity_1 = require("../modules/config/entities/notice.entity");
const account_entity_1 = require("../modules/account/entities/account.entity");
const account_refresh_token_entity_1 = require("../modules/account/entities/account-refresh-token.entity");
exports.default = new typeorm_1.DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? '5432'),
    username: process.env.DB_USER ?? 'app',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'privacy_dialer',
    entities: [
        user_entity_1.UserEntity,
        account_entity_1.AccountEntity,
        account_refresh_token_entity_1.AccountRefreshTokenEntity,
        dial_prefix_config_entity_1.DialPrefixConfigEntity,
        notice_entity_1.NoticeEntity,
    ],
    migrations: ['src/database/migrations/*{.ts,.js}'],
    synchronize: false,
    logging: false,
});
