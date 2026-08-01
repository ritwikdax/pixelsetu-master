import { Injectable } from '@nestjs/common';
import { OrgRepository } from './org.repo';
import { ContextService } from '../common';
import { Org } from './schema';

@Injectable()
export class OrgService {
  constructor(
    private readonly orgRepository: OrgRepository,
    private readonly context: ContextService,
  ) {}

  async getOrgDetails() {
    const orgId = this.context.getOrThrow('orgId');
    return await this.orgRepository.getOrgDetails(orgId);
  }

  async updateOrgDetails(updatedData: Partial<Org>) {
    const orgId = this.context.getOrThrow('orgId');
    await this.orgRepository.updateOrgDetails(updatedData, orgId);
  }

  async checkNamespaceAvailability(namespace: string) {
    return await this.orgRepository.checkNamespaceAvailability(namespace);
  }
}
