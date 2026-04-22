import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallbackSessionEntity } from './entities/callback-session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CallbackSessionEntity])],
  exports: [TypeOrmModule],
})
export class CallbackModule {}
