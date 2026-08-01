import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { AppConfigService } from '../common/config/config.service';

@Injectable()
export class JwtService {
  private readonly DOMAIN = 'pixelsetu.com';

  constructor(private readonly config: AppConfigService) {}

  sign(payload: Record<string, any>): string {
    const jwtSecret = this.config.getConfig('JWT_SECRET');

    return jwt.sign({ ...payload, iss: this.DOMAIN }, jwtSecret, {
      algorithm: 'HS256',
      expiresIn: '7d',
    });
  }

  verify<TClaims>(token: string, options?: jwt.VerifyOptions) {
    try {
      return jwt.verify(
        token,
        this.config.getConfig('JWT_SECRET'),
        options,
      ) as TClaims;
    } catch (err) {
      return null;
    }
  }
}
