import { Global, Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './db/database.module';
import { CacheModule } from './cache/cache.module';
import { ContextModule } from './context/context.module';
import { UtilsModule } from './utils/utils.module';
import { AuthModule } from '../auth/auth.module';
import { RBACModule } from '../rbac/role.module';
import { EmailModule } from './email';

@Global()
@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    CacheModule.forRootAsync(),
    ContextModule,
    UtilsModule,
    AuthModule,
    RBACModule,
    EmailModule
  ],
  exports: [
    AppConfigModule,
    DatabaseModule,
    CacheModule,
    ContextModule,
    UtilsModule,
    AuthModule,
    RBACModule,
  ],
})
export class CommonModule {}
