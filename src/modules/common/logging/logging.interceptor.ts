import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { AppLogger } from './app.logger';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new AppLogger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();

    const method = request.method;
    const path = request.originalUrl || request.url;

    return next.handle().pipe(
      finalize(() => {
        const durationMs = Date.now() - startedAt;
        const statusCode = response.statusCode;
        this.logger.log(`${method} ${path} ${statusCode} ${durationMs}ms`);
      }),
    );
  }
}
