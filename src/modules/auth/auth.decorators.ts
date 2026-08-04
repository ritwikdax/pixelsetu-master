import { SetMetadata } from '@nestjs/common';

export const ALLOW_ANNONYMOUS_KEY = Symbol('ALLOW_ANNONYMOUS_KEY');

export const AllowAnnonymous = () => SetMetadata(ALLOW_ANNONYMOUS_KEY, true);
