import { Inject } from '@nestjs/common';
import crypto from 'crypto';
import { CACHE_CLIENT } from './cache.constants';

export interface CacheOptions {
  ttl?: number;
}

export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
}

const DEFAULT_TTL = 1 * 60 * 60 * 1000; // 1 hour in milliseconds

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) {
    return JSON.stringify(value);
  }
  if (typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  const obj = value as Record<string, unknown>;

  return `{${Object.keys(obj)
    .sort()
    .map((k) => `"${k}":${stableStringify(obj[k])}`)
    .join(',')}}`;
}

export function Cache(options?: CacheOptions): MethodDecorator {
  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const original = descriptor.value;

    descriptor.value = async function (
      this: { cache: ICacheService },
      ...args: unknown[]
    ) {
      if (!this.cache) {
        throw new Error(
          `@Cache requires this.cache to exist on ${target.constructor.name}`,
        );
      }

      const className = target.constructor.name;
      const methodName = propertyKey.toString();

      const argsString = stableStringify(args);

      const hash = crypto.createHash('sha256').update(argsString).digest('hex');

      const cacheKey = `${className}:${methodName}:${hash}`;

      const cached = await this.cache.get(cacheKey);
      await delay(5 * 1000);

      if (cached !== null && cached !== undefined) {
        console.log(`Cache hit for ${cacheKey}`);
        return cached;
      }

      console.log(`Cache miss for ${cacheKey}. Executing original method.`);
      const result = await original.apply(this, args);

      await this.cache.set(cacheKey, result, options?.ttl ?? DEFAULT_TTL);

      return result;
    };

    return descriptor;
  };
}

export const InjectCache = () => Inject(CACHE_CLIENT);
