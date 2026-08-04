import { Db, DeleteResult, InsertOneResult } from 'mongodb';
import { InjectDb } from '../common.decorators';
import { EntityMetadata } from '../config/type';
import { Injectable } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import {
  ListQuery,
  ListQueryOptions,
  ListQueryResult,
  StandardFilter,
} from './interface';
import { ListQueryParser } from './dbquery.parser';
import { AppLogger } from '../logging/app.logger';

@Injectable()
export class Repository<T extends EntityMetadata> {
  private readonly DEFAULT_LIMIT = 100;
  private readonly logger = new AppLogger(Repository.name);

  constructor(@InjectDb() private readonly db: Db) {}

  async query(
    collectionName: string,
    q: ListQuery,
    options?: ListQueryOptions,
  ): Promise<ListQueryResult<T>> {
    this.logger.debug(`query collection=${collectionName}`);
    try {
      const parsed = ListQueryParser.parse(q, {
        defaultLimit: this.DEFAULT_LIMIT,
        ...options,
      });

      const collection = this.db.collection(collectionName);
      const fetchLimit = parsed.limit + 1;

      let results: Record<string, unknown>[];

      if (parsed.lookups.length > 0) {
        const pipeline: Record<string, unknown>[] = [
          { $match: parsed.filter },
          { $sort: parsed.sort },
          { $limit: fetchLimit },
          ...parsed.lookups,
        ];

        if (parsed.projection) {
          pipeline.push({ $project: parsed.projection });
        } else {
          pipeline.push({ $project: { _id: 0 } });
        }

        results = await collection.aggregate(pipeline).toArray();
      } else {
        const cursor = collection
          .find(parsed.filter)
          .sort(parsed.sort)
          .limit(fetchLimit);

        if (parsed.projection) {
          cursor.project(parsed.projection);
        } else {
          cursor.project({ _id: 0 });
        }

        results = await cursor.toArray();
      }

      let next: string | undefined;
      if (results.length > parsed.limit) {
        const lastDoc = results[parsed.limit - 1];
        next = ListQueryParser.encodeCursor(lastDoc, parsed.sort);
        results = results.slice(0, parsed.limit);
      }

      return { data: results as T[], next };
    } catch (err) {
      this.logger.error(
        `query failed collection=${collectionName}`,
        err instanceof Error ? err.stack : String(err),
      );
      throw err;
    }
  }

  async findAll(
    collectionName: string,
    standardFilter?: StandardFilter,
  ): Promise<T[]> {
    this.logger.debug(`findAll collection=${collectionName}`);
    try {
      const filter = standardFilter?.nextToken
        ? {
            id: {
              $gt: standardFilter.nextToken,
            },
          }
        : {};
      const collection = this.db.collection(collectionName);
      const data = (await collection
        .find(filter)
        .limit(this.DEFAULT_LIMIT)
        .project({ _id: 0 })
        .toArray()) as any;
      return data as T[];
    } catch (err) {
      this.logger.error(
        `findAll failed collection=${collectionName}`,
        err instanceof Error ? err.stack : String(err),
      );
      throw err;
    }
  }

  async findById(collectionName: string, id: string): Promise<T | null> {
    this.logger.debug(`findById collection=${collectionName} id=${id}`);
    try {
      const collection = this.db.collection(collectionName);
      const data = await collection.findOne({ id });
      return data as T | null;
    } catch (err) {
      this.logger.error(
        `findById failed collection=${collectionName} id=${id}`,
        err instanceof Error ? err.stack : String(err),
      );
      throw err;
    }
  }

  async create(collectionName: string, entity: T): Promise<InsertOneResult<T>> {
    this.logger.debug(`create collection=${collectionName}`);
    try {
      const entityWithMetadata = {
        ...entity,
        id: uuidv7(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const collection = this.db.collection(collectionName);
      return await collection.insertOne(entityWithMetadata);
    } catch (err) {
      this.logger.error(
        `create failed collection=${collectionName}`,
        err instanceof Error ? err.stack : String(err),
      );
      throw err;
    }
  }

  async update(
    collectionName: string,
    id: string,
    entity: Partial<T>,
  ): Promise<void> {
    this.logger.debug(`update collection=${collectionName} id=${id}`);
    try {
      const entityWithUpdatedAt = {
        ...entity,
        updatedAt: new Date(),
      };
      const collection = this.db.collection(collectionName);
      await collection.updateOne({ id }, { $set: entityWithUpdatedAt });
    } catch (err) {
      this.logger.error(
        `update failed collection=${collectionName} id=${id}`,
        err instanceof Error ? err.stack : String(err),
      );
      throw err;
    }
  }

  async delete(collectionName: string, id: string): Promise<DeleteResult> {
    this.logger.debug(`delete collection=${collectionName} id=${id}`);
    try {
      const collection = this.db.collection(collectionName);
      return await collection.deleteOne({ id });
    } catch (err) {
      this.logger.error(
        `delete failed collection=${collectionName} id=${id}`,
        err instanceof Error ? err.stack : String(err),
      );
      throw err;
    }
  }
}
