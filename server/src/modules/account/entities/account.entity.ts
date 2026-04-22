import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum AccountRole {
  AppUser = 'app_user',
  Admin = 'admin',
}

export enum AccountStatus {
  Active = 'active',
  Disabled = 'disabled',
  Banned = 'banned',
}

@Entity('accounts')
@Index('uk_accounts_username', ['username'], { unique: true })
export class AccountEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ name: 'username', type: 'varchar', length: 50 })
  username!: string;

  @Column({ name: 'display_name', type: 'varchar', length: 100 })
  displayName!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 128 })
  passwordHash!: string;

  @Column({
    name: 'role',
    type: 'varchar',
    length: 20,
    default: AccountRole.AppUser,
  })
  role!: AccountRole;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: AccountStatus.Active,
  })
  status!: AccountStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt!: Date | null;
}
