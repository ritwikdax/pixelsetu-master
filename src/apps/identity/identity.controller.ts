import { Body, Controller, Delete, Get, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/modules/auth/auth.guard';
import { OrgService } from './org.service';
import { UserManagementService } from './user.service';
import { Role, RoleGuard } from '@/modules/rbac';
import { ValidateSchema } from '@common';
import { InviteUserToOrgSchema, MembershipSchema, Org, OrganizationSchema } from './schema';
import { type Response } from 'express';
import type { InviteUserToOrg } from './schema';
import { COOKIE_NAME } from '@/modules/const.global';
import { AllowAnnonymous } from '@/modules';
import { CookieService } from './cookie.service';

@UseGuards(AuthGuard, RoleGuard)
@Controller('identity')
export class IdentityController {
  constructor(
    private readonly orgService: OrgService,
    private readonly userService: UserManagementService,
    private readonly cookieService: CookieService,
  ) { }

  @Get('healthcheck')
  async healthcheck() {
    return 'OK';
  }

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
