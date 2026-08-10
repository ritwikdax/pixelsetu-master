import { Injectable, NotFoundException } from '@nestjs/common';
import { OrgRepository } from './org.repo';
import { AppError, AppLogger, ContextService } from '@common';
import { Org, OrgRole } from './schema';
import { UserRepository } from './user.repo';
import { EmailService } from '@/modules/common/email';
import { MembershipRepository } from './membership.repo';
import { JwtService } from '@/modules';
import { AcceptInviteTokenPayload, OrgMember } from './identity.interface';
import { uuidv7 } from 'uuidv7';
import { AppConfigService } from '@/modules/common/config/config.service';

@Injectable()
export class OrgService {
  private readonly logger = new AppLogger(OrgService.name);
  constructor(
    private readonly orgRepository: OrgRepository,
    private readonly userRepository: UserRepository,
    private readonly emailService: EmailService,
    private readonly membershipRepo: MembershipRepository,
    private readonly context: ContextService,
    private readonly jwtService: JwtService,
    private readonly configService: AppConfigService,
  ) { }

  async getBusinessDetails(namespace: string) {
    return await this.orgRepository.getOrgDetailsPublic(namespace);
  }



  async getOrgDetails() {
    const orgId = this.context.getOrThrow('orgId');
    return await this.orgRepository.getOrgDetails(orgId);
  }

  async getOrgMembers(): Promise<OrgMember[]> {
    const orgId = this.context.getOrThrow('orgId');
    return (await this.membershipRepo.getAllMembersOfOrg(
      orgId,
    )) as OrgMember[];
  }

  async updateOrgDetails(updatedData: Partial<Org>) {

    if(updatedData.namespace){
      const isAvailable = await this.orgRepository.checkNamespaceAvailability(updatedData.namespace);
      if(!isAvailable) {
        throw new AppError("Unsupported", "Namespace is not available");
      }
    }


    const orgId = this.context.getOrThrow('orgId');
    await this.orgRepository.updateOrgDetails(updatedData, orgId);
  }

  async checkNamespaceAvailability(namespace: string) {
    return await this.orgRepository.checkNamespaceAvailability(namespace);
  }

  async inviteUserToOrg(email: string, role: OrgRole) {
    const orgId = this.context.getOrThrow('orgId');
    const userId = this.context.getOrThrow('userId');

    const invitedUser = await this.userRepository.findByEmail(email);
    if (!invitedUser) {
      throw new NotFoundException('User not found');
    }

    else if (userId === invitedUser.id) {
      throw new AppError("Unsupported", "User cannot invite themselves");
    }

    const membership = await this.membershipRepo.checkMembership(orgId, invitedUser.id);

    if (membership) {
      throw new AppError("Unsupported", "User already a member of the organization");
    }

    const org = await this.orgRepository.getOrgDetails(orgId);
    if (!org) {
      throw new AppError("NotFoundError", "Organization not found");
    }

    const baseUrl = this.configService.getConfig('DEPLOY_DOMAIN');

    const inviteToken = this.jwtService.sign({
      orgId,
      email,
      role,
    });
    const ctaUrl = `${baseUrl}/identity/org/invite/accept?token=${inviteToken}`;

    this.logger.log(`Inviting user ${email} to org ${org.displayName} with role ${role}`, {ctaUrl});

    await this.emailService.sendOrgInvitationEmail({
      to: email,
      ctaUrl: ctaUrl,
      orgName: org.displayName || '',
      orgRole: role,
    });

    return {
      ctaUrl
    }
  }

  async acceptInvite(token: string) {
    const decodedToken = this.jwtService.verify<AcceptInviteTokenPayload>(token);
    if(!decodedToken) {
      return `<div>Invalid or expired invite token</div>`;
    }

    const user = await this.userRepository.findByEmail(decodedToken.email);
    if (!user) {
      return `<div>User not found. Please ask user to register first.</div>`;
    }

    const membership = await this.membershipRepo.checkMembership(decodedToken.orgId, user.id);
    if (membership) {
      return `<div>User already a member of the organization</div>`;
    }

    await this.membershipRepo.createMembership({
      id: uuidv7(),
      orgId: decodedToken.orgId,
      userId: user.id,
      role: decodedToken.role as OrgRole,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return `<div>User invited to organization successfully</div>`;
  }


  async removeOrgMember(memberId: string) {
    const orgId = this.context.getOrThrow('orgId');
    const membership = await this.membershipRepo.checkMembership(orgId, memberId);
    if(!membership) {
      throw new AppError("NotFoundError", "Membership not found");
    }
    if(membership.role === 'owner') {
      throw new AppError("Unsupported", "Owner cannot be removed from the organization");
    }

    return await this.membershipRepo.deleteMembership(orgId, memberId);
  }

}
