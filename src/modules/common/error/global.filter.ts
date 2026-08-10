import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppError } from './app.error';
import { AppLogger } from '../logging/app.logger';
import { requestContextAls } from '../context/context.als';

const PATH_NOT_FOUND_PATTERN =
  /^Cannot (GET|HEAD|PUT|PATCH|POST|DELETE|OPTIONS) /;

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new AppLogger(GlobalExceptionFilter.name);

  private isPathNotFound(exception: unknown): exception is HttpException {
    if (!(exception instanceof HttpException)) {
      return false;
    }

    if (exception.getStatus() !== HttpStatus.NOT_FOUND) {
      return false;
    }

    const response = exception.getResponse();
    const message =
      typeof response === 'string'
        ? response
        : (response as { message?: string | string[] }).message;

    const messageText = Array.isArray(message) ? message[0] : message;

    return (
      typeof messageText === 'string' &&
      PATH_NOT_FOUND_PATTERN.test(messageText)
    );
  }

  catch(exception: unknown, host: ArgumentsHost) {
    console.log('exception', exception);
    const ctx = host.switchToHttp();

    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;

    let body: Record<string, unknown> = {
      success: false,
      message: 'Internal Server Error',
    };

    if (this.isPathNotFound(exception)) {
      const responseBody = exception.getResponse();
      const message =
        typeof responseBody === 'string'
          ? responseBody
          : (responseBody as { message?: string | string[] }).message;
      const messageText = Array.isArray(message) ? message[0] : message;

      status = HttpStatus.NOT_FOUND;
      body = {
        success: false,
        errorType: 'Path not found',
        code: HttpStatus.NOT_FOUND,
        message: messageText ?? `Cannot ${request.method} ${request.url}`,
      };
    } else if (exception instanceof AppError) {
      status = exception.code;
      body = {
        success: false,
        errorType: exception.message,
        code: exception.code,
        message: exception.errorDetails,
      };
    } else {
      body = {
        success: false,
        errorType: (exception as Error)?.message || 'Internal Server Error',
        code: (exception as { code?: number })?.code || status,
        message:
          (exception as { errorDetails?: string })?.errorDetails ||
          'An unexpected error occurred',
      };
    }

    const requestId =
      requestContextAls.getStore()?.get('requestId') ||
      (request.headers['x-context-id'] as string | undefined) ||
      (request.headers['x-request-id'] as string | undefined);

    const logPayload = {
      message: 'Request failed',
      method: request.method,
      path: request.url,
      status,
      ...(requestId ? { requestId } : {}),
    };

    if (exception instanceof AppError || this.isPathNotFound(exception)) {
      this.logger.warn({
        ...logPayload,
        ...(exception instanceof AppError
          ? {
              errorMessage: exception.message,
              errorDetails: exception.errorDetails,
              code: exception.code,
            }
          : {
              errorMessage: 'Path not found',
              errorDetails:
                (body.message as string | undefined) ??
                `Cannot ${request.method} ${request.url}`,
              code: HttpStatus.NOT_FOUND,
            }),
      });
    } else {
      this.logger.error({
        ...logPayload,
        error:
          exception instanceof Error
            ? exception
            : { message: String(exception) },
      });
    }

    response.status(status).json({
      path: request.url,
      ...body,
    });
  }
}
