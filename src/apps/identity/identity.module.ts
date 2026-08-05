import { Module } from '@nestjs/common';
import { CommonModule } from '@/modules/common/common.module';
import { IdentityController } from './identity.controller';
import { LoginController } from './login/login.controller';
import { UserManagementService } from './user.service';
import { OrgService } from './org.service';
import { IdentityRepo } from './identity.repo';
import { UserRepository } from './user.repo';
import { OrgRepository } from './org.repo';
import { MembershipRepository } from './membership.repo';
import { UserLoginService } from './login/login.service';
import { EmailModule } from '@/modules/common/email';
import { CookieService } from './cookie.service';

@Module({
  imports: [CommonModule, EmailModule],
  controllers: [IdentityController, LoginController],
  providers: [
    UserManagementService,
    OrgService,
    IdentityRepo,
    UserRepository,
    OrgRepository,
    MembershipRepository,
    UserLoginService,
    CookieService,
  ],
})
export class IdentityModule {}
