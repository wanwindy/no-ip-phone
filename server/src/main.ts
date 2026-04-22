import 'reflect-metadata';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { assertReleaseRuntimePreflight } from './common/runtime/release-runtime.preflight';

async function bootstrap(): Promise<void> {
  assertReleaseRuntimePreflight();

  const app = await NestFactory.create(AppModule, {
    cors: true,
    rawBody: true,
  });
  app.setGlobalPrefix('api/v1', {
    exclude: [
      {
        path: 'webhooks/inbound-call',
        method: RequestMethod.POST,
      },
      {
        path: 'webhooks/call-status',
        method: RequestMethod.POST,
      },
      {
        path: 'webhooks/recording-ready',
        method: RequestMethod.POST,
      },
    ],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();
