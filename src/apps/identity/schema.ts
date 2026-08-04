import { z } from 'zod';
import { EntityMetadata } from '@/modules/interface.global';

export const FeaturedImageSchema = z.object({
  id: z.string(),
  value: z.string().url(),
});

export const OrganizationSchema = z.object({
  ownerId: z.string(),
  ownerEmail: z.email(),
  displayName: z.string().optional(),
  namespace: z.string(),
  region: z.string().optional().default('IN'),
  address: z.string().optional(),
  alternativePhone: z.string().optional(),
  businessEmail: z.email().optional(),
  country: z.string().max(3).optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
  tagline: z.string().optional(),
  lightLogoUrl: z.url().optional(),
  darkLogoUrl: z.url().optional(),
  coverImageUrl: z.url().optional(),
  website: z.url().optional(),
  facebookUrl: z.url().optional(),
  instagramUrl: z.url().optional(),
  linkedinUrl: z.url().optional(),
  twitterUrl: z.url().optional(),
  youtubeUrl: z.url().optional(),
  googleMapUrl: z.url().optional(),
  featuredImages: z.array(FeaturedImageSchema).optional(),
  platform: z.string().optional(),
  isVerified: z.boolean(),
  licenses: z.array(z.string()).default(['regular']).optional(),
});

const OrganizationRoles = z.enum(['owner', 'admin', 'editor', 'viewer']);

const Membership = z.object({
  userId: z.string(),
  role: OrganizationRoles,
  permissions: z.array(z.string()).optional(),
  orgId: z.string(),
});

const User = z.object({
  email: z.email(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().optional(),
  avatarUrl: z.url().optional(),
  isVerified: z.boolean(),
  isActive: z.boolean(),
  applicationPool: z.array(z.string()),
});

export const InviteUserToOrgSchema = z.object({
  email: z.email(),
  role: z.enum(['admin', 'editor', 'viewer']),
});

export type FeaturedImage = z.infer<typeof FeaturedImageSchema> &
  EntityMetadata;
export type Org = z.infer<typeof OrganizationSchema> & EntityMetadata;
export type Membership = z.infer<typeof Membership> & EntityMetadata;
export type User = z.infer<typeof User> & EntityMetadata;
export type OrgRole = z.infer<typeof OrganizationRoles>;
export type InviteUserToOrg = z.infer<typeof InviteUserToOrgSchema>;
