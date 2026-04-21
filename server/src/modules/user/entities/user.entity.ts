import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum UserStatus {
  Active = 'active',
  Disabled = 'disabled',
  Banned = 'banned',
}

@Entity('users')
@Index('uk_users_phone', ['phone'], { unique: true })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ name: 'phone', type: 'varchar', length: 20 })
  phone!: string;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: UserStatus.Active,
  })
  status!: UserStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt!: Date | null;
}
