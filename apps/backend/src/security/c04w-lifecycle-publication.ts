import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { sql, type Transaction } from "kysely";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";
import { newUuidV7 } from "../uuid.js";

type Binding = { entity_type: string; from_state: string; command_code: string; to_state: string;
  precondition_policy_ref: string; permission_code: string; allowed_scopes: string[]; sod_policy_ref: string;
  side_effect_event_codes: string[]; audit_event_code: string; notification_policy: string;
  recalculation_policy: string; idempotency_semantics: string; concurrency_semantics: string; system_actor_allowed: boolean };
type File = { source: string; successor_path: string; sha256: string };
const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
function deny(): never { throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "C04W publication denied", 403); }
function conflict(): never { throw new FoundationError("TCDX.CONFLICT.RESOURCE", "C04W publication evidence conflict", 409); }

/** Reads approved, immutable successor bytes; DRAFT annotations are historical, never a runtime bypass. */
export async function loadC04wLifecyclePublication(root: string, manifestSha256: string) {
  async function exact(path: string, sha256: string) {
    const file = resolve(root, path);
    if (!file.startsWith(resolve(root) + sep) || !/^[a-f0-9]{64}$/.test(sha256)) deny();
    const bytes = await readFile(file);
    if (digest(bytes) !== sha256) deny();
    return JSON.parse(bytes.toString("utf8")) as any;
  }
  const manifest = await exact("docs/executable-contracts/amendments/STEP_6A3_C04W_CFGD_v1.10/PUBLICATION_MANIFEST.json", manifestSha256);
  if (manifest.baseline !== "TCDX_GRC_MASTER_REGENT_BASELINE_v1.10_2026-10-15"
    || manifest.files?.length !== 10 || manifest.human_decisions?.length !== 2) deny();
  const approved = new Map<string, string>();
  for (const decision of manifest.human_decisions) {
    const act = await exact(decision.path, decision.sha256);
    if (act.baseline !== manifest.baseline || !["APPROVED_EDITORIAL_FOUR_CANDIDATES", "APPROVED_EDITORIAL_SIX_DERIVED_SNAPSHOTS"].includes(act.status)) deny();
    for (const f of act.approved_files) {
      if (approved.has(f.path)) deny();
      approved.set(f.path, f.sha256);
    }
  }
  let bindings: Binding[] | undefined;
  for (const f of manifest.files as File[]) {
    if (approved.get(f.source) !== f.sha256) deny();
    // All files, including non-JSON snapshots, must match; parsing is only needed for the mapping.
    for (const path of [f.source, f.successor_path]) {
      const absolute = resolve(root, path);
      if (!absolute.startsWith(resolve(root) + sep) || digest(await readFile(absolute)) !== f.sha256) deny();
    }
    if (f.successor_path.endsWith("/LIFECYCLE_BINDINGS.json")) bindings = (await exact(f.successor_path, f.sha256)).bindings;
  }
  for (const layer of ["physical-data-model/amendments/STEP_6A3_C04W_v1.10", "executable-contracts/amendments/STEP_6A3_C04W_CFGD_v1.10"]) {
    const receipt = JSON.parse(await readFile(resolve(root, "docs", layer, "CONTRACT_PUBLICATION_RECEIPT.json"), "utf8"));
    if (receipt.status !== "PASS_CONTRACT_EFFECTIVE" || receipt.publication_manifest_sha256 !== manifestSha256
      || receipt.baseline !== manifest.baseline || JSON.stringify(receipt.human_decisions) !== JSON.stringify(manifest.human_decisions)) deny();
    const expected = manifest.files.filter((f: File) => f.successor_path.startsWith("docs/" + layer + "/"));
    if (JSON.stringify(receipt.files) !== JSON.stringify(expected)) deny();
  }
  if (!bindings || bindings.length !== 5 || new Set(bindings.map(b => `${b.entity_type}:${b.from_state}:${b.command_code}`)).size !== bindings.length
    || bindings.some(b => b.allowed_scopes.length !== 1 || b.allowed_scopes[0] !== "tenant" || b.system_actor_allowed !== false
      || b.side_effect_event_codes.length !== 0 || b.idempotency_semantics !== "IDEMPOTENCY_KEY_REQUIRED"
      || b.concurrency_semantics !== "ROW_VERSION_COMPARE_AND_SWAP")) deny();
  const dependency = manifest.dependencies.find((f: { path: string }) => f.path === "database/migrations/manifest.json");
  if (!dependency) deny();
  const migrations = (await exact(dependency.path, dependency.sha256)).migrations as { id: string; filename: string; sha256: string }[];
  return { bindings, manifestSha256, migrations, decisionReferences: manifest.human_decisions };
}
export type C04wLifecyclePublication = Awaited<ReturnType<typeof loadC04wLifecyclePublication>>;

