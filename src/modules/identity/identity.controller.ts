import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { IdentityGuard } from './identity.guard';
import { OrgService } from './org.service';
import { UserManagementService } from './user.service';
import { Role, RoleGuard } from '../rbac';
import { ValidateSchema } from '../common';
import { Org, OrganizationSchema } from './schema';

@UseGuards(IdentityGuard, RoleGuard)
@Controller('identity')
export class IdentityController {
  constructor(
    private readonly orgService: OrgService,
    private readonly userService: UserManagementService,
  ) {}


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

  @Get('org')
  async getOrg() {
    return {
      success: true,
      message: 'Organization details retrieved successfully',
      data: await this.orgService.getOrgDetails(),
    };
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
