import { InjectDb, InjectDbClient } from '@/modules/common';
import { Injectable } from '@nestjs/common';
import { Db, MongoClient } from 'mongodb';
import { COLLECTION_NAME } from '../const';
import type { Album, Project } from '../schema';
import type { SelectedImage } from './schema';

@Injectable()
export class ClientRepository {
  constructor(
    @InjectDb() private readonly db: Db,
    @InjectDbClient() private readonly dbClient: MongoClient,
  ) {}

  async findProjectByCredentials(
    phone: string,
    password: string,
  ): Promise<Array<{ id?: string; phone?: string; orgId?: string }>> {
    return this.db
      .collection(COLLECTION_NAME.PROJECT)
      .find({ phone, password })
      .project({ id: 1, phone: 1, orgId: 1 })
      .toArray();
  }

  async findProjectById(
    projectId: string,
    orgId: string,
  ): Promise<Project | null> {
    return this.db
      .collection<Project>(COLLECTION_NAME.PROJECT)
      .findOne({ id: projectId, orgId });
  }

  async findAlbumsByProjectId(
    projectId: string,
    orgId: string,
  ): Promise<
    Array<
      Pick<
        Album,
        | 'id'
        | 'name'
        | 'isSelectionAllowed'
        | 'maxSelectionCount'
        | 'isSubmitted'
      >
    >
  > {
    return this.db
      .collection<Album>(COLLECTION_NAME.ALBUM)
      .find({ projectId, orgId })
      .project<
        Pick<
          Album,
          | 'id'
          | 'name'
          | 'isSelectionAllowed'
          | 'maxSelectionCount'
          | 'isSubmitted'
        >
      >({
        id: 1,
        name: 1,
        isSelectionAllowed: 1,
        maxSelectionCount: 1,
        isSubmitted: 1,
        _id: 0,
      })
      .toArray();
  }

  async findAlbum(
    albumId: string,
    projectId: string,
    orgId: string,
  ): Promise<Album | null> {
    return this.db
      .collection<Album>(COLLECTION_NAME.ALBUM)
      .findOne({ id: albumId, projectId, orgId });
  }

  async findSelectedImage(
    albumId: string,
    imageId: string,
    projectId: string,
    orgId: string,
  ): Promise<SelectedImage | null> {
    return this.db
      .collection<SelectedImage>(COLLECTION_NAME.SELECTED_IMAGES)
      .findOne({ albumId, imageId, projectId, orgId });
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

  async upsertSelectedImage(
    doc: SelectedImage,
    isNew: boolean,
  ): Promise<void> {
    const session = this.dbClient.startSession();
    session.startTransaction();
    try {
      await this.db.collection(COLLECTION_NAME.SELECTED_IMAGES).updateOne(
        {
          albumId: doc.albumId,
          imageId: doc.imageId,
          projectId: doc.projectId,
          orgId: doc.orgId,
        },
        {
          $set: {
            name: doc.name,
            parentFolderId: doc.parentFolderId,
            updatedAt: doc.updatedAt,
            ...(doc.folderName !== undefined
              ? { folderName: doc.folderName }
              : {}),
            ...(doc.comment !== undefined ? { comment: doc.comment } : {}),
          },
          $setOnInsert: {
            id: doc.id,
            albumId: doc.albumId,
            imageId: doc.imageId,
            projectId: doc.projectId,
            orgId: doc.orgId,
            createdAt: doc.createdAt,
          },
        },
        { upsert: true, session },
      );

      const albumUpdate: {
        $set: { status: 'in_progress'; updatedAt: Date };
        $inc?: { alreadySelectedCount: number };
      } = {
        $set: {
          status: 'in_progress',
          updatedAt: doc.updatedAt,
        },
      };

      if (isNew) {
        albumUpdate.$inc = { alreadySelectedCount: 1 };
      }

      await this.db.collection(COLLECTION_NAME.ALBUM).updateOne(
        { id: doc.albumId, projectId: doc.projectId, orgId: doc.orgId },
        albumUpdate,
        { session },
      );
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async deleteSelectedImage(
    albumId: string,
    imageId: string,
    projectId: string,
    orgId: string,
  ): Promise<boolean> {
    const session = this.dbClient.startSession();
    session.startTransaction();
    try {
      const result = await this.db
        .collection(COLLECTION_NAME.SELECTED_IMAGES)
        .deleteOne({ albumId, imageId, projectId, orgId }, { session });

      if (result.deletedCount === 0) {
        await session.abortTransaction();
        return false;
      }

      await this.db.collection(COLLECTION_NAME.ALBUM).updateOne(
        {
          id: albumId,
          projectId,
          orgId,
        },
        {
          $inc: { alreadySelectedCount: -1 },
          $set: { updatedAt: new Date() },
        },
        { session },
      );
      await session.commitTransaction();
      return true;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async submitAlbumSelection(
    albumId: string,
    projectId: string,
    orgId: string,
  ): Promise<void> {
    await this.db.collection(COLLECTION_NAME.ALBUM).updateOne(
      { id: albumId, projectId, orgId },
      {
        $set: {
          isSubmitted: true,
          isSelectionAllowed: false,
          status: 'submitted',
          updatedAt: new Date(),
        },
      },
    );
  }

  async findSelectedImages(
    albumId: string,
    projectId: string,
    orgId: string,
  ): Promise<Array<{ id: string; name: string }>> {
    const docs = await this.db
      .collection(COLLECTION_NAME.SELECTED_IMAGES)
      .find({ albumId, projectId, orgId })
      .project({ imageId: 1, name: 1, _id: 0 })
      .toArray();

    return docs.map((doc) => ({
      id: doc.imageId as string,
      name: doc.name as string,
    }));
  }
}
