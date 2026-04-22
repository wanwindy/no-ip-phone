import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountService } from './account.service';
import { AccountEntity } from './entities/account.entity';
import { AccountRefreshTokenEntity } from './entities/account-refresh-token.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AccountEntity, AccountRefreshTokenEntity])],
  providers: [AccountService],
  exports: [AccountService, TypeOrmModule],
})
export class AccountModule {}
