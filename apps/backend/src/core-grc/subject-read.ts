import { createHash } from "node:crypto";
import { CompiledQuery, type Kysely } from "kysely";
import { validate as validateUuid } from "uuid";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";
import type { CoreActor } from "./model.js";

type Query = Record<string, unknown>;
type SubjectRow = { subject_id: string; subject_type: string; canonical_key: string; display_name: string; lifecycle_state: string };

function invalid(field: string): never {
  throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400, false, { field });
}

export async function listSelectableSubjects(database: Kysely<FoundationDatabase>, actor: CoreActor, query: Query) {
  const allowed = new Set(["page[size]", "page[cursor]", "filter[query]", "filter[subject_type]"]);
  for (const field of Object.keys(query)) if (!allowed.has(field)) invalid(field);
  const rawSize = query["page[size]"];
  const size = rawSize === undefined ? 25 : Number(rawSize);
  if (!Number.isInteger(size) || size < 1 || size > 100) invalid("page[size]");
  const search = query["filter[query]"];
  if (search !== undefined && (typeof search !== "string" || search.trim().length < 2 || search.length > 160)) invalid("filter[query]");
  const subjectType = query["filter[subject_type]"];
  if (subjectType !== undefined && (typeof subjectType !== "string" || !/^[a-z][a-z0-9_]{0,63}$/.test(subjectType))) invalid("filter[subject_type]");
  const hash = createHash("sha256").update(JSON.stringify([actor.tenantId, search ?? null, subjectType ?? null])).digest("hex");
  let after: { display_name: string; subject_id: string } | null = null;
  if (query["page[cursor]"] !== undefined) {
    const raw = query["page[cursor]"];
    if (typeof raw !== "string" || raw.length > 2048) invalid("page[cursor]");
    try {
      const decoded = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as { hash?: string; display_name?: string; subject_id?: string };
      if (decoded.hash !== hash || typeof decoded.display_name !== "string" || !decoded.subject_id || !validateUuid(decoded.subject_id)) throw new Error("cursor");
      after = { display_name: decoded.display_name, subject_id: decoded.subject_id };
    } catch { invalid("page[cursor]"); }
  }
  const values: unknown[] = [actor.tenantId];
  let where = "tenant_id=$1::uuid AND lifecycle_state='active' AND superseded_by_subject_id IS NULL AND effective_from<=transaction_timestamp() AND (effective_to IS NULL OR effective_to>transaction_timestamp())";
  if (search !== undefined) {
    values.push(`%${search.trim().replaceAll("%", "\\%").replaceAll("_", "\\_")}%`);
    where += ` AND (display_name ILIKE $${values.length} ESCAPE '\\' OR canonical_key ILIKE $${values.length} ESCAPE '\\')`;
  }
  if (subjectType !== undefined) { values.push(subjectType); where += ` AND subject_type=$${values.length}`; }
  if (after) {
    values.push(after.display_name, after.subject_id);
    where += ` AND (display_name,subject_id)>($${values.length - 1}::text,$${values.length}::uuid)`;
  }
  values.push(size + 1);
  const result = await database.executeQuery<SubjectRow>(CompiledQuery.raw(
    `SELECT subject_id,subject_type,canonical_key,display_name,lifecycle_state FROM org.subjects WHERE ${where} ORDER BY display_name,subject_id LIMIT $${values.length}::integer`, values
  ));
  const items = result.rows.slice(0, size);
  const last = items.at(-1);
  return { items, page: { has_more: result.rows.length > size, next_cursor: result.rows.length > size && last
    ? Buffer.from(JSON.stringify({ hash, display_name: last.display_name, subject_id: last.subject_id })).toString("base64url") : null } };
}
