import { sql, type Kysely, type Transaction } from "kysely";
import { validate as validateUuid } from "uuid";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";

type Executor = Kysely<FoundationDatabase> | Transaction<FoundationDatabase>;
type RuntimeEnvironment = "development" | "test" | "qa" | "production";
type Cursor = {
  v: 1;
  effective_from: string;
  filter_effective_from: string | null;
  pack_code: string;
  edition: string;
  regulatory_pack_version_id: string;
  regulatory_pack_validation_provenance_id: string;
};

export type ValidationAccessCandidate = {
  regulatory_pack_version_id: string;
  regulatory_pack_validation_provenance_id: string;
  pack_code: string;
  name: string;
  edition: string;
  license_classification: string;
  version_state: string;
  pack_state: string;
  authority_class: string;
  source_role: string;
  provenance_ref: string;
  version_effective_from: string | null;
  version_effective_to: string | null;
};

function invalid(field: string): never {
  throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400, false, { field });
}

function instant(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) invalid(field);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) invalid(field);
  const offset = value.match(/([+-])(\d{2}):(\d{2})$/);
  if (offset && (Number(offset[2]) > 23 || Number(offset[3]) > 59)) invalid(field);
  const local = value.slice(0, 19);
  const wallTime = new Date(parsed.getTime() + (offset ? (offset[1] === "+" ? 1 : -1) *
    (Number(offset[2]) * 60 + Number(offset[3])) * 60_000 : 0));
  if (wallTime.toISOString().slice(0, 19) !== local) invalid(field);
  return value;
}

export function parseValidationAccessCandidateQuery(query: Record<string, unknown>) {
  if (Object.keys(query).some((key) => !["page[size]", "page[cursor]", "filter[effective_from]"].includes(key))) invalid("query");
  const rawSize = query["page[size]"];
  const size = rawSize === undefined ? 25 : Number(rawSize);
  if (rawSize !== undefined && (typeof rawSize !== "string" || !/^\d+$/.test(rawSize))) invalid("page[size]");
  if (!Number.isInteger(size) || size < 1 || size > 100) invalid("page[size]");
  const filter = query["filter[effective_from]"] === undefined ? null : instant(query["filter[effective_from]"], "filter[effective_from]");
  let cursor: Cursor | null = null;
  if (query["page[cursor]"] !== undefined) {
    try {
      const raw = query["page[cursor]"];
      if (typeof raw !== "string" || !raw || raw.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(raw)) invalid("page[cursor]");
      const decoded = Buffer.from(raw, "base64url").toString("utf8");
      if (Buffer.from(decoded, "utf8").toString("base64url") !== raw) invalid("page[cursor]");
      const value = JSON.parse(decoded) as Partial<Cursor>;
      if (!value || typeof value !== "object" || Array.isArray(value) ||
          Object.keys(value).length !== 7 || value.v !== 1 ||
          value.filter_effective_from !== filter ||
          typeof value.pack_code !== "string" || !value.pack_code ||
          typeof value.edition !== "string" || !value.edition ||
          !validateUuid(value.regulatory_pack_version_id) ||
          !validateUuid(value.regulatory_pack_validation_provenance_id) ||
          instant(value.effective_from, "page[cursor]") !== value.effective_from ||
          (filter !== null && value.effective_from !== filter)) invalid("page[cursor]");
      cursor = value as Cursor;
    } catch { invalid("page[cursor]"); }
  }
  return { size, filter, cursor };
}

