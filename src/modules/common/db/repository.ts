import { Db, DeleteResult, InsertOneResult } from 'mongodb';
import { InjectDb } from '../common.decorators';
import { EntityMetadata } from '../config/type';
import { Injectable } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import { StandardFilter } from './interface';

@Injectable()
export class Repository<T extends EntityMetadata> {
  private readonly DEFAULT_LIMIT = 100;
  constructor(@InjectDb() private readonly db: Db) {}

  async findAll(
    collectionName: string,
    standardFilter?: StandardFilter,
  ): Promise<T[]> {
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
  }

  async findById(collectionName: string, id: string): Promise<T | null> {
    const collection = this.db.collection(collectionName);
    const data = await collection.findOne({ id });
    return data as T | null;
  }

  async create(collectionName: string, entity: T): Promise<InsertOneResult<T>> {
    const entityWithMetadata = {
      ...entity,
      id: uuidv7(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const collection = this.db.collection(collectionName);
    return await collection.insertOne(entityWithMetadata);
  }

  async update(
    collectionName: string,
    id: string,
    entity: Partial<T>,
  ): Promise<void> {
    const entityWithUpdatedAt = {
      ...entity,
      updatedAt: new Date(),
    };
    const collection = this.db.collection(collectionName);
    await collection.updateOne({ id }, { $set: entityWithUpdatedAt });
  }

  //   async update(collectionName: string, id: string, entity: T): Promise<void> {
  //     const collection = this.db.collection(collectionName);
  //     await collection.updateOne({ id }, { $set: entity });
  //   }

  async delete(collectionName: string, id: string): Promise<DeleteResult> {
    const collection = this.db.collection(collectionName);
    return await collection.deleteOne({ id });
  }
}
