import { Injectable } from '@nestjs/common';
import { Db } from 'mongodb';
import { InjectDb } from '@common';
import { COLLECTIONS } from '@/modules/const.global';
import { Membership } from './schema';

@Injectable()
export class MembershipRepository {
  constructor(@InjectDb() private readonly db: Db) {}

  async createMembership(membership: Membership) {
    return await this.db.collection(COLLECTIONS.MEMBERSHIPS).insertOne(membership);
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
          from: COLLECTIONS.MEMBERSHIPS,
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
      .collection(COLLECTIONS.MEMBERSHIPS)
      .aggregate(pipeline)
      .toArray();
  }

  async checkMembership(orgId: string, userId: string) {
    return await this.db
      .collection(COLLECTIONS.MEMBERSHIPS)
      .findOne({ orgId, userId });
  }

  async checkMembershipByEmail(orgId: string, email: string) {
    const pipeline = [
      {
        $match: {
          orgId: orgId,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: 'id',
          as: 'userDetails',
        },
      },
      {
        $unwind: '$userDetails',
      },
      {
        $match: {
          'userDetails.email': email,
        },
      },
    ];
    const result = await this.db
      .collection(COLLECTIONS.MEMBERSHIPS)
      .aggregate(pipeline)
      .toArray();
    return result?.length > 0 ? result[0] : null;
  }

  async getAllMembersOfOrg(orgId: string) {
    const pipeline = [
      {
        $match: {
          orgId: orgId,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: 'id',
          as: 'userDetails',
        },
      },
      {
        $unwind: '$userDetails',
      },
      {
        $project: {
          _id: 0,
          id: '$userDetails.id',
          email: '$userDetails.email',
          firstName: '$userDetails.firstName',
          lastName: '$userDetails.lastName',
          avatarUrl: '$userDetails.avatarUrl',
          role: '$role',
        },
      },
    ];
    return await this.db
      .collection(COLLECTIONS.MEMBERSHIPS)
      .aggregate(pipeline)
      .toArray();
  }

  async deleteMembership(orgId: string, userId: string) {
    return await this.db
      .collection(COLLECTIONS.MEMBERSHIPS)
      .deleteOne({ orgId, userId });
  }
}
