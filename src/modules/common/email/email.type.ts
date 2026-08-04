export interface WelcomeEmailPayload {
    name: string;
    email: string;
    ctaUrl: string;
}


export interface OrgInvitationEmailPayload {
    to: string;
    ctaUrl: string;
    orgName: string;
    orgRole: string;
}

export type EmailTemplate = 'pixelsetu_login_failure' | 'onboard_pixelsetu' | 'pixelsetu_org_invitation' | 'pixelsetu_welcome';