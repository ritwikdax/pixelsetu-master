import { Module } from '@nestjs/common';
import { HttpModule } from '../common';
import { GoogleLoginService } from './login/googleLogin.service';
import { UserLoginService } from './login/login.service';
import { IdentityController } from './identity.controller';
import { JwtService } from './jwt.service';
import { UserManagementService } from './user.service';
import { IdentityRepo } from './identity.repo';
import { UserRepository } from './user.repo';
import { OrgRepository } from './org.repo';
import { LoginController } from './login/login.controller';
import { OrgService } from './org.service';
import { IdentityGuard } from './identity.guard';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
  controllers: [IdentityController, LoginController],
  providers: [
    IdentityGuard,
    GoogleLoginService,
    UserLoginService,
    JwtService,
    UserManagementService,
    IdentityRepo,
    UserRepository,
    OrgRepository,
    OrgService,
  ],
  exports: [],
})
export class IdentityModule {}
