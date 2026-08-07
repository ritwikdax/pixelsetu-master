import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppError } from '../common/error/app.error';
import { AppLogger } from '../common/logging/app.logger';
import { ContextService } from '../common/context/context.service';
import { ALLOW_ANNONYMOUS_KEY, ALLOW_MFA_PENDING_KEY } from './auth.decorators';
import { JwtService } from './jwt.service';
import { Token } from './login/interface';
import { COOKIE_NAME } from '../const.global';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new AppLogger(AuthGuard.name);

  constructor(
    private readonly ctx: ContextService,
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const allowAnnonymous = this.reflector.getAllAndOverride<boolean>(
      ALLOW_ANNONYMOUS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const allowMfaPending = this.reflector.getAllAndOverride<boolean>(
      ALLOW_MFA_PENDING_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (allowAnnonymous) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const cookieHeader = request.headers['cookie'] || '';
    const cookies = cookieHeader
      .split(';')
      .reduce((acc: Record<string, string>, cookie) => {
        const [name, value] = cookie.trim().split('=');
        acc[name] = value;
        return acc;
      }, {});

    const tokenFromCookie = cookies[COOKIE_NAME];

    const authHeader = request.headers['authorization'] || '';

    const tokenFromHeader = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!tokenFromCookie && !tokenFromHeader) {
      this.logger.warn('Unauthorized: no token provided');
      throw new AppError('UnauthorizedError', 'No token provided');
    }

    const token = tokenFromCookie || tokenFromHeader;

    const decodedToken = this.jwtService.verify<Token>(token);

    if (!decodedToken) {
      this.logger.warn('Unauthorized: invalid token');
      throw new AppError('UnauthorizedError', 'Invalid token');
    }

    if (decodedToken.mfaPending && !allowMfaPending) {
      this.logger.warn('Unauthorized: MFA verification required');
      throw new AppError(
        'UnauthorizedError',
        'MFA verification required',
      );
    }

    this.ctx.set('userId', decodedToken.userId);
    this.ctx.set('role', decodedToken.role);
    this.ctx.set('orgId', decodedToken.orgId);
    this.ctx.set('email', decodedToken.email);
    return true;
  }
}
