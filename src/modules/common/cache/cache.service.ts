import { Inject, Injectable } from '@nestjs/common';
import { ICacheService } from './cache.decorator';
import KeyV from 'keyv';
import { CACHE_CLIENT } from './cache.constants';

@Injectable()
export class CacheService implements ICacheService {
  constructor(@Inject(CACHE_CLIENT) private readonly cache: KeyV<any>) {}
  async get<T>(key: string): Promise<T | null> {
    const value = await this.cache.get(key);
    return value as T | null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.cache.set(key, value, ttl);
  }
}
