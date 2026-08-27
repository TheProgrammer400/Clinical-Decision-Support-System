import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { AppConfigService } from './modules/config/config.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(AppConfigService);

  // Global Prefix /api/v1
  app.setGlobalPrefix('api/v1');

  // CORS Configuration
  app.enableCors({
    origin: true, // Accepts client requests
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Correlation-ID', 'Idempotency-Key'],
  });

  // Global Interceptors & Filters
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Cookie Parser Middleware
  app.use((req: any, res: any, next: any) => {
    const rawCookies = req.headers.cookie;
    req.cookies = {};
    if (rawCookies) {
      rawCookies.split(';').forEach((cookie: string) => {
        const parts = cookie.split('=');
        if (parts.length === 2) {
          req.cookies[parts[0].trim()] = decodeURIComponent(parts[1].trim());
        }
      });
    }
    next();
  });

  const port = configService.port;
  await app.listen(port);
  logger.log(`CDSS Backend API listening on port ${port} [Env: ${configService.nodeEnv}]`);
}

bootstrap();
