import { Controller, Get, Query } from '@nestjs/common';
import { AppConfigService } from './config.service';
import { DialPrefixQueryDto } from './dto/dial-prefix-query.dto';

@Controller('config')
export class ConfigController {
  constructor(private readonly configService: AppConfigService) {}

  @Get('dial-prefixes')
  async getDialPrefixes(
    @Query() query: DialPrefixQueryDto,
  ) {
    return this.configService.getActiveDialPrefixes(query.countryCode ?? 'CN');
  }

  @Get('notices')
  async getNotices() {
    return this.configService.getActiveNotices();
  }
}
