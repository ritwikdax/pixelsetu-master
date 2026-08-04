import { AsyncLocalStorage } from 'node:async_hooks';
import { ContextStore } from './store';

/** Shared ALS so AppLogger can read requestId without DI. */
export const requestContextAls = new AsyncLocalStorage<ContextStore>();
