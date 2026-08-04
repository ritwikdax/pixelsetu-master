import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppError } from './app.error';
import { AppLogger } from '../logging/app.logger';
import { requestContextAls } from '../context/context.als';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new AppLogger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();

    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;

    let body: Record<string, unknown> = {
      success: false,
      message: 'Internal Server Error',
    };

    if (exception instanceof AppError) {
      status = exception.code;
      body = {
        success: false,
        message: exception.message,
        code: exception.code,
        errorDetails: exception.errorDetails,
      };
    } else {
      body = {
        success: false,
        message: (exception as Error)?.message || 'Internal Server Error',
        code: (exception as { code?: number })?.code || status,
        errorDetails:
          (exception as { errorDetails?: string })?.errorDetails ||
          'An unexpected error occurred',
      };
    }

    const requestId =
      requestContextAls.getStore()?.get('requestId') ||
      (request.headers['x-context-id'] as string | undefined) ||
      (request.headers['x-request-id'] as string | undefined);

    const logMessage = `${request.method} ${request.url} status=${status}${
      requestId ? ` requestId=${requestId}` : ''
    }`;

    if (exception instanceof AppError) {
      this.logger.warn(
        `${logMessage} — ${exception.message}: ${exception.errorDetails}`,
      );
    } else {
      this.logger.error(
        logMessage,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      path: request.url,
      ...body,
    });
  }
}
