import {publishInitialSourceLifecycle,type InitialSourcePublication} from "./initial-source-lifecycle-publication.js";
import { createHash } from "node:crypto";
import { readFile, lstat } from "node:fs/promises";
import { sql, CompiledQuery, type Kysely, type Transaction } from "kysely";
import { ROLE_PERMISSION_PUBLICATION } from "@tcdx-grc/contracts";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";
import { persistAuditEvent } from "../persistence/foundation-records.js";
import { newUuidV7 } from "../uuid.js";
import { requireRbacResolutionR3 } from "./reference-publication.js";
import { ApplicationTokenService, type MachineIdentityProof, type MachineJwtProfile } from "./application-token.js";
import { publishC04wLifecycle, type C04wLifecyclePublication } from "./c04w-lifecycle-publication.js";

type Ex = Kysely<FoundationDatabase> | Transaction<FoundationDatabase>;
type Binding = { command_code: string; entity: string; from: string | null; to: string | null; permission: string;
  object_policy: string; audit: string; event: string; profile: string; allowed_scopes: string[];
  system_actor_allowed: boolean; notification_policy: string; recalculation_policy: string;
  concurrency_semantics: string; sod_policy: string };
type Bindings = { status: string; bindings: Binding[]; permission_grant_candidates: { code: string; base_role: string; other_roles: string }[] };
const digest = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const c04wR2Sha256 = "b2a5bc73f75d7f95fb7ba5068f1b3ea77a923d7da7501446d05455ee545ec523";
const c04wRoleManifestSha256 = "8c9112ae1db21f477cca6f16dba12ccbe0b4956b2d477b77b4097d3ed5727583";
const c04wTenantAdminPermissions = [
  "privacy.retention_policy.read", "privacy.retention_policy.create", "privacy.retention_policy.update",
  "privacy.retention_policy.publish", "evidence.document.create", "evidence.document.update",
  "evidence.evidence.create", "evidence.evidence.submit", "evidence.evidence.read"
] as const;
const c04wHoldReleasePermission = "privacy.retention_policy.legal_hold.release";
function deny(): never { throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "IAM publication denied", 403); }
function conflict(): never { throw new FoundationError("TCDX.CONFLICT.RESOURCE", "IAM publication evidence conflict", 409); }

/** Exact-byte, QA-only operational configuration; no credential is contained in these bytes. */
export async function loadIamPublicationFiles(input: {
  profilePath: string; approvedProfileSha256: string; bindingsPath: string; approvedBindingsSha256: string;
  decisionPath: string; approvedDecisionSha256: string;
  rbacResolutionPath: string; approvedRbacResolutionSha256: string;
}) {
  const files = await Promise.all([readFile(input.profilePath), readFile(input.bindingsPath), readFile(input.decisionPath), readFile(input.rbacResolutionPath)]);
  const expected = [input.approvedProfileSha256, input.approvedBindingsSha256, input.approvedDecisionSha256, input.approvedRbacResolutionSha256];
  if (files.some((bytes, i) => !/^[0-9a-f]{64}$/.test(expected[i] ?? "") || digest(bytes) !== expected[i])) deny();
  const profile = JSON.parse(files[0]!.toString()) as MachineJwtProfile;
  const decision = JSON.parse(files[2]!.toString()) as Record<string, unknown>;
  if (decision.status !== "APPROVED" || decision.decision_id !== profile.decision_id
    || decision.environment !== "qa" || decision.principal_code !== profile.principal_code
    || decision.purpose !== profile.purpose || decision.production_access !== false
    || decision.ownership_class !== "PLATFORM_CONTROL" || decision.tenant_id !== null) deny();
  const bindings = JSON.parse(files[1]!.toString()) as Bindings;
  if (bindings.status !== "APPROVED_ACTIVE_CONTRACT" || bindings.permission_grant_candidates.length !== 3
    || bindings.bindings.length !== 5 || bindings.permission_grant_candidates.some(p => p.base_role !== "PLATFORM_ADMIN" || p.other_roles !== "DENY")
    || bindings.bindings.some(b => b.allowed_scopes.length !== 1 || b.allowed_scopes[0] !== "platform" || b.system_actor_allowed !== false)) deny();
  return { profile, bindings, profileSha256: expected[0]!, bindingsSha256: expected[1]!, decisionSha256: expected[2]!,
    rbacResolutionSql: files[3]!.toString("utf8") };
}