/** Called only within the authenticated IAM publisher transaction. Never creates permissions or grants. */
export async function publishC04wLifecycle(tx: Transaction<FoundationDatabase>, sp: string, config: C04wLifecyclePublication,
  audit: (input: { aggregateType: string; aggregateId: string; eventCode: string; commandCode: string;
    ownershipClass: "PLATFORM_CONTROL"; tenantId: null; before: Record<string, unknown>; after: Record<string, unknown> }) => Promise<boolean>) {
  const ledger = (await sql<{ migration_id: string; filename: string; content_sha256: string; outcome: string }>`
    SELECT migration_id,filename,content_sha256,outcome FROM platform.schema_migrations ORDER BY migration_id`.execute(tx)).rows;
  const expected = config.migrations.map(m => ({ migration_id: m.id, filename: m.filename, content_sha256: m.sha256, outcome: "applied" }));
  if (JSON.stringify(ledger) !== JSON.stringify(expected)) deny();
  let created = 0, audited = 0;
  for (const b of config.bindings) {
    const permissions = (await sql<{ id: string }>`SELECT permission_id::text AS id FROM iam.permissions
      WHERE permission_code=${b.permission_code} AND lifecycle_state='published'`.execute(tx)).rows;
    if (permissions.length !== 1) deny();
    const permissionId = permissions[0]!.id;
    const existing = (await sql<{ id: string; valid: boolean }>`SELECT lifecycle_transition_definition_id::text AS id,
      (to_state=${b.to_state} AND precondition_policy_ref=${b.precondition_policy_ref} AND permission_id=${permissionId}::uuid
        AND sod_policy_ref=${b.sod_policy_ref} AND audit_event_code=${b.audit_event_code} AND notification_policy_ref=${b.notification_policy}
        AND recalculation_policy_ref=${b.recalculation_policy} AND idempotency_semantics=${b.idempotency_semantics}
        AND concurrency_semantics=${b.concurrency_semantics} AND system_actor_allowed=FALSE AND lifecycle_state='published') AS valid
      FROM ops_audit.lifecycle_transition_definitions WHERE entity_type=${b.entity_type} AND from_state=${b.from_state}
        AND command_code=${b.command_code} ORDER BY version_number DESC`.execute(tx)).rows;
    if (existing.length > 1 || existing[0]?.valid === false) conflict();
    const id = existing[0]?.id ?? newUuidV7();
    if (!existing.length) {
      await sql`INSERT INTO ops_audit.lifecycle_transition_definitions
        (lifecycle_transition_definition_id,created_by_service_principal_id,entity_type,version_number,from_state,command_code,to_state,
          precondition_policy_ref,permission_id,sod_policy_ref,audit_event_code,notification_policy_ref,recalculation_policy_ref,
          idempotency_semantics,concurrency_semantics,system_actor_allowed,lifecycle_state,published_at)
        VALUES (${id}::uuid,${sp}::uuid,${b.entity_type},1,${b.from_state},${b.command_code},${b.to_state},${b.precondition_policy_ref},
          ${permissionId}::uuid,${b.sod_policy_ref},${b.audit_event_code},${b.notification_policy},${b.recalculation_policy},
          ${b.idempotency_semantics},${b.concurrency_semantics},FALSE,'published',transaction_timestamp())`.execute(tx);
      await sql`INSERT INTO ops_audit.lifecycle_transition_scopes
        (lifecycle_transition_scope_id,created_by_service_principal_id,lifecycle_transition_definition_id,scope_kind)
        VALUES (${newUuidV7()}::uuid,${sp}::uuid,${id}::uuid,'tenant')`.execute(tx);
      created++;
    }
    const scopes = (await sql<{ scope_kind: string }>`SELECT scope_kind FROM ops_audit.lifecycle_transition_scopes
      WHERE lifecycle_transition_definition_id=${id}::uuid`.execute(tx)).rows;
    const effects = (await sql`SELECT lifecycle_transition_side_effect_id FROM ops_audit.lifecycle_transition_side_effects
      WHERE lifecycle_transition_definition_id=${id}::uuid`.execute(tx)).rows;
    if (scopes.length !== 1 || scopes[0]?.scope_kind !== "tenant" || effects.length) conflict();
    if (await audit({ aggregateType: "LifecycleTransitionDefinition", aggregateId: id, ownershipClass: "PLATFORM_CONTROL", tenantId: null,
      eventCode: "audit.platform.lifecycle_transition.publish.v1", commandCode: "step6a3C04wLifecyclePublication",
      before: { present: existing.length === 1 }, after: { present: true, binding: b,
        publication_manifest_sha256: config.manifestSha256, human_decisions: config.decisionReferences } })) audited++;
  }
  return { c04w_lifecycle_registry_rows: config.bindings.length, c04w_lifecycle_created: created, c04w_lifecycle_audited: audited };
}
