import { Module, DynamicModule } from '@nestjs/common';
import { AppConfigModule } from '../config/config.module';
import { AppConfigService } from '../config/config.service';
import { MongoClient } from 'mongodb';
import { MONGO_CLIENT, MONGO_DB } from './const';
import { Repository } from './repository';

@Module({})
export class MongoDbModule {
  static forRootAsync(): DynamicModule {
    return {
      module: MongoDbModule,
      imports: [AppConfigModule],
      providers: [
        {
          provide: MONGO_DB,
          inject: [MONGO_CLIENT, AppConfigService],
          useFactory: async (client: MongoClient, config: AppConfigService) => {
            return client.db(config.getConfig('MONGO_DB_NAME'));
          },
        },
        {
          provide: MONGO_CLIENT,
          inject: [AppConfigService],
          useFactory: async (config: AppConfigService) => {
            const client = new MongoClient(config.getConfig('MONGODB_URI'));
            await client.connect();
            return client;
          },
        },
        Repository,
      ],
      exports: [MONGO_DB, MONGO_CLIENT, Repository],
    };
  }
}
