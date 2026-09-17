import { AllowAnnonymous } from '@/modules/auth/auth.decorators';
import { AuthGuard } from '@/modules/auth/auth.guard';
import { ValidateSchema } from '@/modules/common';
import { RoleGuard } from '@/modules/rbac';
import {
  Controller,
  Get,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { DoxService } from './dox.service';
import { ResourceIdSchema } from './schema';

@Controller('dox')
@UseGuards(AuthGuard, RoleGuard)
export class DoxPublicController {
  constructor(private readonly doxService: DoxService) {}

  @AllowAnnonymous()
  @ValidateSchema({ params: ResourceIdSchema })
  @Get('share/:token')
  async getSharedPage(@Param('token') token: string) {
    return {
      success: true,
      data: await this.doxService.getSharedPage(token),
    };
  }

  @AllowAnnonymous()
  @ValidateSchema({ params: ResourceIdSchema })
  @Get('assets/:id/file')
  async getAssetFile(@Param('id') id: string, @Res() res: Response) {
    const { stream, mimeType } = await this.doxService.getAssetFile(id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    stream.pipe(res);
  }
}
