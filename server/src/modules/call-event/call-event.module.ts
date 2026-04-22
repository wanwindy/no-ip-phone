import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallEventEntity } from './entities/call-event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CallEventEntity])],
  exports: [TypeOrmModule],
})
export class CallEventModule {}
