import { InjectDb, InjectDbClient } from '@/modules/common';
import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  Db,
  Filter,
  GridFSBucket,
  MongoClient,
  ObjectId,
  Sort,
} from 'mongodb';
import { COLLECTION_NAME, GRIDFS_BUCKET } from './const';
import type {
  AssetDoc,
  AiKeyDoc,
  PageDoc,
  PreferenceDoc,
  ShareDoc,
  SyncEventDoc,
  TombstoneDoc,
  TopicDoc,
  WordMemoryDoc,
} from './schema';

@Injectable()
export class DoxRepository implements OnModuleInit {
  constructor(
    @InjectDb() private readonly db: Db,
    @InjectDbClient() private readonly dbClient: MongoClient,
  ) {}

  async onModuleInit() {
    await Promise.all([
      this.db
        .collection(COLLECTION_NAME.TOPIC)
        .createIndex({ userId: 1, order: 1 }),
      this.db
        .collection(COLLECTION_NAME.PAGE)
        .createIndex({ userId: 1, topicId: 1, order: 1 }),
      this.db
        .collection(COLLECTION_NAME.PAGE)
        .createIndex({ userId: 1, updatedAt: 1 }),
      this.db
        .collection(COLLECTION_NAME.TOMBSTONE)
        .createIndex({ userId: 1, deletedAt: 1 }),
      this.db
        .collection(COLLECTION_NAME.PREFERENCE)
        .createIndex({ userId: 1 }, { unique: true }),
      this.db
        .collection(COLLECTION_NAME.ASSET)
        .createIndex({ userId: 1, id: -1 }),
      this.db
        .collection(COLLECTION_NAME.SHARE)
        .createIndex({ shareToken: 1 }, { unique: true }),
      this.db
        .collection(COLLECTION_NAME.SHARE)
        .createIndex({ userId: 1, pageId: 1 }, { unique: true }),
      this.db
        .collection(COLLECTION_NAME.WORD_MEMORY)
        .createIndex({ userId: 1 }, { unique: true }),
      this.db
        .collection(COLLECTION_NAME.AI_KEY)
        .createIndex({ userId: 1 }, { unique: true }),
      this.db
        .collection(COLLECTION_NAME.SYNC_EVENT)
        .createIndex({ userId: 1, createdAt: 1 }),
    ]);
  }

  private gridFs() {
    return new GridFSBucket(this.db, { bucketName: GRIDFS_BUCKET });
  }

  async findTopics(userId: string): Promise<TopicDoc[]> {
    return this.db
      .collection<TopicDoc>(COLLECTION_NAME.TOPIC)
      .find({ userId })
      .sort({ order: 1 })
      .project<TopicDoc>({ _id: 0 })
      .toArray();
  }

  async findTopicById(userId: string, id: string): Promise<TopicDoc | null> {
    return this.db
      .collection<TopicDoc>(COLLECTION_NAME.TOPIC)
      .findOne({ userId, id }, { projection: { _id: 0 } });
  }

  async insertTopic(doc: TopicDoc): Promise<void> {
    await this.db.collection(COLLECTION_NAME.TOPIC).insertOne(doc);
  }

  async updateTopic(
    userId: string,
    id: string,
    patch: Partial<TopicDoc>,
  ): Promise<void> {
    await this.db
      .collection(COLLECTION_NAME.TOPIC)
      .updateOne({ userId, id }, { $set: patch });
  }

  async maxTopicOrder(userId: string): Promise<number> {
    const last = await this.db
      .collection<TopicDoc>(COLLECTION_NAME.TOPIC)
      .find({ userId })
      .sort({ order: -1 })
      .limit(1)
      .project({ order: 1 })
      .toArray();
    return last[0]?.order ?? -1;
  }

  async countPagesInTopic(userId: string, topicId: string): Promise<number> {
    return this.db
      .collection(COLLECTION_NAME.PAGE)
      .countDocuments({ userId, topicId });
  }

  async countPagesByTopicIds(
    userId: string,
    topicIds: string[],
  ): Promise<Map<string, number>> {
    if (topicIds.length === 0) {
      return new Map();
    }

    const rows = await this.db
      .collection(COLLECTION_NAME.PAGE)
      .aggregate<{ _id: string; count: number }>([
        { $match: { userId, topicId: { $in: topicIds } } },
        { $group: { _id: '$topicId', count: { $sum: 1 } } },
      ])
      .toArray();

    return new Map(rows.map((row) => [row._id, row.count]));
  }

