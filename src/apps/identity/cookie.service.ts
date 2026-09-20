import { COOKIE_NAME } from '@/modules/const.global';
import { Injectable } from '@nestjs/common';
import { Response } from 'express';

@Injectable()
export class CookieService {
  private readonly COOKIE_MAX_AGE = 60 * 24 * 60 * 60 * 1000;
  private readonly COOKIE_PATH = '/';
  private readonly COOKIE_DOMAIN = '.pixelsetu.com';
  private readonly COOKIE_SAME_SITE = 'none';
  private readonly COOKIE_HTTP_ONLY = true;

  async setLoginCookie(res: Response, token: string) {
    res.cookie(COOKIE_NAME, token, {
      httpOnly: this.COOKIE_HTTP_ONLY,
      secure: process.env.NODE_ENV === 'production',
      ...(process.env.NODE_ENV === 'production' && {
        domain: this.COOKIE_DOMAIN,
        sameSite: this.COOKIE_SAME_SITE,
      }),
      maxAge: this.COOKIE_MAX_AGE,
      path: this.COOKIE_PATH,
    });
  }

  async clearCookie(res: Response) {
    res.cookie(COOKIE_NAME, '', {
      httpOnly: this.COOKIE_HTTP_ONLY,
      secure: process.env.NODE_ENV === 'production',
      ...(process.env.NODE_ENV === 'production' && {
        domain: this.COOKIE_DOMAIN,
        sameSite: this.COOKIE_SAME_SITE,
      }),
      maxAge: 0,
      path: this.COOKIE_PATH,
    });
  }
}
