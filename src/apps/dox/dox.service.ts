import { ContextService } from '@/modules/common';
import { AppConfigService } from '@/modules/common/config/config.service';
import { AppError } from '@/modules/common/error/app.error';
import { Injectable } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import {
  ALLOWED_ASSET_MIME_TYPES,
  DEFAULT_PREFERENCES,
  EMPTY_DOC_CONTENT,
  MAX_ASSET_BYTES,
} from './const';
import { DoxRepository } from './dox.repo';
import type {
  AiProxy,
  AssetDoc,
  BigramRecord,
  CreatePage,
  CreateShare,
  CreateTopic,
  ListAssetsQuery,
  PageDoc,
  ShareDoc,
  StoreAiKey,
  SyncEventDoc,
  SyncPush,
  TopicDoc,
  UpdatePageContent,
  UpdatePageMeta,
  UpdatePreferences,
  UpdateShare,
  UpdateTopic,
  WordMemorySync,
  WordProfileRecord,
} from './schema';

const toMs = (value: Date | number) =>
  value instanceof Date ? value.getTime() : value;

const toDateOrNull = (value: number | null | undefined) =>
  value == null ? null : new Date(value);

@Injectable()
export class DoxService {
  constructor(
    private readonly repo: DoxRepository,
    private readonly context: ContextService,
    private readonly config: AppConfigService,
  ) {}

  private userId() {
    return this.context.getOrThrow('userId');
  }

  private baseUrl() {
    const domain = this.config.getConfig('DEPLOY_DOMAIN');
    if (domain?.startsWith('http')) {
      return domain.replace(/\/$/, '');
    }
    return domain ? `https://${domain}` : 'http://localhost:3000';
  }

  private topicDto(topic: TopicDoc, pageCount: number) {
    return {
      id: topic.id,
      name: topic.name,
      collapsed: topic.collapsed,
      order: topic.order,
      pageCount,
      createdAt: toMs(topic.createdAt),
      updatedAt: toMs(topic.updatedAt),
    };
  }

  private pageStubDto(page: PageDoc) {
    return {
      id: page.id,
      title: page.title,
      topicId: page.topicId,
      locked: page.locked,
      order: page.order,
      createdAt: toMs(page.createdAt),
      updatedAt: toMs(page.updatedAt),
    };
  }

  private shareDto(share: ShareDoc) {
    return {
      shareToken: share.shareToken,
      shareUrl: `${this.baseUrl()}/dox/share/${share.shareToken}`,
      mode: share.mode,
      expiresAt: share.expiresAt ? toMs(share.expiresAt) : null,
      createdAt: toMs(share.createdAt),
    };
  }

  private assetDto(asset: AssetDoc) {
    return {
      assetId: asset.id,
      url: asset.url,
      width: asset.width,
      height: asset.height,
      sizeBytes: asset.sizeBytes,
      mimeType: asset.mimeType,
      pageId: asset.pageId,
      createdAt: toMs(asset.createdAt),
    };
  }

  private async emit(
    userId: string,
    event: SyncEventDoc['event'],
    data: Record<string, unknown>,
  ) {
    await this.repo.insertSyncEvent({
      id: uuidv7(),
      userId,
      event,
      data,
      createdAt: new Date(),
    });
  }

  private async getTopicOrThrow(id: string) {
    const topic = await this.repo.findTopicById(this.userId(), id);
    if (!topic) {
      throw new AppError('NotFoundError', `Topic ${id} does not exist.`);
    }
    return topic;
  }

  private async getPageOrThrow(id: string, includeContent = false) {
    const page = await this.repo.findPageById(
      this.userId(),
      id,
      includeContent,
    );
    if (!page) {
      throw new AppError('NotFoundError', `Page ${id} does not exist.`);
    }
    return page;
  }

  async getPreferences() {
    const existing = await this.repo.findPreferences(this.userId());
    if (!existing) {
      return { ...DEFAULT_PREFERENCES };
    }
    return {
      orientation: existing.orientation,
      theme: existing.theme,
    };
  }

