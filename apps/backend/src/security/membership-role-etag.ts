import { createHash } from "node:crypto";

export type MembershipRoleValidity = {
  membership_role_id: string;
  valid_from: string | Date;
  valid_to: string | Date | null;
};

export function membershipRoleEtag(role: MembershipRoleValidity): string {
  const from = new Date(role.valid_from).toISOString();
  const to = role.valid_to === null ? null : new Date(role.valid_to).toISOString();
  return createHash("sha256").update(JSON.stringify([role.membership_role_id, from, to])).digest("hex");
}
