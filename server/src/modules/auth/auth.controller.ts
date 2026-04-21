import { Body, Controller, Get, Ip, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { PhoneValidationPipe } from '../../common/pipes/phone-validation.pipe';
import { AuthService, TokenPair } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';
import { SendCodeDto } from './dto/send-code.dto';

type AuthMeResponse = Promise<{
  id: string;
  phone: string;
  status: string;
  createdAt: string;
}>;

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('send-code')
  async sendCode(
    @Body(PhoneValidationPipe) body: SendCodeDto,
    @Ip() ip: string,
  ): Promise<{ cooldown: number }> {
    return this.authService.sendCode(body.phone, ip);
  }

  @Public()
  @Post('login')
  async login(
    @Body(PhoneValidationPipe) body: LoginDto,
  ): Promise<TokenPair> {
    return this.authService.login(body.phone, body.code, body.deviceId);
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() body: RefreshDto): Promise<TokenPair> {
    return this.authService.refresh(body.refreshToken, body.deviceId);
  }

  @Post('logout')
  async logout(
    @Req() request: Request & { user: { userId: string } },
    @Body() body: LogoutDto,
  ): Promise<null> {
    await this.authService.logout(request.user.userId, body.refreshToken);
    return null;
  }

  @Get('me')
  async me(@Req() request: Request & { user: { userId: string } }): AuthMeResponse {
    const profile = await this.authService.me(request.user.userId);
    return profile;
  }
}
