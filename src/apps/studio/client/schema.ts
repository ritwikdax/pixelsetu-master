import z from 'zod';

export const LoginPayloadSchema = z.object({
  phone: z
    .string()
    .length(10)
    .regex(/^[0-9]+$/),
  password: z
    .string()
    .length(6)
    .regex(/^[a-zA-Z0-9]+$/),
});

export const DriveIdSchema = z.string().regex(/^[a-zA-Z0-9_-]+$/);

export const FolderContentsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).optional().default(100),
  pageToken: z.string().min(1).optional(),
});

export const SelectImageSchema = z.object({
  name: z.string().min(1),
  imageId: DriveIdSchema,
  parentFolderId: DriveIdSchema,
  folderName: z.string(),
  albumId: z.uuidv7(),
  comment: z.string().optional(),
});

export type LoginPayload = z.infer<typeof LoginPayloadSchema>;
export type SelectImage = z.infer<typeof SelectImageSchema>;
export type FolderContentsQuery = z.infer<typeof FolderContentsQuerySchema>;

export type SelectedImage = {
  id: string;
  albumId: string;
  projectId: string;
  orgId: string;
  name: string;
  imageId: string;
  parentFolderId: string;
  folderName?: string;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
};
