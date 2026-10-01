import { createHash } from "node:crypto";
import { sql, type Kysely, type Transaction } from "kysely";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";
import { claimIdempotency, completeIdempotency, persistAuditEvent } from "../persistence/foundation-records.js";
import { requirePlatformAccess, type PlatformActor } from "../security/platform-authority.js";
import { newUuidV7 } from "../uuid.js";
import { resolveConfiguration, type ConfigurationLayer } from "../configuration/resolver.js";

type Executor = Kysely<FoundationDatabase> | Transaction<FoundationDatabase>;
export type TenantAccountClassification = "commercial" | "demo" | "test";
export type EffectiveTenantClassification = {
  tenantId: string; value: TenantAccountClassification; selectedLayerId: string; layerIds: string[];
};

function invalid(field: string): never {
  throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400, false, { field });
}

/** Derived EffectiveConfiguration; unknown, conflicting or missing authority resolves to commercial. */
export async function effectiveTenantClassification(executor: Executor, tenantId: string): Promise<EffectiveTenantClassification> {
  const definitions = await sql<{ configuration_definition_id: string; default_text_value: string }>`
    SELECT configuration_definition_id,default_text_value FROM config.configuration_definitions
     WHERE configuration_code='tenant_account_classification' AND ownership_class='PLATFORM_CONTROL'
       AND tenant_id IS NULL AND lifecycle_state='published'
       AND effective_from<=transaction_timestamp() AND effective_to>transaction_timestamp()
     ORDER BY version_number DESC LIMIT 2
  `.execute(executor);
  const definition = definitions.rows[0];
  if (definitions.rows.length !== 1 || definition?.default_text_value !== "commercial") {
    return { tenantId, value: "commercial", selectedLayerId: "missing", layerIds: [] };
  }
  const overrides = await sql<{ configuration_override_id: string; text_value: string }>`
    SELECT configuration_override_id,text_value FROM config.configuration_overrides
     WHERE configuration_definition_id=${definition.configuration_definition_id}::uuid
       AND ownership_class='TENANT_OWNED' AND tenant_id=${tenantId}::uuid
       AND scope_level='tenant' AND lifecycle_state='published'
       AND methodology_id IS NULL AND regulatory_pack_version_id IS NULL AND scope_subject_id IS NULL
       AND effective_from<=transaction_timestamp() AND effective_to>transaction_timestamp()
     ORDER BY override_version DESC LIMIT 2
  `.execute(executor);
  const base = `configuration-definition:${definition.configuration_definition_id}`;
  const layers: ConfigurationLayer[] = [{ layerId: base, precedence: 0, specificity: "platform", value: "commercial" }];
  for (const override of overrides.rows) {
    if (!["commercial", "demo", "test"].includes(override.text_value))
      return { tenantId, value: "commercial", selectedLayerId: base, layerIds: [base] };
    layers.push({ layerId: `configuration-override:${override.configuration_override_id}`,
      precedence: 1, specificity: "tenant", value: override.text_value });
  }
  try {
    const resolved = resolveConfiguration(layers);
    return { tenantId, value: resolved.value as TenantAccountClassification,
      selectedLayerId: resolved.selectedLayerId, layerIds: resolved.layerIds };
  } catch {
    return { tenantId, value: "commercial", selectedLayerId: base, layerIds: [base] };
  }
}

