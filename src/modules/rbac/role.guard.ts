import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLE_KEY } from './role.decorator';
import { ROLE_MAP } from './const';
import { AppError, ContextService } from '../common';
import { ApplicationRole } from './role.interface';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly ctx: ContextService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRole = this.reflector.getAllAndOverride(ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) as ApplicationRole | undefined;

    const existingRole = this.ctx.get('role');

    if (!requiredRole) {
      return true;
    }

    if (!existingRole) {
      throw new AppError('UnauthorizedError', 'User role not found');
    }

    if (ROLE_MAP[existingRole] < ROLE_MAP[requiredRole]) {
      throw new AppError(
        'UnauthorizedError',
        'Insufficient permissions to access this resource',
      );
    }

    return true;
  }
}
