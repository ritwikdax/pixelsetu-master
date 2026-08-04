import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppLogger, GlobalExceptionFilter, LoggingInterceptor } from './modules/common';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new AppLogger('Bootstrap');
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(new AppLogger('Nest'));
  app.use(helmet());
  const isProduction = process.env.NODE_ENV === 'production';
  const pixelsetuOrigin = /^https?:\/\/([a-zA-Z0-9-]+\.)*pixelsetu\.com$/;
  const localhostOrigin = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/;

  app.enableCors({
    origin: isProduction
      ? [pixelsetuOrigin]
      : [localhostOrigin, pixelsetuOrigin],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Application listening on http://localhost:${port}`);
}

bootstrap().catch((err) => {
  const logger = new AppLogger('Bootstrap');
  logger.error(
    'Failed to start application',
    err instanceof Error ? err.stack : String(err),
  );
  process.exit(1);
});
