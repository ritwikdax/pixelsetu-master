import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { AppError } from '@/modules/common/error/app.error';
import { AppLogger } from '@/modules/common/logging/app.logger';
import type { FolderContentsQuery } from './schema';

const FOLDER_MIME = 'application/vnd.google-apps.folder';
const THUMBNAIL_WIDTH = 240;
const PREVIEW_WIDTH = 900;
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|heic|heif|tiff?|bmp|avif)$/i;

export interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
}

export interface FolderContents {
  folders: DriveItem[];
  files: DriveItem[];
  nextPageToken?: string;
}

export interface DriveImagePayload {
  stream: NodeJS.ReadableStream;
  mimeType: string;
}

@Injectable()
export class DriveService {
  private readonly logger = new AppLogger(DriveService.name);

  async getFolderContents(
    folderId: string,
    query: FolderContentsQuery,
  ): Promise<FolderContents> {
    this.assertDriveId(folderId);

    try {
      return await this.listViaPublicDriveApi(folderId, query);
    } catch (err) {
      this.logger.warn(
        `Public Drive API list failed for ${folderId}, using folder view`,
      );
      try {
        return await this.listViaPublicFolderView(folderId, query);
      } catch (fallbackErr) {
        this.logger.error(
          'Unable to list public folder',
          fallbackErr instanceof Error ? fallbackErr.stack : String(fallbackErr),
        );
        throw this.toAppError(err, 'Unable to list folder contents');
      }
    }
  }

  async getThumbnailImage(imageId: string): Promise<DriveImagePayload> {
    return this.fetchHostedImage(imageId, THUMBNAIL_WIDTH);
  }

  async getPreviewImage(imageId: string): Promise<DriveImagePayload> {
    return this.fetchHostedImage(imageId, PREVIEW_WIDTH);
  }

  private async listViaPublicDriveApi(
    folderId: string,
    query: FolderContentsQuery,
  ): Promise<FolderContents> {
    const folders: DriveItem[] = [];
    const files: DriveItem[] = [];

    const response = await axios.get<{
      nextPageToken?: string;
      files?: Array<{
        id?: string;
        name?: string;
        mimeType?: string;
      }>;
    }>('https://www.googleapis.com/drive/v3/files', {
      params: {
        q: `'${folderId}' in parents and trashed = false and (mimeType = '${FOLDER_MIME}' or mimeType contains 'image/')`,
        pageSize: query.limit,
        fields: 'nextPageToken,files(id,name,mimeType)',
        pageToken: query.pageToken,
        orderBy: 'folder,name',
      },
      timeout: 20_000,
    });

    for (const file of response.data.files ?? []) {
      if (!file.id || !file.mimeType) {
        continue;
      }

      const item: DriveItem = {
        id: file.id,
        name: file.name ?? '',
        mimeType: file.mimeType,
      };

      if (file.mimeType === FOLDER_MIME) {
        folders.push(item);
      } else {
        files.push(item);
      }
    }

    return {
      folders,
      files,
      nextPageToken: response.data.nextPageToken,
    };
  }

  private async listViaPublicFolderView(
    folderId: string,
    query: FolderContentsQuery,
  ): Promise<FolderContents> {
    const response = await axios.get<string>(
      'https://drive.google.com/embeddedfolderview',
      {
        params: { id: folderId },
        responseType: 'text',
        timeout: 20_000,
        headers: {
          Accept: 'text/html',
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      },
    );

    return this.paginateFolderContents(
      this.parseEmbeddedFolderView(response.data, folderId),
      query,
    );
  }

  private parseEmbeddedFolderView(
    html: string,
    folderId: string,
  ): FolderContents {
    const folders = new Map<string, DriveItem>();
    const files = new Map<string, DriveItem>();
    const blocks = html.split('class="flip-entry"');

    for (const block of blocks.slice(1)) {
      const idMatch = block.match(/id="entry-([^"]+)"/);
      const id = idMatch?.[1];
      if (!id || id === folderId) {
        continue;
      }

      const name =
        block.match(/class="flip-entry-title"[^>]*>([^<]+)/)?.[1]?.trim() ??
        '';
      const isFolder = /drive\.google\.com\/drive\/folders\//.test(block);

      if (isFolder) {
        folders.set(id, {
          id,
          name,
          mimeType: FOLDER_MIME,
        });
        continue;
      }

      if (IMAGE_EXT.test(name) || /drive\.google\.com\/file\/d\//.test(block)) {
        if (name && !IMAGE_EXT.test(name)) {
          continue;
        }
        files.set(id, {
          id,
          name,
          mimeType: this.guessImageMime(name),
        });
      }
    }

    if (folders.size === 0 && files.size === 0) {
      throw new AppError('NotFoundError', 'Folder contents not found');
    }

    return {
      folders: [...folders.values()],
      files: [...files.values()],
    };
  }

  private paginateFolderContents(
    contents: FolderContents,
    query: FolderContentsQuery,
  ): FolderContents {
    const items = [...contents.folders, ...contents.files];
    const offset = query.pageToken
      ? this.parseOffsetToken(query.pageToken)
      : 0;
    const page = items.slice(offset, offset + query.limit);
    const nextOffset = offset + query.limit;

    return {
      folders: page.filter((item) => item.mimeType === FOLDER_MIME),
      files: page.filter((item) => item.mimeType !== FOLDER_MIME),
      nextPageToken:
        nextOffset < items.length ? String(nextOffset) : undefined,
    };
  }

  private parseOffsetToken(token: string): number {
    const offset = Number(token);
    if (!Number.isInteger(offset) || offset < 0) {
      throw new AppError('ValidationError', 'Invalid page token');
    }
    return offset;
  }

  private async fetchHostedImage(
    imageId: string,
    width: number,
  ): Promise<DriveImagePayload> {
    this.assertDriveId(imageId);

    const url = `https://lh3.googleusercontent.com/d/${imageId}=w${width}?authuser=0`;

    try {
      const response = await axios.get(url, {
        responseType: 'stream',
        timeout: 30_000,
        maxRedirects: 5,
      });

      return {
        stream: response.data,
        mimeType:
          String(response.headers['content-type'] ?? '').split(';')[0] ||
          'image/jpeg',
      };
    } catch (err) {
      this.logger.error(
        `Failed to fetch public image ${imageId}`,
        err instanceof Error ? err.stack : String(err),
      );
      throw this.toAppError(err, 'Image not found');
    }
  }

  private guessImageMime(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      case 'bmp':
        return 'image/bmp';
      case 'tif':
      case 'tiff':
        return 'image/tiff';
      case 'heic':
      case 'heif':
        return 'image/heic';
      case 'avif':
        return 'image/avif';
      default:
        return 'image/jpeg';
    }
  }

  private assertDriveId(id: string) {
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      throw new AppError('ValidationError', 'Invalid Drive file id');
    }
  }

  private toAppError(err: unknown, notFoundMessage: string): AppError {
    const status = (err as { response?: { status?: number } })?.response
      ?.status;
    if (status === 404 || status === 400) {
      return new AppError('NotFoundError', notFoundMessage);
    }
    if (status === 401 || status === 403) {
      return new AppError('ForbiddenError', 'Drive folder is not public');
    }
    return new AppError('InternalServerError', 'Google Drive request failed');
  }
}
