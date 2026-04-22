import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedAppUser } from '../auth/strategies/jwt.strategy';
import { CreateOutboundCallDto } from './dto/create-outbound-call.dto';
import { CallsService, OutboundCallTaskResponse } from './calls.service';

@Controller('calls')
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Post('outbound')
  async createOutboundCall(
    @Req() request: Request & { user: AuthenticatedAppUser },
    @Body() body: CreateOutboundCallDto,
  ): Promise<OutboundCallTaskResponse> {
    return this.callsService.createOutboundCall(request.user, body);
  }

  @Get(':id')
  async getCall(
    @Req() request: Request & { user: AuthenticatedAppUser },
    @Param('id') id: string,
  ): Promise<OutboundCallTaskResponse> {
    return this.callsService.getCall(request.user, id);
  }
}
