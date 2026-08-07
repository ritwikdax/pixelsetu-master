import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { UserLoginService } from './login.service';
import { CookieService } from '../cookie.service';

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

    const baseUrl =
      process.env.NODE_ENV === 'production'
        ? 'https://home.pixelsetu.com'
        : 'http://localhost:3001';

    const redirectUrl = requiresMfa ? `${baseUrl}/mfa-login` : baseUrl;

    return res.status(302).redirect(redirectUrl);
  }
}
