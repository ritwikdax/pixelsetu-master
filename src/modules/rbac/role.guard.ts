import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLE_KEY } from './role.decorator';
import { ROLE_MAP } from './const';
import { AppError } from '../common/error/app.error';
import { AppLogger } from '../common/logging/app.logger';
import { ContextService } from '../common/context/context.service';
import { ApplicationRole } from './role.interface';

@Injectable()
export class RoleGuard implements CanActivate {
  private readonly logger = new AppLogger(RoleGuard.name);

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
      this.logger.warn('Unauthorized: user role not found in context');
      throw new AppError('UnauthorizedError', 'User role not found');
    }

    if (ROLE_MAP[existingRole] < ROLE_MAP[requiredRole]) {
      const userId = this.ctx.tryGet('userId');
      this.logger.warn(
        `Insufficient permissions: userId=${userId ?? 'unknown'} role=${existingRole} required=${requiredRole}`,
      );
      throw new AppError(
        'UnauthorizedError',
        'Insufficient permissions to access this resource',
      );
    }

    return true;
  }
}
