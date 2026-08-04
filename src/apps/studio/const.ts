export const COLLECTION_NAME = {
    PROJECT: 'projects',
    ALBUM: 'albums',
    PAYMENT: 'payments',
} as const;

export type CollectionName = typeof COLLECTION_NAME[keyof typeof COLLECTION_NAME];