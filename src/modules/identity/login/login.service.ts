import { Request } from 'express';
import { StandardClaims, Token } from './interface';
import { Injectable } from '@nestjs/common';
import { GoogleLoginService } from './googleLogin.service';
import { InjectDbClient } from '@/modules/common';
import { MongoClient } from 'mongodb';
import { UserManagementService } from '../user.service';
import { JwtService } from '../jwt.service';

@Injectable()
export class UserLoginService {
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

  /**
   *
   * @param standardClaims
   * @returns The signed token
   */
  async login(standardClaims: StandardClaims) {
    const user = await this.userService.findUserByEmail(standardClaims.email);
    let tokenClaims: Token;

    if (!user) {
      //New User Login Detected - Onboard the user
      const newUserDetails =
        await this.userService.onboardNewUser(standardClaims);
      tokenClaims = {
        type: 'human',
        userId: newUserDetails.userId,
        orgId: newUserDetails.orgId,
        role: 'owner',
      };
    } else {
      const defaultOrg = await this.userService.getDefaultOrgOfUser(user.id);
      tokenClaims = {
        type: 'human',
        userId: user.id,
        orgId: defaultOrg.id,
        role: 'owner',
      };
    }
    return this.jwtService.sign(tokenClaims);
  }
}
