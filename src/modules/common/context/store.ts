import { ApplicationRole } from '@/modules/rbac/role.interface';

export interface IStore {
  //Metadata
  requestId: string;
  method: string;
  endpoint: string;
  requestTimestamp: string; // ISO 8601 format

  // User-related information
  userId: string;
  orgId: string;
  role: ApplicationRole;
  permissions: string[]; //Not in use yet
}

export class ContextStore {
  private readonly store: Partial<IStore> = {};

  constructor(initialData?: Partial<IStore>) {
    if (initialData) {
      this.store = { ...initialData };
    }
  }

  set<K extends keyof IStore>(key: K, value: IStore[K]): void {
    this.store[key] = value;
  }

  get<K extends keyof IStore>(key: K): IStore[K] | undefined {
    return this.store[key];
  }

  has(key: keyof IStore): boolean {
    return key in this.store;
  }
}
