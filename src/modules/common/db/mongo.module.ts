import { Module, DynamicModule, Logger } from '@nestjs/common';
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
            const logger = new Logger('MongoDbModule');
            const uri = config.getConfig('MONGODB_URI');
            const client = new MongoClient(uri);
            try {
              await client.connect();
              logger.log('MongoDB connected');
              return client;
            } catch (err) {
              logger.error(
                'MongoDB connection failed',
                err instanceof Error ? err.stack : String(err),
              );
              throw err;
            }
          },
        },
        Repository,
      ],
      exports: [MONGO_DB, MONGO_CLIENT, Repository],
    };
  }
}
