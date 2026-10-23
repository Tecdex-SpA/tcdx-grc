import { sql, type Kysely, type Transaction } from "kysely";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";
import { claimIdempotency, completeIdempotency, persistAuditEvent, persistOutboxEvent } from "../persistence/foundation-records.js";
import { newUuidV7 } from "../uuid.js";
import { hashCanonical } from "./hash.js";
import type { NormalizedRegulatoryPack } from "./model.js";
import type { PersistedRegulatoryPack, RegulatoryPackRepository, RegulatoryPackTransaction } from "./repository.js";

type VersionRow = {
  regulatory_pack_version_id: string;
  framework_version_id: string;
  import_checksum: string;
  content_hash: string;
  lifecycle_state: PersistedRegulatoryPack["lifecycleState"];
};

function persisted(row: VersionRow): PersistedRegulatoryPack {
  return {
    regulatoryPackVersionId: row.regulatory_pack_version_id,
    frameworkVersionId: row.framework_version_id,
    importChecksum: row.import_checksum,
    contentHash: row.content_hash,
    lifecycleState: row.lifecycle_state
  };
}

async function findImport(transaction: Transaction<FoundationDatabase>, packCode: string, checksum: string): Promise<PersistedRegulatoryPack | null> {
  const result = await sql<VersionRow>`
    SELECT pv.regulatory_pack_version_id,pfv.framework_version_id,im.import_checksum,pv.content_hash,pv.lifecycle_state
      FROM regulatory.regulatory_packs p
      JOIN regulatory.regulatory_pack_versions pv ON pv.regulatory_pack_id=p.regulatory_pack_id
      JOIN regulatory.regulatory_pack_framework_versions pfv ON pfv.regulatory_pack_version_id=pv.regulatory_pack_version_id
      JOIN regulatory.regulatory_import_manifests im ON im.regulatory_pack_version_id=pv.regulatory_pack_version_id
     WHERE p.pack_code=${packCode} AND im.import_checksum=${checksum}
  `.execute(transaction);
  return result.rows[0] ? persisted(result.rows[0]) : null;
}

async function findVersion(transaction: Transaction<FoundationDatabase>, packCode: string, versionNumber: number): Promise<PersistedRegulatoryPack | null> {
  const result = await sql<VersionRow>`
    SELECT pv.regulatory_pack_version_id,pfv.framework_version_id,COALESCE(im.import_checksum,'') AS import_checksum,
           pv.content_hash,pv.lifecycle_state
      FROM regulatory.regulatory_packs p
      JOIN regulatory.regulatory_pack_versions pv ON pv.regulatory_pack_id=p.regulatory_pack_id
      JOIN regulatory.regulatory_pack_framework_versions pfv ON pfv.regulatory_pack_version_id=pv.regulatory_pack_version_id
      LEFT JOIN regulatory.regulatory_import_manifests im ON im.regulatory_pack_version_id=pv.regulatory_pack_version_id
     WHERE p.pack_code=${packCode} AND pv.version_number=${versionNumber}
     ORDER BY im.imported_at DESC NULLS LAST LIMIT 1
  `.execute(transaction);
  return result.rows[0] ? persisted(result.rows[0]) : null;
}

