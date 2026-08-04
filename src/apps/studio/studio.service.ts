import { ContextService, ListQuery, Repository } from "@/modules/common";
import { Project } from "./schema";
import { COLLECTION_NAME } from "./const";
import { Injectable } from "@nestjs/common";

@Injectable()
export class StudioService {
  constructor(private readonly repository: Repository<Project>, private readonly context: ContextService) {}

  async listProjects(query: ListQuery) {
    const orgId = this.context.getOrThrow('orgId');
    return this.repository.query(COLLECTION_NAME.PROJECT, query, {
      baseFilter: { orgId },
      searchFields: ['name', 'displayName', 'email', 'phone'],
    });
  }

  async createProject(project: Project) {
    const orgId = this.context.getOrThrow('orgId');
    const newProject = {
      ...project,
      orgId
    }
    return this.repository.create(COLLECTION_NAME.PROJECT, newProject);
  }


}