export const COLLECTION_NAME = {
  PROJECT: 'studio_projects',
  ALBUM: 'studio_albums',
  PAYMENT: 'studio_payments',
  SELECTED_IMAGES: 'studio_selected_images',
} as const;

export type CollectionName =
  (typeof COLLECTION_NAME)[keyof typeof COLLECTION_NAME];
