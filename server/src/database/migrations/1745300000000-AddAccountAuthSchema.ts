import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAccountAuthSchema1745300000000 implements MigrationInterface {
  name = 'AddAccountAuthSchema1745300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        username varchar(50) NOT NULL,
        display_name varchar(100) NOT NULL,
        password_hash varchar(128) NOT NULL,
        role varchar(20) NOT NULL DEFAULT 'app_user',
        status varchar(20) NOT NULL DEFAULT 'active',
        created_at timestamptz NOT NULL DEFAULT NOW(),
        last_login_at timestamptz,
        CONSTRAINT uk_accounts_username UNIQUE (username),
        CONSTRAINT ck_accounts_role CHECK (role IN ('app_user', 'admin')),
        CONSTRAINT ck_accounts_status CHECK (status IN ('active', 'disabled', 'banned'))
      )
    `);

    await queryRunner.query(`COMMENT ON TABLE accounts IS '统一账号表，支持 App 用户和后台管理员'`);
    await queryRunner.query(`COMMENT ON COLUMN accounts.username IS '账号名，唯一'`);
    await queryRunner.query(`COMMENT ON COLUMN accounts.display_name IS '展示名称'`);
    await queryRunner.query(`COMMENT ON COLUMN accounts.password_hash IS '密码 bcrypt 哈希'`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS account_refresh_tokens (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        role varchar(20) NOT NULL,
        token_hash varchar(128) NOT NULL,
        device_id varchar(128),
        expired_at timestamptz NOT NULL,
        revoked_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_account_refresh_tokens_role CHECK (role IN ('app_user', 'admin'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_account_refresh_tokens_account
      ON account_refresh_tokens (account_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_account_refresh_tokens_hash
      ON account_refresh_tokens (token_hash)
      WHERE revoked_at IS NULL
    `);

    await queryRunner.query(`COMMENT ON TABLE account_refresh_tokens IS '统一账号刷新令牌表'`);
    await queryRunner.query(`COMMENT ON COLUMN account_refresh_tokens.token_hash IS 'SHA-256 哈希'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS account_refresh_tokens`);
    await queryRunner.query(`DROP TABLE IF EXISTS accounts`);
  }
}
