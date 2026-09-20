import { CommonModule } from '@/modules/common/common.module';
import { Module } from '@nestjs/common';
import { ClientGuard } from './client.guard';
import { ClientRepository } from './client.repo';
import { ClientService } from './client.service';
import { DriveService } from './drive.service';
import { PublicStudioController } from './public.controller';

@Module({
  imports: [CommonModule],
  controllers: [PublicStudioController],
  providers: [ClientGuard, ClientService, ClientRepository, DriveService],
})
export class ClientModule {}
