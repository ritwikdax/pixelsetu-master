import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppError } from '@/modules/common/error/app.error';
import { AppLogger } from '@/modules/common/logging/app.logger';
import { ContextService } from '@/modules/common/context/context.service';
import { ALLOW_ANNONYMOUS_KEY } from '@/modules/auth/auth.decorators';
import { JwtService } from '@/modules/auth/jwt.service';
import { COOKIE_NAME } from '@/modules/const.global';

type ClientToken = {
  projectId: string;
  phone: string;
  orgId: string;
};

@Injectable()
export class ClientGuard implements CanActivate {
  private readonly logger = new AppLogger(ClientGuard.name);

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

    if (allowAnnonymous) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const cookieHeader = request.headers['cookie'] || '';
    const cookies = cookieHeader
      .split(';')
      .reduce((acc: Record<string, string>, cookie: string) => {
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
    const decodedToken = this.jwtService.verify<ClientToken>(token);

    if (!decodedToken?.projectId || !decodedToken?.orgId) {
      this.logger.warn('Unauthorized: invalid token');
      throw new AppError('UnauthorizedError', 'Invalid token');
    }

    this.ctx.set('projectId', decodedToken.projectId);
    this.ctx.set('orgId', decodedToken.orgId);
    return true;
  }
}
