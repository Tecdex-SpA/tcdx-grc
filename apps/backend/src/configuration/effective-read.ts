// EC-DETAIL-READ-v1-L03-R1; executable contract28 and DR-STEP6A3-EC-DETAIL-R1-20261009.
import { CompiledQuery, type Kysely } from "kysely";
import { validate as validateUuid } from "uuid";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";
import type { CoreActor } from "../core-grc/model.js";
import { requireAccess } from "../core-grc/security.js";

type ResolutionRow = {
  effective_configuration_id: string; configuration_definition_id: string;
  configuration_code: string; version_number: string;
  resolved_for_subject_id: string | null; effective_at: Date | string;
  resolved_at: Date | string; resolution_status: string; input_hash: string;
  layer_id: string | null; layer_definition_id: string | null;
  configuration_override_id: string | null; precedence_level: string | null;
  ordinal: number | null; was_selected: boolean | null;
};
function metadataFailure(): never { throw new FoundationError("TCDX.INTERNAL.FAILURE", "Internal failure", 500); }
function isUuid(value: unknown): value is string { return typeof value === "string" && validateUuid(value); }
function boundedText(value: unknown, minimum: number, maximum: number): value is string {
  return typeof value === "string" && [...value].length >= minimum && [...value].length <= maximum;
}
function utcTimestamp(value: Date | string): string {
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) metadataFailure();
    value = value.toISOString();
  }
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value)) metadataFailure();
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,19) !== value.slice(0,19)) metadataFailure();
  return value;
}
export async function readEffectiveConfiguration(database: Kysely<FoundationDatabase>, actor: CoreActor, id: string) {
  requireAccess(actor, "configuration.effective_configuration.read", "CORE_PLATFORM", ["tenant"]);
  // One statement snapshot. Missing joined references must not masquerade as global ownership.
  const result = await database.executeQuery<ResolutionRow>(CompiledQuery.raw(`
    SELECT ec.effective_configuration_id,ec.configuration_definition_id,
           cd.configuration_code,cd.version_number::text AS version_number,
           ec.resolved_for_subject_id,ec.effective_at,ec.resolved_at,ec.resolution_status,ec.input_hash,
           l.effective_configuration_layer_id AS layer_id,l.configuration_definition_id AS layer_definition_id,
           l.configuration_override_id,l.precedence_level,l.ordinal,l.was_selected
      FROM config.effective_configurations ec
      JOIN config.configuration_definitions cd ON cd.configuration_definition_id=ec.configuration_definition_id
      LEFT JOIN config.effective_configuration_layers l
        ON l.effective_configuration_id=ec.effective_configuration_id
     WHERE ec.effective_configuration_id=$1::uuid AND ec.tenant_id=$2::uuid
       AND (cd.tenant_id IS NULL OR cd.tenant_id=ec.tenant_id)
       AND NOT EXISTS (
         SELECT 1 FROM config.effective_configuration_layers layer
         LEFT JOIN config.configuration_definitions ld ON ld.configuration_definition_id=layer.configuration_definition_id
         LEFT JOIN config.configuration_overrides lo ON lo.configuration_override_id=layer.configuration_override_id
         LEFT JOIN config.configuration_definitions od ON od.configuration_definition_id=lo.configuration_definition_id
         WHERE layer.effective_configuration_id=ec.effective_configuration_id
           AND (layer.tenant_id <> ec.tenant_id
             OR ld.configuration_definition_id IS NULL
             OR (ld.tenant_id IS NOT NULL AND ld.tenant_id <> ec.tenant_id)
             OR (layer.configuration_override_id IS NOT NULL AND lo.configuration_override_id IS NULL)
             OR (lo.tenant_id IS NOT NULL AND lo.tenant_id <> ec.tenant_id)
             OR (layer.configuration_override_id IS NOT NULL AND od.configuration_definition_id IS NULL)
             OR (od.tenant_id IS NOT NULL AND od.tenant_id <> ec.tenant_id))
       )
     ORDER BY l.ordinal ASC NULLS LAST,l.precedence_level COLLATE "C" ASC NULLS LAST,
              l.configuration_override_id ASC NULLS FIRST,l.effective_configuration_layer_id ASC NULLS LAST
  `, [id, actor.tenantId]));
  const row = result.rows[0];
  if (!row) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
  if (!isUuid(row.effective_configuration_id) || row.effective_configuration_id !== id || !isUuid(row.configuration_definition_id)
    || !boundedText(row.configuration_code,1,128) || !boundedText(row.resolution_status,0,32)
    || (row.resolved_for_subject_id !== null && !isUuid(row.resolved_for_subject_id))
    || typeof row.input_hash !== "string" || !/^[0-9a-fA-F]{64}$/.test(row.input_hash)
    || typeof row.version_number !== "string" || !/^[1-9][0-9]{0,18}$/.test(row.version_number)
    || BigInt(row.version_number) > 9223372036854775807n) metadataFailure();
  const effectiveAt = utcTimestamp(row.effective_at);
  const resolvedAt = utcTimestamp(row.resolved_at);
  const keys = new Map<string, Set<number>>();
  const selectedLevels = new Set<string>();
  const layers = result.rows.flatMap(layer => {
    if (layer.layer_id === null) {
      if (result.rows.length !== 1 || layer.layer_definition_id !== null || layer.configuration_override_id !== null
        || layer.precedence_level !== null || layer.ordinal !== null || layer.was_selected !== null) metadataFailure();
      return [];
    }
    if (!isUuid(layer.layer_id) || !isUuid(layer.layer_definition_id)
      || (layer.configuration_override_id !== null && !isUuid(layer.configuration_override_id))
      || !boundedText(layer.precedence_level,0,32) || !Number.isInteger(layer.ordinal)
      || layer.ordinal === null || layer.ordinal < 1 || layer.ordinal > 2147483647
      || typeof layer.was_selected !== "boolean") metadataFailure();
    const ordinals = keys.get(layer.precedence_level) ?? new Set<number>();
    if (ordinals.has(layer.ordinal) || (layer.was_selected && selectedLevels.has(layer.precedence_level))) {
      throw new FoundationError("TCDX.CONFLICT.RESOURCE", "Configuration lineage conflict", 409);
    }
    ordinals.add(layer.ordinal); keys.set(layer.precedence_level,ordinals);
    if (layer.was_selected) selectedLevels.add(layer.precedence_level);
    return [{ configuration_definition_id: layer.layer_definition_id,
      configuration_override_id: layer.configuration_override_id, precedence_level: layer.precedence_level,
      ordinal: layer.ordinal, was_selected: layer.was_selected }];
  });
  return {
    effective_configuration_id: row.effective_configuration_id,
    configuration_definition: { configuration_definition_id: row.configuration_definition_id,
      configuration_code: row.configuration_code, version_number: row.version_number },
    resolved_for_subject_id: row.resolved_for_subject_id, effective_at: effectiveAt, resolved_at: resolvedAt,
    resolution_status: row.resolution_status, input_hash: row.input_hash, layers
  };
}
