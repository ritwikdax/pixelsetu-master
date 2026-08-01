import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
  GDriveModule,
  IdentityModule,
  RBACModule,
  TelegramModule,
} from './modules';
import { StockModule } from './modules/stock';
import { AppConfigModule } from './modules/common/config/config.module';
import { ContextModule, DatabaseModule, UtilsModule } from '@common';
import { CacheModule } from './modules/common/cache/cache.module';

@Module({
  imports: [
    TelegramModule,
    StockModule,
    DatabaseModule,
    AppConfigModule,
    GDriveModule,
    CacheModule.forRootAsync(),
    ContextModule,
    UtilsModule,
    IdentityModule,
    RBACModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
