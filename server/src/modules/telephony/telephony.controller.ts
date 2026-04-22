import {
  Body,
  Controller,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import {
  InboundWebhookResponse,
  RecordingWebhookResponse,
  TelephonyService,
  TelephonyWebhookError,
  TelephonyWebhookSuccessResponse,
  WebhookAcceptedResponse,
} from './telephony.service';

@Public()
@Controller('webhooks')
export class TelephonyController {
  constructor(private readonly telephonyService: TelephonyService) {}

  @Post('inbound-call')
  async inboundCall(
    @Req() request: Request & { rawBody?: Buffer },
    @Body() body: Record<string, unknown>,
    @Res() response: Response,
  ): Promise<void> {
    await this.handle(
      response,
      () => this.telephonyService.handleInboundCall(request, body),
    );
  }

  @Post('call-status')
  async callStatus(
    @Req() request: Request & { rawBody?: Buffer },
    @Body() body: Record<string, unknown>,
    @Res() response: Response,
  ): Promise<void> {
    await this.handle(
      response,
      () => this.telephonyService.handleCallStatus(request, body),
    );
  }

  @Post('recording-ready')
  async recordingReady(
    @Req() request: Request & { rawBody?: Buffer },
    @Body() body: Record<string, unknown>,
    @Res() response: Response,
  ): Promise<void> {
    await this.handle(
      response,
      () => this.telephonyService.handleRecordingReady(request, body),
    );
  }

  private async handle(
    response: Response,
    handler: () => Promise<
      | InboundWebhookResponse
      | WebhookAcceptedResponse
      | RecordingWebhookResponse
    >,
  ): Promise<void> {
    try {
      const payload = await handler();
      response.status(200).json(payload);
    } catch (error) {
      if (error instanceof TelephonyWebhookError) {
        response.status(error.status).json(error.body);
        return;
      }

      const fallback: TelephonyWebhookSuccessResponse = {
        accepted: false,
        error_code: 'internal_error',
        retryable: true,
      };
      response.status(500).json(fallback);
    }
  }
}
