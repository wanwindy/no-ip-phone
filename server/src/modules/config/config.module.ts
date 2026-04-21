import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigController } from './config.controller';
import {
  DialPrefixConfigEntity,
} from './entities/dial-prefix-config.entity';
import { NoticeEntity } from './entities/notice.entity';
import { AppConfigService } from './config.service';

@Module({
  imports: [TypeOrmModule.forFeature([DialPrefixConfigEntity, NoticeEntity])],
  controllers: [ConfigController],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class ConfigAppModule {}
