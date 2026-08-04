import { OrgRole } from "./schema";

export interface AcceptInviteTokenPayload {
    orgId: string;
    email: string;
    role: OrgRole;
}