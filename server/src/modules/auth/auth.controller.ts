import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { AccountProfile, AccountRole } from '../account/account.service';
import { AuthService, TokenPair } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() body: LoginDto): Promise<TokenPair> {
    return this.authService.loginWithRole(
      body.username,
      body.password,
      body.deviceId,
      AccountRole.AppUser,
    );
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() body: RefreshDto): Promise<TokenPair> {
    return this.authService.refreshWithRole(
      body.refreshToken,
      body.deviceId,
      AccountRole.AppUser,
    );
  }

  @Post('logout')
  async logout(
    @Req() request: Request & { user: { accountId: string } },
    @Body() body: LogoutDto,
  ): Promise<null> {
    await this.authService.logoutWithRole(
      request.user.accountId,
      body.refreshToken,
      AccountRole.AppUser,
    );
    return null;
  }

  @Get('me')
  async me(
    @Req() request: Request & { user: { accountId: string } },
  ): Promise<AccountProfile> {
    const profile = await this.authService.me(request.user.accountId);
    return profile;
  }
}
