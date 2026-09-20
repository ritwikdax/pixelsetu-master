import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { UserLoginService } from './login.service';
import { CookieService } from '../cookie.service';

const DEFAULT_POST_LOGIN_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://home.pixelsetu.com'
    : 'http://localhost:3002';

function resolvePostLoginBaseUrl(state: unknown): string {
  if (typeof state !== 'string' || !state) {
    return DEFAULT_POST_LOGIN_URL;
  }

  try {
    const url = new URL(state);
    const isLocalhost =
      url.protocol === 'http:' &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
    const isPixelsetu =
      url.protocol === 'https:' &&
      (url.hostname === 'pixelsetu.com' ||
        url.hostname.endsWith('.pixelsetu.com'));

    if (!isLocalhost && !isPixelsetu) {
      return DEFAULT_POST_LOGIN_URL;
    }

    return url.origin;
  } catch {
    return DEFAULT_POST_LOGIN_URL;
  }
}

@Controller('login')
export class LoginController {
  constructor(
    private readonly userLogin: UserLoginService,
    private readonly cookieService: CookieService,
  ) {}

  @Get('callback/google')
  async loginWithGoogle(@Req() req: Request, @Res() res: Response) {
    const standardClaims = await this.userLogin.loginWithGoogle(req);
    const { token, requiresMfa } = await this.userLogin.login(standardClaims);

    await this.cookieService.setLoginCookie(res, token);

    const baseUrl = resolvePostLoginBaseUrl(req.query.state);
    const redirectUrl = requiresMfa ? `${baseUrl}/mfa-login` : baseUrl;

    return res.status(302).redirect(redirectUrl);
  }
}
