import { Global, Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { createPinoHttpOptions } from './pino.config';

@Global()
@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: createPinoHttpOptions(),
    }),
  ],
  exports: [LoggerModule],
})
export class LoggingModule {}
