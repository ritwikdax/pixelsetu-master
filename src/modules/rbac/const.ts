import { ApplicationRole } from './role.interface';

export const ROLE_MAP: Record<ApplicationRole, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
  owner: 4,
} as const;