async function persistPack(transaction: Transaction<FoundationDatabase>, pack: NormalizedRegulatoryPack): Promise<PersistedRegulatoryPack> {
  const testPack = pack.governance.authorityClass === "NON_AUTHORITATIVE_TEST_PACK";
  const editableLifecycleState = testPack ? "draft" : "review";
  // The six governed codes use the same canonical aggregate. No special seed or
  // tenant exception is needed for the sixth code; creation stays in this TX.
  await sql`INSERT INTO regulatory.regulatory_packs
    (regulatory_pack_id,created_by_user_identity_id,updated_by_user_identity_id,pack_code,name,source_type,jurisdiction_code,lifecycle_state)
    VALUES (${newUuidV7()}::uuid,${pack.importedByUserIdentityId}::uuid,${pack.importedByUserIdentityId}::uuid,
      ${pack.packCode},${pack.packName},${pack.source.sourceType},${pack.jurisdictionCode ?? null},'draft')
    ON CONFLICT (pack_code) DO NOTHING`.execute(transaction);
  const packRow = await sql<{ regulatory_pack_id: string; source_type: string; jurisdiction_code: string | null }>`
    SELECT regulatory_pack_id,source_type,jurisdiction_code FROM regulatory.regulatory_packs WHERE pack_code=${pack.packCode} FOR UPDATE`.execute(transaction);
  const header = packRow.rows[0];
  if (!header || header.source_type !== pack.source.sourceType || (pack.jurisdictionCode != null && header.jurisdiction_code !== pack.jurisdictionCode)) {
    throw new FoundationError("TCDX.REGULATORY.SOURCE_DRIFT", "Regulatory pack source type or jurisdiction conflicts with its canonical header", 409);
  }
  const regulatoryPackId = header.regulatory_pack_id;

  const sourceId = newUuidV7();
  await sql`
    INSERT INTO regulatory.regulatory_sources
      (regulatory_source_id,created_by_user_identity_id,updated_by_user_identity_id,source_code,source_type,publisher,official_uri,license_classification,lifecycle_state)
    VALUES (${sourceId}::uuid,${pack.importedByUserIdentityId}::uuid,${pack.importedByUserIdentityId}::uuid,${pack.source.sourceCode},
      ${pack.source.sourceType},${pack.source.publisher},${pack.source.officialUri},${pack.source.licenseClassification},'published')
    ON CONFLICT (source_code) DO NOTHING
  `.execute(transaction);
  const source = await sql<{ regulatory_source_id: string; source_type: string; publisher: string; official_uri: string | null; license_classification: string }>`
    SELECT regulatory_source_id,source_type,publisher,official_uri,license_classification
    FROM regulatory.regulatory_sources WHERE source_code=${pack.source.sourceCode} FOR SHARE`.execute(transaction);
  const received = source.rows[0];
  if (!received || received.source_type !== pack.source.sourceType || received.publisher !== pack.source.publisher
    || received.official_uri !== pack.source.officialUri || received.license_classification !== pack.source.licenseClassification) {
    throw new FoundationError("TCDX.REGULATORY.SOURCE_DRIFT", "Import cannot rewrite an existing source's identity or rights metadata", 409);
  }
  const regulatorySourceId = received.regulatory_source_id;

  const versionId = newUuidV7();
  const packVersion = await sql<{ regulatory_pack_version_id: string }>`
    INSERT INTO regulatory.regulatory_pack_versions
      (regulatory_pack_version_id,created_by_user_identity_id,version_number,lifecycle_state,effective_from,regulatory_pack_id,edition,license_classification,content_hash)
    VALUES (${versionId}::uuid,${pack.importedByUserIdentityId}::uuid,${pack.versionNumber},${editableLifecycleState},${pack.effectiveFrom}::timestamptz,
      ${regulatoryPackId}::uuid,${pack.edition},${pack.source.licenseClassification},${pack.contentHash})
    ON CONFLICT (regulatory_pack_id,version_number) DO UPDATE SET content_hash=EXCLUDED.content_hash
      WHERE regulatory.regulatory_pack_versions.lifecycle_state <> 'published'
    RETURNING regulatory_pack_version_id
  `.execute(transaction);
  const regulatoryPackVersionId = packVersion.rows[0]?.regulatory_pack_version_id;
  if (!regulatoryPackVersionId) throw new FoundationError("TCDX.REGULATORY.PUBLISHED_IMMUTABLE", "Published regulatory content is immutable", 409);

  const frameworkIdCandidate = newUuidV7();
  const framework = await sql<{ framework_id: string }>`
    INSERT INTO regulatory.frameworks
      (framework_id,created_by_user_identity_id,updated_by_user_identity_id,ownership_class,tenant_id,framework_code,name,source_type,lifecycle_state)
    VALUES (${frameworkIdCandidate}::uuid,${pack.importedByUserIdentityId}::uuid,${pack.importedByUserIdentityId}::uuid,
      'GLOBAL_REFERENCE',NULL,${pack.frameworkCode},${pack.frameworkName},${pack.source.sourceType},'review')
    ON CONFLICT (ownership_class,tenant_id,framework_code) DO UPDATE SET
      updated_at=CURRENT_TIMESTAMP,updated_by_user_identity_id=EXCLUDED.updated_by_user_identity_id,row_version=regulatory.frameworks.row_version+1
    RETURNING framework_id
  `.execute(transaction);
  const frameworkId = framework.rows[0]?.framework_id;
  if (!frameworkId) throw new FoundationError("TCDX.REGULATORY.PERSISTENCE_FAILED", "Framework was not persisted", 500);

  const frameworkVersionCandidate = newUuidV7();
  const frameworkVersion = await sql<{ framework_version_id: string }>`
    INSERT INTO regulatory.framework_versions
      (framework_version_id,created_by_user_identity_id,ownership_class,tenant_id,framework_id,version_number,edition,lifecycle_state,effective_from,content_hash)
    VALUES (${frameworkVersionCandidate}::uuid,${pack.importedByUserIdentityId}::uuid,'GLOBAL_REFERENCE',NULL,${frameworkId}::uuid,
      ${pack.versionNumber},${pack.edition},${editableLifecycleState},${pack.effectiveFrom}::timestamptz,${pack.contentHash})
    ON CONFLICT (framework_id,version_number) DO UPDATE SET content_hash=EXCLUDED.content_hash
      WHERE regulatory.framework_versions.lifecycle_state <> 'published'
    RETURNING framework_version_id
  `.execute(transaction);
  const frameworkVersionId = frameworkVersion.rows[0]?.framework_version_id;
  if (!frameworkVersionId) throw new FoundationError("TCDX.REGULATORY.PUBLISHED_IMMUTABLE", "Published framework content is immutable", 409);

  await sql`
    INSERT INTO regulatory.regulatory_pack_framework_versions
      (regulatory_pack_framework_version_id,created_by_user_identity_id,regulatory_pack_version_id,framework_version_id)
    VALUES (${newUuidV7()}::uuid,${pack.importedByUserIdentityId}::uuid,${regulatoryPackVersionId}::uuid,${frameworkVersionId}::uuid)
    ON CONFLICT (regulatory_pack_version_id,framework_version_id) DO NOTHING
  `.execute(transaction);

  const unitIds = new Map<string, string>();
  const pending = [...pack.units];
  while (pending.length > 0) {
    const index = pending.findIndex((unit) => unit.parentSourceLocator === null || unitIds.has(unit.parentSourceLocator));
    if (index < 0) throw new FoundationError("TCDX.REGULATORY.INVALID_HIERARCHY", "Normative hierarchy cannot be persisted", 409);
    const unit = pending.splice(index, 1)[0];
    if (!unit) continue;
    const id = newUuidV7();
    const row = await sql<{ normative_unit_id: string }>`
      INSERT INTO regulatory.normative_units
        (normative_unit_id,created_by_user_identity_id,ownership_class,tenant_id,framework_version_id,parent_normative_unit_id,unit_type,
         unit_code,title,display_order,source_locator,content_language,licensed_content,licensed_content_ref,content_hash,license_classification,provenance_ref,effective_from,effective_to)
      VALUES (${id}::uuid,${pack.importedByUserIdentityId}::uuid,'GLOBAL_REFERENCE',NULL,${frameworkVersionId}::uuid,
        ${unit.parentSourceLocator === null ? null : unitIds.get(unit.parentSourceLocator)}::uuid,${unit.unitType},${unit.unitCode},${unit.title},
        ${unit.displayOrder},${unit.sourceLocator},${unit.contentLanguage},${unit.licensedContent},${unit.licensedContentRef},${unit.contentHash},
        ${pack.source.licenseClassification},${unit.provenanceRef},${unit.effectiveFrom ?? null}::timestamptz,${unit.effectiveTo ?? null}::timestamptz)
      ON CONFLICT (framework_version_id,source_locator) DO UPDATE SET title=EXCLUDED.title
        WHERE regulatory.normative_units.framework_version_id=EXCLUDED.framework_version_id
      RETURNING normative_unit_id
    `.execute(transaction);
    const unitId = row.rows[0]?.normative_unit_id;
    if (!unitId) throw new FoundationError("TCDX.REGULATORY.SOURCE_DRIFT", "NormativeUnit source locator conflicts with another framework", 409);
    unitIds.set(unit.sourceLocator, unitId);
  }

  const requirementIds = new Map<string, string>();
  for (const requirement of pack.requirements) {
    const row = await sql<{ requirement_id: string }>`
      INSERT INTO regulatory.requirements
        (requirement_id,created_by_user_identity_id,ownership_class,tenant_id,framework_version_id,normative_unit_id,requirement_code,
         requirement_kind,statement_locator,content_language,licensed_statement,licensed_content_ref,content_hash,is_mandatory,
         applicability_guidance,evidence_expectations,provenance_ref,effective_from,effective_to)
      VALUES (${newUuidV7()}::uuid,${pack.importedByUserIdentityId}::uuid,'GLOBAL_REFERENCE',NULL,${frameworkVersionId}::uuid,
        ${unitIds.get(requirement.normativeUnitSourceLocator)}::uuid,${requirement.requirementCode},${requirement.requirementKind},
        ${requirement.sourceLocator},${requirement.contentLanguage},${requirement.licensedStatement},${requirement.licensedContentRef},
        ${requirement.contentHash},${requirement.isMandatory},${requirement.applicabilityGuidance},${requirement.evidenceExpectations},${requirement.provenanceRef},
        ${requirement.effectiveFrom ?? null}::timestamptz,${requirement.effectiveTo ?? null}::timestamptz)
      ON CONFLICT (requirement_code) DO UPDATE SET content_hash=EXCLUDED.content_hash
        WHERE regulatory.requirements.framework_version_id=EXCLUDED.framework_version_id
      RETURNING requirement_id
    `.execute(transaction);
    const requirementId = row.rows[0]?.requirement_id;
    if (!requirementId) throw new FoundationError("TCDX.REGULATORY.SOURCE_DRIFT", "Requirement code conflicts with another framework", 409);
    requirementIds.set(requirement.requirementCode, requirementId);
  }

  const controlVersionIds = new Map<string, string>();
  for (const control of [...pack.controls].sort((a,b) => a.controlCode.localeCompare(b.controlCode))) {
    const ownership = control.origin === "regulatory_reference" ? "GLOBAL_REFERENCE" : "PLATFORM_CONTROL";
    await sql`
      INSERT INTO controls.controls
        (control_id,created_by_user_identity_id,updated_by_user_identity_id,ownership_class,tenant_id,control_code,name,control_origin,lifecycle_state)
      VALUES (${newUuidV7()}::uuid,${pack.importedByUserIdentityId}::uuid,${pack.importedByUserIdentityId}::uuid,${ownership},NULL,
        ${control.controlCode},${control.name},${control.origin},${editableLifecycleState})
      ON CONFLICT (ownership_class,tenant_id,control_code) DO NOTHING
    `.execute(transaction);
    const controlRow = await sql<{ control_id: string }>`SELECT control_id FROM controls.controls
      WHERE ownership_class=${ownership} AND tenant_id IS NULL AND control_code=${control.controlCode}
        AND name=${control.name} AND control_origin=${control.origin} FOR SHARE`.execute(transaction);
    const controlId = controlRow.rows[0]?.control_id;
    if (!controlId) throw new FoundationError("TCDX.REGULATORY.SOURCE_DRIFT", "Control identity conflicts with an existing source", 409);
    await sql`
      INSERT INTO controls.control_versions
        (control_version_id,created_by_user_identity_id,ownership_class,tenant_id,control_id,version_number,objective,control_type,nature,
         frequency_code,execution_method,verification_method,minimum_evidence,suggested_owner_role_code,lifecycle_state)
      VALUES (${newUuidV7()}::uuid,${pack.importedByUserIdentityId}::uuid,${ownership},NULL,${controlId}::uuid,${control.versionNumber},${control.objective},
        ${control.controlType},${control.nature},${control.frequencyCode},${control.executionMethod},${control.verificationMethod},
        ${control.minimumEvidence},${control.suggestedOwnerRoleCode},${editableLifecycleState})
      ON CONFLICT (control_id,version_number) DO NOTHING
    `.execute(transaction);
    const versionRow = await sql<{ control_version_id: string }>`SELECT control_version_id FROM controls.control_versions
      WHERE control_id=${controlId}::uuid AND version_number=${control.versionNumber}
        AND objective=${control.objective} AND control_type=${control.controlType} AND nature=${control.nature}
        AND frequency_code=${control.frequencyCode} AND execution_method=${control.executionMethod}
        AND verification_method=${control.verificationMethod} AND minimum_evidence=${control.minimumEvidence}
        AND suggested_owner_role_code IS NOT DISTINCT FROM ${control.suggestedOwnerRoleCode}
      FOR SHARE`.execute(transaction);
    const controlVersionId = versionRow.rows[0]?.control_version_id;
    if (!controlVersionId) throw new FoundationError("TCDX.REGULATORY.SOURCE_DRIFT", "An existing control version cannot be rewritten by import", 409);
    controlVersionIds.set(control.controlCode, controlVersionId);
  }

  let mappingVersion = 1;
  for (const mapping of pack.requirementControlMappings) {
    await sql`
      INSERT INTO regulatory.requirement_control_mappings
        (requirement_control_mapping_id,created_by_user_identity_id,ownership_class,tenant_id,requirement_id,control_version_id,mapping_version,
         mapping_type,coverage_contribution,rationale,lifecycle_state,provenance_ref)
      VALUES (${newUuidV7()}::uuid,${pack.importedByUserIdentityId}::uuid,'GLOBAL_REFERENCE',NULL,${requirementIds.get(mapping.requirementCode)}::uuid,
        ${controlVersionIds.get(mapping.controlCode)}::uuid,${mappingVersion++},${mapping.mappingType},${mapping.coverageContribution},
        ${mapping.rationale},${editableLifecycleState},${mapping.provenanceRef})
      ON CONFLICT DO NOTHING
    `.execute(transaction);
  }
  for (const mapping of pack.normativeUnitControlMappings) {
    await sql`
      INSERT INTO regulatory.normative_unit_control_mappings
        (normative_unit_control_mapping_id,created_by_user_identity_id,ownership_class,tenant_id,normative_unit_id,control_version_id,
         mapping_version,source_locator,rationale,lifecycle_state,provenance_ref)
      VALUES (${newUuidV7()}::uuid,${pack.importedByUserIdentityId}::uuid,'GLOBAL_REFERENCE',NULL,
        ${unitIds.get(mapping.normativeUnitSourceLocator)}::uuid,${controlVersionIds.get(mapping.controlCode)}::uuid,${mappingVersion++},
        ${mapping.sourceLocator},${mapping.rationale},${editableLifecycleState},${mapping.provenanceRef})
      ON CONFLICT DO NOTHING
    `.execute(transaction);
  }

  for (const crosswalk of pack.crosswalks) {
    const target = await sql<{ framework_version_id: string }>`
      SELECT fv.framework_version_id
        FROM regulatory.frameworks f
        JOIN regulatory.framework_versions fv ON fv.framework_id=f.framework_id
       WHERE f.framework_code=${crosswalk.targetFrameworkCode} AND fv.edition=${crosswalk.targetEdition}
         AND f.ownership_class='GLOBAL_REFERENCE' AND f.tenant_id IS NULL
         AND fv.ownership_class='GLOBAL_REFERENCE' AND fv.tenant_id IS NULL
       FOR SHARE OF fv
    `.execute(transaction);
    const targetFrameworkVersionId = target.rows[0]?.framework_version_id;
    if (!targetFrameworkVersionId || target.rows.length !== 1) throw new FoundationError("TCDX.REGULATORY.CROSSWALK_TARGET_MISSING", "Crosswalk target framework version must resolve uniquely", 409);
    const crosswalkId = newUuidV7();
    await sql`
      INSERT INTO regulatory.framework_crosswalks
        (framework_crosswalk_id,created_by_user_identity_id,ownership_class,tenant_id,source_framework_version_id,target_framework_version_id,
         crosswalk_version,direction,lifecycle_state,provenance_ref,effective_from,effective_to)
      VALUES (${crosswalkId}::uuid,${pack.importedByUserIdentityId}::uuid,'GLOBAL_REFERENCE',NULL,${frameworkVersionId}::uuid,
        ${targetFrameworkVersionId}::uuid,${crosswalk.versionNumber},${crosswalk.direction},${editableLifecycleState},${crosswalk.provenanceRef},
        ${crosswalk.effectiveFrom ?? null}::timestamptz,${crosswalk.effectiveTo ?? null}::timestamptz)
    `.execute(transaction);
    for (const mapping of crosswalk.mappings) {
      let sourceId: string | undefined;
      let targetId: string | null = null;
      if (mapping.objectType === "normative_unit") {
        sourceId = unitIds.get(mapping.sourceCode);
        if (mapping.targetCode !== null) {
          const row = await sql<{ id: string }>`SELECT normative_unit_id AS id FROM regulatory.normative_units WHERE framework_version_id=${targetFrameworkVersionId}::uuid AND source_locator=${mapping.targetCode}`.execute(transaction);
          targetId = row.rows[0]?.id ?? null;
        }
        if (!sourceId || (mapping.targetCode !== null && !targetId)) throw new FoundationError("TCDX.REGULATORY.CROSSWALK_TARGET_MISSING", "Typed NormativeUnit crosswalk target is unavailable", 409);
        await sql`
          INSERT INTO regulatory.normative_unit_crosswalk_mappings
            (normative_unit_crosswalk_mapping_id,created_by_user_identity_id,ownership_class,tenant_id,framework_crosswalk_id,
             source_normative_unit_id,target_normative_unit_id,relationship_type,rationale,confidence,mapping_status,
             direction,provenance_ref,effective_from,effective_to,mapping_version_number)
          VALUES (${newUuidV7()}::uuid,${pack.importedByUserIdentityId}::uuid,'GLOBAL_REFERENCE',NULL,${crosswalkId}::uuid,
            ${sourceId}::uuid,${targetId}::uuid,${mapping.relationshipType},${mapping.rationale},${mapping.confidence},${mapping.reviewed ? "review" : "draft"},
            ${crosswalk.direction},${mapping.provenanceRef},${mapping.effectiveFrom}::timestamptz,${mapping.effectiveTo ?? null}::timestamptz,${mapping.versionNumber})
        `.execute(transaction);
      } else if (mapping.objectType === "requirement") {
        sourceId = requirementIds.get(mapping.sourceCode);
        if (mapping.targetCode !== null) {
          const row = await sql<{ id: string }>`SELECT requirement_id AS id FROM regulatory.requirements WHERE framework_version_id=${targetFrameworkVersionId}::uuid AND requirement_code=${mapping.targetCode}`.execute(transaction);
          targetId = row.rows[0]?.id ?? null;
        }
        if (!sourceId || (mapping.targetCode !== null && !targetId)) throw new FoundationError("TCDX.REGULATORY.CROSSWALK_TARGET_MISSING", "Typed Requirement crosswalk target is unavailable", 409);
        await sql`
          INSERT INTO regulatory.requirement_crosswalk_mappings
            (requirement_crosswalk_mapping_id,created_by_user_identity_id,ownership_class,tenant_id,framework_crosswalk_id,
             source_requirement_id,target_requirement_id,relationship_type,rationale,confidence,mapping_status,
             direction,provenance_ref,effective_from,effective_to,mapping_version_number)
          VALUES (${newUuidV7()}::uuid,${pack.importedByUserIdentityId}::uuid,'GLOBAL_REFERENCE',NULL,${crosswalkId}::uuid,
            ${sourceId}::uuid,${targetId}::uuid,${mapping.relationshipType},${mapping.rationale},${mapping.confidence},${mapping.reviewed ? "review" : "draft"},
            ${crosswalk.direction},${mapping.provenanceRef},${mapping.effectiveFrom}::timestamptz,${mapping.effectiveTo ?? null}::timestamptz,${mapping.versionNumber})
        `.execute(transaction);
      } else {
        sourceId = controlVersionIds.get(mapping.sourceCode);
        if (mapping.targetCode !== null) {
          const row = await sql<{ id: string }>`
            SELECT DISTINCT cv.control_version_id AS id
              FROM controls.controls c
              JOIN controls.control_versions cv ON cv.control_id=c.control_id
              JOIN regulatory.normative_unit_control_mappings nucm ON nucm.control_version_id=cv.control_version_id
              JOIN regulatory.normative_units nu ON nu.normative_unit_id=nucm.normative_unit_id
             WHERE nu.framework_version_id=${targetFrameworkVersionId}::uuid AND c.control_code=${mapping.targetCode}
          `.execute(transaction);
          if (row.rows.length !== 1) throw new FoundationError("TCDX.REGULATORY.CROSSWALK_TARGET_MISSING", "Typed Control version must resolve uniquely", 409);
          targetId = row.rows[0]?.id ?? null;
        }
        if (!sourceId || (mapping.targetCode !== null && !targetId)) throw new FoundationError("TCDX.REGULATORY.CROSSWALK_TARGET_MISSING", "Typed Control crosswalk target is unavailable", 409);
        await sql`
          INSERT INTO regulatory.control_crosswalk_mappings
            (control_crosswalk_mapping_id,created_by_user_identity_id,ownership_class,tenant_id,framework_crosswalk_id,
             source_control_version_id,target_control_version_id,relationship_type,rationale,confidence,mapping_status,
             direction,provenance_ref,effective_from,effective_to,mapping_version_number)
          VALUES (${newUuidV7()}::uuid,${pack.importedByUserIdentityId}::uuid,'GLOBAL_REFERENCE',NULL,${crosswalkId}::uuid,
            ${sourceId}::uuid,${targetId}::uuid,${mapping.relationshipType},${mapping.rationale},${mapping.confidence},${mapping.reviewed ? "review" : "draft"},
            ${crosswalk.direction},${mapping.provenanceRef},${mapping.effectiveFrom}::timestamptz,${mapping.effectiveTo ?? null}::timestamptz,${mapping.versionNumber})
        `.execute(transaction);
      }
    }
  }

  await sql`
    INSERT INTO regulatory.regulatory_coverage_manifests
      (regulatory_coverage_manifest_id,created_by_user_identity_id,regulatory_pack_version_id,normative_units_expected,normative_units_imported,
       normative_units_reviewed,requirements_expected,requirements_imported,requirements_reviewed,reference_controls_expected,
       reference_controls_imported,reference_controls_reviewed,valid_parent_links,reviewed_editorial_mappings,reviewed_compliance_mappings,coverage_percent)
    VALUES (${newUuidV7()}::uuid,${pack.importedByUserIdentityId}::uuid,${regulatoryPackVersionId}::uuid,
      ${pack.coverage.normativeUnitsExpected},${pack.coverage.normativeUnitsImported},${pack.coverage.normativeUnitsReviewed},
      ${pack.coverage.requirementsExpected},${pack.coverage.requirementsImported},${pack.coverage.requirementsReviewed},
      ${pack.coverage.referenceControlsExpected},${pack.coverage.referenceControlsImported},${pack.coverage.referenceControlsReviewed},
      ${pack.coverage.validParentLinks},${pack.coverage.reviewedEditorialMappings},${pack.coverage.reviewedComplianceMappings},${pack.coverage.coveragePercent})
  `.execute(transaction);
  await sql`
    INSERT INTO regulatory.regulatory_import_manifests
      (regulatory_import_manifest_id,created_by_user_identity_id,regulatory_pack_version_id,regulatory_source_id,import_checksum,
       source_edition,imported_by_user_identity_id,imported_at,row_count,outcome)
    VALUES (${newUuidV7()}::uuid,${pack.importedByUserIdentityId}::uuid,${regulatoryPackVersionId}::uuid,${regulatorySourceId}::uuid,
      ${pack.importChecksum},${pack.edition},${pack.importedByUserIdentityId}::uuid,CURRENT_TIMESTAMP,
      ${pack.units.length + pack.requirements.length + pack.controls.length},${testPack ? "validated_test_non_authoritative" : "validated"})
  `.execute(transaction);

  return { regulatoryPackVersionId, frameworkVersionId, importChecksum: pack.importChecksum, contentHash: pack.contentHash, lifecycleState: editableLifecycleState };
}