export async function setTenantClassification(tx: Transaction<FoundationDatabase>, actor: PlatformActor, input: {
  tenantId: string; body: unknown; key: string; correlationId: string;
}) {
  requirePlatformAccess(actor, "platform.tenant_account_classification.update", actor.roles.includes("PLATFORM_ADMIN"));
  if (!input.body || typeof input.body !== "object" || Array.isArray(input.body)) invalid("body");
  const body = input.body as Record<string, unknown>;
  if (Object.keys(body).length !== 1 || !Object.hasOwn(body, "classification") ||
      !["commercial", "demo", "test"].includes(String(body.classification))) invalid("classification");
  if (!input.key || input.key.length > 255) invalid("Idempotency-Key");
  const tenant = await sql<{ tenant_id: string }>`
    SELECT tenant_id FROM platform.tenants WHERE tenant_id=${input.tenantId}::uuid AND lifecycle_state='active' FOR UPDATE
  `.execute(tx);
  if (tenant.rows.length !== 1) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
  const definition = await sql<{ configuration_definition_id: string }>`
    SELECT configuration_definition_id FROM config.configuration_definitions
     WHERE configuration_code='tenant_account_classification' AND ownership_class='PLATFORM_CONTROL'
       AND lifecycle_state='published' AND tenant_overridable=TRUE
       AND effective_from<=transaction_timestamp() AND effective_to>transaction_timestamp()
  `.execute(tx);
  if (definition.rows.length !== 1) throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Classification definition unavailable", 403);
  const requestHash = createHash("sha256").update(JSON.stringify([input.tenantId,body.classification])).digest("hex");
  const claim = await claimIdempotency(tx, { idempotencyRecordId: newUuidV7(), ownershipClass: "PLATFORM_CONTROL",
    tenantId: null, actor: { userIdentityId: actor.identity.principalId }, correlationId: input.correlationId,
    operationCode: "tenantAccountClassificationSet", key: input.key, requestHash });
  if (claim.state === "replay") return { result: await effectiveTenantClassification(tx, input.tenantId), replayed: true };
  const before = await effectiveTenantClassification(tx, input.tenantId);
  const prior = await sql<{ configuration_override_id: string; override_version: string }>`
    SELECT configuration_override_id,override_version FROM config.configuration_overrides
     WHERE configuration_definition_id=${definition.rows[0]!.configuration_definition_id}::uuid
       AND tenant_id=${input.tenantId}::uuid AND scope_level='tenant'
       AND methodology_id IS NULL AND regulatory_pack_version_id IS NULL AND scope_subject_id IS NULL
       AND effective_to>transaction_timestamp()
     FOR UPDATE
  `.execute(tx);
  if (prior.rows.length > 1) throw new FoundationError("TCDX.CONFLICT.RESOURCE", "Conflicting classification", 409);
  if (prior.rows[0]) await sql`UPDATE config.configuration_overrides SET effective_to=transaction_timestamp()
    WHERE configuration_override_id=${prior.rows[0].configuration_override_id}::uuid`.execute(tx);
  const id = newUuidV7();
  await sql`INSERT INTO config.configuration_overrides
    (configuration_override_id,ownership_class,tenant_id,configuration_definition_id,override_version,
     scope_level,lifecycle_state,effective_from,effective_to,text_value,created_by_user_identity_id,approved_by_user_identity_id)
    VALUES (${id}::uuid,'TENANT_OWNED',${input.tenantId}::uuid,
      ${definition.rows[0]!.configuration_definition_id}::uuid,${prior.rows[0] ? Number(prior.rows[0].override_version)+1 : 1},
      'tenant','published',transaction_timestamp(),'infinity'::timestamptz,${String(body.classification)},
      ${actor.identity.principalId}::uuid,${actor.identity.principalId}::uuid)
  `.execute(tx);
  const result = await effectiveTenantClassification(tx, input.tenantId);
  await persistAuditEvent(tx, { auditEventId: newUuidV7(), ownershipClass: "PLATFORM_CONTROL", tenantId: null,
    actor: { userIdentityId: actor.identity.principalId }, correlationId: input.correlationId,
    eventCode: "audit.platform.tenant_account_classification.set.v1", aggregateType: "Tenant",
    aggregateId: input.tenantId, commandCode: "tenantAccountClassificationSet", outcome: "success",
    classification: "confidential", before: { value: before.value, selected_layer_id: before.selectedLayerId },
    after: { value: result.value, selected_layer_id: result.selectedLayerId } });
  await completeIdempotency(tx, { idempotencyRecordId: claim.idempotencyRecordId, requestHash,
    resultStatusCode: "completed", resultRef: `classification:${id}`,
    responseHash: createHash("sha256").update(JSON.stringify(result)).digest("hex") });
  return { result, replayed: false };
}
