import { Global, Module } from '@nestjs/common';
import { createKeyv } from '@keyv/redis';
import { AppConfigService } from '../config/config.service';
import { CacheService } from './cache.service';
import { CACHE_CLIENT } from './cache.constants';

@Global()
@Module({})
export class CacheModule {
  static async forRootAsync() {
    return {
      module: CacheModule,
      providers: [
        {
          provide: CACHE_CLIENT,
          inject: [AppConfigService],
          useFactory: async (configService: AppConfigService) => {
            return createKeyv(configService.getConfig('REDIS_URI'), {
              namespace: 'pixelsetu-cache-temp',
            });
          },
        },
        CacheService,
      ],
      exports: [CacheService],
    };
  }
}
