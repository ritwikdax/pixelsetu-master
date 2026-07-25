import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GDriveModule, TelegramModule } from './modules';
import { StockModule } from './modules/stock';
import { AppConfigModule } from './modules/common/config/config.module';
import { DatabaseModule } from './modules/common';
import { CacheModule } from './modules/common/cache/cache.module';

@Module({
  imports: [
    TelegramModule,
    StockModule,
    DatabaseModule,
    AppConfigModule,
    GDriveModule,
    CacheModule.forRootAsync(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
