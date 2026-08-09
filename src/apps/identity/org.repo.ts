import { Injectable } from '@nestjs/common';
import { Db } from 'mongodb';
import { InjectDb } from '@common';
import { Org } from './schema';
import { COLLECTIONS } from '@/modules/const.global';

@Injectable()
export class OrgRepository {
  constructor(@InjectDb() private readonly db: Db) {}

  async getOrgDetailsPublic(namespace: string){
    return await this.db.collection<Org>(COLLECTIONS.ORGS).findOne(
      { namespace },
      {
        projection: {
          _id: 0,
          id: 0,
          licenses: 0,
          ownerId: 0,
          createdAt: 0,
          updatedAt: 0,
        },
      },
    );
  }

  async getOrgDetails(orgId: string) {
    return await this.db
      .collection<Org>(COLLECTIONS.ORGS)
      .findOne({ id: orgId }, { projection: { _id: 0 } });
  }

  async getOrgDetailsByNamespace(namespace: string) {
    return await this.db.collection<Org>(COLLECTIONS.ORGS).findOne(
      { namespace },
      {
        projection: {
          _id: 0,
          id: 0,
          ownerEmail: 0,
          ownerId: 0,
          createdAt: 0,
          updatedAt: 0,
        },
      },
    );
  }

  async updateOrgDetails(updatedData: Partial<Org>, orgId: string) {
    await this.db
      .collection(COLLECTIONS.ORGS)
      .updateOne({ id: orgId }, { $set: updatedData });
  }

  async checkNamespaceAvailability(namespace: string) {
    const org = await this.db
      .collection(COLLECTIONS.ORGS)
      .findOne({ namespace });
    return !org;
  }

  async getDefaultOrgOfUser(userId: string) {
    return await this.db
      .collection(COLLECTIONS.ORGS)
      .findOne({ ownerId: userId });
  }

  async getOrgDetailsById(orgId: string) {
    return await this.db
      .collection<Org>(COLLECTIONS.ORGS)
      .findOne({ id: orgId });
  }

  async getEffectiveOrgsOfUser(userId: string) {
    const pipeline = [
      {
        $match: {
          userId: userId,
        },
      },
      {
        $lookup: {
          from: COLLECTIONS.ORGS,
          localField: 'orgId',
          foreignField: 'id',
          as: 'orgDetails',
        },
      },
      {
        $unwind: '$orgDetails',
      },
      {
        $project: {
          _id: 0,
          id: '$orgDetails.id',
          namespace: '$orgDetails.namespace',
          displayName: '$orgDetails.displayName',
          role: '$role',
        },
      },
    ];
    return await this.db
      .collection<Org>('memberships')
      .aggregate(pipeline)
      .toArray();
  }

  async checkMembership(orgId: string, userId: string) {
    return await this.db.collection(COLLECTIONS.MEMBERSHIPS).findOne({ orgId, userId });
  }

  async inviteUserToOrg(inviteData: Record<string, any>) {
    return await this.db.collection(COLLECTIONS.ORG_INVITATIONS).insertOne(inviteData);
  }
}