function transactionAdapter(transaction: Transaction<FoundationDatabase>): RegulatoryPackTransaction {
  return {
    lock: async (packCode) => {
      await sql`SELECT pg_advisory_xact_lock(hashtextextended(${'tcdx-grc:regulatory-pack:' + packCode},0))`.execute(transaction);
    },
    findImport: (packCode, checksum) => findImport(transaction, packCode, checksum),
    findVersion: (packCode, versionNumber) => findVersion(transaction, packCode, versionNumber),
    persist: (pack) => persistPack(transaction, pack),
    publish: async (command) => {
      const claim = await claimIdempotency(transaction, {
        idempotencyRecordId: newUuidV7(), ownershipClass: "GLOBAL_REFERENCE", tenantId: null,
        actor: { userIdentityId: command.actorUserIdentityId }, correlationId: command.correlationId,
        operationCode: "regulatoryPackPublish", key: command.idempotencyKey, requestHash: command.requestHash
      });
      if (claim.state === "replay") return;
      const updated = await sql`
        UPDATE regulatory.regulatory_pack_versions
           SET lifecycle_state='published',published_at=CURRENT_TIMESTAMP,reviewed_by_user_identity_id=${command.actorUserIdentityId}::uuid
         WHERE regulatory_pack_version_id=${command.regulatoryPackVersionId}::uuid AND lifecycle_state IN ('review','approved')
      `.execute(transaction);
      if (Number(updated.numAffectedRows) !== 1) throw new FoundationError("TCDX.REGULATORY.PUBLICATION_CONFLICT", "Regulatory pack version is not publishable", 409);
      await persistAuditEvent(transaction, {
        auditEventId: newUuidV7(), ownershipClass: "GLOBAL_REFERENCE", tenantId: null,
        actor: { userIdentityId: command.actorUserIdentityId }, correlationId: command.correlationId,
        eventCode: "audit.knowledge.regulatory_pack.publish.v1", aggregateType: "RegulatoryPackVersion",
        aggregateId: command.regulatoryPackVersionId, commandCode: "regulatoryPackPublish", outcome: "success",
        classification: "protected_metadata", after: { lifecycle_state: "published", approval_refs: command.approvalRefs }
      });
      const eventId = newUuidV7();
      await persistOutboxEvent(transaction, {
        outboxEventId: newUuidV7(), eventId, ownershipClass: "GLOBAL_REFERENCE", tenantId: null,
        actor: { userIdentityId: command.actorUserIdentityId }, correlationId: command.correlationId,
        eventType: "knowledge.regulatory_pack.published.v1", aggregateType: "RegulatoryPackVersion",
        aggregateId: command.regulatoryPackVersionId, classification: "protected_metadata",
        payload: { regulatory_pack_version_id: command.regulatoryPackVersionId, approval_refs: command.approvalRefs }
      });
      await completeIdempotency(transaction, {
        idempotencyRecordId: claim.idempotencyRecordId, requestHash: command.requestHash,
        resultStatusCode: "completed", resultRef: command.regulatoryPackVersionId,
        responseHash: hashCanonical({ regulatoryPackVersionId: command.regulatoryPackVersionId, lifecycleState: "published" })
      });
    }
  };
}

export class PostgresRegulatoryPackRepository implements RegulatoryPackRepository {
  constructor(private readonly database: Kysely<FoundationDatabase>) {}

  transaction<T>(work: (transaction: RegulatoryPackTransaction) => Promise<T>): Promise<T> {
    return this.database.transaction().setIsolationLevel('read committed').execute((transaction) => work(transactionAdapter(transaction)));
  }
}
