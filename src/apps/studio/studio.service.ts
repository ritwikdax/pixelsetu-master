import { ContextService, ListQuery, Repository } from "@/modules/common";
import { AppError } from "@/modules/common/error/app.error";
import { Project, CreateAlbum, UpdateAlbum, CreatePayment, UpdatePayment } from "./schema";
import { COLLECTION_NAME } from "./const";
import { Injectable } from "@nestjs/common";
import { uuidv7 } from "uuidv7";

@Injectable()
export class StudioService {
  constructor(private readonly repository: Repository<any>, private readonly context: ContextService) { }

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
    const newProject = {
      ...project,
      orgId
    }
    return this.repository.create(COLLECTION_NAME.PROJECT, newProject);
  }

  async updateProject(id: string, project: Project) {
    await this.getProjectById(id);
    return this.repository.update(COLLECTION_NAME.PROJECT, id, project);
  }

  async getProjectById(id: string) {
    return await this.repository.findOne(COLLECTION_NAME.PROJECT, {
      id: id,
      orgId: this.context.getOrThrow('orgId'),
    }, {
      projection: {
        _id: 0,
        orgId: 0,
      }
    })
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

  async listAlbums(query: ListQuery) {
    const orgId = this.context.getOrThrow('orgId');
    return this.repository.query(COLLECTION_NAME.ALBUM, query, {
      baseFilter: { orgId },
      searchFields: ['name', 'projectName', 'projectId'],
    });
  }

  async getAlbumById(projectId: string, id: string) {
    const album = await this.repository.findOne(COLLECTION_NAME.ALBUM, {
      id,
      projectId,
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
      projectId,
      projectName,
      status: status ?? 'not_started',
      orgId: this.context.getOrThrow('orgId'),
    });
  }

  async updateAlbum(projectId: string, id: string, album: UpdateAlbum) {
    await this.getAlbumById(projectId, id);
    await this.repository.update(COLLECTION_NAME.ALBUM, id, album);
  }

  async deleteAlbum(projectId: string, id: string) {
    await this.getAlbumById(projectId, id);
    return this.repository.delete(COLLECTION_NAME.ALBUM, id);
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
    await this.repository.update(COLLECTION_NAME.PAYMENT, id, payment);
  }

  async deletePayment(projectId: string, id: string) {
    await this.getPaymentById(projectId, id);
    return this.repository.delete(COLLECTION_NAME.PAYMENT, id);
  }
}