/** Platform-only derived metadata projection. The route owns actor authorization. */
export async function listValidationAccessCandidates(executor: Executor, query: Record<string, unknown>,
  runtimeEnvironment: RuntimeEnvironment) {
  if (runtimeEnvironment !== "development" && runtimeEnvironment !== "test" && runtimeEnvironment !== "qa")
    throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
  const { size, filter, cursor } = parseValidationAccessCandidateQuery(query);
  const effectiveFrom = cursor?.effective_from ?? filter ?? (await sql<{ effective_from: string }>`
    SELECT to_char(transaction_timestamp() AT TIME ZONE 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS effective_from
  `.execute(executor)).rows[0]!.effective_from;
  const result = await sql<{
    regulatory_pack_version_id: string; regulatory_pack_validation_provenance_id: string;
    pack_code: string; name: string; edition: string; license_classification: string;
    version_state: string; pack_state: string; authority_class: string; source_role: string;
    provenance_ref: string; version_effective_from: Date | null; version_effective_to: Date | null;
  }>`
    SELECT pv.regulatory_pack_version_id,vp.regulatory_pack_validation_provenance_id,
           p.pack_code,p.name,pv.edition,pv.license_classification,
           pv.lifecycle_state AS version_state,p.lifecycle_state AS pack_state,
           vp.authority_class,vp.source_role,vp.provenance_ref,
           pv.effective_from AS version_effective_from,pv.effective_to AS version_effective_to
      FROM regulatory.regulatory_packs p
      JOIN regulatory.regulatory_pack_versions pv ON pv.regulatory_pack_id=p.regulatory_pack_id
      JOIN regulatory.regulatory_pack_validation_provenances vp
        ON vp.regulatory_pack_version_id=pv.regulatory_pack_version_id
      JOIN regulatory.regulatory_import_manifests im
        ON im.regulatory_import_manifest_id=vp.regulatory_import_manifest_id
       AND im.regulatory_pack_version_id=vp.regulatory_pack_version_id
       AND im.regulatory_source_id=vp.regulatory_source_id
       AND im.import_checksum=vp.source_checksum
      JOIN regulatory.regulatory_sources rs ON rs.regulatory_source_id=vp.regulatory_source_id
     WHERE p.lifecycle_state='draft' AND pv.lifecycle_state='draft'
       AND pv.license_classification IN ('NOT_YET_LICENSED','non_authoritative_test_pack')
       AND vp.authority_class='NON_AUTHORITATIVE_TEST_PACK'
       AND vp.source_role IN ('provisional_supporting_reference','supporting_reference','test_data_source')
       AND length(btrim(vp.provenance_ref))>0
       AND im.outcome IN ('validated','validated_test_non_authoritative')
       AND rs.license_classification IN ('NOT_YET_LICENSED','non_authoritative_test_pack')
       AND (pv.effective_from IS NULL OR pv.effective_from<=${effectiveFrom}::timestamptz)
       AND (pv.effective_to IS NULL OR pv.effective_to>${effectiveFrom}::timestamptz)
       AND (${cursor?.pack_code ?? null}::text IS NULL OR
         (p.pack_code,pv.edition,pv.regulatory_pack_version_id,vp.regulatory_pack_validation_provenance_id)>
         (${cursor?.pack_code ?? null}::text,${cursor?.edition ?? null}::text,
          ${cursor?.regulatory_pack_version_id ?? null}::uuid,
          ${cursor?.regulatory_pack_validation_provenance_id ?? null}::uuid))
     ORDER BY p.pack_code,pv.edition,pv.regulatory_pack_version_id,vp.regulatory_pack_validation_provenance_id
     LIMIT ${size + 1}
  `.execute(executor);
  const rows = result.rows.slice(0, size);
  const items: ValidationAccessCandidate[] = rows.map((row) => ({
    ...row,
    version_effective_from: row.version_effective_from?.toISOString() ?? null,
    version_effective_to: row.version_effective_to?.toISOString() ?? null
  }));
  const last = rows.at(-1);
  const nextCursor = result.rows.length > size && last ? Buffer.from(JSON.stringify({
    v: 1, effective_from: effectiveFrom, filter_effective_from: filter,
    pack_code: last.pack_code, edition: last.edition,
    regulatory_pack_version_id: last.regulatory_pack_version_id,
    regulatory_pack_validation_provenance_id: last.regulatory_pack_validation_provenance_id
  } satisfies Cursor), "utf8").toString("base64url") : null;
  return { items, page: { has_more: nextCursor !== null, next_cursor: nextCursor } };
}
