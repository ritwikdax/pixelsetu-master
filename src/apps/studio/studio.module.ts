import { Module } from '@nestjs/common';
import { CommonModule } from '@/modules/common/common.module';
import { ClientModule } from './client/client.module';
import { StudioController } from './studio.controller';
import { StudioService } from './studio.service';
import { StudioRepository } from './studio.repo';

@Module({
  imports: [CommonModule, ClientModule],
  controllers: [StudioController],
  providers: [StudioService, StudioRepository],
})
export class StudioModule {}