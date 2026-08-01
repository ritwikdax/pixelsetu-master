import { Injectable } from '@nestjs/common';
import { InjectDb } from '@common';
import { User } from './schema';
import { Db } from 'mongodb';
import { IdentityOnboardData, IdentityProvider } from './login/interface';
import { COLLECTIONS } from '../const.global';

@Injectable()
export class IdentityRepo {
  constructor(@InjectDb() private readonly db: Db) {}

  async lookupIdentity(
    email: string,
    provider: IdentityProvider,
  ): Promise<User | null> {
    const user = await this.db
      .collection(COLLECTIONS.AUTH_PROVIDER_GOOGLE)
      .findOne<User>({ email, provider });
    return user;
  }

  async createIdentity(identityData: IdentityOnboardData) {
    return await this.db
      .collection(COLLECTIONS.AUTH_PROVIDER_GOOGLE)
      .insertOne(identityData);
  }
}