  async updatePreferences(patch: UpdatePreferences) {
    const userId = this.userId();
    const current = await this.getPreferences();
    const next = { ...current, ...patch };
    const now = new Date();
    await this.repo.upsertPreferences({
      id: userId,
      userId,
      orientation: next.orientation,
      theme: next.theme,
      createdAt: now,
      updatedAt: now,
    });
    await this.emit(userId, 'preferences_updated', next);
    return next;
  }

  async listTopics() {
    const userId = this.userId();
    const topics = await this.repo.findTopics(userId);
    const counts = await this.repo.countPagesByTopicIds(
      userId,
      topics.map((topic) => topic.id),
    );
    return topics.map((topic) =>
      this.topicDto(topic, counts.get(topic.id) ?? 0),
    );
  }

  async createTopic(input: CreateTopic) {
    const userId = this.userId();
    const now = new Date();
    const order = (await this.repo.maxTopicOrder(userId)) + 1;
    const topic: TopicDoc = {
      id: uuidv7(),
      userId,
      name: input.name,
      collapsed: false,
      order,
      createdAt: now,
      updatedAt: now,
    };
    await this.repo.insertTopic(topic);
    const dto = this.topicDto(topic, 0);
    await this.emit(userId, 'topic_updated', dto);
    return dto;
  }

  async updateTopic(id: string, patch: UpdateTopic) {
    const userId = this.userId();
    const topic = await this.getTopicOrThrow(id);
    const now = new Date();
    const next = {
      ...topic,
      ...patch,
      updatedAt: now,
    };
    await this.repo.updateTopic(userId, id, {
      name: next.name,
      collapsed: next.collapsed,
      updatedAt: now,
    });
    const pageCount = await this.repo.countPagesInTopic(userId, id);
    const dto = this.topicDto(next, pageCount);
    await this.emit(userId, 'topic_updated', dto);
    return dto;
  }

  async deleteTopic(id: string, orphanAction: 'untopic' | 'delete') {
    const userId = this.userId();
    await this.getTopicOrThrow(id);
    const { deletedPageIds } = await this.repo.deleteTopicWithPages(
      userId,
      id,
      orphanAction,
      new Date(),
    );
    await this.emit(userId, 'topic_deleted', { id });
    for (const pageId of deletedPageIds) {
      await this.emit(userId, 'page_deleted', { id: pageId });
    }
  }

  async reorderTopics(orderedIds: string[]) {
    const userId = this.userId();
    const topics = await this.repo.findTopics(userId);
    const existing = new Set(topics.map((topic) => topic.id));
    if (
      orderedIds.length !== existing.size ||
      orderedIds.some((id) => !existing.has(id))
    ) {
      throw new AppError(
        'ValidationError',
        'Topic order must include every topic exactly once.',
      );
    }

    const updated = await this.repo.setTopicOrders(
      userId,
      orderedIds,
      new Date(),
    );
    return { updated };
  }

  async listPagesForTopic(topicId: string) {
    await this.getTopicOrThrow(topicId);
    const pages = await this.repo.findPagesByTopic(this.userId(), topicId);
    return pages.map((page) => this.pageStubDto(page));
  }

  async createPage(input: CreatePage) {
    const userId = this.userId();
    const topicId = input.topicId ?? null;
    if (topicId) {
      await this.getTopicOrThrow(topicId);
    }

    const now = new Date();
    let order = (await this.repo.maxPageOrder(userId, topicId)) + 1;

    if (input.afterPageId) {
      const after = await this.getPageOrThrow(input.afterPageId);
      if (after.topicId !== topicId) {
        throw new AppError(
          'ValidationError',
          'afterPageId must belong to the same topic.',
        );
      }
      order = after.order + 1;
      await this.repo.shiftPageOrders(userId, topicId, after.order, 1, now);
    }

    const page: PageDoc = {
      id: uuidv7(),
      userId,
      title: input.title,
      topicId,
      locked: false,
      order,
      content: EMPTY_DOC_CONTENT,
      createdAt: now,
      updatedAt: now,
    };
    await this.repo.insertPage(page);
    const dto = this.pageStubDto(page);
    await this.emit(userId, 'page_meta_updated', dto);
    return dto;
  }

