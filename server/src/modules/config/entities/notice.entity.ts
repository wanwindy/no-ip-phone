import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum NoticeStatus {
  Active = 'active',
  Disabled = 'disabled',
}

export enum NoticeType {
  Info = 'info',
  Warning = 'warning',
  Urgent = 'urgent',
}

@Entity('notices')
@Index('idx_notices_active', ['status', 'startAt', 'endAt'])
export class NoticeEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ name: 'title', type: 'varchar', length: 200 })
  title!: string;

  @Column({ name: 'content', type: 'text' })
  content!: string;

  @Column({
    name: 'type',
    type: 'varchar',
    length: 20,
    default: NoticeType.Info,
  })
  type!: NoticeType;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: NoticeStatus.Active,
  })
  status!: NoticeStatus;

  @Column({ name: 'start_at', type: 'timestamptz', nullable: true })
  startAt!: Date | null;

  @Column({ name: 'end_at', type: 'timestamptz', nullable: true })
  endAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
