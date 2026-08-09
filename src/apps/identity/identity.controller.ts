import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/modules/auth/auth.guard';
import { OrgService } from './org.service';
import { UserManagementService } from './user.service';
import { Role, RoleGuard } from '@/modules/rbac';
import { ValidateSchema } from '@common';
import { InviteUserToOrgSchema, MembershipSchema, Org, OrganizationSchema } from './schema';
import { type Response } from 'express';
import type { InviteUserToOrg } from './schema';
import { COOKIE_NAME } from '@/modules/const.global';
import { AllowAnnonymous, AllowMfaPending } from '@/modules';
import { CookieService } from './cookie.service';
import { TotpService } from './totp.service';
import { UserLoginService } from './login/login.service';
import z from 'zod';

@UseGuards(AuthGuard, RoleGuard)
@Controller('identity')
export class IdentityController {
  constructor(
    private readonly orgService: OrgService,
    private readonly userService: UserManagementService,
    private readonly cookieService: CookieService,
    private readonly totpService: TotpService,
    private readonly userLoginService: UserLoginService,
  ) { }

  @AllowAnnonymous()
  @Get('business/:namespace')
  async getBusinessDetails(@Param('namespace') namespace: string){
    return {
      success: true,
      message: 'Business details retrieved successfully',
      data: await this.orgService.getBusinessDetails(namespace),
    }
  }


  @Get('healthcheck')
  async healthcheck() {
    return 'OK';
  }

  @Role('owner')
  @Post('me/mfa/setup')
  async setupMfa() {
    return {
      success: true,
      message: 'MFA setup response sent successfully',
      data: await this.totpService.setup(),
    }
  }

  @Role('owner')
  @Delete('me/mfa')
  async deleteMfaSetup(){
    return {
      success: true,
      message: 'MFA setup deleted successfully',
      data: await this.totpService.deleteTotpSetup(),
    }
  }

  @Role('owner')
  @Patch('me/mfa/login/toggle')
  async toggleMfaLoginSetup(){
    return {
      success: true,
      message: 'MFA login setup toggled successfully',
      data: await this.totpService.toggleMfaLoginSetup(),
    }
  }

  @Role('owner')
  @ValidateSchema({
    body: z.object({ code: z.string().length(6) }),
  })
  @Post('me/mfa/verify')
  async verifyMfa(@Body() body: { code: string }) {
    return {
      success: true,
      message: 'MFA verified successfully',
      data: await this.totpService.verifySetup(body.code),
    }
  }

  @Role('owner')
  @AllowMfaPending()
  @Get('me/mfa/login')
  async getMfaLoginStatus() {
    return {
      success: true,
      message: 'MFA login status retrieved successfully',
      data: {
        mfaPending: true,
        email: await this.userService.getEmailForMfaLogin(),
      },
    };
  }

  @Role('owner')
  @ValidateSchema({
    body: z.object({ code: z.string().length(6) }),
  })
  @AllowMfaPending()
  @Post('me/mfa/login')
  async verifyLoginMfa(
    @Body() body: { code: string },
    @Res() res: Response,
  ) {
    await this.totpService.verifyLogin(body.code);
    const token = this.userLoginService.completeMfaLogin();
    await this.cookieService.setLoginCookie(res, token);
    return res.status(200).json({
      success: true,
      message: 'MFA verified for login successfully',
    });
  }

  @AllowMfaPending()
  @Get('me')
  async getIdentityContext() {
    return {
      success: true,
      message: 'Identity context retrieved successfully',
      data: await this.userService.getCurrentUserDetails(),
    };
  }

  @Post('me/logout')
  async logout(@Res() res: Response) {
    res.cookie(COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      ...(process.env.NODE_ENV === 'production' && {
        domain: '.pixelsetu.com',
        sameSite: 'none',
      }),
      maxAge: 0,
      path: '/',
    });
    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  }

  @Patch('me/switch-org')
  @ValidateSchema({
    body: MembershipSchema.pick({ orgId: true }).strict(),
  })
  async changeOrgContext(@Res() res: Response, @Body() body: {orgId: string}){

    const { orgId } = body;
    const newToken = await this.userService.switchOrg(orgId);
    await this.cookieService.setLoginCookie(res, newToken);
    return res.status(200).json({ success: true, message: 'Organization context changed successfully' });
  }

  @Delete('me/leave-org')
  async leaveOrg(@Res() res: Response){
    await this.userService.leaveOrg();
    await this.cookieService.clearCookie(res);
    return res.status(200).json({ success: true, message: 'User left the organization successfully' });
  }

  @AllowMfaPending()
  @Get('org')
  async getOrg() {
    return {
      success: true,
      message: 'Organization details retrieved successfully',
      data: await this.orgService.getOrgDetails(),
    };
  }

  @Role('owner')
  @Get('org/members')
  async getOrgMembers() {
    return {
      success: true,
      message: 'Organization members retrieved successfully',
      data: await this.orgService.getOrgMembers(),
    };
  }

  @Role('owner')
  @Post('org/invite')
  @ValidateSchema({
    body: InviteUserToOrgSchema,
  })
  async inviteUserToOrg(@Body() body: InviteUserToOrg) {
    return {
      success: true,
      message: 'User invited to organization successfully',
      data: await this.orgService.inviteUserToOrg(body.email, body.role),
    };
  }

  @AllowAnnonymous()
  @Get('org/invite/accept')
  async acceptInvite(@Query('token') token: string){
    return await this.orgService.acceptInvite(token);
  }

  @ValidateSchema({
    body: OrganizationSchema.omit({
      ownerId: true,
      ownerEmail: true,
      isVerified: true,
    }).strict(),
  })
  @Patch('org')
  @Role('owner')
  async updateOrg(@Body() updatedData: Partial<Org>) {
    await this.orgService.updateOrgDetails(updatedData);
    return {
      success: true,
      message: 'Organization details updated successfully',
    };
  }

  @Post('org/check-namespace')
  @ValidateSchema({
    body: OrganizationSchema.pick({ namespace: true }).strict(),
  })
  @Role('owner')
  async checkNamespaceAvailability(@Body() body: { namespace: string }) {
    const { namespace } = body;
    const isAvailable =
      await this.orgService.checkNamespaceAvailability(namespace);
    return {
      success: true,
      message: isAvailable
        ? 'Namespace is available'
        : 'Namespace is already taken',
      data: { isAvailable },
    };
  }
}