  async updatePageMeta(id: string, patch: UpdatePageMeta) {
    const userId = this.userId();
    const page = await this.getPageOrThrow(id);
    const now = new Date();
    const next: PageDoc = {
      ...page,
      ...patch,
      updatedAt: now,
    };

    if (patch.topicId !== undefined && patch.topicId !== page.topicId) {
      if (patch.topicId) {
        await this.getTopicOrThrow(patch.topicId);
      }
      next.order = (await this.repo.maxPageOrder(userId, patch.topicId)) + 1;
    }

    await this.repo.updatePage(userId, id, {
      title: next.title,
      topicId: next.topicId,
      locked: next.locked,
      order: next.order,
      updatedAt: now,
    });
    const dto = this.pageStubDto(next);
    await this.emit(userId, 'page_meta_updated', dto);
    return dto;
  }

  async reorderPages(topicId: string, orderedIds: string[]) {
    const userId = this.userId();
    await this.getTopicOrThrow(topicId);
    const pages = await this.repo.findPagesByTopic(userId, topicId);
    const existing = new Set(pages.map((page) => page.id));
    if (
      orderedIds.length !== existing.size ||
      orderedIds.some((id) => !existing.has(id))
    ) {
      throw new AppError(
        'ValidationError',
        'Page order must include every page in the topic exactly once.',
      );
    }

    const updated = await this.repo.setPageOrders(
      userId,
      topicId,
      orderedIds,
      new Date(),
    );
    return { updated };
  }

  async deletePage(id: string) {
    const userId = this.userId();
    await this.getPageOrThrow(id);
    await this.repo.deletePage(userId, id, new Date());
    await this.emit(userId, 'page_deleted', { id });
  }

  async duplicatePage(id: string) {
    const userId = this.userId();
    const source = await this.getPageOrThrow(id, true);
    const now = new Date();
    await this.repo.shiftPageOrders(
      userId,
      source.topicId,
      source.order,
      1,
      now,
    );

    const page: PageDoc = {
      id: uuidv7(),
      userId,
      title: source.title,
      topicId: source.topicId,
      locked: source.locked,
      order: source.order + 1,
      content: source.content ?? EMPTY_DOC_CONTENT,
      createdAt: now,
      updatedAt: now,
    };
    await this.repo.insertPage(page);
    const dto = this.pageStubDto(page);
    await this.emit(userId, 'page_meta_updated', dto);
    return dto;
  }

  async getPageContent(id: string) {
    const page = await this.repo.findPageContent(this.userId(), id);
    if (!page) {
      throw new AppError('NotFoundError', `Page ${id} does not exist.`);
    }
    return {
      id: page.id,
      content: page.content,
      updatedAt: toMs(page.updatedAt),
    };
  }

  async updatePageContent(id: string, input: UpdatePageContent) {
    const userId = this.userId();
    const page = await this.repo.findPageContent(userId, id);
    if (!page) {
      throw new AppError('NotFoundError', `Page ${id} does not exist.`);
    }
    if (page.locked) {
      throw new AppError('ForbiddenError', 'Page is locked.');
    }

    const serverUpdatedAt = toMs(page.updatedAt);
    if (serverUpdatedAt > input.updatedAt) {
      throw new AppError(
        'ConflictError',
        `Server version is newer. Fetch the current content before saving. serverUpdatedAt=${serverUpdatedAt}`,
      );
    }

    const now = new Date();
    await this.repo.updatePage(userId, id, {
      content: input.content,
      updatedAt: now,
    });
    await this.emit(userId, 'page_content_updated', {
      id,
      updatedAt: toMs(now),
    });
    return { id, updatedAt: toMs(now) };
  }

