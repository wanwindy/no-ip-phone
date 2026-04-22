import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum DidInventoryStatus {
  Available = 'available',
  Assigned = 'assigned',
  Reserved = 'reserved',
  Disabled = 'disabled',
  Retired = 'retired',
}

@Entity('did_inventory')
@Index('uk_did_inventory_phone_number', ['phoneNumberE164'], { unique: true })
@Index('idx_did_inventory_country_status', ['countryCode', 'status'])
@Index('idx_did_inventory_provider_status', ['providerCode', 'status'])
export class DidInventoryEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ name: 'provider_code', type: 'varchar', length: 50 })
  providerCode!: string;

  @Column({ name: 'phone_number_e164', type: 'varchar', length: 32 })
  phoneNumberE164!: string;

  @Column({ name: 'country_code', type: 'varchar', length: 8 })
  countryCode!: string;

  @Column({ name: 'area_code', type: 'varchar', length: 20, nullable: true })
  areaCode!: string | null;

  @Column({ name: 'display_label', type: 'varchar', length: 100, nullable: true })
  displayLabel!: string | null;

  @Column({
    name: 'capabilities',
    type: 'jsonb',
    default: () => "'[]'::jsonb",
  })
  capabilities!: string[];

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: DidInventoryStatus.Available,
  })
  status!: DidInventoryStatus;

  @Column({
    name: 'monthly_cost',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  monthlyCost!: number | null;

  @Column({ name: 'currency', type: 'varchar', length: 3, nullable: true })
  currency!: string | null;

  @Column({
    name: 'metadata',
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  metadata!: Record<string, unknown>;

  @Column({ name: 'purchased_at', type: 'timestamptz', nullable: true })
  purchasedAt!: Date | null;

  @Column({ name: 'released_at', type: 'timestamptz', nullable: true })
  releasedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
