import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitPrivacyDialSchema1745210000000 implements MigrationInterface {
  name = 'InitPrivacyDialSchema1745210000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        phone varchar(20) NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'active',
        created_at timestamptz NOT NULL DEFAULT NOW(),
        last_login_at timestamptz,
        CONSTRAINT uk_users_phone UNIQUE (phone),
        CONSTRAINT ck_users_status CHECK (status IN ('active', 'disabled', 'banned'))
      )
    `);

    await queryRunner.query(`COMMENT ON TABLE users IS '用户表'`);
    await queryRunner.query(`COMMENT ON COLUMN users.phone IS '手机号，唯一'`);
    await queryRunner.query(`COMMENT ON COLUMN users.status IS '账户状态：active/disabled/banned'`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS auth_codes (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        phone varchar(20) NOT NULL,
        code_hash varchar(128) NOT NULL,
        expired_at timestamptz NOT NULL,
        used_at timestamptz,
        send_ip varchar(45),
        created_at timestamptz NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_auth_codes_phone_created
      ON auth_codes (phone, created_at DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_auth_codes_expired
      ON auth_codes (expired_at)
      WHERE used_at IS NULL
    `);
    await queryRunner.query(`COMMENT ON TABLE auth_codes IS '短信验证码记录'`);
    await queryRunner.query(`COMMENT ON COLUMN auth_codes.code_hash IS '验证码 bcrypt 哈希，不存明文'`);
    await queryRunner.query(`COMMENT ON COLUMN auth_codes.send_ip IS '发送请求来源 IP，用于风控'`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash varchar(128) NOT NULL,
        device_id varchar(128),
        expired_at timestamptz NOT NULL,
        revoked_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user
      ON refresh_tokens (user_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash
      ON refresh_tokens (token_hash)
      WHERE revoked_at IS NULL
    `);
    await queryRunner.query(`COMMENT ON TABLE refresh_tokens IS '刷新令牌，支持轮换与注销'`);
    await queryRunner.query(`COMMENT ON COLUMN refresh_tokens.token_hash IS 'SHA-256 哈希'`);
    await queryRunner.query(`COMMENT ON COLUMN refresh_tokens.device_id IS '设备标识，用于多设备管理'`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS dial_prefix_configs (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        country_code varchar(10) NOT NULL DEFAULT 'CN',
        carrier_name varchar(50) NOT NULL DEFAULT '*',
        prefix varchar(20) NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'active',
        priority int NOT NULL DEFAULT 0,
        remark text,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_dial_prefix_status CHECK (status IN ('active', 'disabled'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dial_prefix_country_status
      ON dial_prefix_configs (country_code, status, priority DESC)
    `);
    await queryRunner.query(`COMMENT ON TABLE dial_prefix_configs IS '拨号隐私前缀配置，按国家和运营商管理'`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notices (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        title varchar(200) NOT NULL,
        content text NOT NULL,
        type varchar(20) NOT NULL DEFAULT 'info',
        status varchar(20) NOT NULL DEFAULT 'active',
        start_at timestamptz,
        end_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_notice_type CHECK (type IN ('info', 'warning', 'urgent')),
        CONSTRAINT ck_notice_status CHECK (status IN ('active', 'disabled'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notices_active
      ON notices (status, start_at, end_at)
      WHERE status = 'active'
    `);
    await queryRunner.query(`COMMENT ON TABLE notices IS '应用内公告，支持定时展示'`);

    await queryRunner.query(`
      INSERT INTO dial_prefix_configs
        (country_code, carrier_name, prefix, priority, remark)
      VALUES
        ('CN', '*', '#31#', 100, '中国通用 CLIR 前缀，GSM 标准'),
        ('CN', 'china_mobile', '#31#', 90, '中国移动 - GSM/LTE 支持'),
        ('CN', 'china_unicom', '#31#', 90, '中国联通 - GSM/LTE 支持'),
        ('CN', 'china_telecom', '#31#', 80, '中国电信 - CDMA 部分网络可能不支持'),
        ('US', '*', '*67', 100, '美国/加拿大通用 CLIR 前缀'),
        ('GB', '*', '141', 100, '英国通用 CLIR 前缀'),
        ('HK', '*', '133', 100, '中国香港通用 CLIR 前缀'),
        ('JP', '*', '184', 100, '日本通用 CLIR 前缀'),
        ('KR', '*', '*23#', 100, '韩国通用 CLIR 前缀'),
        ('DE', '*', '#31#', 100, '德国通用 CLIR 前缀'),
        ('FR', '*', '#31#', 100, '法国通用 CLIR 前缀'),
        ('AU', '*', '#31#', 100, '澳大利亚通用 CLIR 前缀'),
        ('IN', '*', '#31#', 100, '印度通用 CLIR 前缀')
    `);

    await queryRunner.query(`
      INSERT INTO notices (title, content, type, status)
      VALUES (
        '功能说明',
        '隐私拨打效果受运营商、地区和终端环境影响，实际结果可能不同。',
        'info',
        'active'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS notices`);
    await queryRunner.query(`DROP TABLE IF EXISTS dial_prefix_configs`);
    await queryRunner.query(`DROP TABLE IF EXISTS refresh_tokens`);
    await queryRunner.query(`DROP TABLE IF EXISTS auth_codes`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp"`);
  }
}
