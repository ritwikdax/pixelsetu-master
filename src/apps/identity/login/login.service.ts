import { Request } from 'express';
import { LoginResult, StandardClaims, Token } from '@/modules/auth/login/interface';
import { Injectable } from '@nestjs/common';
import { GoogleLoginService } from '@/modules/auth/login/googleLogin.service';
import { AppLogger, ContextService, InjectDbClient } from '@common';
import { MongoClient } from 'mongodb';
import { UserManagementService } from '../user.service';
import { JwtService } from '@/modules/auth/jwt.service';

@Injectable()
export class UserLoginService {
  private readonly logger = new AppLogger(UserLoginService.name);

  constructor(
    private readonly gl: GoogleLoginService,
    private readonly userService: UserManagementService,
    private readonly jwtService: JwtService,
    private readonly ctx: ContextService,
    @InjectDbClient() private readonly dbClient: MongoClient,
  ) {}

  async loginWithGoogle(req: Request): Promise<StandardClaims> {
    const claims = await this.gl.login(req);
    return claims;
  }

  async login(standardClaims: StandardClaims): Promise<LoginResult> {
    const user = await this.userService.findUserByEmail(standardClaims.email);
    let tokenClaims: Token;

    if (!user) {
      const newUserDetails =
        await this.userService.onboardNewUser(standardClaims);
      tokenClaims = {
        type: 'human',
        userId: newUserDetails.userId,
        orgId: newUserDetails.orgId,
        role: 'owner',
        email: standardClaims.email,
      };
      this.logger.log(
        `Login: onboarded new user userId=${newUserDetails.userId} orgId=${newUserDetails.orgId}`,
      );
    } else {
      const defaultOrg = await this.userService.getDefaultOrgOfUser(user.id);
      tokenClaims = {
        type: 'human',
        userId: user.id,
        orgId: defaultOrg.id,
        role: 'owner',
        email: standardClaims.email,
      };
      this.logger.log(
        `Login: existing user userId=${user.id} orgId=${defaultOrg.id}`,
      );

      if (user.loginWithMfaEnabled && user.mfaEnabled) {
        const mfaPendingToken = this.jwtService.sign(
          { ...tokenClaims, mfaPending: true },
          { expiresIn: '1m' },
        );
        this.logger.log(
          `Login: MFA required for userId=${user.id}, issuing pending token`,
        );
        return { token: mfaPendingToken, requiresMfa: true };
      }
    }

    return {
      token: this.jwtService.sign(tokenClaims),
      requiresMfa: false,
    };
  }

  completeMfaLogin(): string {
    const tokenClaims: Token = {
      type: 'human',
      userId: this.ctx.getOrThrow('userId'),
      orgId: this.ctx.getOrThrow('orgId'),
      role: this.ctx.getOrThrow('role'),
      email: this.ctx.getOrThrow('email'),
    };
    this.logger.log(
      `Login: MFA verified for userId=${tokenClaims.userId}, issuing full token`,
    );
    return this.jwtService.sign(tokenClaims);
  }
}
