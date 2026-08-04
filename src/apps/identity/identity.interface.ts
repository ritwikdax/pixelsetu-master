import { OrgRole } from "./schema";

export interface AcceptInviteTokenPayload {
    orgId: string;
    email: string;
    role: OrgRole;
}

export interface OrgMember {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string;
    role: OrgRole;
}