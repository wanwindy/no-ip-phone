import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import {
  AdminDialPrefixResponse,
  AdminNoticeResponse,
  AppConfigService,
} from '../config/config.service';
import { CreateDialPrefixDto } from './dto/create-dial-prefix.dto';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { UpdateDialPrefixDto } from './dto/update-dial-prefix.dto';
import { UpdateNoticeDto } from './dto/update-notice.dto';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';

@Public()
@UseGuards(AdminJwtAuthGuard)
@Controller('admin/config')
export class AdminConfigController {
  constructor(private readonly configService: AppConfigService) {}

  @Get('dial-prefixes')
  async getDialPrefixes(
    @Query('countryCode') countryCode?: string,
  ): Promise<AdminDialPrefixResponse[]> {
    return this.configService.listDialPrefixes(countryCode?.trim().toUpperCase());
  }

  @Post('dial-prefixes')
  async createDialPrefix(
    @Body() body: CreateDialPrefixDto,
  ): Promise<AdminDialPrefixResponse> {
    return this.configService.createDialPrefix(body);
  }

  @Patch('dial-prefixes/:id')
  async updateDialPrefix(
    @Param('id') id: string,
    @Body() body: UpdateDialPrefixDto,
  ): Promise<AdminDialPrefixResponse> {
    return this.configService.updateDialPrefix(id, body);
  }

  @Get('notices')
  async getNotices(): Promise<AdminNoticeResponse[]> {
    return this.configService.listNotices();
  }

  @Post('notices')
  async createNotice(@Body() body: CreateNoticeDto): Promise<AdminNoticeResponse> {
    return this.configService.createNotice(body);
  }

  @Patch('notices/:id')
  async updateNotice(
    @Param('id') id: string,
    @Body() body: UpdateNoticeDto,
  ): Promise<AdminNoticeResponse> {
    return this.configService.updateNotice(id, body);
  }
}