  async getSyncState(since: number) {
    const userId = this.userId();
    const sinceDate = new Date(since);
    const [topics, pages, tombstones] = await Promise.all([
      this.repo.findChangedTopics(userId, sinceDate),
      this.repo.findChangedPageStubs(userId, sinceDate),
      this.repo.findTombstones(userId, sinceDate),
    ]);
    const counts = await this.repo.countPagesByTopicIds(
      userId,
      topics.map((topic) => topic.id),
    );

    return {
      serverTime: Date.now(),
      topics: topics.map((topic) =>
        this.topicDto(topic, counts.get(topic.id) ?? 0),
      ),
      pages: pages.map((page) => this.pageStubDto(page)),
      deletedTopicIds: tombstones
        .filter((item) => item.resourceType === 'topic')
        .map((item) => item.id),
      deletedPageIds: tombstones
        .filter((item) => item.resourceType === 'page')
        .map((item) => item.id),
    };
  }

  async pushSync(input: SyncPush) {
    const userId = this.userId();
    const accepted = { topicIds: [] as string[], pageIds: [] as string[] };
    const conflicts: { pageId: string; serverUpdatedAt: number }[] = [];

    for (const topic of input.topics) {
      const existing = await this.repo.findTopicById(userId, topic.id);
      const now = new Date();
      if (existing && toMs(existing.updatedAt) > topic.updatedAt) {
        continue;
      }

      const next: TopicDoc = {
        id: topic.id,
        userId,
        name: topic.name ?? existing?.name ?? 'Untitled',
        collapsed: topic.collapsed ?? existing?.collapsed ?? false,
        order: topic.order ?? existing?.order ?? 0,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      await this.repo.upsertTopic(next);
      accepted.topicIds.push(topic.id);
      await this.emit(userId, 'topic_updated', this.topicDto(next, 0));
    }

    for (const page of input.pages) {
      const existing = await this.repo.findPageById(userId, page.id, true);
      if (existing && toMs(existing.updatedAt) > page.updatedAt) {
        conflicts.push({
          pageId: page.id,
          serverUpdatedAt: toMs(existing.updatedAt),
        });
        continue;
      }

      if (page.topicId) {
        const topic = await this.repo.findTopicById(userId, page.topicId);
        if (!topic) {
          throw new AppError(
            'ValidationError',
            `Topic ${page.topicId} does not exist.`,
          );
        }
      }

      const now = new Date();
      const next: PageDoc = {
        id: page.id,
        userId,
        title: page.title ?? existing?.title ?? 'Untitled',
        topicId:
          page.topicId === undefined
            ? (existing?.topicId ?? null)
            : page.topicId,
        locked: page.locked ?? existing?.locked ?? false,
        order: page.order ?? existing?.order ?? 0,
        content: page.content ?? existing?.content ?? EMPTY_DOC_CONTENT,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      await this.repo.upsertPage(next);
      accepted.pageIds.push(page.id);
      await this.emit(userId, 'page_meta_updated', this.pageStubDto(next));
      if (page.content !== undefined) {
        await this.emit(userId, 'page_content_updated', {
          id: page.id,
          updatedAt: toMs(now),
        });
      }
    }

    for (const topicId of input.deletedTopicIds) {
      const existing = await this.repo.findTopicById(userId, topicId);
      if (existing) {
        await this.deleteTopic(topicId, 'untopic');
      }
    }

    for (const pageId of input.deletedPageIds) {
      const existing = await this.repo.findPageById(userId, pageId);
      if (existing) {
        await this.deletePage(pageId);
      }
    }

    return { accepted, conflicts };
  }

  async getSyncEvents(lastEventId?: string) {
    let since = new Date(0);
    if (lastEventId) {
      const asNumber = Number(lastEventId);
      if (Number.isFinite(asNumber)) {
        since = new Date(asNumber);
      }
    }
    return this.repo.findSyncEventsSince(this.userId(), since);
  }

  async uploadAsset(file: {
    buffer: Buffer;
    mimetype: string;
    size: number;
    originalname: string;
  }, pageId?: string) {
    if (!file?.buffer) {
      throw new AppError('ValidationError', 'file is required.');
    }
    if (file.size > MAX_ASSET_BYTES) {
      throw new AppError('PayloadTooLargeError', 'File exceeds 20 MB.');
    }
    if (
      !ALLOWED_ASSET_MIME_TYPES.includes(
        file.mimetype as (typeof ALLOWED_ASSET_MIME_TYPES)[number],
      )
    ) {
      throw new AppError(
        'ValidationError',
        `Unsupported mime type ${file.mimetype}.`,
      );
    }

    const userId = this.userId();
    if (pageId) {
      await this.getPageOrThrow(pageId);
    }

    const id = uuidv7();
    const gridFsId = await this.repo.uploadGridFs(
      `${id}-${file.originalname}`,
      file.buffer,
      file.mimetype,
    );
    const now = new Date();
    const asset: AssetDoc = {
      id,
      userId,
      pageId,
      url: `${this.baseUrl()}/dox/assets/${id}/file`,
      width: 0,
      height: 0,
      sizeBytes: file.size,
      mimeType: file.mimetype,
      gridFsId,
      createdAt: now,
      updatedAt: now,
    };
    await this.repo.insertAsset(asset);
    return this.assetDto(asset);
  }

  async listAssets(query: ListAssetsQuery) {
    const items = await this.repo.listAssets(this.userId(), {
      pageId: query.pageId,
      cursor: query.cursor,
      limit: query.limit,
    });
    const hasMore = items.length > query.limit;
    const page = hasMore ? items.slice(0, query.limit) : items;
    return {
      items: page.map((asset) => this.assetDto(asset)),
      nextCursor: hasMore ? page[page.length - 1]?.id : undefined,
    };
  }

  async deleteAsset(id: string) {
    const deleted = await this.repo.deleteAsset(this.userId(), id);
    if (!deleted) {
      throw new AppError('NotFoundError', `Asset ${id} does not exist.`);
    }
  }

  async getAssetFile(id: string) {
    const asset = await this.repo.findAssetByIdPublic(id);
    if (!asset) {
      throw new AppError('NotFoundError', `Asset ${id} does not exist.`);
    }
    return {
      stream: this.repo.openDownloadStream(asset.gridFsId),
      mimeType: asset.mimeType,
    };
  }

  async createShare(pageId: string, input: CreateShare) {
    const userId = this.userId();
    await this.getPageOrThrow(pageId);
    const existing = await this.repo.findShareByPage(userId, pageId);
    const now = new Date();
    if (existing) {
      await this.repo.updateShare(userId, pageId, {
        mode: input.mode,
        expiresAt: toDateOrNull(input.expiresAt),
        updatedAt: now,
      });
      return this.shareDto({
        ...existing,
        mode: input.mode,
        expiresAt: toDateOrNull(input.expiresAt),
        updatedAt: now,
      });
    }

    const share: ShareDoc = {
      id: uuidv7(),
      userId,
      pageId,
      shareToken: `shr_${uuidv7().replaceAll('-', '').slice(0, 10)}`,
      mode: input.mode,
      expiresAt: toDateOrNull(input.expiresAt),
      ownerName: this.context.tryGet('email') ?? '',
      createdAt: now,
      updatedAt: now,
    };
    await this.repo.insertShare(share);
    return this.shareDto(share);
  }

  async updateShare(pageId: string, input: UpdateShare) {
    const userId = this.userId();
    const existing = await this.repo.findShareByPage(userId, pageId);
    if (!existing) {
      throw new AppError('NotFoundError', 'Share link does not exist.');
    }
    const now = new Date();
    const next: ShareDoc = {
      ...existing,
      mode: input.mode ?? existing.mode,
      expiresAt:
        input.expiresAt === undefined
          ? existing.expiresAt
          : toDateOrNull(input.expiresAt),
      updatedAt: now,
    };
    await this.repo.updateShare(userId, pageId, {
      mode: next.mode,
      expiresAt: next.expiresAt,
      updatedAt: now,
    });
    return this.shareDto(next);
  }

  async deleteShare(pageId: string) {
    const deleted = await this.repo.deleteShare(this.userId(), pageId);
    if (!deleted) {
      throw new AppError('NotFoundError', 'Share link does not exist.');
    }
  }

  async getSharedPage(token: string) {
    const share = await this.repo.findShareByToken(token);
    if (!share) {
      throw new AppError('NotFoundError', 'Share token not found.');
    }
    if (share.expiresAt && share.expiresAt.getTime() < Date.now()) {
      throw new AppError('GoneError', 'Share link has expired.');
    }

    const page = await this.repo.findPageByIdPublic(share.pageId);
    if (!page) {
      throw new AppError('NotFoundError', 'Shared page no longer exists.');
    }

    return {
      title: page.title,
      content: page.content,
      ownerName: share.ownerName || '',
      sharedAt: toMs(share.createdAt),
    };
  }

  async syncWordMemory(input: WordMemorySync) {
    const userId = this.userId();
    const existing = await this.repo.findWordMemory(userId);
    const mergedBigrams = this.mergeBigrams(
      existing?.bigrams ?? [],
      input.bigrams,
    );
    const mergedProfile = this.mergeProfiles(
      existing?.profile ?? [],
      input.profile,
    );
    const now = new Date();
    await this.repo.upsertWordMemory({
      id: userId,
      userId,
      bigrams: mergedBigrams,
      profile: mergedProfile,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    return { bigrams: mergedBigrams, profile: mergedProfile };
  }

  async clearWordMemory() {
    await this.repo.deleteWordMemory(this.userId());
  }

  async storeAiKey(input: StoreAiKey) {
    const userId = this.userId();
    const now = new Date();
    await this.repo.upsertAiKey({
      id: userId,
      userId,
      encryptedKey: input.encryptedKey,
      createdAt: now,
      updatedAt: now,
    });
    return { stored: true };
  }

  async getAiKeyStatus() {
    const key = await this.repo.findAiKey(this.userId());
    return { hasKey: Boolean(key?.encryptedKey) };
  }

  async deleteAiKey() {
    await this.repo.deleteAiKey(this.userId());
  }

  async proxyAi(input: AiProxy) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new AppError(
        'ValidationError',
        'Server Gemini key is not configured.',
      );
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(input.model)}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: input.contents }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new AppError(
        'ValidationError',
        `Gemini proxy failed with status ${response.status}.`,
      );
    }
    return payload;
  }

