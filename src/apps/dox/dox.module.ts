import { Module } from '@nestjs/common';
import { CommonModule } from '@/modules/common/common.module';
import { DoxController } from './dox.controller';
import { DoxPublicController } from './dox.public.controller';
import { DoxRepository } from './dox.repo';
import { DoxService } from './dox.service';

@Module({
  imports: [CommonModule],
  controllers: [DoxController, DoxPublicController],
  providers: [DoxService, DoxRepository],
})
export class DoxModule {}
