import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppError } from './app.error';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();

    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;

    let body: any = {
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
        message: (exception as any)?.message || 'Internal Server Error',
        code: (exception as any)?.code || status,
        errorDetails:
          (exception as any)?.errorDetails || 'An unexpected error occurred',
      };
    }

    this.logger.error(
      `${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      path: request.url,
      ...body,
    });
  }
}