export class IamPublicationService {
  constructor(private readonly db: Kysely<FoundationDatabase>, private readonly tokens: ApplicationTokenService,
    readonly configuration: Awaited<ReturnType<typeof loadIamPublicationFiles>>,
    private readonly machineCredential: () => Promise<string>,
    private readonly c04wLifecycle?: C04wLifecyclePublication, private readonly initialSource?: InitialSourcePublication) {}

  static credentialFile(path: string): () => Promise<string> {
    return async () => {
      const stat = await lstat(path);
      if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0 || stat.uid !== process.getuid?.()) deny();
      const value = (await readFile(path, "utf8")).trim();
      if (!value || /\s/.test(value)) deny();
      return value;
    };
  }

  async resolvePrincipal(proof: MachineIdentityProof, executor: Ex = this.db): Promise<string> {
    const { profile: p, profileSha256, decisionSha256 } = this.configuration;
    if (proof.expiresAt <= new Date() || proof.clientId !== p.client_id || proof.issuerSha256 !== digest(p.issuer)) deny();
    const result = await sql<{ id: string }>`SELECT sp.service_principal_id::text AS id FROM iam.service_principals sp
      JOIN ops_audit.audit_events a ON a.aggregate_id=sp.service_principal_id AND a.aggregate_type='ServicePrincipal'
        AND a.event_code='audit.iam.service_principal.provision.v1' AND a.command_code='servicePrincipalProvisionQa'
      WHERE sp.principal_code=${p.principal_code} AND sp.principal_kind=${p.principal_kind}
        AND sp.ownership_class='PLATFORM_CONTROL' AND sp.tenant_id IS NULL AND sp.lifecycle_state='active'
        AND sp.credential_ref=${p.credential_ref} AND a.actor_service_principal_id=sp.service_principal_id
        AND a.actor_user_identity_id IS NULL AND a.ownership_class='PLATFORM_CONTROL' AND a.tenant_id IS NULL AND a.outcome='success'
        AND a.after_payload->>'profile_sha256'=${profileSha256} AND a.after_payload->>'decision_sha256'=${decisionSha256}
        AND a.after_payload->>'decision_id'=${p.decision_id} AND a.after_payload->>'client_id'=${p.client_id}
        AND a.after_payload->>'issuer_sha256'=${proof.issuerSha256} AND a.after_payload->>'subject_sha256'=${proof.subjectSha256}
        AND a.after_payload->>'purpose'=${p.purpose}`.execute(executor);
    if (result.rows.length !== 1) deny();
    return result.rows[0]!.id;
  }

  async provision(correlationId: string) {
    const proof = await this.tokens.authenticateMachine(await this.machineCredential());
    return this.provisionAuthenticated(proof, correlationId);
  }

  /** Called only after the existing token service obtained and verified a fresh client_credentials proof. */
  private async provisionAuthenticated(proof: MachineIdentityProof, correlationId: string) {
    const { profile: p, profileSha256, decisionSha256 } = this.configuration;
    return this.db.transaction().setIsolationLevel("read committed").execute(async tx => {
      // Existing published Platform role is only the serialization point, never a grant to this machine.
      const roles = await sql`SELECT role_id FROM iam.roles WHERE role_code='PLATFORM_ADMIN' AND is_baseline
        AND ownership_class='PLATFORM_CONTROL' AND tenant_id IS NULL AND lifecycle_state='published' FOR UPDATE`.execute(tx);
      if (roles.rows.length !== 1 || proof.expiresAt <= new Date()) deny();
      const existing = await sql`SELECT service_principal_id FROM iam.service_principals
        WHERE ownership_class='PLATFORM_CONTROL' AND tenant_id IS NULL AND principal_code=${p.principal_code} FOR UPDATE`.execute(tx);
      if (existing.rows.length) return { service_principal_id: await this.resolvePrincipal(proof, tx), replayed: true };
      const id = newUuidV7();
      await sql`INSERT INTO iam.service_principals
        (service_principal_id,created_by_service_principal_id,ownership_class,tenant_id,principal_code,display_name,principal_kind,lifecycle_state,credential_ref)
        VALUES (${id}::uuid,${id}::uuid,'PLATFORM_CONTROL',NULL,${p.principal_code},${p.display_name},${p.principal_kind},'active',${p.credential_ref})`.execute(tx);
      await persistAuditEvent(tx, { auditEventId: newUuidV7(), ownershipClass: "PLATFORM_CONTROL", tenantId: null,
        actor: { servicePrincipalId: id }, correlationId, eventCode: "audit.iam.service_principal.provision.v1",
        aggregateType: "ServicePrincipal", aggregateId: id, commandCode: "servicePrincipalProvisionQa", outcome: "success", classification: "restricted",
        before: { present: false }, after: { present: true, principal_code: p.principal_code, client_id: p.client_id,
          issuer_sha256: proof.issuerSha256, subject_sha256: proof.subjectSha256, purpose: p.purpose,
          decision_id: p.decision_id, profile_sha256: profileSha256, decision_sha256: decisionSha256, lifecycle_state: "active" } });
      return { service_principal_id: await this.resolvePrincipal(proof, tx), replayed: false };
    });
  }

  async publish(correlationId: string) {
    const proof = await this.tokens.authenticateMachine(await this.machineCredential());
    return this.db.transaction().setIsolationLevel("read committed").execute(async tx => {
      await sql`SET LOCAL lock_timeout='5s'`.execute(tx);
      await sql`LOCK TABLE iam.roles,iam.permissions,iam.role_permissions,ops_audit.lifecycle_transition_definitions,
        ops_audit.lifecycle_transition_scopes,ops_audit.lifecycle_transition_side_effects IN SHARE ROW EXCLUSIVE MODE`.execute(tx);
      await sql`SELECT service_principal_id FROM iam.service_principals WHERE principal_code=${this.configuration.profile.principal_code}
        AND ownership_class='PLATFORM_CONTROL' AND tenant_id IS NULL FOR SHARE`.execute(tx);
      const id = await this.resolvePrincipal(proof, tx);
      const refs = await this.publishReferences(tx, id, correlationId);
      // Existing exact approved R3 command implementation, authenticated here; not a new migration/ledger entry.
      await sql`SELECT set_config('tcdx.publication_service_principal_id',${id},true)`.execute(tx);
      await tx.executeQuery(CompiledQuery.raw(this.configuration.rbacResolutionSql));
      if (await requireRbacResolutionR3(tx, true) !== id) deny();
      const commercial = await this.publishCommercialBindings(tx, id, correlationId);
      const c04w = await this.publishC04wRolePermissions(tx, id, correlationId);
      return { ...refs, ...commercial, ...c04w, rbac_resolution_r3_published: true };
    });
  }

  /** Separate private operation: editorial acts do not authorize replaying other IAM publications. */
  async publishC04w(correlationId: string) {
    if (!this.c04wLifecycle) deny();
    const config = this.c04wLifecycle;
    const proof = await this.tokens.authenticateMachine(await this.machineCredential());
    return this.db.transaction().setIsolationLevel("read committed").execute(async tx => {
      await sql`SET LOCAL lock_timeout='5s'`.execute(tx);
      await sql`LOCK TABLE iam.permissions,ops_audit.lifecycle_transition_definitions,
        ops_audit.lifecycle_transition_scopes,ops_audit.lifecycle_transition_side_effects IN SHARE ROW EXCLUSIVE MODE`.execute(tx);
      await sql`SELECT service_principal_id FROM iam.service_principals
        WHERE principal_code=${this.configuration.profile.principal_code} AND ownership_class='PLATFORM_CONTROL'
          AND tenant_id IS NULL FOR SHARE`.execute(tx);
      const id = await this.resolvePrincipal(proof, tx);
      return publishC04wLifecycle(tx, id, config, input => this.auditOnce(tx, id, correlationId, input));
    });
  }

  async publishInitialSource(correlationId:string) {
    if(!this.initialSource) deny();
    const config=this.initialSource;
    const proof=await this.tokens.authenticateMachine(await this.machineCredential());
    return this.db.transaction().setIsolationLevel("read committed").execute(async tx=>{
      await sql`SET LOCAL lock_timeout='5s'`.execute(tx);
      await sql`LOCK TABLE iam.permissions,ops_audit.lifecycle_transition_definitions,ops_audit.lifecycle_transition_scopes,ops_audit.lifecycle_transition_side_effects IN SHARE ROW EXCLUSIVE MODE`.execute(tx);
      await sql`SELECT service_principal_id FROM iam.service_principals WHERE principal_code=${this.configuration.profile.principal_code} AND ownership_class='PLATFORM_CONTROL' AND tenant_id IS NULL FOR SHARE`.execute(tx);
      const id=await this.resolvePrincipal(proof,tx);
      return publishInitialSourceLifecycle(tx,id,correlationId,config);
    });
  }

  /** Only this authenticated, active principal can revoke itself; no generic IAM mutation or reactivation. */
  async revoke(correlationId: string) {
    const proof = await this.tokens.authenticateMachine(await this.machineCredential());
    return this.db.transaction().execute(async tx => {
      await sql`SELECT service_principal_id FROM iam.service_principals WHERE principal_code=${this.configuration.profile.principal_code}
        AND ownership_class='PLATFORM_CONTROL' AND tenant_id IS NULL FOR UPDATE`.execute(tx);
      const id = await this.resolvePrincipal(proof, tx);
      await sql`UPDATE iam.service_principals SET lifecycle_state='inactive',row_version=row_version+1,
        updated_at=transaction_timestamp(),updated_by_service_principal_id=${id}::uuid,updated_by_user_identity_id=NULL
        WHERE service_principal_id=${id}::uuid AND lifecycle_state='active'`.execute(tx);
      await persistAuditEvent(tx, { auditEventId: newUuidV7(), ownershipClass: "PLATFORM_CONTROL", tenantId: null,
        actor: { servicePrincipalId: id }, correlationId, aggregateType: "ServicePrincipal", aggregateId: id,
        eventCode: "audit.iam.service_principal.revoke.v1", commandCode: "servicePrincipalRevokeQa", outcome: "success", classification: "restricted",
        before: { lifecycle_state: "active" }, after: { lifecycle_state: "inactive", decision_id: this.configuration.profile.decision_id } });
      return { service_principal_id: id, lifecycle_state: "inactive" };
    });
  }

  private async auditOnce(tx: Transaction<FoundationDatabase>, sp: string, correlationId: string, input: {
    aggregateType: string; aggregateId: string; eventCode: string; commandCode: string;
    ownershipClass: "PLATFORM_CONTROL" | "TENANT_OWNED"; tenantId: string | null;
    before: Record<string, unknown>; after: Record<string, unknown>;
  }) {
    const existing = (await sql<{ valid: boolean }>`SELECT (a.outcome='success'
      AND a.actor_service_principal_id=${sp}::uuid AND a.actor_user_identity_id IS NULL
      AND a.ownership_class=${input.ownershipClass} AND a.tenant_id IS NOT DISTINCT FROM ${input.tenantId}::uuid
      AND jsonb_typeof(a.before_payload->'present')='boolean'
      AND (a.before_payload-'present')=(${JSON.stringify(input.before)}::jsonb-'present')
      AND (${input.commandCode === ROLE_PERMISSION_PUBLICATION.command_code}::boolean=FALSE OR a.before_payload=${JSON.stringify(input.before)}::jsonb)
      AND a.after_payload=${JSON.stringify(input.after)}::jsonb) AS valid FROM ops_audit.audit_events a
      WHERE aggregate_type=${input.aggregateType} AND aggregate_id=${input.aggregateId}::uuid
        AND event_code=${input.eventCode} AND command_code=${input.commandCode}`.execute(tx)).rows;
    if (existing.length) {
      if (existing.length !== 1 || !existing[0]?.valid) conflict();
      return false;
    }
    await persistAuditEvent(tx, { ...input, auditEventId: newUuidV7(), actor: { servicePrincipalId: sp },
      correlationId, outcome: "success", classification: "restricted" });
    return true;
  }

  private async publishC04wRolePermissions(tx: Transaction<FoundationDatabase>, sp: string, correlationId: string) {
    const source = (await sql<{ total: number; approved: number }>`SELECT count(*)::integer AS total,
      count(*) FILTER (WHERE filename='20261015000100_c04w_applicability_hold_r2.sql'
        AND content_sha256=${c04wR2Sha256} AND outcome='applied')::integer AS approved
      FROM platform.schema_migrations WHERE migration_id='20261015000100'`.execute(tx)).rows[0];
    if (source?.total === 0) return { c04w_status: "pending_migration" };
    if (source?.total !== 1 || source.approved !== 1) deny();
    const roles = (await sql<{ id: string; tenant_id: string; role_code: string }>`SELECT role_id::text AS id,
      tenant_id::text,role_code FROM iam.roles WHERE role_code IN ('TENANT_ADMIN','LEGAL_REVIEWER')
        AND ownership_class='TENANT_OWNED' AND tenant_id IS NOT NULL AND is_baseline
        AND lifecycle_state='published' ORDER BY tenant_id,role_code`.execute(tx)).rows;
    const tenants = new Map<string, Map<string, string>>();
    for (const role of roles) {
      const pair = tenants.get(role.tenant_id) ?? new Map<string, string>();
      if (pair.has(role.role_code)) deny();
      pair.set(role.role_code, role.id);
      tenants.set(role.tenant_id, pair);
    }
    if (!tenants.size || [...tenants.values()].some(pair => pair.size !== 2)) deny();
    const codes = [...c04wTenantAdminPermissions, c04wHoldReleasePermission];
    const existing = (await sql<{ id: string; permission_code: string; valid: boolean }>`SELECT permission_id::text AS id,
      permission_code,(lifecycle_state='published' AND (permission_code<>${c04wHoldReleasePermission}
        OR (domain_code='privacy' AND resource_code='retention_policy' AND action_code='release'))) AS valid FROM iam.permissions
      WHERE permission_code=ANY(${codes}::text[])`.execute(tx)).rows;
    const permissionIds = new Map<string, string>();
    for (const permission of existing) {
      if (!permission.valid || permissionIds.has(permission.permission_code)) deny();
      permissionIds.set(permission.permission_code, permission.id);
    }
    if (c04wTenantAdminPermissions.some(code => !permissionIds.has(code))) deny();
    let permissionCreated = 0;
    let releaseId = permissionIds.get(c04wHoldReleasePermission);
    if (!releaseId) {
      releaseId = newUuidV7();
      await sql`INSERT INTO iam.permissions (permission_id,created_by_service_principal_id,permission_code,
        domain_code,resource_code,action_code,lifecycle_state)
        VALUES (${releaseId}::uuid,${sp}::uuid,${c04wHoldReleasePermission},'privacy','retention_policy','release','published')`.execute(tx);
      permissionCreated = 1;
    }
    await this.auditOnce(tx, sp, correlationId, { aggregateType: "Permission", aggregateId: releaseId,
      ownershipClass: "PLATFORM_CONTROL", tenantId: null, eventCode: "audit.iam.permission.publish.v1",
      commandCode: "phase6a3C04wRolePermissionPublication", before: { present: permissionCreated === 0 },
      after: { present: true, permission_code: c04wHoldReleasePermission,
        manifest_sha256: c04wRoleManifestSha256, source_migration_sha256: c04wR2Sha256 } });
    permissionIds.set(c04wHoldReleasePermission, releaseId);
    const forbiddenRelease = (await sql<{ count: number }>`SELECT count(*)::integer AS count FROM iam.role_permissions rp
      JOIN iam.roles r ON r.role_id=rp.role_id WHERE rp.permission_id=${releaseId}::uuid
        AND NOT (r.role_code='LEGAL_REVIEWER' AND r.ownership_class='TENANT_OWNED'
          AND rp.ownership_class='TENANT_OWNED' AND rp.tenant_id=r.tenant_id)`.execute(tx)).rows[0];
    if (forbiddenRelease?.count !== 0) deny();
    let grantsCreated = 0;
    let grantsAudited = 0;
    for (const [tenantId, pair] of tenants) {
      for (const [roleCode, permissionCodes] of [["TENANT_ADMIN", c04wTenantAdminPermissions],
        ["LEGAL_REVIEWER", [c04wHoldReleasePermission]]] as const) {
        const roleId = pair.get(roleCode)!;
        for (const permissionCode of permissionCodes) {
          const permissionId = permissionIds.get(permissionCode)!;
          const old = (await sql<{ id: string; valid: boolean }>`SELECT role_permission_id::text AS id,
            (ownership_class='TENANT_OWNED' AND tenant_id=${tenantId}::uuid) AS valid
            FROM iam.role_permissions WHERE role_id=${roleId}::uuid AND permission_id=${permissionId}::uuid`.execute(tx)).rows;
          if (old.length > 1 || old[0]?.valid === false) deny();
          const grantId = old[0]?.id ?? newUuidV7();
          if (!old.length) {
            await sql`INSERT INTO iam.role_permissions (role_permission_id,created_by_service_principal_id,
              ownership_class,tenant_id,role_id,permission_id)
              VALUES (${grantId}::uuid,${sp}::uuid,'TENANT_OWNED',${tenantId}::uuid,
                ${roleId}::uuid,${permissionId}::uuid)`.execute(tx);
            grantsCreated++;
          }
          if (await this.auditOnce(tx, sp, correlationId, { aggregateType: "RolePermission", aggregateId: grantId,
            ownershipClass: "TENANT_OWNED", tenantId, eventCode: "audit.iam.role_permission.publish.v1",
            commandCode: "phase6a3C04wRolePermissionPublication", before: { present: old.length === 1 },
            after: { present: true, role_code: roleCode, role_id: roleId, permission_code: permissionCode,
              manifest_sha256: c04wRoleManifestSha256, source_migration_sha256: c04wR2Sha256 } })) grantsAudited++;
        }
      }
    }
    return { c04w_tenants: tenants.size, c04w_permission_created: permissionCreated,
      c04w_grants_created: grantsCreated, c04w_grants_audited: grantsAudited };
  }

  private async publishReferences(tx: Transaction<FoundationDatabase>, sp: string, correlationId: string) {
    const p = ROLE_PERMISSION_PUBLICATION;
    const source = await sql`SELECT migration_id FROM platform.schema_migrations WHERE migration_id=${p.source_migration_id}
      AND content_sha256=${p.source_migration_sha256} AND outcome='applied'`.execute(tx);
    if (source.rows.length !== 1) deny();
    const grants = (await sql<{ id: string; role_id: string; role_code: string; permission_id: string; permission_code: string;
      ownership_class: "PLATFORM_CONTROL" | "TENANT_OWNED"; tenant_id: string | null; valid: boolean }>`
      SELECT rp.role_permission_id::text AS id,rp.role_id::text,r.role_code,rp.permission_id::text,perm.permission_code,
        rp.ownership_class,rp.tenant_id::text,
        (r.is_baseline AND r.lifecycle_state='published' AND perm.lifecycle_state='published'
          AND rp.ownership_class=r.ownership_class AND rp.tenant_id IS NOT DISTINCT FROM r.tenant_id
          AND ((rp.tenant_id IS NULL AND rp.ownership_class='PLATFORM_CONTROL') OR
            (rp.tenant_id IS NOT NULL AND rp.ownership_class='TENANT_OWNED'))) AS valid
      FROM iam.role_permissions rp JOIN iam.roles r USING(role_id) JOIN iam.permissions perm USING(permission_id)
      WHERE perm.permission_code=ANY(${[...p.permission_codes]}::text[]) ORDER BY rp.role_permission_id`.execute(tx)).rows;
    const approved = new Set(p.pairs.map(pair => `${pair.role_code}:${pair.permission}`));
    const globals = grants.filter(g => g.tenant_id === null);
    if (globals.length !== p.pairs.length || new Set(globals.map(g => `${g.role_code}:${g.permission_code}`)).size !== approved.size
      || grants.some(g => !g.valid || !approved.has(`${g.role_code}:${g.permission_code}`))) deny();
    let auditsCreated = 0;
    for (const g of grants) {
      const state = { present: true, role_id: g.role_id, role_code: g.role_code, permission_id: g.permission_id, permission_code: g.permission_code };
      if (await this.auditOnce(tx, sp, correlationId, { aggregateType: "RolePermission", aggregateId: g.id,
        ownershipClass: g.ownership_class, tenantId: g.tenant_id, eventCode: p.event_code, commandCode: p.command_code,
        before: state, after: { ...state, manifest_sha256: p.manifest_sha256, receipt_sha256: p.receipt_sha256,
          migration_id: p.migration_id, source_migration_id: p.source_migration_id, source_migration_sha256: p.source_migration_sha256,
          reason: "Exact approved R2 adoption; existing global and tenant presence preserved" } })) auditsCreated++;
    }
    return { reference_global_grants: globals.length, reference_tenant_grants: grants.length - globals.length,
      reference_publication_audits: grants.length, reference_audits_created: auditsCreated };
  }

  private async publishCommercialBindings(tx: Transaction<FoundationDatabase>, sp: string, correlationId: string) {
    const { bindings, bindingsSha256, profile: p } = this.configuration;
    const provenance = { bindings_sha256: bindingsSha256, decision_id: p.decision_id };
    const admin = (await sql<{ id: string }>`SELECT role_id::text AS id FROM iam.roles WHERE role_code='PLATFORM_ADMIN'
      AND is_baseline AND ownership_class='PLATFORM_CONTROL' AND tenant_id IS NULL AND lifecycle_state='published'`.execute(tx)).rows;
    if (admin.length !== 1) deny();
    const permissionIds = new Map<string, string>();
    for (const candidate of bindings.permission_grant_candidates) {
      const [domain, resource, action, extra] = candidate.code.split(".");
      if (extra || domain !== "platform" || !resource || !action) deny();
      const old = (await sql<{ id: string; valid: boolean }>`SELECT permission_id::text AS id,
        (domain_code=${domain} AND resource_code=${resource} AND action_code=${action} AND lifecycle_state='published') AS valid
        FROM iam.permissions WHERE permission_code=${candidate.code}`.execute(tx)).rows;
      if (old.length > 1 || old[0]?.valid === false) conflict();
      const permissionId = old[0]?.id ?? newUuidV7();
      if (!old.length) await sql`INSERT INTO iam.permissions (permission_id,created_by_service_principal_id,permission_code,domain_code,resource_code,action_code,lifecycle_state)
        VALUES (${permissionId}::uuid,${sp}::uuid,${candidate.code},${domain},${resource},${action},'published')`.execute(tx);
      await this.auditOnce(tx, sp, correlationId, { aggregateType: "Permission", aggregateId: permissionId,
        ownershipClass: "PLATFORM_CONTROL", tenantId: null, eventCode: "audit.iam.permission.publish.v1", commandCode: "step6a3CommercialIamPublication",
        before: { present: old.length === 1 }, after: { present: true, permission_code: candidate.code, ...provenance } });
      permissionIds.set(candidate.code, permissionId);
      const grants = (await sql<{ id: string; valid: boolean }>`SELECT rp.role_permission_id::text AS id,
        (rp.role_id=${admin[0]!.id}::uuid AND rp.tenant_id IS NULL AND rp.ownership_class='PLATFORM_CONTROL') AS valid
        FROM iam.role_permissions rp WHERE permission_id=${permissionId}::uuid`.execute(tx)).rows;
      if (grants.length > 1 || grants[0]?.valid === false) deny();
      const grantId = grants[0]?.id ?? newUuidV7();
      if (!grants.length) await sql`INSERT INTO iam.role_permissions (role_permission_id,created_by_service_principal_id,ownership_class,role_id,permission_id)
        VALUES (${grantId}::uuid,${sp}::uuid,'PLATFORM_CONTROL',${admin[0]!.id}::uuid,${permissionId}::uuid)`.execute(tx);
      await this.auditOnce(tx, sp, correlationId, { aggregateType: "RolePermission", aggregateId: grantId,
        ownershipClass: "PLATFORM_CONTROL", tenantId: null, eventCode: "audit.iam.role_permission.publish.v1", commandCode: "step6a3CommercialIamPublication",
        before: { present: grants.length === 1 }, after: { present: true, permission_code: candidate.code, role_id: admin[0]!.id, ...provenance } });
    }
    let registryRows = 0;
    for (const b of bindings.bindings) {
      if (b.from === null || b.to === null) continue; // Approved creation/publication effects have no invented registry state.
      const permissionId = permissionIds.get(b.permission);
      if (!permissionId) deny();
      const existing = (await sql<{ id: string; valid: boolean }>`SELECT lifecycle_transition_definition_id::text AS id,
        (to_state=${b.to} AND precondition_policy_ref=${b.object_policy} AND permission_id=${permissionId}::uuid
          AND sod_policy_ref=${b.sod_policy} AND audit_event_code=${b.audit} AND notification_policy_ref=${b.notification_policy}
          AND recalculation_policy_ref=${b.recalculation_policy} AND idempotency_semantics=${b.profile}
          AND concurrency_semantics=${b.concurrency_semantics} AND system_actor_allowed=FALSE AND lifecycle_state='published') AS valid
        FROM ops_audit.lifecycle_transition_definitions WHERE entity_type=${b.entity} AND from_state=${b.from}
          AND command_code=${b.command_code} ORDER BY version_number DESC LIMIT 1`.execute(tx)).rows;
      if (existing[0]?.valid === false) conflict();
      const edgeId = existing[0]?.id ?? newUuidV7();
      if (!existing.length) {
        await sql`INSERT INTO ops_audit.lifecycle_transition_definitions
          (lifecycle_transition_definition_id,created_by_service_principal_id,entity_type,version_number,from_state,command_code,to_state,
            precondition_policy_ref,permission_id,sod_policy_ref,audit_event_code,notification_policy_ref,recalculation_policy_ref,
            idempotency_semantics,concurrency_semantics,system_actor_allowed,lifecycle_state,published_at)
          VALUES (${edgeId}::uuid,${sp}::uuid,${b.entity},1,${b.from},${b.command_code},${b.to},${b.object_policy},${permissionId}::uuid,
            ${b.sod_policy},${b.audit},${b.notification_policy},${b.recalculation_policy},${b.profile},${b.concurrency_semantics},FALSE,'published',transaction_timestamp())`.execute(tx);
        await sql`INSERT INTO ops_audit.lifecycle_transition_scopes (lifecycle_transition_scope_id,created_by_service_principal_id,lifecycle_transition_definition_id,scope_kind)
          VALUES (${newUuidV7()}::uuid,${sp}::uuid,${edgeId}::uuid,'platform')`.execute(tx);
        await sql`INSERT INTO ops_audit.lifecycle_transition_side_effects (lifecycle_transition_side_effect_id,created_by_service_principal_id,lifecycle_transition_definition_id,event_code,ordinal,is_required)
          VALUES (${newUuidV7()}::uuid,${sp}::uuid,${edgeId}::uuid,${b.event},1,TRUE)`.execute(tx);
      }
      const scopes = (await sql<{ scope_kind: string }>`SELECT scope_kind FROM ops_audit.lifecycle_transition_scopes WHERE lifecycle_transition_definition_id=${edgeId}::uuid`.execute(tx)).rows;
      const effects = (await sql<{ event_code: string; ordinal: number; is_required: boolean }>`SELECT event_code,ordinal,is_required
        FROM ops_audit.lifecycle_transition_side_effects WHERE lifecycle_transition_definition_id=${edgeId}::uuid`.execute(tx)).rows;
      if (scopes.length !== 1 || scopes[0]?.scope_kind !== "platform" || effects.length !== 1
        || effects[0]?.event_code !== b.event || effects[0]?.ordinal !== 1 || effects[0]?.is_required !== true) conflict();
      await this.auditOnce(tx, sp, correlationId, { aggregateType: "LifecycleTransitionDefinition", aggregateId: edgeId,
        ownershipClass: "PLATFORM_CONTROL", tenantId: null, eventCode: "audit.platform.lifecycle_transition.publish.v1", commandCode: "step6a3CommercialIamPublication",
        before: { present: existing.length === 1 }, after: { present: true, entity: b.entity, from: b.from, to: b.to, command_code: b.command_code, ...provenance } });
      registryRows++;
    }
    return { commercial_permissions: permissionIds.size, commercial_admin_grants: permissionIds.size,
      lifecycle_registry_rows: registryRows, transfer_activate: "APPROVED_INTERNAL_INITIAL_STATE_EFFECT",
      commercial_family_publication: "APPROVED_PUBLICATION_WITHOUT_LIFECYCLE_STATE" };
  }
}
