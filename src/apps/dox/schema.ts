import { z } from 'zod';
import { EntityMetadata } from '@/modules/interface.global';

export const OrientationSchema = z.enum([
  'portrait',
  'landscape',
  'fullscreen',
]);

export const PreferencesSchema = z.object({
  orientation: OrientationSchema,
  theme: z.string().min(1),
});

export const UpdatePreferencesSchema = PreferencesSchema.partial();

export const CreateTopicSchema = z.object({
  name: z.string().min(1),
});

export const UpdateTopicSchema = z
  .object({
    name: z.string().min(1),
    collapsed: z.boolean(),
  })
  .partial();

export const ReorderSchema = z.object({
  order: z.array(z.string().min(1)).min(1),
});

export const DeleteTopicQuerySchema = z.object({
  orphanAction: z.enum(['untopic', 'delete']).optional().default('untopic'),
});

export const CreatePageSchema = z.object({
  title: z.string().min(1),
  topicId: z.string().min(1).nullable().optional(),
  afterPageId: z.string().min(1).optional(),
});

export const UpdatePageMetaSchema = z
  .object({
    title: z.string().min(1),
    topicId: z.string().min(1).nullable(),
    locked: z.boolean(),
  })
  .partial();

export const UpdatePageContentSchema = z.object({
  content: z.string(),
  updatedAt: z.number(),
});

export const SyncStateQuerySchema = z.object({
  since: z.coerce.number().optional().default(0),
});

export const SyncPushPageSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  topicId: z.string().min(1).nullable().optional(),
  locked: z.boolean().optional(),
  order: z.number().optional(),
  updatedAt: z.number(),
  content: z.string().optional(),
});

export const SyncPushTopicSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  collapsed: z.boolean().optional(),
  order: z.number().optional(),
  updatedAt: z.number(),
});

export const SyncPushSchema = z.object({
  topics: z.array(SyncPushTopicSchema).optional().default([]),
  pages: z.array(SyncPushPageSchema).optional().default([]),
  deletedTopicIds: z.array(z.string().min(1)).optional().default([]),
  deletedPageIds: z.array(z.string().min(1)).optional().default([]),
});

export const ListAssetsQuerySchema = z.object({
  pageId: z.string().min(1).optional(),
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const CreateShareSchema = z.object({
  mode: z.literal('read').optional().default('read'),
  expiresAt: z.number().nullable().optional(),
});

export const UpdateShareSchema = z.object({
  mode: z.literal('read').optional(),
  expiresAt: z.number().nullable().optional(),
});

export const BigramSuccessorSchema = z.object({
  weight: z.number(),
  casing: z.string(),
});

export const BigramRecordSchema = z.object({
  context: z.string(),
  successors: z.record(z.string(), BigramSuccessorSchema),
  updatedAt: z.number(),
});

export const WordProfileRecordSchema = z.object({
  word: z.string(),
  casing: z.string(),
  count: z.number(),
  capitalized: z.number(),
  accepted: z.number(),
  rejected: z.number(),
  lastUsedAt: z.number(),
});

export const WordMemorySyncSchema = z.object({
  bigrams: z.array(BigramRecordSchema).optional().default([]),
  profile: z.array(WordProfileRecordSchema).optional().default([]),
});

export const StoreAiKeySchema = z.object({
  encryptedKey: z.string().min(1),
});

export const AiProxySchema = z.object({
  model: z.string().min(1),
  contents: z.array(z.unknown()),
});

export const ResourceIdSchema = z.string().min(1);

export type Orientation = z.infer<typeof OrientationSchema>;
export type Preferences = z.infer<typeof PreferencesSchema>;
export type UpdatePreferences = z.infer<typeof UpdatePreferencesSchema>;
export type CreateTopic = z.infer<typeof CreateTopicSchema>;
export type UpdateTopic = z.infer<typeof UpdateTopicSchema>;
export type Reorder = z.infer<typeof ReorderSchema>;
export type DeleteTopicQuery = z.infer<typeof DeleteTopicQuerySchema>;
export type CreatePage = z.infer<typeof CreatePageSchema>;
export type UpdatePageMeta = z.infer<typeof UpdatePageMetaSchema>;
export type UpdatePageContent = z.infer<typeof UpdatePageContentSchema>;
export type SyncStateQuery = z.infer<typeof SyncStateQuerySchema>;
export type SyncPush = z.infer<typeof SyncPushSchema>;
export type ListAssetsQuery = z.infer<typeof ListAssetsQuerySchema>;
export type CreateShare = z.infer<typeof CreateShareSchema>;
export type UpdateShare = z.infer<typeof UpdateShareSchema>;
export type BigramRecord = z.infer<typeof BigramRecordSchema>;
export type WordProfileRecord = z.infer<typeof WordProfileRecordSchema>;
export type WordMemorySync = z.infer<typeof WordMemorySyncSchema>;
export type StoreAiKey = z.infer<typeof StoreAiKeySchema>;
export type AiProxy = z.infer<typeof AiProxySchema>;

export type TopicDoc = EntityMetadata & {
  userId: string;
  name: string;
  collapsed: boolean;
  order: number;
};

export type PageDoc = EntityMetadata & {
  userId: string;
  title: string;
  topicId: string | null;
  locked: boolean;
  order: number;
  content: string;
};

export type TombstoneDoc = {
  id: string;
  userId: string;
  resourceType: 'topic' | 'page';
  deletedAt: Date;
};

export type PreferenceDoc = EntityMetadata & {
  userId: string;
  orientation: Orientation;
  theme: string;
};

export type AssetDoc = EntityMetadata & {
  userId: string;
  pageId?: string;
  url: string;
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: string;
  gridFsId: string;
};

export type ShareDoc = EntityMetadata & {
  userId: string;
  pageId: string;
  shareToken: string;
  mode: 'read';
  expiresAt: Date | null;
  ownerName: string;
};

export type WordMemoryDoc = EntityMetadata & {
  userId: string;
  bigrams: BigramRecord[];
  profile: WordProfileRecord[];
};

export type AiKeyDoc = EntityMetadata & {
  userId: string;
  encryptedKey: string;
};

export type SyncEventDoc = {
  id: string;
  userId: string;
  event:
    | 'topic_updated'
    | 'page_meta_updated'
    | 'page_content_updated'
    | 'topic_deleted'
    | 'page_deleted'
    | 'preferences_updated';
  data: Record<string, unknown>;
  createdAt: Date;
};