  async setTopicOrders(
    userId: string,
    orderedIds: string[],
    updatedAt: Date,
  ): Promise<number> {
    if (orderedIds.length === 0) {
      return 0;
    }

    const ops = orderedIds.map((id, order) => ({
      updateOne: {
        filter: { userId, id },
        update: { $set: { order, updatedAt } },
      },
    }));

    const result = await this.db
      .collection(COLLECTION_NAME.TOPIC)
      .bulkWrite(ops);
    return result.modifiedCount;
  }

  async deleteTopicWithPages(
    userId: string,
    topicId: string,
    orphanAction: 'untopic' | 'delete',
    deletedAt: Date,
  ): Promise<{ deletedPageIds: string[] }> {
    const session = this.dbClient.startSession();
    session.startTransaction();
    try {
      const pages = await this.db
        .collection<PageDoc>(COLLECTION_NAME.PAGE)
        .find({ userId, topicId })
        .project({ id: 1 })
        .toArray();
      const deletedPageIds: string[] = [];

      if (orphanAction === 'delete') {
        if (pages.length > 0) {
          deletedPageIds.push(...pages.map((page) => page.id));
          await this.db
            .collection(COLLECTION_NAME.PAGE)
            .deleteMany({ userId, topicId }, { session });
          await this.db.collection(COLLECTION_NAME.TOMBSTONE).insertMany(
            deletedPageIds.map((id) => ({
              id,
              userId,
              resourceType: 'page',
              deletedAt,
            })),
            { session },
          );
        }
      } else {
        await this.db
          .collection(COLLECTION_NAME.PAGE)
          .updateMany(
            { userId, topicId },
            { $set: { topicId: null, updatedAt: deletedAt } },
            { session },
          );
      }

      await this.db
        .collection(COLLECTION_NAME.TOPIC)
        .deleteOne({ userId, id: topicId }, { session });
      await this.db.collection(COLLECTION_NAME.TOMBSTONE).insertOne(
        {
          id: topicId,
          userId,
          resourceType: 'topic',
          deletedAt,
        },
        { session },
      );

      await session.commitTransaction();
      return { deletedPageIds };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async findPagesByTopic(userId: string, topicId: string): Promise<PageDoc[]> {
    return this.db
      .collection<PageDoc>(COLLECTION_NAME.PAGE)
      .find({ userId, topicId })
      .sort({ order: 1 })
      .project<PageDoc>({ _id: 0, content: 0 })
      .toArray();
  }

  async findPageById(
    userId: string,
    id: string,
    includeContent = false,
  ): Promise<PageDoc | null> {
    return this.db.collection<PageDoc>(COLLECTION_NAME.PAGE).findOne(
      { userId, id },
      {
        projection: {
          _id: 0,
          ...(includeContent ? {} : { content: 0 }),
        },
      },
    );
  }

  async findPageContent(
    userId: string,
    id: string,
  ): Promise<Pick<PageDoc, 'id' | 'content' | 'updatedAt' | 'locked'> | null> {
    return this.db.collection<PageDoc>(COLLECTION_NAME.PAGE).findOne(
      { userId, id },
      {
        projection: { _id: 0, id: 1, content: 1, updatedAt: 1, locked: 1 },
      },
    );
  }

  async insertPage(doc: PageDoc): Promise<void> {
    await this.db.collection(COLLECTION_NAME.PAGE).insertOne(doc);
  }

  async updatePage(
    userId: string,
    id: string,
    patch: Partial<PageDoc>,
  ): Promise<void> {
    await this.db
      .collection(COLLECTION_NAME.PAGE)
      .updateOne({ userId, id }, { $set: patch });
  }

  async maxPageOrder(userId: string, topicId: string | null): Promise<number> {
    const last = await this.db
      .collection<PageDoc>(COLLECTION_NAME.PAGE)
      .find({ userId, topicId })
      .sort({ order: -1 })
      .limit(1)
      .project({ order: 1 })
      .toArray();
    return last[0]?.order ?? -1;
  }

  async shiftPageOrders(
    userId: string,
    topicId: string | null,
    fromOrder: number,
    delta: number,
    updatedAt: Date,
  ): Promise<void> {
    await this.db.collection(COLLECTION_NAME.PAGE).updateMany(
      { userId, topicId, order: { $gt: fromOrder } },
      { $inc: { order: delta }, $set: { updatedAt } },
    );
  }

  async setPageOrders(
    userId: string,
    topicId: string,
    orderedIds: string[],
    updatedAt: Date,
  ): Promise<number> {
    if (orderedIds.length === 0) {
      return 0;
    }

    const ops = orderedIds.map((id, order) => ({
      updateOne: {
        filter: { userId, topicId, id },
        update: { $set: { order, updatedAt } },
      },
    }));

    const result = await this.db
      .collection(COLLECTION_NAME.PAGE)
      .bulkWrite(ops);
    return result.modifiedCount;
  }

  async deletePage(userId: string, id: string, deletedAt: Date): Promise<void> {
    await this.db.collection(COLLECTION_NAME.PAGE).deleteOne({ userId, id });
    await this.db.collection(COLLECTION_NAME.TOMBSTONE).insertOne({
      id,
      userId,
      resourceType: 'page',
      deletedAt,
    });
  }

  async findChangedTopics(userId: string, since: Date): Promise<TopicDoc[]> {
    return this.db
      .collection<TopicDoc>(COLLECTION_NAME.TOPIC)
      .find({ userId, updatedAt: { $gt: since } })
      .project<TopicDoc>({ _id: 0 })
      .toArray();
  }

  async findChangedPageStubs(userId: string, since: Date): Promise<PageDoc[]> {
    return this.db
      .collection<PageDoc>(COLLECTION_NAME.PAGE)
      .find({ userId, updatedAt: { $gt: since } })
      .project<PageDoc>({ _id: 0, content: 0 })
      .toArray();
  }

  async findTombstones(
    userId: string,
    since: Date,
  ): Promise<TombstoneDoc[]> {
    return this.db
      .collection<TombstoneDoc>(COLLECTION_NAME.TOMBSTONE)
      .find({ userId, deletedAt: { $gt: since } })
      .project<TombstoneDoc>({ _id: 0 })
      .toArray();
  }

  async upsertTopic(doc: TopicDoc): Promise<void> {
    const { id, userId, ...rest } = doc;
    await this.db
      .collection(COLLECTION_NAME.TOPIC)
      .updateOne({ userId, id }, { $set: rest, $setOnInsert: { id, userId } }, { upsert: true });
  }

  async upsertPage(doc: PageDoc): Promise<void> {
    const { id, userId, ...rest } = doc;
    await this.db
      .collection(COLLECTION_NAME.PAGE)
      .updateOne({ userId, id }, { $set: rest, $setOnInsert: { id, userId } }, { upsert: true });
  }

  async findPreferences(userId: string): Promise<PreferenceDoc | null> {
    return this.db
      .collection<PreferenceDoc>(COLLECTION_NAME.PREFERENCE)
      .findOne({ userId }, { projection: { _id: 0 } });
  }

  async upsertPreferences(doc: PreferenceDoc): Promise<void> {
    const { userId, ...rest } = doc;
    await this.db
      .collection(COLLECTION_NAME.PREFERENCE)
      .updateOne({ userId }, { $set: rest, $setOnInsert: { userId } }, { upsert: true });
  }

  async insertAsset(doc: AssetDoc): Promise<void> {
    await this.db.collection(COLLECTION_NAME.ASSET).insertOne(doc);
  }

  async findAssetById(userId: string, id: string): Promise<AssetDoc | null> {
    return this.db
      .collection<AssetDoc>(COLLECTION_NAME.ASSET)
      .findOne({ userId, id }, { projection: { _id: 0 } });
  }

  async findAssetByIdPublic(id: string): Promise<AssetDoc | null> {
    return this.db
      .collection<AssetDoc>(COLLECTION_NAME.ASSET)
      .findOne({ id }, { projection: { _id: 0 } });
  }

  async listAssets(
    userId: string,
    query: { pageId?: string; cursor?: string; limit: number },
  ): Promise<AssetDoc[]> {
    const filter: Filter<AssetDoc> = { userId };
    if (query.pageId) {
      filter.pageId = query.pageId;
    }
    if (query.cursor) {
      filter.id = { $lt: query.cursor };
    }

    return this.db
      .collection<AssetDoc>(COLLECTION_NAME.ASSET)
      .find(filter)
      .sort({ id: -1 } as Sort)
      .limit(query.limit + 1)
      .project<AssetDoc>({ _id: 0 })
      .toArray();
  }

  async deleteAsset(userId: string, id: string): Promise<AssetDoc | null> {
    const asset = await this.findAssetById(userId, id);
    if (!asset) {
      return null;
    }

    await this.db.collection(COLLECTION_NAME.ASSET).deleteOne({ userId, id });
    try {
      await this.gridFs().delete(new ObjectId(asset.gridFsId));
    } catch {
      // GridFS file may already be missing
    }
    return asset;
  }

  async uploadGridFs(
    filename: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    const bucket = this.gridFs();
    return new Promise((resolve, reject) => {
      const stream = bucket.openUploadStream(filename, {
        metadata: { contentType },
      });
      stream.on('error', reject);
      stream.on('finish', () => resolve(stream.id.toString()));
      stream.end(buffer);
    });
  }

  openDownloadStream(gridFsId: string) {
    return this.gridFs().openDownloadStream(new ObjectId(gridFsId));
  }

  async findShareByPage(
    userId: string,
    pageId: string,
  ): Promise<ShareDoc | null> {
    return this.db
      .collection<ShareDoc>(COLLECTION_NAME.SHARE)
      .findOne({ userId, pageId }, { projection: { _id: 0 } });
  }

  async findShareByToken(shareToken: string): Promise<ShareDoc | null> {
    return this.db
      .collection<ShareDoc>(COLLECTION_NAME.SHARE)
      .findOne({ shareToken }, { projection: { _id: 0 } });
  }

  async insertShare(doc: ShareDoc): Promise<void> {
    await this.db.collection(COLLECTION_NAME.SHARE).insertOne(doc);
  }

  async updateShare(
    userId: string,
    pageId: string,
    patch: Partial<ShareDoc>,
  ): Promise<void> {
    await this.db
      .collection(COLLECTION_NAME.SHARE)
      .updateOne({ userId, pageId }, { $set: patch });
  }

  async deleteShare(userId: string, pageId: string): Promise<boolean> {
    const result = await this.db
      .collection(COLLECTION_NAME.SHARE)
      .deleteOne({ userId, pageId });
    return result.deletedCount > 0;
  }

  async findPageByIdPublic(id: string): Promise<PageDoc | null> {
    return this.db
      .collection<PageDoc>(COLLECTION_NAME.PAGE)
      .findOne({ id }, { projection: { _id: 0 } });
  }

  async findWordMemory(userId: string): Promise<WordMemoryDoc | null> {
    return this.db
      .collection<WordMemoryDoc>(COLLECTION_NAME.WORD_MEMORY)
      .findOne({ userId }, { projection: { _id: 0 } });
  }

  async upsertWordMemory(doc: WordMemoryDoc): Promise<void> {
    const { userId, ...rest } = doc;
    await this.db
      .collection(COLLECTION_NAME.WORD_MEMORY)
      .updateOne({ userId }, { $set: rest, $setOnInsert: { userId } }, { upsert: true });
  }

  async deleteWordMemory(userId: string): Promise<void> {
    await this.db.collection(COLLECTION_NAME.WORD_MEMORY).deleteOne({ userId });
  }

  async findAiKey(userId: string): Promise<AiKeyDoc | null> {
    return this.db
      .collection<AiKeyDoc>(COLLECTION_NAME.AI_KEY)
      .findOne({ userId }, { projection: { _id: 0 } });
  }

  async upsertAiKey(doc: AiKeyDoc): Promise<void> {
    const { userId, ...rest } = doc;
    await this.db
      .collection(COLLECTION_NAME.AI_KEY)
      .updateOne({ userId }, { $set: rest, $setOnInsert: { userId } }, { upsert: true });
  }

  async deleteAiKey(userId: string): Promise<void> {
    await this.db.collection(COLLECTION_NAME.AI_KEY).deleteOne({ userId });
  }

  async insertSyncEvent(doc: SyncEventDoc): Promise<void> {
    await this.db.collection(COLLECTION_NAME.SYNC_EVENT).insertOne(doc);
  }

  async findSyncEventsSince(
    userId: string,
    since: Date,
  ): Promise<SyncEventDoc[]> {
    return this.db
      .collection<SyncEventDoc>(COLLECTION_NAME.SYNC_EVENT)
      .find({ userId, createdAt: { $gt: since } })
      .sort({ createdAt: 1 })
      .limit(100)
      .project<SyncEventDoc>({ _id: 0 })
      .toArray();
  }
}
