import { LoggerService } from '@nestjs/common';
import type { Logger as PinoLogger } from 'pino';
import { rootLogger } from './pino.config';

type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

/**
 * Pino-backed logger compatible with Nest LoggerService.
 * Safe to construct without DI: `private readonly logger = new AppLogger(MyService.name)`.
 * Automatically enriches logs with request context from ALS via the root pino mixin.
 */
export class AppLogger implements LoggerService {
  private readonly pino: PinoLogger;

  constructor(private readonly context: string) {
    this.pino = rootLogger.child({ context });
  }

  log(message: unknown, ...optionalParams: unknown[]) {
    this.write('info', message, optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]) {
    this.write('error', message, optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]) {
    this.write('warn', message, optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]) {
    this.write('debug', message, optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]) {
    this.write('trace', message, optionalParams);
  }

  fatal(message: unknown, ...optionalParams: unknown[]) {
    this.write('fatal', message, optionalParams);
  }

  private write(
    level: LogLevel,
    message: unknown,
    optionalParams: unknown[],
  ): void {
    const payload = this.buildPayload(message, optionalParams, level);
    const logMessage =
      typeof payload.message === 'string' ? payload.message : undefined;

    if (payload.error instanceof Error) {
      const { error, message: msg, ...rest } = payload;
      this.pino[level]({ ...rest, error }, msg as string | undefined);
      return;
    }

    if (logMessage !== undefined) {
      const { message: msg, ...rest } = payload;
      this.pino[level](rest, msg as string);
      return;
    }

    this.pino[level](payload);
  }

  private buildPayload(
    message: unknown,
    optionalParams: unknown[],
    level: LogLevel,
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    if (typeof message === 'string') {
      payload.message = message;
    } else if (message instanceof Error) {
      payload.error = message;
      payload.message = message.message;
    } else if (message && typeof message === 'object') {
      Object.assign(payload, message);
    } else if (message !== undefined) {
      payload.message = String(message);
    }

    for (const param of optionalParams) {
      if (param === undefined || param === null) {
        continue;
      }

      if (param instanceof Error) {
        payload.error = param;
        if (!payload.message) {
          payload.message = param.message;
        }
        continue;
      }

      if (typeof param === 'string') {
        if (level === 'error' && param.includes('\n') && !payload.stack) {
          payload.stack = param;
          continue;
        }

        if (param !== this.context) {
          payload.detail = param;
        }
        continue;
      }

      if (typeof param === 'object') {
        Object.assign(payload, param);
      }
    }

    return payload;
  }
}
