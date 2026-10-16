import { createHash } from "node:crypto";
import { sql, type Transaction } from "kysely";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";
import { claimIdempotency, completeIdempotency, persistAuditEvent, persistOutboxEvent } from "../persistence/foundation-records.js";
import { newUuidV7 } from "../uuid.js";
import { recordPrivilegedUse, requirePlatformAccess, resolvePlatformActor, type PlatformActor } from "./platform-authority.js";

type Family = { commercial_family_id: string; family_code: string; name: string; source_type: string };
type RootLink = { regulatory_pack_commercial_family_link_id: string; regulatory_pack_id: string; commercial_family_id: string; source_type: string };
type FamilyLink = { plan_version_commercial_family_link_id: string; commercial_family_id: string };
type Limit = { usage_limit_id: string; commercial_family_id: string | null; limit_code: "regulatory_pack_count";
  limit_value: string; unit: "pack"; effective_from: string; effective_to: string | null };
type Entitlement = { entitlement_id: string; capability_id: string; is_enabled: boolean };
type Version = { plan_version_id: string; plan_id: string; version_number: string; display_name: string;
  commercial_terms_ref: string | null; effective_from: string; effective_to: string | null;
  family_links: FamilyLink[]; usage_limits: Limit[]; entitlements: Entitlement[] };
type Manifest = { profile: "COMMERCIAL_CATALOG_PUBLICATION_V1"; decision_record_ref: string;
  decision_record_sha256: string; families: Family[]; root_links: RootLink[]; plan_versions: Version[] };
export type CatalogPublicationResult = { profile: "COMMERCIAL_CATALOG_PUBLICATION_RESULT_V1"; manifest_sha256: string;
  published_aggregates: { aggregate_type: "CommercialFamily" | "PlanVersion"; aggregate_id: string }[] };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const stamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/;
const hashPattern = /^[0-9a-f]{64}$/;
const sha = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const isObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const fields = (value: unknown, names: string[]): value is Record<string, unknown> => isObject(value)
  && Object.keys(value).sort().join("\0") === [...names].sort().join("\0");
const id = (value: unknown): value is string => typeof value === "string" && uuid.test(value);
const text = (value: unknown, max = Number.MAX_SAFE_INTEGER): value is string =>
  typeof value === "string" && value.trim().length > 0 && value.length <= max;
const instant = (value: unknown): value is string => typeof value === "string" && stamp.test(value) && Number.isFinite(Date.parse(value));
const interval = (from: unknown, to: unknown) => instant(from) && (to === null || instant(to) && to > from);
function invalid(): never { throw new FoundationError("TCDX.VALIDATION.FAILED", "Invalid commercial publication manifest", 400); }
function conflict(): never { throw new FoundationError("TCDX.CONFLICT.RESOURCE", "Commercial catalog conflict", 409); }
function denied(): never { throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403); }

