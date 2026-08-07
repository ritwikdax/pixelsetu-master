import {
    BadRequestException,
    Injectable,
} from '@nestjs/common';
import { generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';
import { UserRepository } from './user.repo';
import { AppError, ContextService } from '@/modules/common';

@Injectable()
export class TotpService {

    private readonly APPLICATION_NAME = 'Pixelsetu';

    constructor(
        private readonly userRepo: UserRepository,
        private readonly ctx: ContextService,
    ) { }


    async setup() {
        const userId = this.ctx.getOrThrow('userId');
        const user = await this.userRepo.findById(userId);

        if (user?.mfaEnabled) {
            return {
                isEnabled: true,
            }
        }

        let secret = user?.totpSecret;
        if (!secret || !user?.totpSecret) {
            secret = generateSecret();
        } else {
            secret = user?.totpSecret;
        }

        const email = this.ctx.getOrThrow('email');

        const otpauthUrl = generateURI({
            issuer: this.APPLICATION_NAME,
            label: email,
            secret,
            algorithm: 'sha1',
            digits: 6,
            period: 30,
        });

        const qrCode = await QRCode.toDataURL(otpauthUrl);

        await this.userRepo.updateById(userId, {
            totpSecret: secret,
            mfaEnabled: false,
        });

        return {
            isEnabled: false,
            qrCode,
            secret, // show this as a manual-entry fallback
        };
    }

    async verifySetup(
        token: string,
    ) {
        const userId = this.ctx.getOrThrow('userId');
        const user = await this.userRepo.findById(userId);

        if (!user?.totpSecret) {
            throw new BadRequestException(
                'TOTP setup has not been initiated',
            );
        }

        const { valid } = await verify({
            token,
            secret: user.totpSecret,
        });

        if (!valid) {
            throw new AppError("UnauthorizedError", "Invalid authenticator code");
        }

        // Only enable TOTP after successful verification.
        await this.userRepo.updateById(userId, {
            mfaEnabled: true,
        });

        return {
            success: true,
        };
    }

    async verifyLogin(
        token: string,
    ) {
        const userId = this.ctx.getOrThrow('userId');
        const user = await this.userRepo.findById(userId);
        if (!user?.mfaEnabled || !user.totpSecret) {
            throw new AppError(
                'UnauthorizedError',
                'MFA is not enabled for this account',
            );
        }
        const { valid } = await verify({
            token,
            secret: user.totpSecret,
        });
        if (!valid) {
            throw new AppError('UnauthorizedError', 'Invalid authenticator code');
        }
    }

    async deleteTotpSetup() {
        const userId = this.ctx.getOrThrow('userId');
        await this.userRepo.updateById(userId, {
            totpSecret: null,
            mfaEnabled: false,
            loginWithMfaEnabled: false,
        });
        return { success: true };
    }

    async toggleMfaLoginSetup() {
        const userId = this.ctx.getOrThrow('userId');
        const user = await this.userRepo.findById(userId);
        if (!user?.loginWithMfaEnabled) {
            await this.userRepo.updateById(userId, {
                loginWithMfaEnabled: true,
            });
            return { currentStatus: true };
        } else {
            await this.userRepo.updateById(userId, {
                loginWithMfaEnabled: false,
            });
            return { currentStatus: false };
        }
    }
}