import { Module, DynamicModule } from '@nestjs/common';
import { AppConfigModule } from '../config/config.module';
import { AppConfigService } from '../config/config.service';
import { MongoClient } from 'mongodb';
import { MONGO_DB } from '../const';

@Module({})
export class MongoDbModule {
  static forRootAsync(): DynamicModule {
    return {
      module: MongoDbModule,
      imports: [AppConfigModule],
      providers: [
        {
          provide: MONGO_DB,
          inject: [AppConfigService],
          useFactory: async (config: AppConfigService) => {
            const client = new MongoClient(config.getConfig('MONGODB_URI'));

            await client.connect();
            return client.db(config.getConfig('MONGO_DB_NAME'));
          },
        },
      ],
      exports: [MONGO_DB],
    };
  }
}
