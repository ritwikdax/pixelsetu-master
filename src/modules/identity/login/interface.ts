import { Request } from 'express';
import { ApplicationRole } from '../../rbac/role.interface';
import { OrgRole } from '../schema';
export type IdentityProvider = 'google' | 'facebook' | 'apple' | 'other';

export interface LoginService {
  login(request: Request): Promise<StandardClaims>;
}

export interface UserOnboardData {
  userId: string;
  providerId: string;
  provider: IdentityProvider;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  isVerified: boolean;
}

export interface OrgOnboardData {
  orgId: string;
  ownerEmail: string;
  ownerId: string;
  displayName: string;
  namespace: string;
}

export interface IdentityOnboardData {
  id?: string;
  identityId: string;
  userId: string;
  provider: IdentityProvider;
  providerGivenId: string; //It is sub in case of google
  email: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * This is the standard structure of claims that we expect from any login service (Google, Facebook, Apple etc.)
 */
export interface StandardClaims {
  email: string;
  firstName: string;
  lastName: string;
  isVerified: boolean;
  avatarUrl: string;
  provider: IdentityProvider;
  providerGivenId: string;
}

export interface LoggedInClientInfo {
  ip: string;
  device: string;
}

export interface GoogleTokenClaims {
  email: string;
  given_name: string;
  family_name: string;
  email_verified: boolean;
  picture: string;
  sub: string; //This is the unique identifier for the user in Google login
}

export interface OrgInviteTokenClaims {
  role: OrgRole;
  orgId: string;
  orgNamespace: string;
  orgDisplayName: string;
  toEmail: string;
}

export interface Token {
  type: 'human' | 'machine';
  userId: string;
  orgId: string;
  role: ApplicationRole; //Role as a number (1: VIEWER, 2: EDITOR, 3: ADMIN, 4: OWNER)
}

export interface IdentityContext {
  userID: string;
  orgID: string;
  role: ApplicationRole;
  permissions: string[];
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string;
}
