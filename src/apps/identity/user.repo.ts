import { Injectable } from '@nestjs/common';
import { Db, MongoClient } from 'mongodb';
import { InjectDb, InjectDbClient } from '@common';
import { User, Org, Membership } from './schema';
import { COLLECTIONS } from '@/modules/const.global';

@Injectable()
export class UserRepository {
  constructor(
    @InjectDb() private readonly db: Db,
    @InjectDbClient() private readonly dbClient: MongoClient,
  ) {}

  async lookupUserByEmail(email: string) {
    return await this.db.collection<User>(COLLECTIONS.USERS).findOne({ email });
  }

  async findByEmail(email: string) {
    return await this.db.collection<User>(COLLECTIONS.USERS).findOne({ email });
  }

  async findById(userId: string) {
    return await this.db
      .collection<User>(COLLECTIONS.USERS)
      .findOne({ id: userId }, { projection: { _id: 0 } });
  }

  async onboardNewUser(
    userData: User,
    orgData: Org,
    membershipData: Membership,
  ) {
    let session;
    try {
      session = this.dbClient.startSession();
      session.startTransaction();

      await this.db
        .collection<User>(COLLECTIONS.USERS)
        .insertOne(userData, { session });

      await this.db
        .collection<Org>(COLLECTIONS.ORGS)
        .insertOne(orgData, { session });

      await this.db
        .collection(COLLECTIONS.MEMBERSHIPS)
        .insertOne(membershipData, { session });

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async addApplication(userId: string, appId: string) {
    return await this.db
      .collection(COLLECTIONS.USERS)
      .updateOne({ id: userId }, { $addToSet: { applicationPool: appId } });
  }

  async removeApplication(userId: string, appId: string) {
    await this.db
      .collection<User>(COLLECTIONS.USERS)
      .updateOne({ id: userId }, { $pull: { applicationPool: appId } });
  }
}
