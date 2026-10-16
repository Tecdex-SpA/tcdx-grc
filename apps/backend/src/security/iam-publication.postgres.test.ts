import { createHash, generateKeyPairSync, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from "jose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { ROLE_PERMISSION_PUBLICATION } from "@tcdx-grc/contracts";
import { createDatabase, sql } from "../database.js";
import { loadConfig } from "../config.js";
import { newUuidV7 } from "../uuid.js";
import { ApplicationTokenService } from "./application-token.js";
import { IamPublicationService, loadIamPublicationFiles } from "./iam-publication.js";
import { requireReferencePublication, requireReferenceGrantPublication } from "./reference-publication.js";
import { resolvePlatformActor } from "./platform-authority.js";

describe.skipIf(process.env.TCDX_IAM_PUBLICATION_INTEGRATION !== "true")("IAM publication on task-owned PostgreSQL 16", () => {
  let db: ReturnType<typeof createDatabase>;
  let tokens: ApplicationTokenService;
  let service: IamPublicationService;
  let machineKeys: Awaited<ReturnType<typeof generateKeyPair>>;
  let machineSubject = newUuidV7();
  let principalId: string;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  const credential = randomBytes(32).toString("base64url");
  const sha = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
  const tenantIds = [newUuidV7(), newUuidV7()];
  const targetIdentity = newUuidV7();
  let targetMembership: string;
  beforeAll(async () => {
    if (process.env.DATABASE_HOST !== "127.0.0.1" || process.env.DATABASE_PORT !== "55435"
      || process.env.TCDX_ISOLATED_REBUILD !== "true") throw Error("OWN_DISPOSABLE_POSTGRES_REQUIRED");
    db = createDatabase(loadConfig(process.env));
    const paths = ["iam/config/step6a3-m2m-qa-profile.json",
      "docs/executable-contracts/amendments/STEP_6A3_COMMERCIAL_v1.9/08_COMMAND_PERMISSION_LIFECYCLE_AUDIT_BINDINGS.json",
      "docs/phase6a/STEP_6A3/IAM_M2M_QA_DECISION_RECEIPT_20261014.json",
      "docs/phase6a/STEP_6A3/rbac-publication/20261009000400_phase6a3_rbac_resolution.sql"];
    const bytes = await Promise.all(paths.map(path => readFile(path)));
    const config = await loadIamPublicationFiles({ profilePath: paths[0]!, approvedProfileSha256: sha(bytes[0]!),
      bindingsPath: paths[1]!, approvedBindingsSha256: sha(bytes[1]!), decisionPath: paths[2]!, approvedDecisionSha256: sha(bytes[2]!),
      rbacResolutionPath: paths[3]!, approvedRbacResolutionSha256: sha(bytes[3]!) });
    const human = generateKeyPairSync("rsa", { modulusLength: 2048 });
    tokens = await ApplicationTokenService.create({ issuer: "https://isolated.tcdx.test", audience: config.profile.audience,
      privateKey: human.privateKey.export({ format: "pem", type: "pkcs8" }).toString(),
      publicKey: human.publicKey.export({ format: "pem", type: "spki" }).toString(), keyId: "isolated-human",
      algorithm: "RS256", maxLifetimeSeconds: 300, clockToleranceSeconds: 0 });
    machineKeys = await generateKeyPair("RS256");
    const jwk = await exportJWK(machineKeys.publicKey);
    service = new IamPublicationService(db, tokens, config, async () => credential);
    tokens.configureMachineProfile({ profile: config.profile, keySet: createLocalJWKSet({ keys: [{ ...jwk, kid: "isolated-machine", alg: "RS256" }] }),
      resolvePrincipal: proof => service.resolvePrincipal(proof) }, "qa");
    fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, options) => {
      expect(options?.body?.toString()).toBe("grant_type=client_credentials");
      const p = config.profile;
      const token = await new SignJWT({ principal_class: "MACHINE_TO_MACHINE", typ: "Bearer", azp: p.client_id })
        .setProtectedHeader({ alg: "RS256", typ: "JWT", kid: "isolated-machine" }).setIssuer(p.issuer).setAudience(p.audience)
        .setSubject(machineSubject).setJti(newUuidV7()).setIssuedAt().setExpirationTime("2m").sign(machineKeys.privateKey);
      return new Response(JSON.stringify({ access_token: token, token_type: "Bearer" }), { status: 200 });
    });
    await db.transaction().execute(async tx => {
      for (const tenantId of tenantIds) {
        await sql`INSERT INTO platform.tenants (tenant_id,tenant_code,legal_name,display_name,default_timezone,lifecycle_state)
          VALUES (${tenantId}::uuid,${tenantId},'Isolated tenant','Isolated tenant','America/Santiago','active')`.execute(tx);
        for (const code of new Set(ROLE_PERMISSION_PUBLICATION.pairs.map(p => p.role_code))) {
          const roleId = newUuidV7();
          await sql`INSERT INTO iam.roles (role_id,ownership_class,tenant_id,role_code,name,is_baseline,lifecycle_state)
            VALUES (${roleId}::uuid,'TENANT_OWNED',${tenantId}::uuid,${code},${code},TRUE,'published')`.execute(tx);
          for (const pair of ROLE_PERMISSION_PUBLICATION.pairs.filter(p => p.role_code === code))
            await sql`INSERT INTO iam.role_permissions (role_permission_id,ownership_class,tenant_id,role_id,permission_id)
              SELECT ${newUuidV7()}::uuid,'TENANT_OWNED',${tenantId}::uuid,${roleId}::uuid,permission_id FROM iam.permissions WHERE permission_code=${pair.permission}`.execute(tx);
          if (code === 'AUDITOR') await sql`INSERT INTO iam.role_permissions (role_permission_id,ownership_class,tenant_id,role_id,permission_id)
            SELECT ${newUuidV7()}::uuid,'TENANT_OWNED',${tenantId}::uuid,${roleId}::uuid,permission_id FROM iam.permissions WHERE permission_code='remediation.action.create'`.execute(tx);
        }
      }
      await sql`INSERT INTO iam.user_identities (user_identity_id,identity_key,display_name,lifecycle_state)
        VALUES (${targetIdentity}::uuid,${targetIdentity},'Isolated viewer','active')`.execute(tx);
      targetMembership = newUuidV7();
      await sql`INSERT INTO iam.tenant_memberships (tenant_membership_id,tenant_id,user_identity_id,membership_state,joined_at)
        VALUES (${targetMembership}::uuid,${tenantIds[0]!}::uuid,${targetIdentity}::uuid,'active',transaction_timestamp())`.execute(tx);
      await sql`INSERT INTO iam.membership_roles (membership_role_id,tenant_id,tenant_membership_id,role_id,scope_kind,valid_from)
        SELECT ${newUuidV7()}::uuid,${tenantIds[0]!}::uuid,${targetMembership}::uuid,role_id,'tenant',transaction_timestamp()
        FROM iam.roles WHERE tenant_id=${tenantIds[0]!}::uuid AND role_code='VIEWER'`.execute(tx);
    });
  });
  afterAll(async () => { fetchSpy?.mockRestore(); await db?.destroy(); });

  it("rolls back the canonical principal when its provisioning audit fails", async () => {
    await sql`CREATE FUNCTION public.iam_provision_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.command_code='servicePrincipalProvisionQa' THEN RAISE EXCEPTION 'isolated provision audit fault'; END IF;
      RETURN NEW; END $$`.execute(db);
    await sql`CREATE TRIGGER iam_provision_fault BEFORE INSERT ON ops_audit.audit_events FOR EACH ROW EXECUTE FUNCTION public.iam_provision_fault()`.execute(db);
    try {
      await expect(service.provision(newUuidV7())).rejects.toThrow();
      expect((await sql`SELECT * FROM iam.service_principals`.execute(db)).rows).toHaveLength(0);
    } finally {
      await sql`DROP TRIGGER iam_provision_fault ON ops_audit.audit_events`.execute(db);
      await sql`DROP FUNCTION public.iam_provision_fault()`.execute(db);
    }
  });
  it("provisions one authenticated Platform principal and one audit under concurrency", async () => {
    const results = await Promise.all([service.provision(newUuidV7()), service.provision(newUuidV7())]);
    expect(results.map(r => r.replayed).sort()).toEqual([false, true]);
    expect(results[0]?.service_principal_id).toBe(results[1]?.service_principal_id);
    principalId = results[0]!.service_principal_id;
    expect((await sql`SELECT * FROM iam.service_principals`.execute(db)).rows).toHaveLength(1);
    expect((await sql`SELECT * FROM ops_audit.audit_events WHERE aggregate_type='ServicePrincipal'`.execute(db)).rows).toHaveLength(1);
    expect(JSON.stringify((await sql`SELECT * FROM iam.service_principals`.execute(db)).rows)).not.toContain(credential);
    expect(JSON.stringify((await sql`SELECT * FROM ops_audit.audit_events`.execute(db)).rows)).not.toContain(credential);
  });
  it("rolls back all 132 adoption audits and commercial rows when material auditing fails", async () => {
    await sql`CREATE FUNCTION public.iam_publication_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.aggregate_type='Permission' AND NEW.command_code='step6a3CommercialIamPublication' THEN RAISE EXCEPTION 'isolated audit fault'; END IF;
      RETURN NEW; END $$`.execute(db);
    await sql`CREATE TRIGGER iam_publication_fault BEFORE INSERT ON ops_audit.audit_events FOR EACH ROW EXECUTE FUNCTION public.iam_publication_fault()`.execute(db);
    try {
      await expect(service.publish(newUuidV7())).rejects.toThrow();
      expect((await sql`SELECT * FROM ops_audit.audit_events WHERE command_code=${ROLE_PERMISSION_PUBLICATION.command_code}`.execute(db)).rows).toHaveLength(0);
      expect((await sql`SELECT * FROM iam.permissions WHERE permission_code='platform.subscription.update'`.execute(db)).rows).toHaveLength(0);
    } finally {
      await sql`DROP TRIGGER iam_publication_fault ON ops_audit.audit_events`.execute(db);
      await sql`DROP FUNCTION public.iam_publication_fault()`.execute(db);
    }
  });
  it("publishes exactly 44 global + 88 tenant audits, three permissions and three persistible transitions", async () => {
    const result = await service.publish(newUuidV7());
    expect(result).toMatchObject({ reference_global_grants: 44, reference_tenant_grants: 88,
      reference_publication_audits: 132, reference_audits_created: 132, commercial_permissions: 3, commercial_admin_grants: 3, lifecycle_registry_rows: 3 });
    expect(await requireReferencePublication(db, true)).toBe(principalId);
    await expect(requireReferenceGrantPublication(db, tenantIds[0]!, targetMembership, "compliance.framework.read")).resolves.toBeUndefined();
    await expect(requireReferenceGrantPublication(db, tenantIds[1]!, targetMembership, "compliance.framework.read")).rejects.toMatchObject({ statusCode: 503 });
    const proof = await tokens.authenticateMachine(credential);
    const identity = { principalClass: "MACHINE_TO_MACHINE" as const, principalId, tokenId: proof.tokenId, expiresAt: proof.expiresAt };
    await expect(resolvePlatformActor(db, identity)).rejects.toMatchObject({ statusCode: 403 });
    expect((await sql`SELECT * FROM iam.role_permissions rp JOIN iam.permissions p USING(permission_id)
      WHERE p.permission_code IN ('platform.subscription.read','platform.subscription.update','platform.commercial_catalog.publish')
        AND (rp.tenant_id IS NOT NULL OR rp.role_id NOT IN (SELECT role_id FROM iam.roles WHERE role_code='PLATFORM_ADMIN'))`.execute(db)).rows).toHaveLength(0);
  });
  it("replays without duplicating grants, auditing or migrations", async () => {
    const before = (await sql`SELECT count(*)::int AS audits FROM ops_audit.audit_events`.execute(db)).rows;
    expect((await service.publish(newUuidV7())).reference_audits_created).toBe(0);
    expect((await sql`SELECT count(*)::int AS audits FROM ops_audit.audit_events`.execute(db)).rows).toEqual(before);
    expect((await sql<{ n: number }>`SELECT count(*)::int AS n FROM platform.schema_migrations`.execute(db)).rows[0]?.n).toBe(33);
  });
  it("denies a different stable service-account subject despite the same client ID", async () => {
    const original = machineSubject; machineSubject = newUuidV7();
    try {
      await expect(service.provision(newUuidV7())).rejects.toMatchObject({ statusCode: 403 });
      await expect(service.publish(newUuidV7())).rejects.toMatchObject({ statusCode: 403 });
    } finally { machineSubject = original; }
  });
  it("denies inactive principal and refuses automatic reactivation", async () => {
    await sql`UPDATE iam.service_principals SET lifecycle_state='inactive' WHERE service_principal_id=${principalId}::uuid`.execute(db);
    try {
      await expect(service.publish(newUuidV7())).rejects.toMatchObject({ statusCode: 403 });
      await expect(service.provision(newUuidV7())).rejects.toMatchObject({ statusCode: 403 });
    } finally { await sql`UPDATE iam.service_principals SET lifecycle_state='active' WHERE service_principal_id=${principalId}::uuid`.execute(db); }
  });
  it("rejects corrupt publication evidence instead of manufacturing replacement audits", async () => {
    const id = (await sql<{ id: string }>`SELECT audit_event_id::text AS id FROM ops_audit.audit_events
      WHERE command_code=${ROLE_PERMISSION_PUBLICATION.command_code} LIMIT 1`.execute(db)).rows[0]!.id;
    await sql`UPDATE ops_audit.audit_events SET after_payload=jsonb_set(after_payload,'{receipt_sha256}',to_jsonb(repeat('0',64))) WHERE audit_event_id=${id}::uuid`.execute(db);
    try { await expect(service.publish(newUuidV7())).rejects.toMatchObject({ statusCode: 409 }); }
    finally { await sql`UPDATE ops_audit.audit_events SET after_payload=jsonb_set(after_payload,'{receipt_sha256}',to_jsonb(${ROLE_PERMISSION_PUBLICATION.receipt_sha256}::text)) WHERE audit_event_id=${id}::uuid`.execute(db); }
  });
  it("revokes only the authenticated principal with an audit and makes publication fail closed", async () => {
    expect(await service.revoke(newUuidV7())).toEqual({ service_principal_id: principalId, lifecycle_state: "inactive" });
    expect((await sql`SELECT * FROM ops_audit.audit_events WHERE command_code='servicePrincipalRevokeQa'
      AND actor_service_principal_id=${principalId}::uuid`.execute(db)).rows).toHaveLength(1);
    await expect(service.publish(newUuidV7())).rejects.toMatchObject({ statusCode: 403 });
    await expect(service.provision(newUuidV7())).rejects.toMatchObject({ statusCode: 403 });
  });
});