  private mergeBigrams(
    server: BigramRecord[],
    incoming: BigramRecord[],
  ): BigramRecord[] {
    const byContext = new Map<string, BigramRecord>();
    for (const record of [...server, ...incoming]) {
      const current = byContext.get(record.context);
      if (!current) {
        byContext.set(record.context, {
          ...record,
          successors: { ...record.successors },
        });
        continue;
      }

      const successors = { ...current.successors };
      for (const [word, edge] of Object.entries(record.successors)) {
        const existingEdge = successors[word];
        if (!existingEdge || edge.weight >= existingEdge.weight) {
          successors[word] = edge;
        }
      }
      byContext.set(record.context, {
        context: record.context,
        successors,
        updatedAt: Math.max(current.updatedAt, record.updatedAt),
      });
    }
    return [...byContext.values()];
  }

  private mergeProfiles(
    server: WordProfileRecord[],
    incoming: WordProfileRecord[],
  ): WordProfileRecord[] {
    const byWord = new Map<string, WordProfileRecord>();
    for (const record of [...server, ...incoming]) {
      const key = record.word.toLowerCase();
      const current = byWord.get(key);
      if (!current) {
        byWord.set(key, { ...record });
        continue;
      }
      byWord.set(key, {
        word: record.word,
        casing:
          record.count >= current.count ? record.casing : current.casing,
        count: current.count + record.count,
        capitalized: current.capitalized + record.capitalized,
        accepted: current.accepted + record.accepted,
        rejected: current.rejected + record.rejected,
        lastUsedAt: Math.max(current.lastUsedAt, record.lastUsedAt),
      });
    }
    return [...byWord.values()];
  }
}
