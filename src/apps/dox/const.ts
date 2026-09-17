export const COLLECTION_NAME = {
  TOPIC: 'dox_topics',
  PAGE: 'dox_pages',
  TOMBSTONE: 'dox_tombstones',
  PREFERENCE: 'dox_preferences',
  ASSET: 'dox_assets',
  SHARE: 'dox_shares',
  WORD_MEMORY: 'dox_word_memory',
  AI_KEY: 'dox_ai_keys',
  SYNC_EVENT: 'dox_sync_events',
} as const;

export type CollectionName =
  (typeof COLLECTION_NAME)[keyof typeof COLLECTION_NAME];

export const GRIDFS_BUCKET = 'dox_fs';

export const EMPTY_DOC_CONTENT = '{"type":"doc","content":[]}';

export const MAX_ASSET_BYTES = 20 * 1024 * 1024;

export const ALLOWED_ASSET_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
] as const;

export const DEFAULT_PREFERENCES = {
  orientation: 'portrait',
  theme: 'dark',
} as const;
