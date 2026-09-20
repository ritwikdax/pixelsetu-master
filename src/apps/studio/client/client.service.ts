import { ContextService } from '@/modules/common';
import { AppError } from '@/modules/common/error/app.error';
import { JwtService } from '@/modules/auth/jwt.service';
import { Injectable } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import { ClientRepository } from './client.repo';
import { type LoginPayload, type SelectImage } from './schema';
import type { Album } from '../schema';

const CLIENT_TOKEN_TTL = '60d';

@Injectable()
export class ClientService {
  constructor(
    private readonly context: ContextService,
    private readonly jwtService: JwtService,
    private readonly clientRepository: ClientRepository,
  ) {}

  async login(payload: LoginPayload): Promise<string> {
    const matches = await this.clientRepository.findProjectByCredentials(
      payload.phone,
      payload.password,
    );

    if (matches.length !== 1) {
      throw new AppError('UnauthorizedError', 'Invalid credentials');
    }

    const project = matches[0];

    if (!project.id || !project.orgId) {
      throw new AppError('UnauthorizedError', 'Invalid credentials');
    }

    return this.jwtService.sign(
      {
        projectId: project.id,
        phone: project.phone,
        orgId: project.orgId,
      },
      { expiresIn: CLIENT_TOKEN_TTL },
    );
  }

  async selectImage(payload: SelectImage) {
    const albumId = payload.albumId;
    const album = await this.getAlbumOrThrow(albumId);

    this.assertAlbumNotSubmitted(album);

    if (!album.isSelectionAllowed) {
      throw new AppError(
        'ForbiddenError',
        'Selection is not allowed for this album',
      );
    }

    if (album.status === 'submitted') {
      throw new AppError(
        'ForbiddenError',
        'Selection cannot be changed after the album has been submitted',
      );
    }

    const projectId = this.projectId();
    const orgId = this.orgId();
    const existing = await this.clientRepository.findSelectedImage(
      albumId,
      payload.imageId,
      projectId,
      orgId,
    );

    if (!existing) {
      const selectedCount = await this.clientRepository.countSelectedImages(
        albumId,
        projectId,
        orgId,
      );

      if (selectedCount >= album.maxSelectionCount) {
        throw new AppError(
          'ValidationError',
          'Maximum selection count reached',
        );
      }
    }

    const now = new Date();
    const doc = {
      id: existing?.id ?? uuidv7(),
      albumId,
      folderName: payload.folderName,
      projectId: album.projectId,
      orgId,
      name: payload.name,
      imageId: payload.imageId,
      parentFolderId: payload.parentFolderId,
      ...(payload.folderName !== undefined
        ? { folderName: payload.folderName }
        : {}),
      ...(payload.comment !== undefined ? { comment: payload.comment } : {}),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    await this.clientRepository.upsertSelectedImage(doc, !existing);
    return doc;
  }

  async unselectImage(albumId: string, imageId: string) {
    const album = await this.getAlbumOrThrow(albumId);
    this.assertAlbumNotSubmitted(album);

    const deleted = await this.clientRepository.deleteSelectedImage(
      albumId,
      imageId,
      this.projectId(),
      this.orgId(),
    );

    if (!deleted) {
      throw new AppError('NotFoundError', 'Selected image not found');
    }
  }

  async getStatus() {
    const projectId = this.projectId();
    const orgId = this.orgId();
    const project = await this.clientRepository.findProjectById(
      projectId,
      orgId,
    );

    if (!project) {
      throw new AppError('NotFoundError', 'Project not found');
    }

    const albums = await this.clientRepository.findAlbumsByProjectId(
      projectId,
      orgId,
    );

    return {
      projectName: project.name,
      displayName: project.displayName,
      albums: albums.map((album) => ({
        id: album.id,
        name: album.name,
        isSubmitted: album.isSubmitted,
        isSelectionAllowed: album.isSelectionAllowed,
        maxSelectionCount: album.maxSelectionCount,
      })),
      softcopyUrl: project.softcopyUrl,
    };
  }

  async submitSelection(albumId: string) {
    const album = await this.getAlbumOrThrow(albumId);

    if (album.isSubmitted) {
      throw new AppError(
        'ForbiddenError',
        'Selection has already been submitted for this album',
      );
    }

    const selectedCount = album.alreadySelectedCount ?? 0;

    if (selectedCount > album.maxSelectionCount) {
      throw new AppError(
        'ValidationError',
        'Selected image count exceeds the maximum allowed',
      );
    }

    await this.clientRepository.submitAlbumSelection(
      albumId,
      this.projectId(),
      this.orgId(),
    );
  }

  async getSelectedImages(
    albumId: string,
  ): Promise<Array<{ id: string; name: string }>> {
    await this.getAlbumOrThrow(albumId);

    return this.clientRepository.findSelectedImages(
      albumId,
      this.projectId(),
      this.orgId(),
    );
  }

  private assertAlbumNotSubmitted(album: Album) {
    if (album.isSubmitted) {
      throw new AppError(
        'ForbiddenError',
        'Selection cannot be changed after the album has been submitted',
      );
    }
  }

  private async getAlbumOrThrow(albumId: string) {
    const album = await this.clientRepository.findAlbum(
      albumId,
      this.projectId(),
      this.orgId(),
    );

    if (!album) {
      throw new AppError('NotFoundError', 'Album not found');
    }

    return album;
  }

  private projectId(): string {
    return this.context.getOrThrow('projectId');
  }

  private orgId(): string {
    return this.context.getOrThrow('orgId');
  }
}
