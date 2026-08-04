import { AppError, AppLogger, HttpService } from '@/modules/common';
import jwt from 'jsonwebtoken';
import { AppConfigService } from '@/modules/common/config/config.service';
import { GoogleTokenClaims, LoginService, StandardClaims } from './interface';
import { Request } from 'express';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GoogleLoginService implements LoginService {
  private readonly GRANT_TYPE: string = 'authorization_code';
  private readonly logger = new AppLogger(GoogleLoginService.name);

  constructor(
    private readonly http: HttpService,
    private readonly appConfig: AppConfigService,
  ) {}

  private async exchangeToken(code: string) {
    const GOOGLE_CLIENT_ID = this.appConfig.getConfig('GOOGLE_CLIENT_ID');
    const GOOGLE_SECRET = this.appConfig.getConfig('GOOGLE_CLIENT_SECRET');
    const REDIRECT_URI = this.appConfig.getConfig('GOOGLE_REDIRECT_URI');

    try {
      const { data } = await this.http.post<any>(
        'https://oauth2.googleapis.com/token',
        {
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: this.GRANT_TYPE,
        },
      );
      const token = data['id_token'];
      const decodedToken = this.decodeToken(token);
      return decodedToken;
    } catch (err) {
      this.logger.error(
        'Failed to exchange Google OAuth token',
        err instanceof Error ? err.stack : String(err),
      );
      throw new Error('Failed to exchange Google OAuth token');
    }
  }

  private decodeToken(token: string) {
    try {
      const decodedToken = jwt.decode(token) as GoogleTokenClaims;
      return decodedToken;
    } catch (err) {
      this.logger.error(
        'Failed to decode Google OAuth token',
        err instanceof Error ? err.stack : String(err),
      );
      throw new Error('Failed to decode Google OAuth token');
    }
  }

  async login(req: Request): Promise<StandardClaims> {
    const { code, state } = req.query;

    if (!code || !state) {
      throw new AppError(
        'UnauthorizedError',
        "Failed to login with Google: Missing 'code' or 'state' in request query",
      );
    }

    if (typeof code !== 'string') {
      throw new AppError('Unsupported', 'code must be a string');
    }

    const claims = await this.exchangeToken(code);
    return {
      email: claims.email,
      firstName: claims.given_name,
      lastName: claims.family_name,
      isVerified: claims.email_verified,
      avatarUrl: claims.picture,
      provider: 'google',
      providerGivenId: claims.sub,
    } satisfies StandardClaims;
  }
}
