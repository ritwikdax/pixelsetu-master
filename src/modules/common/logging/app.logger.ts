import { ConsoleLogger } from '@nestjs/common';
import { requestContextAls } from '../context/context.als';

/**
 * Nest ConsoleLogger that prefixes messages with requestId when ALS context exists.
 * Safe to construct without DI: `private readonly logger = new AppLogger(MyService.name)`.
 */
export class AppLogger extends ConsoleLogger {
  constructor(context: string) {
    super(context);
  }

  private withRequestId(message: unknown): unknown {
    if (typeof message !== 'string') {
      return message;
    }
    const requestId = requestContextAls.getStore()?.get('requestId');
    if (!requestId) {
      return message;
    }
    return `[requestId=${requestId}] ${message}`;
  }

  override log(message: unknown, ...optionalParams: unknown[]) {
    super.log(this.withRequestId(message), ...optionalParams);
  }

  override error(message: unknown, ...optionalParams: unknown[]) {
    super.error(this.withRequestId(message), ...optionalParams);
  }

  override warn(message: unknown, ...optionalParams: unknown[]) {
    super.warn(this.withRequestId(message), ...optionalParams);
  }

  override debug(message: unknown, ...optionalParams: unknown[]) {
    super.debug?.(this.withRequestId(message), ...optionalParams);
  }

  override verbose(message: unknown, ...optionalParams: unknown[]) {
    super.verbose?.(this.withRequestId(message), ...optionalParams);
  }

  override fatal(message: unknown, ...optionalParams: unknown[]) {
    super.fatal?.(this.withRequestId(message), ...optionalParams);
  }
}
