import { describe, expect, it } from "vitest";
import { loadConfig } from "../config.js";
import { createDatabase, sql } from "../database.js";
import { newUuidV7 } from "../uuid.js";
import { resources, type CoreActor } from "../core-grc/model.js";
import { subjectCreate } from "../core-grc/subject-create.js";
import { listSelectableSubjects } from "../core-grc/subject-read.js";
import { executeMutation, mutations } from "../core-grc/service.js";
import { detailResource } from "../core-grc/repository.js";
import type { PlatformActor } from "../security/platform-authority.js";
import { effectiveTenantClassification, setTenantClassification } from "./tenant-classification.js";
import { effectivePacks, nonAuthoritativeValidationPacks, packVisibility } from "./pack-entitlement.js";
import { validationAccessCreate, validationAccessRevoke, validationProvenanceCreate } from "./validation-access.js";

const enabled = process.env.TCDX_PHASE5_LIFECYCLE_INTEGRATION === "true";
const rollback = Symbol("phase5-plus-validation-rollback");

describe.skipIf(!enabled)("Phase 5+ Subject and provisional validation in isolated PostgreSQL", () => {
  it("creates tenant Subjects and grants an exact provisional pack only to a classified non-production tenant", async () => {
    if (process.env.DATABASE_HOST !== "127.0.0.1" || process.env.DATABASE_PORT !== "55432" ||
        process.env.TCDX_ISOLATED_REBUILD !== "true") throw new Error("ISOLATED_POSTGRES_REQUIRED");
    const database = createDatabase(loadConfig(process.env));
    const identityId = newUuidV7();
    const tenantId = newUuidV7();
    const commercialId = newUuidV7();
    const coreActor: CoreActor = {
      tenantId, membershipId: newUuidV7(), userIdentityId: identityId,
      permissions: new Set(["organization.subject.create", "organization.subject.read"]),
      scopes: new Set(["tenant"]),
      permissionScopes: new Map([
        ["organization.subject.create", new Set(["tenant" as const])],
        ["organization.subject.read", new Set(["tenant" as const])]
      ]),
      capabilityGroups: new Set(["CORE_PLATFORM"]), roles: ["TENANT_ADMIN"], runtimeEnvironment: "qa"
    };
    const platformActor: PlatformActor = {
      identity: { principalClass: "HUMAN_INTERACTIVE", principalId: identityId, tokenId: newUuidV7(), expiresAt: new Date(Date.now()+60000) },
      roles: ["PLATFORM_ADMIN"], permissions: new Set([
        "platform.tenant_account_classification.update", "platform.regulatory_pack_validation_access.read",
        "platform.regulatory_pack_validation_access.create", "platform.regulatory_pack_validation_access.archive"
      ])
    };
    let completed = false;
    try {
      await database.transaction().execute(async (tx) => {
        await sql`INSERT INTO iam.user_identities (user_identity_id,identity_key,display_name,lifecycle_state)
          VALUES (${identityId}::uuid,${`phase5-plus:${identityId}`},'Phase 5+ local actor','active')`.execute(tx);
        for (const id of [tenantId,commercialId]) await sql`INSERT INTO platform.tenants
          (tenant_id,tenant_code,legal_name,display_name,default_timezone,created_by_user_identity_id,updated_by_user_identity_id)
          VALUES (${id}::uuid,${`F5-${id.slice(-12)}`},'Local tenant','Local tenant','UTC',${identityId}::uuid,${identityId}::uuid)`.execute(tx);
        const grants = await sql<{ permission_code: string; role_code: string }>`
          SELECT p.permission_code,r.role_code FROM iam.role_permissions rp
          JOIN iam.permissions p ON p.permission_id=rp.permission_id JOIN iam.roles r ON r.role_id=rp.role_id
          WHERE p.permission_code IN ('organization.subject.create','platform.regulatory_pack_validation_access.create',
            'platform.regulatory_pack_validation_access.archive','platform.tenant_account_classification.update')
            AND r.tenant_id IS NULL ORDER BY p.permission_code,r.role_code`.execute(tx);
        expect(grants.rows).toEqual([
          { permission_code: "organization.subject.create", role_code: "TENANT_ADMIN" },
          { permission_code: "platform.regulatory_pack_validation_access.archive", role_code: "PLATFORM_ADMIN" },
          { permission_code: "platform.regulatory_pack_validation_access.create", role_code: "PLATFORM_ADMIN" },
          { permission_code: "platform.tenant_account_classification.update", role_code: "PLATFORM_ADMIN" }
        ]);

        const body = { subject_type: "process", canonical_key: "core-process", display_name: "Proceso principal" };
        const created = await subjectCreate(tx,coreActor,{ body,key:newUuidV7(),correlationId:newUuidV7() });
        expect(created.result.subject_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7/);
        expect(created.result).toMatchObject({ lifecycle_state: "active", effective_to: null });
        expect(Date.parse(created.result.effective_from)).toBeGreaterThan(Date.now()-30000);
        await expect(subjectCreate(tx,coreActor,{ body,key:newUuidV7(),correlationId:newUuidV7() }))
          .rejects.toMatchObject({ code: "TCDX.CONFLICT.RESOURCE" });
        expect((await subjectCreate(tx,coreActor,{ body: { ...body,subject_type:"service" },key:newUuidV7(),correlationId:newUuidV7() })).result.subject_id)
          .not.toBe(created.result.subject_id);
        for (const injected of [{ ...body,tenant_id:commercialId },{ ...body,lifecycle_state:"draft" },
          { ...body,effective_from:"2000-01-01T00:00:00Z" },{ ...body,subject_id:newUuidV7() }])
          await expect(subjectCreate(tx,coreActor,{body:injected,key:newUuidV7(),correlationId:newUuidV7()}))
            .rejects.toMatchObject({ code:"TCDX.VALIDATION.FAILED" });
        await expect(subjectCreate(tx,{...coreActor,roles:["CONTROL_OWNER"]},{body,key:newUuidV7(),correlationId:newUuidV7()}))
          .rejects.toMatchObject({ code:"TCDX.AUTHORIZATION.DENIED" });
        expect((await listSelectableSubjects(tx,coreActor,{})).items.map((item) => item.subject_id)).toContain(created.result.subject_id);
        expect((await listSelectableSubjects(tx,{...coreActor,tenantId:commercialId},{})).items).toHaveLength(0);
        const expiredId = newUuidV7();
        const futureId = newUuidV7();
        await sql`INSERT INTO org.subjects
          (subject_id,tenant_id,subject_type,canonical_key,display_name,lifecycle_state,effective_from,effective_to,
           created_by_user_identity_id,updated_by_user_identity_id)
          VALUES (${expiredId}::uuid,${tenantId}::uuid,'process','expired','Expired','active',
            transaction_timestamp()-interval '2 days',transaction_timestamp()-interval '1 day',${identityId}::uuid,${identityId}::uuid),
            (${futureId}::uuid,${tenantId}::uuid,'process','future','Future','active',
            transaction_timestamp()+interval '1 day',NULL,${identityId}::uuid,${identityId}::uuid)`.execute(tx);
        const selectable = (await listSelectableSubjects(tx,coreActor,{})).items.map((item) => item.subject_id);
        expect(selectable).not.toContain(expiredId);
        expect(selectable).not.toContain(futureId);

        expect((await effectiveTenantClassification(tx,tenantId)).value).toBe("commercial");
        expect(await nonAuthoritativeValidationPacks(tx,tenantId,"qa")).toHaveLength(0);
        const classified = await setTenantClassification(tx,platformActor,{ tenantId,body:{classification:"test"},key:newUuidV7(),correlationId:newUuidV7() });
        expect(classified.result.value).toBe("test");
        expect(await nonAuthoritativeValidationPacks(tx,tenantId,"qa")).toHaveLength(0);
        const version = await sql<{ regulatory_pack_version_id: string; regulatory_import_manifest_id: string; provenance_ref: string }>`
          SELECT pv.regulatory_pack_version_id,im.regulatory_import_manifest_id,nu.provenance_ref
          FROM regulatory.regulatory_pack_versions pv
          JOIN regulatory.regulatory_packs p ON p.regulatory_pack_id=pv.regulatory_pack_id
          JOIN regulatory.regulatory_import_manifests im ON im.regulatory_pack_version_id=pv.regulatory_pack_version_id
          JOIN regulatory.regulatory_pack_framework_versions pfv ON pfv.regulatory_pack_version_id=pv.regulatory_pack_version_id
          JOIN regulatory.normative_units nu ON nu.framework_version_id=pfv.framework_version_id
          WHERE p.pack_code='ISO_IEC_27001_2022' AND nu.provenance_ref IS NOT NULL LIMIT 1`.execute(tx);
        const selected = version.rows[0];
        if (!selected) throw new Error("LOCAL_CATALOG_V11_REQUIRED");
        const expiredVersion = await sql<{ regulatory_pack_version_id: string; regulatory_import_manifest_id: string;
          provenance_ref: string }>`SELECT pv.regulatory_pack_version_id,im.regulatory_import_manifest_id,nu.provenance_ref
          FROM regulatory.regulatory_pack_versions pv
          JOIN regulatory.regulatory_packs p ON p.regulatory_pack_id=pv.regulatory_pack_id
          JOIN regulatory.regulatory_import_manifests im ON im.regulatory_pack_version_id=pv.regulatory_pack_version_id
          JOIN regulatory.regulatory_pack_framework_versions pfv ON pfv.regulatory_pack_version_id=pv.regulatory_pack_version_id
          JOIN regulatory.normative_units nu ON nu.framework_version_id=pfv.framework_version_id
          WHERE p.pack_code='ISO_9001_2015' AND nu.provenance_ref IS NOT NULL LIMIT 1`.execute(tx);
        const old = expiredVersion.rows[0];
        if (!old) throw new Error("HISTORIC_CATALOG_VERSION_REQUIRED");
        const oldProvenance = await validationProvenanceCreate(tx,platformActor,{body:{
          regulatory_pack_version_id:old.regulatory_pack_version_id,
          regulatory_import_manifest_id:old.regulatory_import_manifest_id,
          source_role:"provisional_supporting_reference",provenance_ref:old.provenance_ref
        },key:newUuidV7(),correlationId:newUuidV7()});
        await expect(validationAccessCreate(tx,platformActor,{body:{tenant_id:tenantId,
          regulatory_pack_version_id:old.regulatory_pack_version_id,
          regulatory_pack_validation_provenance_id:oldProvenance.result.regulatory_pack_validation_provenance_id,
          effective_from:new Date(Date.now()-60000).toISOString()
        },key:newUuidV7(),correlationId:newUuidV7(),runtimeEnvironment:"qa"}))
          .rejects.toMatchObject({code:"TCDX.RESOURCE.NOT_FOUND"});
        const provenance = await validationProvenanceCreate(tx,platformActor,{body:{
          regulatory_pack_version_id:selected.regulatory_pack_version_id,
          regulatory_import_manifest_id:selected.regulatory_import_manifest_id,
          source_role:"provisional_supporting_reference",provenance_ref:selected.provenance_ref
        },key:newUuidV7(),correlationId:newUuidV7()});
        await expect(validationProvenanceCreate(tx,platformActor,{body:{
          regulatory_pack_version_id:selected.regulatory_pack_version_id,
          regulatory_import_manifest_id:selected.regulatory_import_manifest_id,
          source_role:"official_metadata",provenance_ref:selected.provenance_ref
        },key:newUuidV7(),correlationId:newUuidV7()})).rejects.toMatchObject({code:"TCDX.VALIDATION.FAILED"});
        const accessBody = {
          tenant_id:tenantId,regulatory_pack_version_id:selected.regulatory_pack_version_id,
          regulatory_pack_validation_provenance_id:provenance.result.regulatory_pack_validation_provenance_id,
          effective_from:new Date(Date.now()-60000).toISOString()
        };
        await expect(validationAccessCreate(tx,platformActor,{body:accessBody,key:newUuidV7(),
          correlationId:newUuidV7(),runtimeEnvironment:"production"})).rejects.toMatchObject({code:"TCDX.AUTHORIZATION.DENIED"});
        await expect(validationAccessCreate(tx,platformActor,{body:{...accessBody,tenant_id:commercialId},key:newUuidV7(),
          correlationId:newUuidV7(),runtimeEnvironment:"qa"})).rejects.toMatchObject({code:"TCDX.AUTHORIZATION.DENIED"});
        await expect(validationAccessCreate(tx,platformActor,{body:{...accessBody,regulatory_pack_version_id:newUuidV7()},key:newUuidV7(),
          correlationId:newUuidV7(),runtimeEnvironment:"qa"})).rejects.toMatchObject({code:"TCDX.RESOURCE.NOT_FOUND"});
        const access = await validationAccessCreate(tx,platformActor,{body:{
          ...accessBody
        },key:newUuidV7(),correlationId:newUuidV7(),runtimeEnvironment:"qa"});
        expect(access.result).toMatchObject({ lifecycle_state:"active",access_mode:"non_authoritative_validation" });
        expect((await effectivePacks(tx,tenantId))).toHaveLength(0);
        expect((await nonAuthoritativeValidationPacks(tx,tenantId,"qa")).map((pack) => pack.regulatory_pack_version_id))
          .toEqual([selected.regulatory_pack_version_id]);
        expect(await nonAuthoritativeValidationPacks(tx,tenantId,"production")).toHaveLength(0);
        expect(await nonAuthoritativeValidationPacks(tx,commercialId,"qa")).toHaveLength(0);
        expect((await packVisibility(tx,tenantId,"qa")).packs[0]?.access_mode).toBe("non_authoritative_validation");
        expect((await packVisibility(tx,commercialId,"qa")).packs).toHaveLength(0);
        const visibility = await packVisibility(tx,tenantId,"qa");
        const referenceVersionId = [...visibility.globalControlVersionIds][0];
        if (!referenceVersionId) throw new Error("AUTHORIZED_REFERENCE_CONTROL_REQUIRED");
        const instantiate = mutations.get("controlInstantiate")!;
        const controlActor: CoreActor = { ...coreActor,roles:["CONTROL_OWNER"],
          permissions:new Set([instantiate.permission]),
          permissionScopes:new Map([[instantiate.permission,new Set(["tenant" as const])]]),
          capabilityGroups:new Set([instantiate.capability]) };
        const controlReader: CoreActor = { ...controlActor,
          permissions:new Set([resources.control.permission]),
          permissionScopes:new Map([[resources.control.permission,new Set(["tenant" as const])]]) };
        const referenceControl = await sql<{ control_id: string }>`SELECT control_id FROM controls.control_versions
          WHERE control_version_id=${referenceVersionId}::uuid`.execute(tx);
        const referenceControlId = referenceControl.rows[0]?.control_id;
        if (!referenceControlId) throw new Error("REFERENCE_CONTROL_ID_REQUIRED");
        const visibleReference = await detailResource(tx,controlReader,resources.control,referenceControlId);
        expect((visibleReference.normative_relations as Array<{access_mode:string}>).every((relation) =>
          relation.access_mode === "non_authoritative_validation")).toBe(true);
        expect((visibleReference.crosswalk_relations as Array<{ source_framework_version_id:string; target_framework_version_id:string }>).every((relation) =>
          visibility.frameworkVersionIds.has(relation.source_framework_version_id) &&
          visibility.frameworkVersionIds.has(relation.target_framework_version_id))).toBe(true);
        const controlBody = { based_on_control_version_id:referenceVersionId,
          control_code:`QA-${tenantId.slice(-12)}`,name:"Local QA Control",
          business_owner_subject_id:created.result.subject_id,objective:"Validate exact provisional lineage",
          control_type:"preventive",nature:"manual",frequency_code:"annual",
          execution_method:"inspection",verification_method:"review",minimum_evidence:"reviewed evidence" };
        await expect(executeMutation(tx,controlActor,instantiate,{body:{...controlBody,based_on_control_version_id:newUuidV7()},
          idempotencyKey:newUuidV7(),correlationId:newUuidV7()})).rejects.toMatchObject({code:"TCDX.RESOURCE.NOT_FOUND"});
        await expect(executeMutation(tx,{...controlActor,runtimeEnvironment:"production"},instantiate,{body:controlBody,
          idempotencyKey:newUuidV7(),correlationId:newUuidV7()})).rejects.toMatchObject({code:"TCDX.RESOURCE.NOT_FOUND"});
        const instantiated = await executeMutation(tx,controlActor,instantiate,{body:controlBody,
          idempotencyKey:newUuidV7(),correlationId:newUuidV7()});
        const tenantControlId = instantiated.response.control_id as string;
        const requirement = await sql<{ requirement_id: string }>`SELECT requirement_id FROM regulatory.requirements
          WHERE framework_version_id=ANY(${[...visibility.frameworkVersionIds]}::uuid[]) LIMIT 1`.execute(tx);
        const requirementId = requirement.rows[0]?.requirement_id;
        if (!requirementId) throw new Error("AUTHORIZED_REQUIREMENT_REQUIRED");
        const applicability = mutations.get("applicabilityCreate")!;
        const applicabilityActor: CoreActor = { ...coreActor,roles:["COMPLIANCE_MANAGER"],
          permissions:new Set([applicability.permission]),
          permissionScopes:new Map([[applicability.permission,new Set(["tenant" as const])]]),
          capabilityGroups:new Set([applicability.capability]) };
        const applicabilityBody = { requirement_id:requirementId,scope_subject_id:created.result.subject_id,
          applicability_decision:"not_applicable",rationale:"Outside this tenant process",
          effective_from:new Date(Date.now()-60000).toISOString() };
        await expect(executeMutation(tx,applicabilityActor,applicability,{body:{...applicabilityBody,rationale:""},
          idempotencyKey:newUuidV7(),correlationId:newUuidV7()})).rejects.toMatchObject({code:"TCDX.VALIDATION.FAILED"});
        const assessed = await executeMutation(tx,applicabilityActor,applicability,{body:applicabilityBody,
          idempotencyKey:newUuidV7(),correlationId:newUuidV7()});
        const applicabilityId = assessed.response.requirement_applicability_id as string;
        const revoked = await validationAccessRevoke(tx,platformActor,{id:access.result.regulatory_pack_validation_access_id,
          body:{reason:"End of local validation"},expectedVersion:1,key:newUuidV7(),correlationId:newUuidV7()});
        expect(revoked.result.lifecycle_state).toBe("revoked");
        expect(await nonAuthoritativeValidationPacks(tx,tenantId,"qa")).toHaveLength(0);
        await expect(detailResource(tx,controlReader,resources.control,referenceControlId))
          .rejects.toMatchObject({code:"TCDX.RESOURCE.NOT_FOUND"});
        expect((await detailResource(tx,controlReader,resources.control,tenantControlId)).control_id).toBe(tenantControlId);
        await expect(executeMutation(tx,controlActor,instantiate,{body:{...controlBody,control_code:`QA-POST-${tenantId.slice(-10)}`},
          idempotencyKey:newUuidV7(),correlationId:newUuidV7()})).rejects.toMatchObject({code:"TCDX.RESOURCE.NOT_FOUND"});
        const preserved = await sql<{ controls: number; applicability: number }>`SELECT
          (SELECT count(*)::integer FROM controls.controls WHERE control_id=${tenantControlId}::uuid AND tenant_id=${tenantId}::uuid) AS controls,
          (SELECT count(*)::integer FROM regulatory.requirement_applicabilities WHERE requirement_applicability_id=${applicabilityId}::uuid
            AND tenant_id=${tenantId}::uuid) AS applicability`.execute(tx);
        expect(preserved.rows[0]).toEqual({controls:1,applicability:1});
        const historic = await sql<{ count: number }>`SELECT count(*)::integer AS count FROM platform.regulatory_pack_validation_accesses
          WHERE regulatory_pack_validation_access_id=${access.result.regulatory_pack_validation_access_id}::uuid`.execute(tx);
        expect(historic.rows[0]?.count).toBe(1);
        const expired = await validationAccessCreate(tx,platformActor,{body:{...accessBody,
          effective_from:new Date(Date.now()-172800000).toISOString(),
          effective_to:new Date(Date.now()-86400000).toISOString()
        },key:newUuidV7(),correlationId:newUuidV7(),runtimeEnvironment:"qa"});
        expect(expired.result.effective_state).toBe("expired");
        expect(await nonAuthoritativeValidationPacks(tx,tenantId,"qa")).toHaveLength(0);
        const future = await validationAccessCreate(tx,platformActor,{body:{...accessBody,
          effective_from:new Date(Date.now()+86400000).toISOString()
        },key:newUuidV7(),correlationId:newUuidV7(),runtimeEnvironment:"qa"});
        expect(future.result.effective_state).toBe("future");
        expect(await nonAuthoritativeValidationPacks(tx,tenantId,"qa")).toHaveLength(0);
        expect((await validationAccessRevoke(tx,platformActor,{id:future.result.regulatory_pack_validation_access_id,
          body:{reason:"Cancel before start"},expectedVersion:1,key:newUuidV7(),correlationId:newUuidV7()})).result.lifecycle_state).toBe("revoked");
        const dates = await sql<{ pack_code: string; effective_from: Date | null; effective_to: Date | null }>`
          SELECT p.pack_code,pv.effective_from,pv.effective_to FROM regulatory.regulatory_pack_versions pv
          JOIN regulatory.regulatory_packs p ON p.regulatory_pack_id=pv.regulatory_pack_id
          WHERE p.pack_code IN ('ISO_9001_2015','CL_LEY_21719')`.execute(tx);
        expect(dates.rows.find((row) => row.pack_code === "ISO_9001_2015")?.effective_to?.toISOString().slice(0,10)).toBe("2026-09-16");
        expect(dates.rows.find((row) => row.pack_code === "CL_LEY_21719")?.effective_from?.toISOString().slice(0,10)).toBe("2026-12-01");
        completed=true;
        throw rollback;
      });
    } catch (error) { if (error !== rollback) throw error; }
    finally { await database.destroy(); }
    expect(completed).toBe(true);
  });
});
