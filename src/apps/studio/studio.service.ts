import { ContextService, ListQuery, Repository } from '@/modules/common';
import { AppError } from '@/modules/common/error/app.error';
import {
  Project,
  CreateAlbum,
  UpdateAlbum,
  CreatePayment,
  UpdatePayment,
  type Album,
} from './schema';
import { COLLECTION_NAME } from './const';
import { Injectable } from '@nestjs/common';
import { Readable } from 'stream';
import { StudioRepository } from './studio.repo';
import {
  formatDate,
  formatDateTime,
  formatDownloadFilename,
  generateRandomPassword,
  humanizeLabel,
} from './utils';

const LIST_DIVIDER = '='.repeat(72);
const LIST_RULE = '-'.repeat(72);
const META_LABEL_WIDTH = 18;

@Injectable()
export class StudioService {
  constructor(
    private readonly repository: Repository<any>,
    private readonly context: ContextService,
    private readonly studioRepository: StudioRepository,
  ) {}

  async listProjects(query: ListQuery) {
    const orgId = this.context.getOrThrow('orgId');
    return this.repository.query(COLLECTION_NAME.PROJECT, query, {
      baseFilter: { orgId },
      searchFields: ['name', 'displayName', 'email', 'phone'],
    });
  }

  async createProject(project: Project) {
    const orgId = this.context.getOrThrow('orgId');
    const now = new Date();
    const password = generateRandomPassword();

    return this.repository.create(COLLECTION_NAME.PROJECT, {
      ...project,
      orgId,
      password,
      createdAt: now,
      updatedAt: now,
    });
  }

  async updateProject(id: string, project: Project) {
    return await this.studioRepository.updateProject(
      id,
      this.context.getOrThrow('orgId'),
      project,
    );
  }

  async getProjectById(id: string) {
    return await this.repository.findOne(
      COLLECTION_NAME.PROJECT,
      {
        id: id,
        orgId: this.context.getOrThrow('orgId'),
      },
      {
        projection: {
          _id: 0,
          orgId: 0,
        },
      },
    );
  }

  private async getProjectOrThrow(projectId: string): Promise<Project> {
    const project = await this.repository.findOne(COLLECTION_NAME.PROJECT, {
      id: projectId,
      orgId: this.context.getOrThrow('orgId'),
    });

    if (!project) {
      throw new AppError('NotFoundError', 'Project not found');
    }

    return project as Project;
  }

  async deleteProjectById(projectId: string) {
    return await this.studioRepository.deleteProjectById(
      projectId,
      this.context.getOrThrow('orgId'),
    );
  }

  //==================== ALBUMS ====================

  async listAlbums(query: ListQuery) {
    const orgId = this.context.getOrThrow('orgId');
    return this.repository.query(COLLECTION_NAME.ALBUM, query, {
      baseFilter: { orgId },
      searchFields: ['name', 'projectName', 'projectId'],
    });
  }

  async getAlbumByProjectId(projectId: string) {
    return await this.repository.findAll(COLLECTION_NAME.ALBUM, {
      projectId,
      orgId: this.context.getOrThrow('orgId'),
    });
  }

  async getAlbumById(id: string) {
    const album = await this.repository.findOne(COLLECTION_NAME.ALBUM, {
      id,
      orgId: this.context.getOrThrow('orgId'),
    });

    if (!album) {
      throw new AppError('NotFoundError', 'Album not found');
    }

    return album;
  }

  async createAlbum(album: CreateAlbum) {
    await this.getProjectOrThrow(album.projectId);
    const { projectId, projectName, status, ...rest } = album;
    return this.repository.create(COLLECTION_NAME.ALBUM, {
      ...rest,
      alreadySelectedCount: 0,

      projectId,
      projectName,
      status: status ?? 'not_started',
      orgId: this.context.getOrThrow('orgId'),
    });
  }

  async updateAlbum(id: string, album: UpdateAlbum) {
    const patch = Object.fromEntries(
      Object.entries(album).filter(([, value]) => value !== undefined),
    );

    return await this.repository.update(COLLECTION_NAME.ALBUM, id, patch, {
      orgId: this.context.getOrThrow('orgId'),
    });
  }

  async deleteAlbum(id: string) {
    await this.getAlbumById(id);
    return this.studioRepository.deleteAlbum(
      id,
      this.context.getOrThrow('orgId'),
    );
  }

