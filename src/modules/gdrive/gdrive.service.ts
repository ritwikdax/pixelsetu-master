import { google, drive_v3 } from 'googleapis';
import axios from 'axios';
import { GdriveClient } from './decorators.js';
import { Injectable } from '@nestjs/common';
import { FolderDetails } from './types.js';
import { Cache, CacheService } from '@common';

const logger = console; // Replace with your preferred logging mechanism

@Injectable()
export class GDriveService {
  constructor(
    @GdriveClient() private readonly drive: drive_v3.Drive,
    private readonly cache: CacheService,
  ) {}

  @Cache()
  async getFolderDetailsById(folderId: string): Promise<FolderDetails> {
    try {
      const res = await this.drive.files.get({
        fileId: folderId,
        fields:
          'id, name, mimeType, createdTime, modifiedTime, owners, size, webViewLink',
      });
      return res.data as FolderDetails;
    } catch (err: any) {
      logger.error('❌ Error in getFolderDetails:', {
        error: err,
        message: err?.message,
        stack: err?.stack,
        folderId,
      });
      throw err; // Re-throw to let the caller handle it
    }
  }

  @Cache() // Cache for 1 hour
  async getAllSubfolders(folderId: string): Promise<FolderDetails[]> {
    try {
      const res = await this.drive.files.list({
        q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields:
          'files(id, name, mimeType, createdTime, modifiedTime, owners, webViewLink)',
        orderBy: 'name',
      });
      return res.data.files as FolderDetails[];
    } catch (err: any) {
      logger.error('❌ Error in getAllSubfolders:', {
        error: err,
        message: err?.message,
        stack: err?.stack,
        folderId,
      });
      throw err; // Re-throw to let the caller handle it
    }
  }

  async getThumbnailImage(fileId: string) {
    try {
      const file = await this.drive.files.get({
        fileId,
        fields: 'thumbnailLink',
      });
      const thumbnailUrl = file.data.thumbnailLink;

      if (!thumbnailUrl) {
        throw new Error('No thumbnail available for this file');
      }
      const response = await axios.get(thumbnailUrl, {
        responseType: 'stream',
      });
      return response;
    } catch (err: any) {
      logger.error('❌ Error in fetching thumbnail:', {
        error: err,
        message: err?.message,
        stack: err?.stack,
        fileId,
      });
      throw err; // Re-throw to let the caller handle it
    }
  }

  async getPreviewImage(fileId: string) {
    try {
      const file = await this.drive.files.get({
        fileId,
        fields: 'thumbnailLink',
      });

      const originalLink = file.data.thumbnailLink ?? '';
      const hdPreviewLink = originalLink.replace(/=s\d+/, '=s1024');

      if (!hdPreviewLink) {
        throw new Error('No preview available for this file');
      }

      const response = await axios.get(hdPreviewLink, {
        responseType: 'stream',
      });

      return response;
    } catch (err: any) {
      logger.error('❌ Error in getPreviewImage:', {
        error: err,
        message: err?.message,
        stack: err?.stack,
        fileId,
      });
      throw err; // Re-throw to let the caller handle it
    }
  }
}