/** Closed input corresponding to approved executable contract 17. This is intentionally an internal command. */
export function validateCommercialPublicationManifest(input: unknown): Manifest {
  if (!fields(input, ["profile", "decision_record_ref", "decision_record_sha256", "families", "root_links", "plan_versions"])
    || input.profile !== "COMMERCIAL_CATALOG_PUBLICATION_V1" || !text(input.decision_record_ref)
    || typeof input.decision_record_sha256 !== "string" || !hashPattern.test(input.decision_record_sha256)
    || !Array.isArray(input.families) || input.families.length < 1
    || !Array.isArray(input.root_links) || !Array.isArray(input.plan_versions) || input.plan_versions.length < 1) invalid();
  const allIds = new Set<string>();
  const unique = (value: unknown) => { if (!id(value) || allIds.has(value)) invalid(); allIds.add(value); };
  const familyIds = new Set<string>();
  const familyCodes = new Set<string>();
  for (const item of input.families) {
    if (!fields(item, ["commercial_family_id", "family_code", "name", "source_type"])) invalid();
    unique(item.commercial_family_id);
    if (!text(item.family_code, 96) || !text(item.name) || !text(item.source_type, 32)
      || familyCodes.has(item.family_code)) invalid();
    familyIds.add(item.commercial_family_id as string); familyCodes.add(item.family_code);
  }
  const roots = new Set<string>();
  for (const item of input.root_links) {
    if (!fields(item, ["regulatory_pack_commercial_family_link_id", "regulatory_pack_id", "commercial_family_id", "source_type"])) invalid();
    unique(item.regulatory_pack_commercial_family_link_id);
    if (!id(item.regulatory_pack_id) || !familyIds.has(item.commercial_family_id as string)
      || !text(item.source_type, 32) || roots.has(item.regulatory_pack_id)) invalid();
    roots.add(item.regulatory_pack_id);
  }
  const plans = new Set<string>();
  for (const item of input.plan_versions) {
    if (!fields(item, ["plan_version_id", "plan_id", "version_number", "display_name", "commercial_terms_ref",
      "effective_from", "effective_to", "family_links", "usage_limits", "entitlements"])) invalid();
    unique(item.plan_version_id);
    if (!id(item.plan_id) || plans.has(item.plan_id) || typeof item.version_number !== "string"
      || !/^[1-9][0-9]*$/.test(item.version_number) || !text(item.display_name)
      || !(item.commercial_terms_ref === null || text(item.commercial_terms_ref))
      || !interval(item.effective_from, item.effective_to)
      || !Array.isArray(item.family_links) || item.family_links.length < 1
      || !Array.isArray(item.usage_limits) || item.usage_limits.length < 2
      || !Array.isArray(item.entitlements) || item.entitlements.length < 1) invalid();
    plans.add(item.plan_id);
    const links = new Set<string>();
    for (const link of item.family_links) {
      if (!fields(link, ["plan_version_commercial_family_link_id", "commercial_family_id"])) invalid();
      unique(link.plan_version_commercial_family_link_id);
      if (!familyIds.has(link.commercial_family_id as string) || links.has(link.commercial_family_id as string)) invalid();
      links.add(link.commercial_family_id as string);
    }
    const dimensions = new Set<string>();
    for (const limit of item.usage_limits) {
      if (!fields(limit, ["usage_limit_id", "commercial_family_id", "limit_code", "limit_value", "unit", "effective_from", "effective_to"])) invalid();
      unique(limit.usage_limit_id);
      if (limit.commercial_family_id !== null && !links.has(limit.commercial_family_id as string)) invalid();
      if (limit.limit_code !== "regulatory_pack_count" || limit.unit !== "pack"
        || typeof limit.limit_value !== "string" || !/^(0|[1-9][0-9]{0,19})$/.test(limit.limit_value)
        || limit.effective_from !== item.effective_from || limit.effective_to !== item.effective_to) invalid();
      const dimension = limit.commercial_family_id === null ? "total" : limit.commercial_family_id as string;
      if (dimensions.has(dimension)) invalid();
      dimensions.add(dimension);
    }
    if (!dimensions.has("total") || [...links].some(family => !dimensions.has(family)) || dimensions.size !== links.size + 1) invalid();
    const rights = new Set<string>();
    for (const right of item.entitlements) {
      if (!fields(right, ["entitlement_id", "capability_id", "is_enabled"])) invalid();
      unique(right.entitlement_id);
      if (!id(right.capability_id) || typeof right.is_enabled !== "boolean" || rights.has(right.capability_id)) invalid();
      rights.add(right.capability_id);
    }
  }
  return input as Manifest;
}

function replayResult(value: string | null, expectedHash: string): CatalogPublicationResult {
  if (!value) conflict();
  try {
    const parsed: unknown = JSON.parse(value);
    if (!fields(parsed, ["profile", "manifest_sha256", "published_aggregates"])
      || parsed.profile !== "COMMERCIAL_CATALOG_PUBLICATION_RESULT_V1" || parsed.manifest_sha256 !== expectedHash
      || !Array.isArray(parsed.published_aggregates)) conflict();
    return parsed as CatalogPublicationResult;
  } catch { return conflict(); }
}

