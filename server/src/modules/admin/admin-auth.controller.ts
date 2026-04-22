import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { AccountProfile, AccountRole } from '../account/account.service';
import { AuthService, TokenPair } from '../auth/auth.service';
import { LogoutDto } from '../auth/dto/logout.dto';
import { RefreshDto } from '../auth/dto/refresh.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';

@Public()
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: AdminLoginDto): Promise<TokenPair> {
    return this.authService.loginWithRole(
      body.username,
      body.password,
      body.deviceId,
      AccountRole.Admin,
    );
  }

  @Post('refresh')
  async refresh(@Body() body: RefreshDto): Promise<TokenPair> {
    return this.authService.refreshWithRole(
      body.refreshToken,
      body.deviceId,
      AccountRole.Admin,
    );
  }

  @UseGuards(AdminJwtAuthGuard)
  @Post('logout')
  async logout(
    @Req() request: Request & { user: { accountId: string } },
    @Body() body: LogoutDto,
  ): Promise<null> {
    await this.authService.logoutWithRole(
      request.user.accountId,
      body.refreshToken,
      AccountRole.Admin,
    );
    return null;
  }

  @UseGuards(AdminJwtAuthGuard)
  @Get('me')
  async me(
    @Req() request: Request & { user: { accountId: string } },
  ): Promise<AccountProfile> {
    return this.authService.me(request.user.accountId);
  }
}
