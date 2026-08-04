import { Injectable } from '@nestjs/common';
import { AppError, ContextService } from '@common';
import { UserRepository } from './user.repo';
import { OrgRepository } from './org.repo';
import { uuidv7 } from 'uuidv7';
import { StandardClaims } from '@/modules/auth/login/interface';
import { EmailService } from '@/modules/common/email';

@Injectable()
export class UserManagementService {
  private readonly DEFAULT_APPLICATION_POOL = ['home', 'split'];
  constructor(
    private readonly context: ContextService,
    private readonly userRepo: UserRepository,
    private readonly orgRepo: OrgRepository,
    private readonly emailService: EmailService,
  ) {}

  async findUserByEmail(email: string) {
    return await this.userRepo.findByEmail(email);
  }

  async getCurrentUserDetails() {
    const userId = this.context.getOrThrow('userId');
    const user = await this.userRepo.findById(userId);

    if (!user) {
      throw new AppError('NotFoundError', 'User not found');
    }
    const effectiveOrgs = await this.orgRepo.getEffectiveOrgsOfUser(userId);
    return {
      ...user,
      effectiveOrgs,
      activeOrgId: this.context.get('orgId'),
      activeRole: this.context.get('role'),
    };
  }

  async getDefaultOrgOfUser(userId: string) {
    const defaultOrg = await this.orgRepo.getDefaultOrgOfUser(userId);
    if (!defaultOrg) {
      throw new AppError('NotFoundError', 'Default organization not found');
    }
    return defaultOrg;
  }

  async onboardNewUser(userData: StandardClaims) {
    const newUserId = uuidv7();
    const newOrgId = uuidv7();
    const now = new Date();

    await this.userRepo.onboardNewUser(
      {
        id: newUserId,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        isVerified: userData.isVerified || false,
        avatarUrl: userData.avatarUrl,
        isActive: true,
        applicationPool: this.DEFAULT_APPLICATION_POOL,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: newOrgId,
        region: 'IN',
        platform: 'pixelsetu',
        country: 'IND',
        ownerEmail: userData.email,
        businessEmail: userData.email,
        ownerId: newUserId,
        displayName: `${userData.firstName}'s Company`,
        namespace: userData.email.split('@')[0].replaceAll('.', 'dot'),
        createdAt: now,
        updatedAt: now,
        licenses: ['regular'],
        isVerified: false,
      },
      {
        id: uuidv7(),
        orgId: newOrgId,
        userId: newUserId,
        role: 'owner',
        createdAt: now,
        updatedAt: now,
      },
    );

    await this.emailService.sendWelcomeEmail({
      name: `${userData.firstName} ${userData.lastName}`,
      email: userData.email,
      ctaUrl: 'https://pixelsetu.com',
    });

    return {
      userId: newUserId,
      orgId: newOrgId,
    };
  }

  async addApplication(appId?: string) {
    if (!appId) {
      throw new AppError('ValidationError');
    }
    const userId = this.context.getOrThrow('userId');
    return await this.userRepo.addApplication(userId, appId);
  }

  async removeApplication(appId?: string) {
    if (!appId) {
      throw new AppError('ValidationError');
    }
    const userId = this.context.getOrThrow('userId');
    return await this.userRepo.removeApplication(userId, appId);
  }
}
