import { sql, type Kysely, type Transaction } from "kysely";
import type { FoundationDatabase } from "../database.js";
import { effectiveTenantClassification } from "./tenant-classification.js";

type Executor = Kysely<FoundationDatabase> | Transaction<FoundationDatabase>;

export type EffectivePack = {
  regulatory_pack_version_id: string;
  pack_code: string;
  name: string;
  edition: string;
  pack_lifecycle_state: string;
  entitlement_effective_from: Date;
  entitlement_effective_to: Date | null;
  access_mode: "official" | "non_authoritative_validation";
};

/** The only tenant-to-pack authority: active Subscription plus its exact active pack-version assignment. */
export async function effectivePacks(executor: Executor, tenantId: string): Promise<EffectivePack[]> {
  const result = await sql<EffectivePack>`
    SELECT DISTINCT pv.regulatory_pack_version_id,p.pack_code,p.name,pv.edition,'official'::text AS access_mode,
           pv.lifecycle_state AS pack_lifecycle_state,
           srp.effective_from AS entitlement_effective_from,
           srp.effective_to AS entitlement_effective_to
      FROM platform.subscriptions s
      JOIN platform.subscription_regulatory_packs srp
        ON srp.tenant_id=s.tenant_id AND srp.subscription_id=s.subscription_id
      JOIN regulatory.regulatory_pack_versions pv
        ON pv.regulatory_pack_version_id=srp.regulatory_pack_version_id
      JOIN regulatory.regulatory_packs p ON p.regulatory_pack_id=pv.regulatory_pack_id
     WHERE s.tenant_id=${tenantId}::uuid
       AND s.lifecycle_state='active'
       AND s.starts_at<=transaction_timestamp()
       AND (s.ends_at IS NULL OR s.ends_at>transaction_timestamp())
       AND srp.lifecycle_state='active'
       AND srp.effective_from<=transaction_timestamp()
       AND (srp.effective_to IS NULL OR srp.effective_to>transaction_timestamp())
       AND (pv.effective_from IS NULL OR pv.effective_from<=transaction_timestamp())
       AND (pv.effective_to IS NULL OR pv.effective_to>transaction_timestamp())
       AND pv.lifecycle_state='published'
       AND p.lifecycle_state='published'
  `.execute(executor);
  return result.rows;
}

/** Explicit QA authority. The import/provenance record is bound to the exact draft version. */
export async function nonAuthoritativeValidationPacks(executor: Executor, tenantId: string,
  runtimeEnvironment: "development" | "test" | "qa" | "production"): Promise<EffectivePack[]> {
  if (runtimeEnvironment === "production") return [];
  const classification = await effectiveTenantClassification(executor, tenantId);
  if (classification.value !== "demo" && classification.value !== "test") return [];
  const result = await sql<EffectivePack>`
    SELECT DISTINCT pv.regulatory_pack_version_id,p.pack_code,p.name,pv.edition,
           'non_authoritative_validation'::text AS access_mode,
           pv.lifecycle_state AS pack_lifecycle_state,
           va.effective_from AS entitlement_effective_from,va.effective_to AS entitlement_effective_to
      FROM platform.regulatory_pack_validation_accesses va
      JOIN regulatory.regulatory_pack_validation_provenances vp
        ON vp.regulatory_pack_validation_provenance_id=va.regulatory_pack_validation_provenance_id
       AND vp.regulatory_pack_version_id=va.regulatory_pack_version_id
      JOIN regulatory.regulatory_import_manifests im
        ON im.regulatory_import_manifest_id=vp.regulatory_import_manifest_id
       AND im.regulatory_pack_version_id=vp.regulatory_pack_version_id
       AND im.regulatory_source_id=vp.regulatory_source_id
       AND im.import_checksum=vp.source_checksum
      JOIN regulatory.regulatory_sources rs ON rs.regulatory_source_id=vp.regulatory_source_id
      JOIN regulatory.regulatory_pack_versions pv ON pv.regulatory_pack_version_id=va.regulatory_pack_version_id
      JOIN regulatory.regulatory_packs p ON p.regulatory_pack_id=pv.regulatory_pack_id
     WHERE va.tenant_id=${tenantId}::uuid AND va.lifecycle_state='active'
       AND va.effective_from<=transaction_timestamp()
       AND (va.effective_to IS NULL OR va.effective_to>transaction_timestamp())
       AND vp.authority_class='NON_AUTHORITATIVE_TEST_PACK'
       AND vp.source_role IN ('provisional_supporting_reference','supporting_reference','test_data_source')
       AND length(btrim(vp.provenance_ref))>0
       AND im.outcome IN ('validated','validated_test_non_authoritative')
       AND rs.license_classification IN ('NOT_YET_LICENSED','non_authoritative_test_pack')
       AND pv.license_classification IN ('NOT_YET_LICENSED','non_authoritative_test_pack')
       AND pv.lifecycle_state='draft' AND p.lifecycle_state='draft'
       AND (pv.effective_from IS NULL OR pv.effective_from<=transaction_timestamp())
       AND (pv.effective_to IS NULL OR pv.effective_to>transaction_timestamp())
  `.execute(executor);
  return result.rows;
}

