import { Injectable } from "@nestjs/common";
import { EmailClient, InjectEmailClient } from "./email.client.js";
import { OrgInvitationEmailPayload, WelcomeEmailPayload } from "./email.type.js";



/**
 * Utility class for constructing and sending emails using a fluent interface.
 * This class is designed to be used with the MailNotification service, which will handle the actual sending of emails.
 * It provides a convenient way to build email data and ensures that required fields are set before sending.
 */
@Injectable()
export class EmailService {

    constructor(@InjectEmailClient() private readonly emailClient: EmailClient) { }

    async sendWelcomeEmail(paylload: WelcomeEmailPayload) {
        await this.emailClient.to([paylload.email]).subject(`Hey ${paylload.name}, Welcome to Pixelsetu!`).template("pixelsetu_welcome").templateData({
            name: paylload.name,
            ctaUrl: paylload.ctaUrl,
        }).send();
    }

    async sendOrgInvitationEmail(payload: OrgInvitationEmailPayload) {
        await this.emailClient.to([payload.to]).subject(`You've been invited to join ${payload.orgName}`).template("pixelsetu_org_invitation").templateData({
            orgName: payload.orgName,
            orgRole: payload.orgRole,
            ctaUrl: payload.ctaUrl,
        }).send();
    }   
}