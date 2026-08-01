import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppError, ContextService } from '../common';
import { JwtService } from './jwt.service';
import { Token } from './login/interface';
import { COOKIE_NAME } from '../const.global';

@Injectable()
export class IdentityGuard implements CanActivate {
  constructor(
    private readonly ctx: ContextService,
    private readonly jwtService: JwtService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    //Extract cookie from request headers
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

    //Extract token from request headers as bearer token
    const authHeader = request.headers['authorization'] || '';

    const tokenFromHeader = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!tokenFromCookie && !tokenFromHeader) {
      throw new AppError('UnauthorizedError', 'No token provided');
    }

    //Take token from cookie if available, else take from header
    const token = tokenFromCookie || tokenFromHeader;

    const decodedToken = this.jwtService.verify<Token>(token);

    if (!decodedToken) {
      throw new AppError('UnauthorizedError', 'Invalid token');
    } else {
      this.ctx.set('userId', decodedToken['userId']);
      this.ctx.set('role', decodedToken['role']);
      this.ctx.set('orgId', decodedToken['orgId']);
    }
    return true;
  }
}
