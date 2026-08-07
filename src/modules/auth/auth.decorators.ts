import { SetMetadata } from '@nestjs/common';

export const ALLOW_ANNONYMOUS_KEY = Symbol('ALLOW_ANNONYMOUS_KEY');
export const ALLOW_MFA_PENDING_KEY = Symbol('ALLOW_MFA_PENDING_KEY');

export const AllowAnnonymous = () => SetMetadata(ALLOW_ANNONYMOUS_KEY, true);

export const AllowMfaPending = () => SetMetadata(ALLOW_MFA_PENDING_KEY, true);