/** Caller supplies approved raw bytes and an authenticated human PlatformActor; no public route is created. */
export async function commercialCatalogPublication(tx: Transaction<FoundationDatabase>, actor: PlatformActor, input: {
  manifestBytes: Uint8Array; decisionRecordBytes: Uint8Array; approvalReceiptBytes: Uint8Array;
  idempotencyKey: string; correlationId: string;
}): Promise<{ result: CatalogPublicationResult; replayed: boolean }> {
  if (!input.manifestBytes.length || !input.decisionRecordBytes.length || !input.approvalReceiptBytes.length
    || !text(input.idempotencyKey, 255) || !id(input.correlationId)) invalid();
  const manifestHash = sha(input.manifestBytes);
  let parsed: unknown, receipt: unknown;
  try {
    parsed = JSON.parse(Buffer.from(input.manifestBytes).toString("utf8"));
    receipt = JSON.parse(Buffer.from(input.approvalReceiptBytes).toString("utf8"));
  } catch { invalid(); }
  const manifest = validateCommercialPublicationManifest(parsed);
  if (!isObject(receipt) || receipt.decision !== "APPROVED_EXACT_MANIFEST_BYTES_SUBJECT_TO_OPERATIONAL_GATES"
    || receipt.manifest_sha256 !== manifestHash || receipt.decision_record_sha256 !== manifest.decision_record_sha256
    || !text(receipt.authorizer) || !text(receipt.source) || !text(receipt.manifest_ref)) denied();
  if (sha(input.decisionRecordBytes) !== manifest.decision_record_sha256) denied();
  actor = await resolvePlatformActor(tx, actor.identity, "statement");
  requirePlatformAccess(actor, "platform.commercial_catalog.publish", actor.roles.includes("PLATFORM_ADMIN"));
  const baseline = await sql<{ allowed: boolean }>`SELECT EXISTS (
    SELECT 1 FROM iam.platform_role_assignments pa JOIN iam.roles r USING(role_id)
    JOIN iam.role_permissions rp USING(role_id) JOIN iam.permissions p USING(permission_id)
    WHERE pa.user_identity_id=${actor.identity.principalId}::uuid AND pa.ownership_class='PLATFORM_CONTROL'
      AND pa.valid_from<=statement_timestamp() AND (pa.valid_to IS NULL OR pa.valid_to>statement_timestamp())
      AND r.role_code='PLATFORM_ADMIN' AND r.is_baseline AND r.lifecycle_state='published'
      AND r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL
      AND rp.ownership_class='PLATFORM_CONTROL' AND rp.tenant_id IS NULL
      AND p.permission_code='platform.commercial_catalog.publish' AND p.lifecycle_state='published') AS allowed`.execute(tx);
  if (!baseline.rows[0]?.allowed) denied();
  const edge = await sql<{ allowed: boolean }>`SELECT EXISTS (
    SELECT 1 FROM ops_audit.lifecycle_transition_definitions d
    JOIN iam.permissions p ON p.permission_id=d.permission_id
    JOIN ops_audit.lifecycle_transition_scopes s ON s.lifecycle_transition_definition_id=d.lifecycle_transition_definition_id
    JOIN ops_audit.lifecycle_transition_side_effects e ON e.lifecycle_transition_definition_id=d.lifecycle_transition_definition_id
    WHERE d.entity_type='PlanVersion' AND d.from_state='draft' AND d.to_state='published'
      AND d.command_code='commercial_catalog.publish' AND d.lifecycle_state='published'
      AND d.precondition_policy_ref='commercial.catalog.publish.v1'
      AND d.audit_event_code='audit.platform.plan_version.publish.v1'
      AND d.idempotency_semantics='PUBLICATION_MANIFEST_SHA256'
      AND d.concurrency_semantics='READ_COMMITTED_ORDERED_CATALOG_LOCKS'
      AND d.system_actor_allowed=FALSE
      AND p.permission_code='platform.commercial_catalog.publish' AND p.lifecycle_state='published'
      AND s.scope_kind='platform' AND e.event_code='platform.plan_version.published.v1' AND e.is_required
  ) AS allowed`.execute(tx);
  if (!edge.rows[0]?.allowed) denied();
  const common = { ownershipClass: "PLATFORM_CONTROL" as const, tenantId: null,
    actor: { userIdentityId: actor.identity.principalId }, correlationId: input.correlationId };
  const claim = await claimIdempotency(tx, { ...common, idempotencyRecordId: newUuidV7(),
    operationCode: "commercialCatalogPublication", key: input.idempotencyKey, requestHash: manifestHash });
  if (claim.state === "replay") return { result: replayResult(claim.resultRef, manifestHash), replayed: true };
  if (claim.state !== "claimed") conflict();
  // Stable catalog locking order. The transaction owns all writes, audit and outbox.
  await sql`SELECT plan_id FROM platform.plans ORDER BY plan_id FOR UPDATE`.execute(tx);
  await sql`SELECT regulatory_pack_id FROM regulatory.regulatory_packs ORDER BY regulatory_pack_id FOR UPDATE`.execute(tx);
  const families = [...manifest.families].sort((a, b) => a.commercial_family_id.localeCompare(b.commercial_family_id));
  const familyMap = new Map(families.map(f => [f.commercial_family_id, f]));
  for (const family of families) await sql`INSERT INTO platform.commercial_families
    (commercial_family_id,family_code,name,source_type,published_at,publication_manifest_sha256,created_by_user_identity_id)
    VALUES (${family.commercial_family_id}::uuid,${family.family_code},${family.name},${family.source_type},statement_timestamp(),
      ${manifestHash},${actor.identity.principalId}::uuid)`.execute(tx);
  for (const link of [...manifest.root_links].sort((a, b) => a.regulatory_pack_id.localeCompare(b.regulatory_pack_id))) {
    const family = familyMap.get(link.commercial_family_id);
    if (family?.source_type !== link.source_type) invalid();
    const pack = (await sql<{ source_type: string }>`SELECT source_type FROM regulatory.regulatory_packs
      WHERE regulatory_pack_id=${link.regulatory_pack_id}::uuid`.execute(tx)).rows[0];
    if (pack?.source_type !== link.source_type) conflict();
    await sql`INSERT INTO platform.regulatory_pack_commercial_family_links
      (regulatory_pack_commercial_family_link_id,regulatory_pack_id,commercial_family_id,source_type,created_by_user_identity_id)
      VALUES (${link.regulatory_pack_commercial_family_link_id}::uuid,${link.regulatory_pack_id}::uuid,
        ${link.commercial_family_id}::uuid,${link.source_type},${actor.identity.principalId}::uuid)`.execute(tx);
  }
  const versions = [...manifest.plan_versions].sort((a, b) => a.plan_id.localeCompare(b.plan_id));
  for (const version of versions) {
    const plan = (await sql<{ latest: string }>`SELECT COALESCE(max(version_number),0)::text AS latest
      FROM platform.plan_versions WHERE plan_id=${version.plan_id}::uuid`.execute(tx)).rows[0];
    if (BigInt(version.version_number) !== BigInt(plan?.latest ?? "0") + 1n) conflict();
    await sql`INSERT INTO platform.plan_versions
      (plan_version_id,plan_id,version_number,lifecycle_state,effective_from,effective_to,display_name,commercial_terms_ref,created_by_user_identity_id)
      VALUES (${version.plan_version_id}::uuid,${version.plan_id}::uuid,${version.version_number}::integer,'draft',
        ${version.effective_from}::timestamptz,${version.effective_to}::timestamptz,${version.display_name},
        ${version.commercial_terms_ref},${actor.identity.principalId}::uuid)`.execute(tx);
    for (const link of version.family_links) await sql`INSERT INTO platform.plan_version_commercial_family_links
      (plan_version_commercial_family_link_id,plan_version_id,commercial_family_id,created_by_user_identity_id)
      VALUES (${link.plan_version_commercial_family_link_id}::uuid,${version.plan_version_id}::uuid,
        ${link.commercial_family_id}::uuid,${actor.identity.principalId}::uuid)`.execute(tx);
    for (const limit of version.usage_limits) await sql`INSERT INTO platform.usage_limits
      (usage_limit_id,plan_version_id,limit_code,limit_value,unit,effective_from,effective_to,commercial_family_id,created_by_user_identity_id)
      VALUES (${limit.usage_limit_id}::uuid,${version.plan_version_id}::uuid,${limit.limit_code},${limit.limit_value}::numeric,
        ${limit.unit},${limit.effective_from}::timestamptz,${limit.effective_to}::timestamptz,
        ${limit.commercial_family_id}::uuid,${actor.identity.principalId}::uuid)`.execute(tx);
    for (const entitlement of version.entitlements) await sql`INSERT INTO platform.entitlements
      (entitlement_id,plan_version_id,capability_id,is_enabled,created_by_user_identity_id)
      VALUES (${entitlement.entitlement_id}::uuid,${version.plan_version_id}::uuid,
        ${entitlement.capability_id}::uuid,${entitlement.is_enabled},${actor.identity.principalId}::uuid)`.execute(tx);
    await sql`UPDATE platform.plan_versions SET lifecycle_state='published',published_at=statement_timestamp()
      WHERE plan_version_id=${version.plan_version_id}::uuid AND lifecycle_state='draft'`.execute(tx);
  }
  const published_aggregates: CatalogPublicationResult["published_aggregates"] = [
    ...families.map(f => ({ aggregate_type: "CommercialFamily" as const, aggregate_id: f.commercial_family_id })),
    ...versions.map(v => ({ aggregate_type: "PlanVersion" as const, aggregate_id: v.plan_version_id }))
  ];
  for (const aggregate of published_aggregates) {
    const family = aggregate.aggregate_type === "CommercialFamily";
    const payload = { profile: "PUBLICATION_MANIFEST_SHA256", manifest_sha256: manifestHash,
      decision_record_sha256: manifest.decision_record_sha256, aggregate_id: aggregate.aggregate_id };
    await persistAuditEvent(tx, { ...common, auditEventId: newUuidV7(),
      eventCode: family ? "audit.platform.commercial_catalog.publish.v1" : "audit.platform.plan_version.publish.v1",
      aggregateType: aggregate.aggregate_type, aggregateId: aggregate.aggregate_id, commandCode: "commercial_catalog.publish",
      outcome: "success", classification: "restricted", after: payload });
    await persistOutboxEvent(tx, { ...common, outboxEventId: newUuidV7(), eventId: newUuidV7(),
      eventType: family ? "platform.commercial_catalog.published.v1" : "platform.plan_version.published.v1",
      aggregateType: aggregate.aggregate_type, aggregateId: aggregate.aggregate_id, classification: "restricted", payload });
  }
  await recordPrivilegedUse(tx, { actor, correlationId: input.correlationId,
    aggregateType: "PlanVersion", aggregateId: versions[0]!.plan_version_id,
    commandCode: "commercial_catalog.publish", outcome: "success" });
  await sql`SET CONSTRAINTS ALL IMMEDIATE`.execute(tx);
  const result: CatalogPublicationResult = { profile: "COMMERCIAL_CATALOG_PUBLICATION_RESULT_V1", manifest_sha256: manifestHash, published_aggregates };
  const resultRef = JSON.stringify(result);
  await completeIdempotency(tx, { idempotencyRecordId: claim.idempotencyRecordId, requestHash: manifestHash,
    resultStatusCode: "completed", resultRef, responseHash: sha(Buffer.from(resultRef)) });
  return { result, replayed: false };
}
