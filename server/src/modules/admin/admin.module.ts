import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { AuthModule } from '../auth/auth.module';
import { AdminAccountsController } from './admin-accounts.controller';
import { AdminAuthController } from './admin-auth.controller';
import { AdminConfigController } from './admin-config.controller';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';
import { ConfigAppModule } from '../config/config.module';

@Module({
  imports: [AuthModule, AccountModule, ConfigAppModule],
  controllers: [AdminAuthController, AdminAccountsController, AdminConfigController],
  providers: [AdminJwtStrategy, AdminJwtAuthGuard],
})
export class AdminModule {}
