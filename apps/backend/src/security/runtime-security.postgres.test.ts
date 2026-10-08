import { describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import { loadConfig } from "../config.js";
import { createDatabase, sql } from "../database.js";
import { UnavailableFileStoragePort } from "../ports/file-storage.js";
import { authorize } from "./authorization.js";
import { availableTenantContexts, requireAccess, resolveTenantActor } from "../core-grc/security.js";
import { membershipCreate, membershipRoleAssign, subscriptionCreate, tenantBootstrap, tenantCreate } from "./platform-iam-service.js";
import { bootstrapFirstPlatformAdmin, requirePlatformAccess, resolvePlatformActor } from "./platform-authority.js";
import { PostgresOidcIdentityResolver } from "./oidc-browser.js";
import { newUuidV7 } from "../uuid.js";

describe.skipIf(process.env.TCDX_SECURITY_INTEGRATION !== "true")("Phase 5 runtime security PostgreSQL integration", () => {
it("serializes bootstrap and enforces platform/tenant authorization", async () => {
const database = createDatabase(loadConfig(process.env));
const ids = {
  first: newUuidV7(), second: newUuidV7(), target: newUuidV7(), bootstrapTarget: newUuidV7(), unprivileged: newUuidV7(),
  tenantRole: newUuidV7(), foreignRole: newUuidV7(), tenantRolePermission1: newUuidV7(), tenantRolePermission2: newUuidV7(),
  foreignRolePermission: newUuidV7()
};
const correlations = Array.from({ length: 18 }, () => newUuidV7());
const createdTenants: string[] = [];
const createdMemberships: string[] = [];
const createdAssignments: string[] = [];
const nowPlusHour = new Date(Date.now() + 3_600_000);
const identity = (principalId: string) => ({ principalClass: "HUMAN_INTERACTIVE" as const, principalId, tokenId: newUuidV7(), expiresAt: nowPlusHour });
const firstIdentity = identity(ids.first);
const secondIdentity = identity(ids.second);
const failures: string[] = [];
const oidcIdentityIds: string[] = [];

function check(condition: unknown, label: string): void {
  if (!condition) failures.push(label);
}

async function denied(work: () => Promise<unknown>, label: string): Promise<void> {
  try { await work(); failures.push(`${label}:unexpected-allow`); } catch (error) {
    check((error as { code?: string }).code === "TCDX.AUTHORIZATION.DENIED" || (error as { code?: string }).code === "TCDX.RESOURCE.NOT_FOUND", `${label}:unexpected-error`);
  }
}

async function rejected(work: () => Promise<unknown>, expectedCode: string, label: string): Promise<void> {
  try { await work(); failures.push(`${label}:unexpected-allow`); } catch (error) {
    check((error as { code?: string }).code === expectedCode, `${label}:unexpected-error`);
  }
}

try {
  const preexisting = await sql<{ count: number }>`SELECT count(*)::integer AS count FROM iam.platform_role_assignments`.execute(database);
  if (preexisting.rows[0]?.count !== 0) throw new Error("BOOTSTRAP_TEST_PRECONDITION_BLOCKED: platform assignment history is not empty");
  for (const [id, key, name] of [
    [ids.first, `phase5-runtime:${ids.first}`, "Runtime Admin A"],
    [ids.second, `phase5-runtime:${ids.second}`, "Runtime Admin B"],
    [ids.target, `phase5-runtime:${ids.target}`, "Runtime Target"],
    [ids.bootstrapTarget, `phase5-runtime:${ids.bootstrapTarget}`, "Runtime Bootstrap Target"],
    [ids.unprivileged, `phase5-runtime:${ids.unprivileged}`, "Runtime Unprivileged"]
  ]) {
    await sql`INSERT INTO iam.user_identities (user_identity_id,identity_key,display_name,lifecycle_state) VALUES (${id}::uuid,${key},${name},'active')`.execute(database);
  }

  const oidcIdentities = new PostgresOidcIdentityResolver();
  const firstOidcIdentity = await database.transaction().execute((tx) => oidcIdentities.resolveOrCreate(tx, {
    issuer: "https://issuer-a.example.test", subject: "stable-subject", email: "before@example.test", displayName: "OIDC Identity"
  }));
  const changedEmailIdentity = await database.transaction().execute((tx) => oidcIdentities.resolveOrCreate(tx, {
    issuer: "https://issuer-a.example.test", subject: "stable-subject", email: "after@example.test", displayName: "OIDC Identity Updated"
  }));
  const secondIssuerIdentity = await database.transaction().execute((tx) => oidcIdentities.resolveOrCreate(tx, {
    issuer: "https://issuer-b.example.test", subject: "stable-subject", email: "after@example.test", displayName: "Other Issuer Identity"
  }));
  oidcIdentityIds.push(firstOidcIdentity.userIdentityId, secondIssuerIdentity.userIdentityId);
  const oidcRows = await sql<{ user_identity_id: string; email_normalized: string | null }>`
    SELECT user_identity_id,email_normalized FROM iam.user_identities
     WHERE user_identity_id IN (${firstOidcIdentity.userIdentityId}::uuid,${secondIssuerIdentity.userIdentityId}::uuid)
     ORDER BY user_identity_id
  `.execute(database);
  check(firstOidcIdentity.userIdentityId === changedEmailIdentity.userIdentityId, "oidc-email-change-preserves-identity");
  check(firstOidcIdentity.userIdentityId !== secondIssuerIdentity.userIdentityId, "oidc-issuer-partitions-identity");
  check(oidcRows.rows.some((row) => row.user_identity_id === firstOidcIdentity.userIdentityId && row.email_normalized === "after@example.test"), "oidc-email-remains-attribute");

  await denied(() => bootstrapFirstPlatformAdmin(database, {
    identity: firstIdentity, correlationId: correlations[10]!, justification: "Forbidden role probe", roleCode: "PLATFORM_SUPPORT"
  } as Parameters<typeof bootstrapFirstPlatformAdmin>[1]), "bootstrap-platform-support-input");
  await denied(() => bootstrapFirstPlatformAdmin(database, {
    identity: firstIdentity, correlationId: correlations[11]!, justification: "Forbidden role probe", roleId: newUuidV7()
  } as Parameters<typeof bootstrapFirstPlatformAdmin>[1]), "bootstrap-arbitrary-role-input");

  const attempts = await Promise.allSettled([
    bootstrapFirstPlatformAdmin(database, { identity: firstIdentity, correlationId: correlations[0]!, justification: "Isolated concurrent runtime verification" }),
    bootstrapFirstPlatformAdmin(database, { identity: secondIdentity, correlationId: correlations[1]!, justification: "Isolated concurrent runtime verification" })
  ]);
  check(attempts.filter(({ status }) => status === "fulfilled").length === 1, "bootstrap-concurrency-success-count");
  check(attempts.filter(({ status }) => status === "rejected").length === 1, "bootstrap-concurrency-deny-count");
  const winner = attempts.find((item): item is PromiseFulfilledResult<Awaited<ReturnType<typeof bootstrapFirstPlatformAdmin>>> => item.status === "fulfilled");
  if (!winner) throw new Error("bootstrap produced no winner");
  const winnerIdentity = winner.value.userIdentityId === ids.first ? firstIdentity : secondIdentity;
  const loserIdentity = winner.value.userIdentityId === ids.first ? secondIdentity : firstIdentity;
  createdAssignments.push(winner.value.platformRoleAssignmentId);
  await denied(() => bootstrapFirstPlatformAdmin(database, { identity: loserIdentity, correlationId: correlations[2]!, justification: "Second attempt" }), "bootstrap-second-use");
  await sql`UPDATE iam.platform_role_assignments SET valid_to=transaction_timestamp() WHERE platform_role_assignment_id=${winner.value.platformRoleAssignmentId}::uuid`.execute(database);
  await denied(() => bootstrapFirstPlatformAdmin(database, { identity: loserIdentity, correlationId: correlations[3]!, justification: "Post-revocation attempt" }), "bootstrap-post-revocation");
  await sql`UPDATE iam.platform_role_assignments SET valid_to=NULL WHERE platform_role_assignment_id=${winner.value.platformRoleAssignmentId}::uuid`.execute(database);

  const platformActor = await resolvePlatformActor(database, winnerIdentity);
  requirePlatformAccess(platformActor, "platform.tenant.create");
  const loserPlatform = await resolvePlatformActor(database, loserIdentity);
  check(loserPlatform.permissions.size === 0, "platform-default-deny");
  const deniedApp = buildApp(async () => true, {
    database,
    identityVerifier: { verifyBearerToken: async () => loserIdentity },
    fileStorage: new UnavailableFileStoragePort()
  });
  const deniedResponse = await deniedApp.inject({
    method: "POST", url: "/api/v1/platform/tenants",
    headers: { authorization: "Bearer denied-platform-token", "idempotency-key": newUuidV7() },
    payload: { tenant_code: "RT-DENIED", legal_name: "Denied", display_name: "Denied", default_timezone: "UTC" }
  });
  await deniedApp.close();
  const deniedAudit = await sql<{ count: number }>`
    SELECT count(*)::integer AS count FROM ops_audit.audit_events
     WHERE actor_user_identity_id=${loserIdentity.principalId}::uuid
       AND event_code='audit.iam.application_token.privileged_use.v1'
       AND command_code='tenantCreate' AND outcome='denied'
  `.execute(database);
  check(deniedResponse.statusCode === 403 && deniedAudit.rows[0]?.count === 1, "platform-relevant-deny-audited");

  await rejected(() => database.transaction().execute((tx) => tenantCreate(tx, platformActor, {
    body: { tenant_code: "RT-FORBIDDEN", legal_name: "Forbidden", display_name: "Forbidden", default_timezone: "UTC", lifecycle_state: "active" },
    key: newUuidV7(), correlationId: correlations[4]!
  })), "TCDX.VALIDATION.FAILED", "tenant-caller-lifecycle-rejected");
  await rejected(() => database.transaction().execute((tx) => tenantCreate(tx, platformActor, {
    body: { tenant_code: "RT-FORBIDDEN", legal_name: "Forbidden", display_name: "Forbidden", default_timezone: "Not/A_Timezone", data_classification: "public" },
    key: newUuidV7(), correlationId: correlations[4]!
  })), "TCDX.VALIDATION.FAILED", "tenant-caller-classification-rejected");
  await rejected(() => database.transaction().execute((tx) => tenantCreate(tx, platformActor, {
    body: { tenant_code: "RT-BAD-TZ", legal_name: "Bad timezone", display_name: "Bad timezone", default_timezone: "Not/A_Timezone" },
    key: newUuidV7(), correlationId: correlations[4]!
  })), "TCDX.VALIDATION.FAILED", "tenant-invalid-timezone-rejected");

  const tenantOne = await database.transaction().execute((tx) => tenantCreate(tx, platformActor, {
    body: { tenant_code: `RT-${ids.first.slice(-12)}`, legal_name: "Runtime Verification One", display_name: "Runtime One", default_timezone: "America/Santiago" },
    key: newUuidV7(), correlationId: correlations[4]!
  }));
  createdTenants.push(tenantOne.result.tenant_id);
  const tenantTwo = await database.transaction().execute((tx) => tenantCreate(tx, platformActor, {
    body: { tenant_code: `RT-${ids.second.slice(-12)}`, legal_name: "Runtime Verification Two", display_name: "Runtime Two", default_timezone: "UTC" },
    key: newUuidV7(), correlationId: correlations[5]!
  }));
  createdTenants.push(tenantTwo.result.tenant_id);
  check(tenantOne.result.lifecycle_state === "active" && tenantOne.result.data_classification === "confidential", "tenant-server-defaults");

  await denied(() => tenantBootstrap(database, loserPlatform, {
    tenantId: tenantOne.result.tenant_id, userIdentityId: ids.bootstrapTarget, correlationId: correlations[12]!
  }), "tenant-bootstrap-wrong-caller");
  await denied(() => tenantBootstrap(database, platformActor, {
    tenantId: newUuidV7(), userIdentityId: ids.bootstrapTarget, correlationId: correlations[13]!
  }), "tenant-bootstrap-nonexistent-tenant");
  await denied(() => tenantBootstrap(database, platformActor, {
    tenantId: tenantOne.result.tenant_id, userIdentityId: newUuidV7(), correlationId: correlations[14]!
  }), "tenant-bootstrap-nonexistent-user");
  const tenantBootstrapFirst = await tenantBootstrap(database, platformActor, {
    tenantId: tenantOne.result.tenant_id, userIdentityId: ids.bootstrapTarget, correlationId: correlations[15]!
  });
  const tenantBootstrapSecond = await tenantBootstrap(database, platformActor, {
    tenantId: tenantOne.result.tenant_id, userIdentityId: ids.bootstrapTarget, correlationId: correlations[16]!
  });
  createdMemberships.push(tenantBootstrapFirst.tenantMembershipId);
  createdAssignments.push(tenantBootstrapFirst.membershipRoleId);
  const tenantBootstrapEvidence = await sql<{
    roles: number; grants: number; memberships: number; assignments: number; audits: number;
  }>`
    SELECT
      (SELECT count(*)::integer FROM iam.roles WHERE ownership_class='TENANT_OWNED' AND tenant_id=${tenantOne.result.tenant_id}::uuid AND is_baseline=TRUE) AS roles,
      (SELECT count(*)::integer FROM iam.role_permissions WHERE ownership_class='TENANT_OWNED' AND tenant_id=${tenantOne.result.tenant_id}::uuid) AS grants,
      (SELECT count(*)::integer FROM iam.tenant_memberships WHERE tenant_id=${tenantOne.result.tenant_id}::uuid AND user_identity_id=${ids.bootstrapTarget}::uuid) AS memberships,
      (SELECT count(*)::integer FROM iam.membership_roles mr JOIN iam.roles r ON r.role_id=mr.role_id
        WHERE mr.tenant_id=${tenantOne.result.tenant_id}::uuid AND mr.tenant_membership_id=${tenantBootstrapFirst.tenantMembershipId}::uuid
          AND r.role_code='TENANT_ADMIN' AND r.ownership_class='TENANT_OWNED' AND mr.scope_kind='tenant') AS assignments,
      (SELECT count(*)::integer FROM ops_audit.audit_events WHERE actor_user_identity_id=${winnerIdentity.principalId}::uuid
        AND aggregate_id=${tenantOne.result.tenant_id}::uuid AND command_code='TENANT_BOOTSTRAP'
        AND event_code='audit.iam.application_token.privileged_use.v1') AS audits
  `.execute(database);
  check(!tenantBootstrapFirst.replayed && tenantBootstrapSecond.replayed, "tenant-bootstrap-idempotent-replay");
  check(tenantBootstrapFirst.tenantMembershipId === tenantBootstrapSecond.tenantMembershipId
    && tenantBootstrapFirst.membershipRoleId === tenantBootstrapSecond.membershipRoleId, "tenant-bootstrap-stable-identifiers");
  check(tenantBootstrapEvidence.rows[0]?.roles === 22 && tenantBootstrapEvidence.rows[0]?.grants === tenantBootstrapFirst.baselineGrantCount,
    "tenant-bootstrap-exact-baseline-roles-and-grants");
  check(tenantBootstrapEvidence.rows[0]?.memberships === 1 && tenantBootstrapEvidence.rows[0]?.assignments === 1,
    "tenant-bootstrap-no-duplicate-membership-or-assignment");
  check(tenantBootstrapEvidence.rows[0]?.audits === 2, "tenant-bootstrap-audit-present");

  const permissions = await sql<{ permission_id: string; permission_code: string }>`
    SELECT permission_id,permission_code FROM iam.permissions
     WHERE permission_code IN ('platform.membership.create','platform.role.assign') AND lifecycle_state='published'
  `.execute(database);
  const permissionByCode = new Map(permissions.rows.map((row) => [row.permission_code, row.permission_id]));
  const plan = await sql<{ plan_version_id: string }>`
    SELECT DISTINCT e.plan_version_id FROM platform.entitlements e
    JOIN platform.capabilities c ON c.capability_id=e.capability_id
    WHERE e.is_enabled=TRUE AND c.capability_group='CORE_PLATFORM' AND c.lifecycle_state='published'
    LIMIT 1
  `.execute(database);
  const planVersionId = plan.rows[0]?.plan_version_id;
  if (!planVersionId || permissionByCode.size !== 2) throw new Error("runtime fixture catalog unavailable");

  await denied(() => database.transaction().execute((tx) => subscriptionCreate(tx, loserPlatform, {
    body: { tenant_id: tenantOne.result.tenant_id, plan_version_id: planVersionId, subscription_code: `RT-DENIED-${ids.first.slice(0, 8)}` },
    key: newUuidV7(), correlationId: correlations[17]!
  })), "subscription-platform-default-deny");
  await rejected(() => database.transaction().execute((tx) => subscriptionCreate(tx, platformActor, {
    body: { tenant_id: tenantOne.result.tenant_id, plan_version_id: planVersionId, subscription_code: `RT-FORBIDDEN-${ids.first.slice(0, 8)}`, entitlements: [] },
    key: newUuidV7(), correlationId: correlations[17]!
  })), "TCDX.VALIDATION.FAILED", "subscription-caller-entitlements-rejected");
  const subscriptionKey = newUuidV7();
  const subscriptionCode = `RT-${ids.first.slice(0, 8)}`;
  const subscription = await database.transaction().execute((tx) => subscriptionCreate(tx, platformActor, {
    body: { tenant_id: tenantOne.result.tenant_id, plan_version_id: planVersionId, subscription_code: subscriptionCode },
    key: subscriptionKey, correlationId: correlations[17]!
  }));
  const subscriptionReplay = await database.transaction().execute((tx) => subscriptionCreate(tx, platformActor, {
    body: { tenant_id: tenantOne.result.tenant_id, plan_version_id: planVersionId, subscription_code: subscriptionCode },
    key: subscriptionKey, correlationId: correlations[17]!
  }));
  check(!subscription.replayed && subscriptionReplay.replayed
    && subscription.result.subscription_id === subscriptionReplay.result.subscription_id, "subscription-idempotent-replay");
  await rejected(() => database.transaction().execute((tx) => subscriptionCreate(tx, platformActor, {
    body: { tenant_id: tenantOne.result.tenant_id, plan_version_id: planVersionId, subscription_code: `${subscriptionCode}-CONFLICT` },
    key: subscriptionKey, correlationId: correlations[17]!
  })), "TCDX.CONFLICT.IDEMPOTENCY", "subscription-idempotency-conflict");
  await rejected(() => database.transaction().execute((tx) => subscriptionCreate(tx, platformActor, {
    body: { tenant_id: tenantOne.result.tenant_id, plan_version_id: planVersionId, subscription_code: `${subscriptionCode}-DUPLICATE` },
    key: newUuidV7(), correlationId: correlations[17]!
  })), "TCDX.CONFLICT.RESOURCE", "subscription-duplicate-active");
  await sql`
    INSERT INTO iam.roles (role_id,ownership_class,tenant_id,role_code,name,is_baseline,lifecycle_state,created_by_user_identity_id,updated_by_user_identity_id)
    VALUES (${ids.tenantRole}::uuid,'TENANT_OWNED',${tenantOne.result.tenant_id}::uuid,${`RT_ADMIN_${ids.tenantRole.slice(0, 8)}`},'Runtime Tenant Admin',FALSE,'published',${winnerIdentity.principalId}::uuid,${winnerIdentity.principalId}::uuid),
           (${ids.foreignRole}::uuid,'TENANT_OWNED',${tenantTwo.result.tenant_id}::uuid,${`RT_FOREIGN_${ids.foreignRole.slice(0, 8)}`},'Runtime Foreign Admin',FALSE,'published',${winnerIdentity.principalId}::uuid,${winnerIdentity.principalId}::uuid)
  `.execute(database);
  await sql`
    INSERT INTO iam.role_permissions (role_permission_id,ownership_class,tenant_id,role_id,permission_id,created_by_user_identity_id)
    VALUES (${ids.tenantRolePermission1}::uuid,'TENANT_OWNED',${tenantOne.result.tenant_id}::uuid,${ids.tenantRole}::uuid,${permissionByCode.get("platform.membership.create")!}::uuid,${winnerIdentity.principalId}::uuid),
           (${ids.tenantRolePermission2}::uuid,'TENANT_OWNED',${tenantOne.result.tenant_id}::uuid,${ids.tenantRole}::uuid,${permissionByCode.get("platform.role.assign")!}::uuid,${winnerIdentity.principalId}::uuid),
           (${ids.foreignRolePermission}::uuid,'TENANT_OWNED',${tenantTwo.result.tenant_id}::uuid,${ids.foreignRole}::uuid,${permissionByCode.get("platform.membership.create")!}::uuid,${winnerIdentity.principalId}::uuid)
  `.execute(database);
  const actorMembership = newUuidV7();
  const foreignMembership = newUuidV7();
  const unprivilegedMembership = newUuidV7();
  createdMemberships.push(actorMembership, foreignMembership, unprivilegedMembership);
  await sql`
    INSERT INTO iam.tenant_memberships (tenant_membership_id,tenant_id,user_identity_id,membership_state,joined_at,created_by_user_identity_id,updated_by_user_identity_id)
    VALUES (${actorMembership}::uuid,${tenantOne.result.tenant_id}::uuid,${winnerIdentity.principalId}::uuid,'active',transaction_timestamp(),${winnerIdentity.principalId}::uuid,${winnerIdentity.principalId}::uuid),
           (${foreignMembership}::uuid,${tenantTwo.result.tenant_id}::uuid,${winnerIdentity.principalId}::uuid,'active',transaction_timestamp(),${winnerIdentity.principalId}::uuid,${winnerIdentity.principalId}::uuid),
           (${unprivilegedMembership}::uuid,${tenantOne.result.tenant_id}::uuid,${ids.unprivileged}::uuid,'active',transaction_timestamp(),${winnerIdentity.principalId}::uuid,${winnerIdentity.principalId}::uuid)
  `.execute(database);
  const actorGrant = newUuidV7();
  const foreignGrant = newUuidV7();
  createdAssignments.push(actorGrant, foreignGrant);
  await sql`
    INSERT INTO iam.membership_roles (membership_role_id,tenant_id,tenant_membership_id,role_id,scope_kind,valid_from,created_by_user_identity_id)
    VALUES (${actorGrant}::uuid,${tenantOne.result.tenant_id}::uuid,${actorMembership}::uuid,${ids.tenantRole}::uuid,'tenant',transaction_timestamp(),${winnerIdentity.principalId}::uuid),
           (${foreignGrant}::uuid,${tenantTwo.result.tenant_id}::uuid,${foreignMembership}::uuid,${ids.foreignRole}::uuid,'tenant',transaction_timestamp(),${winnerIdentity.principalId}::uuid)
  `.execute(database);

  const tenantActor = await resolveTenantActor(database, winnerIdentity, tenantOne.result.tenant_id);
  requireAccess(tenantActor, "platform.membership.create", "CORE_PLATFORM", ["tenant"]);
  await denied(async () => { const foreign = await resolveTenantActor(database, winnerIdentity, tenantTwo.result.tenant_id); requireAccess(foreign, "platform.membership.create", "CORE_PLATFORM", ["tenant"]); }, "entitlement-missing");
  await denied(async () => { const noRole = await resolveTenantActor(database, identity(ids.unprivileged), tenantOne.result.tenant_id); requireAccess(noRole, "platform.membership.create", "CORE_PLATFORM", ["tenant"]); }, "permission-role-missing");
  await denied(() => resolveTenantActor(database, loserIdentity, tenantOne.result.tenant_id), "membership-missing");
  await rejected(() => database.transaction().execute((tx) => membershipCreate(tx, tenantActor, {
    body: { user_identity_id: newUuidV7() }, key: newUuidV7(), correlationId: correlations[6]!
  })), "TCDX.RESOURCE.NOT_FOUND", "membership-nonexistent-identity");

  const createdMembership = await database.transaction().execute((tx) => membershipCreate(tx, tenantActor, {
    body: { user_identity_id: ids.target }, key: newUuidV7(), correlationId: correlations[6]!
  }));
  createdMemberships.push(createdMembership.result.tenant_membership_id);
  const automaticRoles = await sql<{ count: number }>`SELECT count(*)::integer AS count FROM iam.membership_roles WHERE tenant_membership_id=${createdMembership.result.tenant_membership_id}::uuid`.execute(database);
  check(automaticRoles.rows[0]?.count === 0 && createdMembership.result.membership_state === "active", "membership-active-without-role");
  await denied(() => database.transaction().execute((tx) => membershipRoleAssign(tx, tenantActor, {
    membershipId: createdMembership.result.tenant_membership_id, body: { role_id: winner.value.roleId, scope_kind: "tenant" }, key: newUuidV7(), correlationId: correlations[7]!
  })), "platform-role-rejected");
  await denied(() => database.transaction().execute((tx) => membershipRoleAssign(tx, tenantActor, {
    membershipId: createdMembership.result.tenant_membership_id, body: { role_id: ids.foreignRole, scope_kind: "tenant" }, key: newUuidV7(), correlationId: correlations[8]!
  })), "cross-tenant-role-rejected");
  await rejected(() => database.transaction().execute((tx) => membershipRoleAssign(tx, tenantActor, {
    membershipId: createdMembership.result.tenant_membership_id,
    body: { role_id: ids.tenantRole, scope_kind: "tenant", valid_to: new Date(Date.now() - 60_000).toISOString() },
    key: newUuidV7(), correlationId: correlations[8]!
  })), "TCDX.VALIDATION.FAILED", "role-invalid-valid-to");
  const targetGrant = await database.transaction().execute((tx) => membershipRoleAssign(tx, tenantActor, {
    membershipId: createdMembership.result.tenant_membership_id, body: { role_id: ids.tenantRole, scope_kind: "tenant" }, key: newUuidV7(), correlationId: correlations[9]!
  }));
  createdAssignments.push(targetGrant.result.membership_role_id);

  const administrativeApp = buildApp(async () => true, {
    database,
    identityVerifier: { verifyBearerToken: async (token: string) => token === "tenant-admin"
      ? identity(ids.bootstrapTarget) : token === "denied" ? loserIdentity : winnerIdentity },
    fileStorage: new UnavailableFileStoragePort()
  });
  try {
    const injectRead = (token: string, path: string, tenantId?: string) => administrativeApp.inject({
      method: "GET", url: path, headers: {
        authorization: `Bearer ${token}`,
        ...(tenantId ? { "x-tcdx-tenant-id": tenantId } : {})
      }
    });
    const tenantListRead = await injectRead("platform-admin", "/api/v1/platform/tenants");
    check(tenantListRead.statusCode === 200 && tenantListRead.json().items.some((row: Record<string, unknown>) => row.tenant_id === tenantOne.result.tenant_id
      && (row.current_subscription as { subscription_id?: string } | null)?.subscription_id === subscription.result.subscription_id), "admin-tenant-list-canonical-subscription");
    check((await injectRead("denied", "/api/v1/platform/tenants")).statusCode === 403, "admin-tenant-list-default-deny");
    check((await injectRead("tenant-admin", "/api/v1/platform/tenants", tenantOne.result.tenant_id)).statusCode === 403, "admin-tenant-list-tenant-admin-deny");
    const membershipsRead = await injectRead("platform-admin", `/api/v1/memberships?tenant_id=${tenantOne.result.tenant_id}`);
    const memberBody = membershipsRead.json();
    check(membershipsRead.statusCode === 200 && memberBody.items.some((row: Record<string, unknown>) => row.tenant_membership_id === createdMembership.result.tenant_membership_id), "admin-membership-list-platform-selected-tenant");
    check(!JSON.stringify(memberBody).includes("identity_key") && !JSON.stringify(memberBody).includes("stable-subject"), "admin-membership-minimal-pii");
    check((await injectRead("platform-admin", "/api/v1/memberships")).statusCode === 400, "admin-membership-explicit-tenant-required");
    check((await injectRead("tenant-admin", "/api/v1/memberships", tenantOne.result.tenant_id)).statusCode === 200, "admin-membership-tenant-authorized");
    check((await injectRead("tenant-admin", `/api/v1/memberships?tenant_id=${tenantTwo.result.tenant_id}`, tenantOne.result.tenant_id)).statusCode === 403, "admin-membership-tenant-override-denied");
    check((await injectRead("tenant-admin", `/api/v1/memberships/${createdMembership.result.tenant_membership_id}`, tenantTwo.result.tenant_id)).statusCode !== 200, "admin-membership-cross-tenant-denied");
    const assignmentRead = await injectRead("tenant-admin", `/api/v1/memberships/${createdMembership.result.tenant_membership_id}/role-assignments`, tenantOne.result.tenant_id);
    check(assignmentRead.statusCode === 200 && assignmentRead.json().items.some((row: Record<string, unknown>) => row.membership_role_id === targetGrant.result.membership_role_id), "admin-membership-role-list");
    const platformRolesRead = await injectRead("platform-admin", `/api/v1/roles?tenant_id=${tenantOne.result.tenant_id}`);
    const platformRoleDetail = await injectRead("platform-admin", `/api/v1/roles/${winner.value.roleId}?tenant_id=${tenantOne.result.tenant_id}`);
    check(platformRolesRead.statusCode === 200 && platformRolesRead.json().items.some((row: Record<string, unknown>) => row.role_code === "TENANT_ADMIN" && row.tenant_id === tenantOne.result.tenant_id)
      && platformRoleDetail.statusCode === 200 && platformRoleDetail.json().role_code === "PLATFORM_ADMIN", "admin-role-list-platform-and-selected-tenant");
    const tenantRolesRead = await injectRead("tenant-admin", "/api/v1/roles", tenantOne.result.tenant_id);
    check(tenantRolesRead.statusCode === 200 && tenantRolesRead.json().items.every((row: Record<string, unknown>) => row.ownership_class === "TENANT_OWNED" && row.tenant_id === tenantOne.result.tenant_id), "admin-role-list-tenant-isolated");
    check((await injectRead("tenant-admin", `/api/v1/roles/${winner.value.roleId}`, tenantOne.result.tenant_id)).statusCode === 404, "admin-platform-role-detail-hidden-from-tenant");
  } finally { await administrativeApp.close(); }
  const targetSecondMembership = newUuidV7();
  createdMemberships.push(targetSecondMembership);
  await sql`
    INSERT INTO iam.tenant_memberships (tenant_membership_id,tenant_id,user_identity_id,membership_state,joined_at,created_by_user_identity_id,updated_by_user_identity_id)
    VALUES (${targetSecondMembership}::uuid,${tenantTwo.result.tenant_id}::uuid,${ids.target}::uuid,'active',transaction_timestamp(),${winnerIdentity.principalId}::uuid,${winnerIdentity.principalId}::uuid)
  `.execute(database);
  const contexts = await availableTenantContexts(database, identity(ids.target));
  check(contexts.length === 2 && contexts[0]?.tenant_id === tenantOne.result.tenant_id && contexts[1]?.tenant_id === tenantTwo.result.tenant_id
    && contexts[0].effective_role_codes.length === 1 && contexts[1].effective_role_codes.length === 0, "access-me-own-active-contexts-deterministic-order");
  check((await availableTenantContexts(database, { principalClass: "MACHINE_TO_MACHINE", principalId: ids.target, tokenId: newUuidV7(), expiresAt: nowPlusHour })).length === 0, "access-me-m2m-empty");
  await sql`UPDATE iam.tenant_memberships SET membership_state='suspended' WHERE tenant_membership_id=${createdMembership.result.tenant_membership_id}::uuid`.execute(database);
  const withoutInactiveMembership = await availableTenantContexts(database, identity(ids.target));
  check(withoutInactiveMembership.length === 1 && withoutInactiveMembership[0]?.tenant_id === tenantTwo.result.tenant_id, "access-me-inactive-membership-excluded");
  await sql`UPDATE iam.tenant_memberships SET membership_state='active' WHERE tenant_membership_id=${createdMembership.result.tenant_membership_id}::uuid`.execute(database);
  await sql`UPDATE platform.tenants SET lifecycle_state='suspended' WHERE tenant_id=${tenantOne.result.tenant_id}::uuid`.execute(database);
  const withoutInactiveTenant = await availableTenantContexts(database, identity(ids.target));
  check(withoutInactiveTenant.length === 1 && withoutInactiveTenant[0]?.tenant_id === tenantTwo.result.tenant_id, "access-me-inactive-tenant-excluded");
  await sql`UPDATE platform.tenants SET lifecycle_state='active' WHERE tenant_id=${tenantOne.result.tenant_id}::uuid`.execute(database);

  const authorizationBase = {
    authenticated: true, tenantMembershipActive: true, capabilityEnabled: true,
    permissions: new Set(["platform.membership.create"]), scopes: new Set(["tenant" as const]), objectAccessible: true, sodAllowed: true
  };
  for (const key of ["tenantMembershipActive", "capabilityEnabled", "objectAccessible", "sodAllowed"] as const) {
    try { authorize({ ...authorizationBase, [key]: false }, { permission: "platform.membership.create", allowedScopes: new Set(["tenant"]) }); failures.push(`default-deny-${key}`); } catch { /* expected */ }
  }

  const bootstrapEvidence = await sql<{ grants: number; audits: number }>`
    SELECT (SELECT count(*)::integer FROM iam.platform_role_assignments WHERE platform_role_assignment_id=${winner.value.platformRoleAssignmentId}::uuid) AS grants,
           (SELECT count(*)::integer FROM ops_audit.audit_events WHERE event_code='audit.iam.platform_role_assignment.bootstrap.v1' AND aggregate_id=${winner.value.platformRoleAssignmentId}::uuid) AS audits
  `.execute(database);
  check(bootstrapEvidence.rows[0]?.grants === 1 && bootstrapEvidence.rows[0]?.audits === 1, "bootstrap-atomic-audit");
  const administrativeEvidence = await sql<{ tenant_audits: number; subscription_audits: number; membership_audits: number; role_audits: number; tenant_events: number; subscription_events: number; membership_events: number; role_events: number }>`
    SELECT
      count(*) FILTER (WHERE event_code='audit.platform.tenant.create.v1' AND aggregate_id IN (${tenantOne.result.tenant_id}::uuid,${tenantTwo.result.tenant_id}::uuid))::integer AS tenant_audits,
      count(*) FILTER (WHERE event_code='audit.platform.subscription.create.v1' AND aggregate_id=${subscription.result.subscription_id}::uuid)::integer AS subscription_audits,
      count(*) FILTER (WHERE event_code='audit.platform.membership.create.v1' AND aggregate_id=${createdMembership.result.tenant_membership_id}::uuid)::integer AS membership_audits,
      count(*) FILTER (WHERE event_code='audit.platform.role.assign.v1' AND aggregate_id=${targetGrant.result.membership_role_id}::uuid)::integer AS role_audits,
      (SELECT count(*)::integer FROM ops_audit.outbox_events WHERE event_type='platform.tenant.provisioned.v1' AND aggregate_id IN (${tenantOne.result.tenant_id}::uuid,${tenantTwo.result.tenant_id}::uuid)) AS tenant_events,
      (SELECT count(*)::integer FROM ops_audit.outbox_events WHERE event_type='platform.subscription.created.v1' AND aggregate_id=${subscription.result.subscription_id}::uuid) AS subscription_events,
      (SELECT count(*)::integer FROM ops_audit.outbox_events WHERE event_type='iam.membership.created.v1' AND aggregate_id=${createdMembership.result.tenant_membership_id}::uuid) AS membership_events,
      (SELECT count(*)::integer FROM ops_audit.outbox_events WHERE event_type='iam.role.assigned.v1' AND aggregate_id=${targetGrant.result.membership_role_id}::uuid) AS role_events
    FROM ops_audit.audit_events
  `.execute(database);
  check(administrativeEvidence.rows[0]?.tenant_audits === 2 && administrativeEvidence.rows[0]?.subscription_audits === 1
    && administrativeEvidence.rows[0]?.membership_audits === 1
    && administrativeEvidence.rows[0]?.role_audits === 1, "administrative-audit-events");
  check(administrativeEvidence.rows[0]?.tenant_events === 2 && administrativeEvidence.rows[0]?.subscription_events === 1
    && administrativeEvidence.rows[0]?.membership_events === 1
    && administrativeEvidence.rows[0]?.role_events === 1, "administrative-outbox-events");

  process.stdout.write(`${JSON.stringify({
    oidcUserIdentityBoundary: "PASS",
    firstPlatformAdminBootstrap: failures.some((item) => item.startsWith("bootstrap")) ? "FAIL" : "PASS",
    bootstrapConcurrency: attempts.map(({ status }) => status),
    tenantBootstrap: failures.some((item) => item.startsWith("tenant-bootstrap")) ? "FAIL" : "PASS",
    platformRbac: failures.some((item) => item.startsWith("platform")) ? "FAIL" : "PASS",
    subscriptionCreate: subscription.result,
    subscriptionReplay: subscriptionReplay.replayed,
    tenantCreateDefaults: tenantOne.result,
    membershipCreateNoAutomaticRole: automaticRoles.rows[0]?.count === 0,
    membershipRoleAssign: targetGrant.result,
    accessMeOwnContexts: contexts.length,
    tenantAuthorizationDefaultDeny: failures.filter((item) => item.startsWith("default-deny")).length === 0,
    failures
  }, null, 2)}\n`);
} finally {
  await sql`DELETE FROM ops_audit.outbox_events WHERE actor_user_identity_id IN (${ids.first}::uuid,${ids.second}::uuid,${ids.target}::uuid,${ids.bootstrapTarget}::uuid,${ids.unprivileged}::uuid)`.execute(database).catch(() => undefined);
  await sql`DELETE FROM ops_audit.audit_events WHERE actor_user_identity_id IN (${ids.first}::uuid,${ids.second}::uuid,${ids.target}::uuid,${ids.bootstrapTarget}::uuid,${ids.unprivileged}::uuid)`.execute(database).catch(() => undefined);
  await sql`DELETE FROM ops_audit.idempotency_records WHERE actor_user_identity_id IN (${ids.first}::uuid,${ids.second}::uuid,${ids.target}::uuid,${ids.bootstrapTarget}::uuid,${ids.unprivileged}::uuid)`.execute(database).catch(() => undefined);
  await sql`DELETE FROM iam.membership_roles WHERE tenant_id = ANY(${createdTenants}::uuid[])`.execute(database).catch(() => undefined);
  await sql`DELETE FROM iam.tenant_memberships WHERE tenant_id = ANY(${createdTenants}::uuid[])`.execute(database).catch(() => undefined);
  await sql`DELETE FROM iam.role_permissions WHERE tenant_id = ANY(${createdTenants}::uuid[])`.execute(database).catch(() => undefined);
  await sql`DELETE FROM iam.roles WHERE tenant_id = ANY(${createdTenants}::uuid[])`.execute(database).catch(() => undefined);
  await sql`DELETE FROM platform.subscriptions WHERE tenant_id = ANY(${createdTenants}::uuid[])`.execute(database).catch(() => undefined);
  await sql`DELETE FROM platform.tenants WHERE tenant_id = ANY(${createdTenants}::uuid[])`.execute(database).catch(() => undefined);
  await sql`DELETE FROM iam.platform_role_assignments WHERE platform_role_assignment_id = ANY(${createdAssignments}::uuid[])`.execute(database).catch(() => undefined);
  await sql`DELETE FROM iam.user_identities WHERE user_identity_id = ANY(${oidcIdentityIds}::uuid[])`.execute(database).catch(() => undefined);
  await sql`DELETE FROM iam.user_identities WHERE user_identity_id IN (${ids.first}::uuid,${ids.second}::uuid,${ids.target}::uuid,${ids.bootstrapTarget}::uuid,${ids.unprivileged}::uuid)`.execute(database).catch(() => undefined);
  await database.destroy();
}

expect(failures).toEqual([]);
}, 30_000);
});
