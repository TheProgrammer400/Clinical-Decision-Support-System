import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { requestContextMiddleware } from './common/middleware/request-context.middleware';
import { AppConfigService } from './modules/config/config.service';

export const API_PREFIX = 'api/v1';

/** Applies the HTTP pipeline shared by the server and the e2e test harness. */
export function configureApp(app: INestApplication): INestApplication {
  const config = app.get(AppConfigService);
  const expressApp = app as NestExpressApplication;

  expressApp.set('trust proxy', config.trustProxy);
  expressApp.disable('x-powered-by');

  app.setGlobalPrefix(API_PREFIX);
  app.use(requestContextMiddleware);
  app.use(helmet());
  app.use(cookieParser());

  const allowedOrigins = new Set(config.corsOrigins);
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Requests without an Origin header (curl, server-to-server, same-origin) are not CORS requests.
      callback(null, !origin || allowedOrigins.has(origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'Idempotency-Key'],
    exposedHeaders: ['X-Request-ID'],
  });

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.enableShutdownHooks();
  return app;
}
