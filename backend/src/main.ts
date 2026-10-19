import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { AppConfigService } from './modules/config/config.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  configureApp(app);

  const config = app.get(AppConfigService);
  if (config.isProduction && config.corsOrigins.length === 0) {
    logger.warn('CORS_ORIGINS is not set: cross-origin browser requests will be rejected.');
  }
  if (config.llmMock) {
    logger.warn('LLM_MOCK=true: analyses are produced by a mock provider and are labelled as such.');
  }

  await app.listen(config.port);
  logger.log(`CDSS Backend API listening on port ${config.port} [Env: ${config.nodeEnv}]`);
}

bootstrap().catch((err) => {
  // Configuration errors land here; print them plainly and exit non-zero.
  // eslint-disable-next-line no-console
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
