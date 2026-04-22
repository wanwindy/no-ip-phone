import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallSessionEntity } from './entities/call-session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CallSessionEntity])],
  exports: [TypeOrmModule],
})
export class CallSessionModule {}
