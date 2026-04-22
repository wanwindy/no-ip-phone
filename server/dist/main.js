"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const response_interceptor_1 = require("./common/interceptors/response.interceptor");
const release_runtime_preflight_1 = require("./common/runtime/release-runtime.preflight");
async function bootstrap() {
    (0, release_runtime_preflight_1.assertReleaseRuntimePreflight)();
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        cors: true,
        rawBody: true,
    });
    app.setGlobalPrefix('api/v1', {
        exclude: [
            {
                path: 'webhooks/inbound-call',
                method: common_1.RequestMethod.POST,
            },
            {
                path: 'webhooks/call-status',
                method: common_1.RequestMethod.POST,
            },
            {
                path: 'webhooks/recording-ready',
                method: common_1.RequestMethod.POST,
            },
        ],
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    app.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter());
    app.useGlobalInterceptors(new response_interceptor_1.ResponseInterceptor());
    const port = Number(process.env.PORT ?? 3000);
    await app.listen(port);
}
void bootstrap();
