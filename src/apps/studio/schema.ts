import { z } from 'zod';
import { EntityMetadata } from '@/modules/interface.global';

export const BookingCategorySchema = z.enum([
  'wedding',
  'pre_wedding',
  'post_wedding',
  'anniversary',
  'birthday',
  'corporate_shoot',
  'baby_bump',
  'rice_ceremony',
  'engagement',
  'thread_ceremony',
  'reception',
  'newborn_shoot',
  'baby_shower',
  'aiburo_vaat',
  'kids_shoot',
  'funeral',
  'saadh',
  'other',
]);

export const ProjectStatusSchema = z.enum([
  'open',
  'close',
  'reopen',
  'withdrawn',
  'on_hold',
  'unknown',
]);

export const ProjectSchema = z.object({
  name: z.string(),
  phone: z.string(),
  displayName: z.string(),
  bookingCategory: BookingCategorySchema,
  dateOfBooking: z.coerce.date(),
  email: z.string(),
  status: ProjectStatusSchema,
  softcopyUrl: z.string().optional(),
  quotationAmount: z.number().optional(),
});

export const AlbumStatusSchema = z.enum([
  'not_started',
  'in_progress',
  'submitted',
]);

export const AlbumSchema = z.object({
  id: z.string(),
  projectName: z.string(),
  projectId: z.string(),
  name: z.string(),
  isSelectionAllowed: z.boolean(),
  maxSelectionCount: z.number(),
  alreadySelectedCount: z.number().optional(),
  status: AlbumStatusSchema,
});

export const CreateAlbumSchema = AlbumSchema.omit({
  id: true,
  alreadySelectedCount: true,
}).extend({
  projectId: z.uuidv7(),
  status: AlbumStatusSchema.optional().default('not_started'),
});

export const UpdateAlbumSchema = AlbumSchema.omit({
  id: true,
  projectId: true,
  projectName: true,
}).partial();

export const PaymentModeSchema = z.enum(['online', 'offline']);

export const PaymentSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  projectName: z.string(),
  amount: z.number(),
  date: z.coerce.date(),
  mode: PaymentModeSchema,
  notify: z.boolean(),
});

export const CreatePaymentSchema = PaymentSchema.omit({
  id: true,
}).extend({
  projectId: z.uuidv7(),
});

export const UpdatePaymentSchema = PaymentSchema.omit({
  id: true,
  projectId: true,
  projectName: true,
}).partial();

export type BookingCategory = z.infer<typeof BookingCategorySchema>;
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;
export type Project = z.infer<typeof ProjectSchema> & EntityMetadata;
export type AlbumStatus = z.infer<typeof AlbumStatusSchema>;
export type Album = z.infer<typeof AlbumSchema> & EntityMetadata;
export type CreateAlbum = z.infer<typeof CreateAlbumSchema>;
export type UpdateAlbum = z.infer<typeof UpdateAlbumSchema>;
export type PaymentMode = z.infer<typeof PaymentModeSchema>;
export type Payment = z.infer<typeof PaymentSchema> & EntityMetadata;
export type CreatePayment = z.infer<typeof CreatePaymentSchema>;
export type UpdatePayment = z.infer<typeof UpdatePaymentSchema>;
