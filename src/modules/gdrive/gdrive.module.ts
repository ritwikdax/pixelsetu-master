import { Module } from '@nestjs/common';
import { GDriveController } from './gdrive.controller';
import { GDriveClientModule } from './client.module';
import { GDriveService } from './gdrive.service';

@Module({
  imports: [GDriveClientModule.forRootAsync()],
  providers: [GDriveService],
  controllers: [GDriveController],
})
export class GDriveModule {}
