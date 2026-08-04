import { Request } from 'express';
import { StandardClaims, Token } from '@/modules/auth/login/interface';
import { Injectable } from '@nestjs/common';
import { GoogleLoginService } from '@/modules/auth/login/googleLogin.service';
import { AppLogger, InjectDbClient } from '@common';
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
    @InjectDbClient() private readonly dbClient: MongoClient,
  ) {}

  async loginWithGoogle(req: Request): Promise<StandardClaims> {
    const claims = await this.gl.login(req);
    return claims;
  }

  async login(standardClaims: StandardClaims) {
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
      };
      this.logger.log(
        `Login: existing user userId=${user.id} orgId=${defaultOrg.id}`,
      );
    }
    return this.jwtService.sign(tokenClaims);
  }
}
