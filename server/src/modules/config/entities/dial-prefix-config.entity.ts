import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum DialPrefixStatus {
  Active = 'active',
  Disabled = 'disabled',
}

@Entity('dial_prefix_configs')
@Index('idx_dial_prefix_country_status', [
  'countryCode',
  'status',
  'priority',
])
export class DialPrefixConfigEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({
    name: 'country_code',
    type: 'varchar',
    length: 10,
    default: 'CN',
  })
  countryCode!: string;

  @Column({
    name: 'carrier_name',
    type: 'varchar',
    length: 50,
    default: '*',
  })
  carrierName!: string;

  @Column({ name: 'prefix', type: 'varchar', length: 20 })
  prefix!: string;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: DialPrefixStatus.Active,
  })
  status!: DialPrefixStatus;

  @Column({ name: 'priority', type: 'int', default: 0 })
  priority!: number;

  @Column({ name: 'remark', type: 'text', nullable: true })
  remark!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
