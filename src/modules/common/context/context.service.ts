import { Injectable } from '@nestjs/common';
import { ContextStore } from './store';
import { IStore } from './store';
import { requestContextAls } from './context.als';

@Injectable()
export class ContextService {
  run(store: ContextStore, callback: () => void) {
    requestContextAls.run(store, callback);
  }

  getStore(): ContextStore {
    const store = requestContextAls.getStore();

    if (!store) {
      throw new Error('No request context available');
    }

    return store;
  }

  tryGetStore(): ContextStore | undefined {
    return requestContextAls.getStore();
  }

  get<K extends keyof IStore>(key: K): IStore[K] | undefined {
    return this.getStore().get(key);
  }

  tryGet<K extends keyof IStore>(key: K): IStore[K] | undefined {
    return requestContextAls.getStore()?.get(key);
  }

  getOrThrow<K extends keyof IStore>(key: K): IStore[K] {
    const value = this.getStore().get(key);
    if (value === undefined) {
      throw new Error(`Key ${String(key)} not found in context store`);
    }
    return value;
  }

  set<K extends keyof IStore>(key: K, value: IStore[K]): void {
    this.getStore().set(key, value);
  }
}
