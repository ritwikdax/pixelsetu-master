import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GDriveModule, TelegramModule } from './modules';
import { StockModule } from './modules/stock';
import { CommonModule } from './modules/common/common.module';
import { IdentityModule, StudioModule } from './apps';

@Module({
  imports: [
    CommonModule,
    TelegramModule,
    StockModule,
    GDriveModule,
    IdentityModule,
    StudioModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
