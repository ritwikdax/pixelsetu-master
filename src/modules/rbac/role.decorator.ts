import { SetMetadata } from '@nestjs/common';
import { ApplicationRole } from './role.interface';

export const ROLE_KEY = Symbol('ROLE_KEY');

export const Role = (role: ApplicationRole) => SetMetadata(ROLE_KEY, role);
