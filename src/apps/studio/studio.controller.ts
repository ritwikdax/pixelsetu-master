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
import { StudioService } from './studio.service';
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
} from './schema';
import { ValidateSchema, ListQuerySchema } from '@/modules/common';
import type { ListQuery } from '@/modules/common';
import z from 'zod';
import { Role, RoleGuard } from '@/modules/rbac';

@Controller('studio')
@UseGuards(AuthGuard, RoleGuard)
export class StudioController {
  constructor(private readonly studioService: StudioService) {}

  //==================== PROJECTS ====================
  @ValidateSchema({
    query: ListQuerySchema,
  })
  @Get('projects')
  async listProjects(@Query() query: ListQuery) {
    const result = await this.studioService.listProjects(query);
    return {
      success: true,
      data: result.data,
      next: result.next,
    };
  }

  @Role('editor')
  @ValidateSchema({
    body: ProjectSchema,
  })
  @Post('projects')
  async createProject(@Body() project: Project) {
    return {
      success: true,
      data: await this.studioService.createProject(project),
      message: 'Project created successfully',
    };
  }

  @ValidateSchema({
    params: z.uuidv7(),
  })
  @Get('projects/:id')
  async getProjectById(@Param('id') id: string) {
    return {
      success: true,
      data: await this.studioService.getProjectById(id),
      message: 'Project fetched successfully',
    };
  }

  @Role('editor')
  @ValidateSchema({
    params: z.uuidv7(),
    body: ProjectSchema,
  })
  @Patch('projects/:projectId')
  async updateProject(
    @Param('projectId') projectId: string,
    @Body() project: Project,
  ) {
    //return { success: false, message: 'Project not found' };
    return {
      success: true,
      data: await this.studioService.updateProject(projectId, project),
      message: 'Project updated successfully',
    };
  }

  @Role('admin')
  @ValidateSchema({
    params: z.uuidv7(),
  })
  @Delete('projects/:projectId')
  async deleteProject(@Param('projectId') projectId: string) {
    await this.studioService.deleteProjectById(projectId);
    return { success: true, message: 'Project deleted successfully' };
  }

  //==================== ALBUMS ====================
  @ValidateSchema({
    query: ListQuerySchema,
  })
  @Get('albums')
  async listAlbums(@Query() query: ListQuery) {
    const result = await this.studioService.listAlbums(query);
    return {
      success: true,
      data: result.data,
      next: result.next,
    };
  }

  @ValidateSchema({
    params: z.uuidv7(),
  })
  @Get('albums/projects/:projectId')
  async listAlbumsByProjectId(@Param('projectId') projectId: string) {
    const result = await this.studioService.getAlbumByProjectId(projectId);
    return {
      success: true,
      data: result,
      message: 'Albums for project fetched successfully',
    };
  }

  @ValidateSchema({
    params: z.uuidv7(),
  })
  @Get('albums/:id')
  async getAlbumById(@Param('id') id: string) {
    return {
      success: true,
      data: await this.studioService.getAlbumById(id),
      message: 'Album fetched successfully',
    };
  }

  @Role('editor')
  @ValidateSchema({
    body: CreateAlbumSchema,
  })
  @Post('albums')
  async createAlbum(@Body() album: CreateAlbum) {
    return {
      success: true,
      data: await this.studioService.createAlbum(album),
      message: 'Album created successfully',
    };
  }

  @Role('editor')
  @ValidateSchema({
    params: z.uuidv7(),
    body: UpdateAlbumSchema,
  })
  @Patch('albums/projects/:projectId/:id')
  async updateAlbum(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() album: UpdateAlbum,
  ) {
    await this.studioService.updateAlbum(projectId, id, album);
    return {
      success: true,
      message: 'Album updated successfully',
    };
  }

  @Role('admin')
  @ValidateSchema({
    params: z.uuidv7(),
  })
  @Delete('albums/projects/:projectId/:id')
  async deleteAlbum(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    await this.studioService.deleteAlbum(projectId, id);
    return {
      success: true,
      message: 'Album deleted successfully',
    };
  }

  //==================== PAYMENTS ====================
  @ValidateSchema({
    query: ListQuerySchema,
  })
  @Get('payments')
  async listPayments(@Query() query: ListQuery) {
    const result = await this.studioService.listPayments(query);
    return { success: true, data: result.data, next: result.next };
  }

  @ValidateSchema({
    params: z.uuidv7(),
  })
  @Get('payments/projects/:projectId')
  async getAllPaymentsForProject(@Param('projectId') projectId: string) {
    return {
      success: true,
      data: await this.studioService.getPaymentsByProjectId(projectId),
      message: 'Payments fetched successfully',
    };
  }

  @ValidateSchema({
    params: z.uuidv7(),
  })
  @Get('payments/projects/:projectId/:id')
  async getPaymentById(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return {
      success: true,
      data: await this.studioService.getPaymentById(projectId, id),
      message: 'Payment fetched successfully',
    };
  }

  @Role('editor')
  @ValidateSchema({
    body: CreatePaymentSchema,
  })
  @Post('payments')
  async createPayment(@Body() payment: CreatePayment) {
    return {
      success: true,
      data: await this.studioService.createPayment(payment),
      message: 'Payment created successfully',
    };
  }

  @Role('editor')
  @ValidateSchema({
    params: z.uuidv7(),
    body: UpdatePaymentSchema,
  })
  @Patch('payments/projects/:projectId/:id')
  async updatePayment(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() payment: UpdatePayment,
  ) {
    await this.studioService.updatePayment(projectId, id, payment);
    return {
      success: true,
      message: 'Payment updated successfully',
    };
  }

  @Role('admin')
  @ValidateSchema({
    params: z.uuidv7(),
  })
  @Delete('payments/projects/:projectId/:id')
  async deletePayment(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    await this.studioService.deletePayment(projectId, id);
    return {
      success: true,
      message: 'Payment deleted successfully',
    };
  }
}