  async downloadAlbumSelectionList(albumId: string): Promise<{
    stream: Readable;
    filename: string;
  }> {
    const album = (await this.getAlbumById(albumId)) as Album;
    const project = (await this.getProjectById(album.projectId)) as Project | null;
    const orgId = this.context.getOrThrow('orgId');
    const selectedCount = await this.studioRepository.countSelectedImages(
      album.id,
      album.projectId,
      orgId,
    );

    const cursor = this.studioRepository.streamSelectedImages(
      album.id,
      album.projectId,
      orgId,
    );

    const header = this.formatSelectionListHeader(
      album,
      project,
      selectedCount,
    );

    async function* generateList() {
      yield header;

      let index = 0;
      let currentFolder: string | undefined;
      const comments: Array<{
        name: string;
        folderName: string;
        comment: string;
      }> = [];

      try {
        for await (const image of cursor) {
          index += 1;
          const folderName = image.folderName?.trim() || 'Ungrouped';

          if (currentFolder !== folderName) {
            if (currentFolder !== undefined) {
              yield '\n';
            }
            yield `${folderName}\n`;
            currentFolder = folderName;
          }

          yield `  ${image.name}\n`;

          const comment = image.comment?.trim();
          if (comment) {
            comments.push({ name: image.name, folderName, comment });
          }
        }
      } finally {
        await cursor.close();
      }

      if (index === 0) {
        yield '  No images have been selected for this album yet.\n\n';
      } else {
        yield '\n';
      }

      if (comments.length > 0) {
        yield `${LIST_RULE}\nCOMMENTS (${comments.length})\n${LIST_RULE}\n\n`;
        for (const item of comments) {
          yield `${item.name}  •  ${item.folderName}\n`;
          for (const line of item.comment.split(/\r?\n/)) {
            yield `  ${line}\n`;
          }
          yield '\n';
        }
      }

      yield `${LIST_RULE}\nEND OF LIST  •  ${index} image${index === 1 ? '' : 's'}\n${LIST_DIVIDER}\n`;
    }

    return {
      stream: Readable.from(generateList(), { encoding: 'utf8' }),
      filename: formatDownloadFilename([
        project?.name ?? album.projectName,
        album.name,
      ]),
    };
  }

  private formatSelectionListHeader(
    album: Album,
    project: Project | null,
    selectedCount: number,
  ): string {
    const yesNo = (value: boolean | undefined) => (value ? 'Yes' : 'No');
    const generatedAt = formatDateTime(new Date());

    return [
      `${LIST_DIVIDER}`,
      'PIXELSETU  •  ALBUM SELECTION LIST',
      `${LIST_DIVIDER}`,
      '',
      'PROJECT',
      metaLine('Name', project?.name ?? album.projectName),
      metaLine('Display name', project?.displayName),
      metaLine('Phone', project?.phone),
      metaLine('Email', project?.email),
      metaLine('Category', humanizeLabel(project?.bookingCategory)),
      metaLine('Booking date', formatDate(project?.dateOfBooking)),
      metaLine('Status', humanizeLabel(project?.status)),
      metaLine(
        'Quotation',
        project?.quotationAmount !== undefined
          ? String(project.quotationAmount)
          : '—',
      ),
      metaLine('Softcopy URL', project?.softcopyUrl),
      '',
      'ALBUM',
      metaLine('Name', album.name),
      metaLine('Status', humanizeLabel(album.status)),
      metaLine(
        'Selection',
        `${selectedCount} selected / ${album.maxSelectionCount} max`,
      ),
      metaLine('Selection allowed', yesNo(album.isSelectionAllowed)),
      metaLine('Submitted', yesNo(album.isSubmitted)),
      metaLine('Generated at', generatedAt),
      '',
      LIST_RULE,
      `SELECTED IMAGES (${selectedCount})`,
      LIST_RULE,
      '',
    ].join('\n') + '\n';
  }

  async getPaymentsByProjectId(projectId: string) {
    await this.getProjectOrThrow(projectId);
    return await this.repository.findAll(COLLECTION_NAME.PAYMENT, {
      projectId,
      orgId: this.context.getOrThrow('orgId'),
    });
  }

  async getPaymentById(projectId: string, id: string) {
    const payment = await this.repository.findOne(COLLECTION_NAME.PAYMENT, {
      id,
      projectId,
      orgId: this.context.getOrThrow('orgId'),
    });

    if (!payment) {
      throw new AppError('NotFoundError', 'Payment not found');
    }

    return payment;
  }

  async createPayment(payment: CreatePayment) {
    await this.getProjectOrThrow(payment.projectId);
    const { projectId, projectName, ...rest } = payment;
    return this.repository.create(COLLECTION_NAME.PAYMENT, {
      ...rest,
      projectId,
      projectName,
      orgId: this.context.getOrThrow('orgId'),
    });
  }

  async updatePayment(projectId: string, id: string, payment: UpdatePayment) {
    await this.getPaymentById(projectId, id);
    await this.repository.update(COLLECTION_NAME.PAYMENT, id, payment, {
      orgId: this.context.getOrThrow('orgId'),
    });
  }

  async deletePayment(projectId: string, id: string) {
    await this.getPaymentById(projectId, id);
    return this.repository.delete(COLLECTION_NAME.PAYMENT, id, {
      orgId: this.context.getOrThrow('orgId'),
    });
  }

  async listPayments(query: ListQuery) {
    const orgId = this.context.getOrThrow('orgId');
    return this.repository.query(COLLECTION_NAME.PAYMENT, query, {
      baseFilter: { orgId },
      searchFields: ['name', 'projectName', 'projectId'],
    });
  }
}

function metaLine(label: string, value: string | undefined | null): string {
  return `  ${label.padEnd(META_LABEL_WIDTH)}: ${value?.trim() ? value : '—'}`;
}
