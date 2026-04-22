import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TenantStatus {
  Active = 'active',
  Suspended = 'suspended',
  Disabled = 'disabled',
}

@Entity('tenants')
@Index('uk_tenants_code', ['code'], { unique: true })
export class TenantEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ name: 'code', type: 'varchar', length: 50 })
  code!: string;

  @Column({ name: 'name', type: 'varchar', length: 100 })
  name!: string;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: TenantStatus.Active,
  })
  status!: TenantStatus;

  @Column({ name: 'timezone', type: 'varchar', length: 64, default: 'UTC' })
  timezone!: string;

  @Column({
    name: 'default_country',
    type: 'varchar',
    length: 8,
    default: 'AU',
  })
  defaultCountry!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
