import { AuthGuard } from '@/modules/auth/auth.guard';
import { ValidateSchema } from '@/modules/common';
import { RoleGuard } from '@/modules/rbac';
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  MessageEvent,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Sse,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Observable, timer } from 'rxjs';
import { mergeMap, switchMap } from 'rxjs/operators';
import { MAX_ASSET_BYTES } from './const';
import { DoxService } from './dox.service';
import {
  AiProxySchema,
  CreatePageSchema,
  CreateShareSchema,
  CreateTopicSchema,
  DeleteTopicQuerySchema,
  ListAssetsQuerySchema,
  ReorderSchema,
  ResourceIdSchema,
  StoreAiKeySchema,
  SyncPushSchema,
  SyncStateQuerySchema,
  UpdatePageContentSchema,
  UpdatePageMetaSchema,
  UpdatePreferencesSchema,
  UpdateShareSchema,
  UpdateTopicSchema,
  WordMemorySyncSchema,
  type AiProxy,
  type CreatePage,
  type CreateShare,
  type CreateTopic,
  type DeleteTopicQuery,
  type ListAssetsQuery,
  type Reorder,
  type StoreAiKey,
  type SyncPush,
  type SyncStateQuery,
  type UpdatePageContent,
  type UpdatePageMeta,
  type UpdatePreferences,
  type UpdateShare,
  type UpdateTopic,
  type WordMemorySync,
} from './schema';

@Controller('dox')
@UseGuards(AuthGuard, RoleGuard)
export class DoxController {
  constructor(private readonly doxService: DoxService) {}

  @Get('users/me/preferences')
  async getPreferences() {
    return {
      success: true,
      data: await this.doxService.getPreferences(),
    };
  }

  @ValidateSchema({ body: UpdatePreferencesSchema })
  @Patch('users/me/preferences')
  async updatePreferences(@Body() body: UpdatePreferences) {
    return {
      success: true,
      data: await this.doxService.updatePreferences(body),
      message: 'Preferences updated successfully',
    };
  }

  @Get('topics')
  async listTopics() {
    return {
      success: true,
      data: await this.doxService.listTopics(),
    };
  }

  @ValidateSchema({ body: CreateTopicSchema })
  @HttpCode(201)
  @Post('topics')
  async createTopic(@Body() body: CreateTopic) {
    return {
      success: true,
      data: await this.doxService.createTopic(body),
      message: 'Topic created successfully',
    };
  }

  @ValidateSchema({ body: ReorderSchema })
  @Put('topics/order')
  async reorderTopics(@Body() body: Reorder) {
    return {
      success: true,
      data: await this.doxService.reorderTopics(body.order),
    };
  }

  @ValidateSchema({
    params: ResourceIdSchema,
    body: UpdateTopicSchema,
  })
  @Patch('topics/:id')
  async updateTopic(@Param('id') id: string, @Body() body: UpdateTopic) {
    return {
      success: true,
      data: await this.doxService.updateTopic(id, body),
      message: 'Topic updated successfully',
    };
  }

  @ValidateSchema({
    params: ResourceIdSchema,
    query: DeleteTopicQuerySchema,
  })
  @HttpCode(204)
  @Delete('topics/:id')
  async deleteTopic(
    @Param('id') id: string,
    @Query() query: DeleteTopicQuery,
  ) {
    await this.doxService.deleteTopic(id, query.orphanAction);
  }

  @ValidateSchema({ params: ResourceIdSchema })
  @Get('topics/:id/pages')
  async listPages(@Param('id') id: string) {
    return {
      success: true,
      data: await this.doxService.listPagesForTopic(id),
    };
  }

  @ValidateSchema({
    params: ResourceIdSchema,
    body: ReorderSchema,
  })
  @Put('topics/:id/pages/order')
  async reorderPages(@Param('id') id: string, @Body() body: Reorder) {
    return {
      success: true,
      data: await this.doxService.reorderPages(id, body.order),
    };
  }

  @ValidateSchema({ body: CreatePageSchema })
  @HttpCode(201)
  @Post('pages')
  async createPage(@Body() body: CreatePage) {
    return {
      success: true,
      data: await this.doxService.createPage(body),
      message: 'Page created successfully',
    };
  }

  @ValidateSchema({
    params: ResourceIdSchema,
    body: UpdatePageMetaSchema,
  })
  @Patch('pages/:id/meta')
  async updatePageMeta(
    @Param('id') id: string,
    @Body() body: UpdatePageMeta,
  ) {
    return {
      success: true,
      data: await this.doxService.updatePageMeta(id, body),
      message: 'Page metadata updated successfully',
    };
  }

  @ValidateSchema({ params: ResourceIdSchema })
  @Get('pages/:id/content')
  async getPageContent(@Param('id') id: string) {
    return {
      success: true,
      data: await this.doxService.getPageContent(id),
    };
  }

