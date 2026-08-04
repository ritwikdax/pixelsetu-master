import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { UserLoginService } from './login.service';
import { COOKIE_NAME } from '@/modules/const.global';

@Controller('login')
export class LoginController {
  constructor(private readonly userLogin: UserLoginService) {}

  @Get('callback/google')
  async loginWithGoogle(@Req() req: Request, @Res() res: Response) {
    const standardClaims = await this.userLogin.loginWithGoogle(req);
    const token = await this.userLogin.login(standardClaims);

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      ...(process.env.NODE_ENV === 'production' && {
        domain: '.pixelsetu.com',
        sameSite: 'none',
      }),
      maxAge: 60 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    const redirectUrl =
      process.env.NODE_ENV === 'production'
        ? 'https://home.pixelsetu.com'
        : 'http://localhost:3001';

    return res.status(302).redirect(redirectUrl);
  }
}
