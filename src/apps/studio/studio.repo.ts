import { InjectDb, InjectDbClient } from '@/modules/common';
import { Injectable } from '@nestjs/common';
import { Db, FindCursor, MongoClient } from 'mongodb';
import { COLLECTION_NAME } from './const';
import { Project } from './schema';
import type { SelectedImage } from './client/schema';

@Injectable()
export class StudioRepository {
  constructor(
    @InjectDb() private readonly db: Db,
    @InjectDbClient() private readonly dbClient: MongoClient,
  ) {}
  async deleteProjectById(projectId: string, orgId: string) {
    const session = this.dbClient.startSession();
    session.startTransaction();
    try {
      const project = await this.db
        .collection(COLLECTION_NAME.PROJECT)
        .findOne({ id: projectId, orgId });
      if (!project) {
        throw new Error('Project not found');
      }
      await this.db
        .collection(COLLECTION_NAME.PROJECT)
        .deleteOne({ id: projectId, orgId });
      await this.db
        .collection(COLLECTION_NAME.ALBUM)
        .deleteMany({ projectId, orgId });
      await this.db
        .collection(COLLECTION_NAME.SELECTED_IMAGES)
        .deleteMany({ projectId, orgId });
      await this.db
        .collection(COLLECTION_NAME.PAYMENT)
        .deleteMany({ projectId, orgId });
      await session.commitTransaction();
    } finally {
      await session.endSession();
    }
  }

  async deleteAlbum(albumId: string, orgId: string) {
    const session = this.dbClient.startSession();
    session.startTransaction();
    try {
      const result = await this.db
        .collection(COLLECTION_NAME.ALBUM)
        .deleteOne({ id: albumId, orgId });

      if (result.deletedCount === 0) {
        throw new Error('Album not found');
      }

      await this.db
        .collection(COLLECTION_NAME.SELECTED_IMAGES)
        .deleteMany({ albumId, orgId });

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async updateProject(
    projectId: string,
    orgId: string,
    project: Partial<Project>,
  ) {
    const session = this.dbClient.startSession();
    const now = new Date();
    session.startTransaction();
    try {
      if (project.name) {
        await this.db
          .collection(COLLECTION_NAME.PROJECT)
          .updateOne(
            { id: projectId, orgId },
            { $set: { ...project, updatedAt: now } },
          );
        await this.db
          .collection(COLLECTION_NAME.ALBUM)
          .updateMany(
            { projectId, orgId },
            { $set: { projectName: project.name, updatedAt: now } },
          );
        await this.db
          .collection(COLLECTION_NAME.PAYMENT)
          .updateMany(
            { projectId, orgId },
            { $set: { projectName: project.name, updatedAt: now } },
          );
      } else {
        await this.db
          .collection(COLLECTION_NAME.PROJECT)
          .updateOne(
            { id: projectId, orgId },
            { $set: { ...project, updatedAt: now } },
          );
      }
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  streamSelectedImages(
    albumId: string,
    projectId: string,
    orgId: string,
  ): FindCursor<Pick<SelectedImage, 'name' | 'folderName' | 'comment'>> {
    return this.db
      .collection<SelectedImage>(COLLECTION_NAME.SELECTED_IMAGES)
      .find({ albumId, projectId, orgId })
      .sort({ folderName: 1, name: 1 })
      .project<Pick<SelectedImage, 'name' | 'folderName' | 'comment'>>({
        _id: 0,
        name: 1,
        folderName: 1,
        comment: 1,
      });
  }

  async countSelectedImages(
    albumId: string,
    projectId: string,
    orgId: string,
  ): Promise<number> {
    return this.db
      .collection(COLLECTION_NAME.SELECTED_IMAGES)
      .countDocuments({ albumId, projectId, orgId });
  }
}