/** One read model supplies all normative and shared-control visibility decisions. */
export async function packVisibility(executor: Executor, tenantId: string,
  runtimeEnvironment: "development" | "test" | "qa" | "production" = "production"): Promise<{
  packs: EffectivePack[];
  frameworkVersionIds: ReadonlySet<string>;
  frameworkAccessModes: ReadonlyMap<string, "official" | "non_authoritative_validation">;
  globalControlVersionIds: ReadonlySet<string>;
  globalControlIds: ReadonlySet<string>;
}> {
  const packs = [...await effectivePacks(executor, tenantId),
    ...await nonAuthoritativeValidationPacks(executor, tenantId, runtimeEnvironment)];
  const packVersionIds = packs.map((pack) => pack.regulatory_pack_version_id);
  if (packVersionIds.length === 0) return {
    packs, frameworkVersionIds: new Set(), frameworkAccessModes: new Map(), globalControlVersionIds: new Set(), globalControlIds: new Set()
  };
  const frameworkResult = await sql<{ framework_version_id: string; regulatory_pack_version_id: string }>`
    SELECT DISTINCT pfv.framework_version_id,pfv.regulatory_pack_version_id
      FROM regulatory.regulatory_pack_framework_versions pfv
     WHERE pfv.regulatory_pack_version_id=ANY(${packVersionIds}::uuid[])
  `.execute(executor);
  const frameworkVersionIds = new Set(frameworkResult.rows.map((row) => row.framework_version_id));
  const frameworkAccessModes = new Map<string, "official" | "non_authoritative_validation">();
  for (const row of frameworkResult.rows) {
    const mode = packs.find((pack) => pack.regulatory_pack_version_id === row.regulatory_pack_version_id)?.access_mode;
    if (mode === "official" || (!frameworkAccessModes.has(row.framework_version_id) && mode))
      frameworkAccessModes.set(row.framework_version_id, mode);
  }
  if (frameworkVersionIds.size === 0) return {
    packs, frameworkVersionIds, frameworkAccessModes, globalControlVersionIds: new Set(), globalControlIds: new Set()
  };
  const authorizedFrameworks = [...frameworkVersionIds];
  const controls = await sql<{ control_version_id: string; control_id: string }>`
    SELECT DISTINCT cv.control_version_id,cv.control_id
      FROM controls.control_versions cv
      JOIN controls.controls c ON c.control_id=cv.control_id AND c.tenant_id IS NULL
     WHERE cv.tenant_id IS NULL AND (
       EXISTS (
         SELECT 1 FROM regulatory.requirement_control_mappings rcm
         JOIN regulatory.requirements r ON r.requirement_id=rcm.requirement_id
        WHERE rcm.control_version_id=cv.control_version_id
          AND r.framework_version_id=ANY(${authorizedFrameworks}::uuid[])
       ) OR EXISTS (
         SELECT 1 FROM regulatory.normative_unit_control_mappings ncm
         JOIN regulatory.normative_units nu ON nu.normative_unit_id=ncm.normative_unit_id
        WHERE ncm.control_version_id=cv.control_version_id
          AND nu.framework_version_id=ANY(${authorizedFrameworks}::uuid[])
       )
     )
  `.execute(executor);
  return {
    packs, frameworkVersionIds, frameworkAccessModes,
    globalControlVersionIds: new Set(controls.rows.map((row) => row.control_version_id)),
    globalControlIds: new Set(controls.rows.map((row) => row.control_id))
  };
}
