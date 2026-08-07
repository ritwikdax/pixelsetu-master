import { Injectable, NestMiddleware } from '@nestjs/common';
import { ContextService } from './context.service';
import { Request, Response, NextFunction } from 'express';
import { ContextStore } from './store';
import { UtilsService } from '../utils/utils.service';

@Injectable()
export class ContextMiddleware implements NestMiddleware {
  constructor(
    private readonly contextService: ContextService,
    private readonly utilsService: UtilsService,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const requestId =
      (req.headers['x-request-id'] as string) ||
      (typeof req.id === 'string' ? req.id : undefined) ||
      this.utilsService.uuid();

    req.id = requestId;

    const store = new ContextStore({
      requestId,
      method: req.method,
      requestTimestamp: new Date().toISOString(),
      endpoint: req.originalUrl,
    });

    res.setHeader('x-context-id', store.get('requestId') as string);
    this.contextService.run(store, () => {
      next();
    });
  }
}
