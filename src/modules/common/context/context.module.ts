import { Global, Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ContextMiddleware } from './context.middleware';
import { ContextService } from './context.service';

@Global()
@Module({
  providers: [ContextService],
  exports: [ContextService],
})
export class ContextModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ContextMiddleware).forRoutes('*');
  }
}
