import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { ContextStore } from './store';
import { IStore } from './store';

@Injectable()
export class ContextService {
  private readonly als = new AsyncLocalStorage<ContextStore>();

  run(store: ContextStore, callback: () => void) {
    this.als.run(store, callback);
  }

  getStore(): ContextStore {
    const store = this.als.getStore();

    if (!store) {
      throw new Error('No request context available');
    }

    return store;
  }

  get<K extends keyof IStore>(key: K): IStore[K] | undefined {
    return this.getStore().get(key);
  }

  set<K extends keyof IStore>(key: K, value: IStore[K]): void {
    this.getStore().set(key, value);
  }
}