  @ValidateSchema({
    params: ResourceIdSchema,
    body: UpdatePageContentSchema,
  })
  @Patch('pages/:id/content')
  async updatePageContent(
    @Param('id') id: string,
    @Body() body: UpdatePageContent,
  ) {
    return {
      success: true,
      data: await this.doxService.updatePageContent(id, body),
    };
  }

  @ValidateSchema({ params: ResourceIdSchema })
  @HttpCode(201)
  @Post('pages/:id/duplicate')
  async duplicatePage(@Param('id') id: string) {
    return {
      success: true,
      data: await this.doxService.duplicatePage(id),
      message: 'Page duplicated successfully',
    };
  }

  @ValidateSchema({
    params: ResourceIdSchema,
    body: CreateShareSchema,
  })
  @HttpCode(201)
  @Post('pages/:id/share')
  async createShare(@Param('id') id: string, @Body() body: CreateShare) {
    return {
      success: true,
      data: await this.doxService.createShare(id, body),
      message: 'Share link created successfully',
    };
  }

  @ValidateSchema({
    params: ResourceIdSchema,
    body: UpdateShareSchema,
  })
  @Patch('pages/:id/share')
  async updateShare(@Param('id') id: string, @Body() body: UpdateShare) {
    return {
      success: true,
      data: await this.doxService.updateShare(id, body),
    };
  }

  @ValidateSchema({ params: ResourceIdSchema })
  @HttpCode(204)
  @Delete('pages/:id/share')
  async deleteShare(@Param('id') id: string) {
    await this.doxService.deleteShare(id);
  }

  @ValidateSchema({ params: ResourceIdSchema })
  @HttpCode(204)
  @Delete('pages/:id')
  async deletePage(@Param('id') id: string) {
    await this.doxService.deletePage(id);
  }

  @ValidateSchema({ query: SyncStateQuerySchema })
  @Get('sync/state')
  async getSyncState(@Query() query: SyncStateQuery) {
    return {
      success: true,
      data: await this.doxService.getSyncState(query.since),
    };
  }

  @ValidateSchema({ body: SyncPushSchema })
  @Post('sync/push')
  async pushSync(@Body() body: SyncPush) {
    return {
      success: true,
      data: await this.doxService.pushSync(body),
    };
  }

  @Sse('sync/events')
  syncEvents(
    @Headers('last-event-id') lastEventId?: string,
  ): Observable<MessageEvent> {
    let cursor = lastEventId;
    return timer(0, 2000).pipe(
      switchMap(async () => {
        const events = await this.doxService.getSyncEvents(cursor);
        if (events.length > 0) {
          cursor = String(events[events.length - 1].createdAt.getTime());
        }
        return events;
      }),
      mergeMap((events) =>
        events.map((event) => ({
          type: event.event,
          id: String(event.createdAt.getTime()),
          data: event.data,
        })),
      ),
    );
  }

  @Post('assets/upload')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_ASSET_BYTES } }),
  )
  async uploadAsset(
    @UploadedFile()
    file: { buffer: Buffer; mimetype: string; size: number; originalname: string },
    @Body('pageId') pageId?: string,
  ) {
    return {
      success: true,
      data: await this.doxService.uploadAsset(file, pageId),
      message: 'Asset uploaded successfully',
    };
  }

  @ValidateSchema({ query: ListAssetsQuerySchema })
  @Get('assets')
  async listAssets(@Query() query: ListAssetsQuery) {
    return {
      success: true,
      data: await this.doxService.listAssets(query),
    };
  }

  @ValidateSchema({ params: ResourceIdSchema })
  @HttpCode(204)
  @Delete('assets/:id')
  async deleteAsset(@Param('id') id: string) {
    await this.doxService.deleteAsset(id);
  }

  @ValidateSchema({ body: WordMemorySyncSchema })
  @Post('word-memory/sync')
  async syncWordMemory(@Body() body: WordMemorySync) {
    return {
      success: true,
      data: await this.doxService.syncWordMemory(body),
    };
  }

  @HttpCode(204)
  @Delete('word-memory')
  async clearWordMemory() {
    await this.doxService.clearWordMemory();
  }

  @ValidateSchema({ body: StoreAiKeySchema })
  @Post('ai/key')
  async storeAiKey(@Body() body: StoreAiKey) {
    return {
      success: true,
      data: await this.doxService.storeAiKey(body),
    };
  }

  @Get('ai/key/status')
  async getAiKeyStatus() {
    return {
      success: true,
      data: await this.doxService.getAiKeyStatus(),
    };
  }

  @HttpCode(204)
  @Delete('ai/key')
  async deleteAiKey() {
    await this.doxService.deleteAiKey();
  }

  @ValidateSchema({ body: AiProxySchema })
  @Post('ai/proxy')
  async proxyAi(@Body() body: AiProxy) {
    return {
      success: true,
      data: await this.doxService.proxyAi(body),
    };
  }
}
