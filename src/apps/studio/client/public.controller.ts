import { AuthGuard } from '@/modules/auth/auth.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StudioService } from '../studio.service';
import {
  ProjectSchema,
  CreateAlbumSchema,
  UpdateAlbumSchema,
  CreatePaymentSchema,
  UpdatePaymentSchema,
  type Project,
  type CreateAlbum,
  type UpdateAlbum,
  type CreatePayment,
  type UpdatePayment,
} from '../schema';
import { ValidateSchema, ListQuerySchema } from '@/modules/common';
import type { ListQuery } from '@/modules/common';
import z from 'zod';
import { Role, RoleGuard } from '@/modules/rbac';
import { LoginPayloadSchema } from './schema';

@Controller('studio/client')
@UseGuards(AuthGuard, RoleGuard)
export class PublicStudioController {
  constructor() {}

  //==================== PROJECTS ====================
  @ValidateSchema({
    body: LoginPayloadSchema,
  })
  @Post('login')
  async login(@Body() body: z.infer<typeof LoginPayloadSchema>) {
    return {
      message: 'Login successful',
      data: body,
    };
  }
}
