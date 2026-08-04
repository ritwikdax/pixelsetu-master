import { Request } from 'express';
import { ApplicationRole } from '../../rbac/role.interface';

export type IdentityProvider = 'google' | 'facebook' | 'apple' | 'other';

export interface LoginService {
  login(request: Request): Promise<StandardClaims>;
}

export interface IdentityOnboardData {
  id?: string;
  identityId: string;
  userId: string;
  provider: IdentityProvider;
  providerGivenId: string;
  email: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Standard structure of claims from any login provider (Google, Facebook, Apple, etc.)
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

export interface GoogleTokenClaims {
  email: string;
  given_name: string;
  family_name: string;
  email_verified: boolean;
  picture: string;
  sub: string;
}

export interface Token {
  type: 'human' | 'machine';
  userId: string;
  orgId: string;
  role: ApplicationRole;
}
