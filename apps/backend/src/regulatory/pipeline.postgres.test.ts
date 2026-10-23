import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Kysely, PostgresDialect, sql } from 'kysely';
import pg from 'pg';
import type { FoundationDatabase } from '../database.js';
import { newUuidV7 } from '../uuid.js';
import { REGULATORY_PACK_CODES, type RegulatoryPackCode, type RegulatoryPackImportInput } from './model.js';
import { PostgresRegulatoryPackRepository } from './postgres-repository.js';
import { RegulatoryPackPipeline } from './pipeline.js';
import { calculateImportChecksum } from './validator.js';
import { sha256 } from './hash.js';
import { NORMATIVE_LIBRARY } from '@tcdx-grc/contracts/normative-library';
import type { CoreActor } from '../core-grc/model.js';
import { loadMatrixPopulation } from '../normative-library/matrix-source.js';
import { parseMatrixQuery } from '../normative-library/matrices.js';
import { CanonicalKnowledgePolicy } from '../normative-library/knowledge-policy.js';
import { validationProvenanceCreate } from './validation-access.js';
import type { PlatformActor } from '../security/platform-authority.js';
import type { KnowledgeWrite } from '@tcdx-grc/contracts/normative-library';

// Every source, obligation, approval flag and identity below is a disposable test
// fixture. Nothing here is an actual regulatory source or an operational receipt.
describe.skipIf(process.env.TCDX_REGULATORY_PIPELINE_INTEGRATION !== 'true')('canonical regulatory import on isolated PostgreSQL 16', () => {
  let db: Kysely<FoundationDatabase>, pipeline: RegulatoryPackPipeline;
  const actor = newUuidV7();
  let version = 7000;
  const finalized = (input: RegulatoryPackImportInput) => ({ ...input, importChecksum: calculateImportChecksum(input) });
  function fixture(packCode: RegulatoryPackCode = 'CL_LEY_21663'): RegulatoryPackImportInput {
    const seed = newUuidV7(), law = packCode.startsWith('CL_LEY_'), officialOnlyFixture = packCode === 'CL_LEY_21719';
    return finalized({
      packCode, packName: 'Isolated synthetic source, never QA content', edition: 'fixture-' + seed,
      versionNumber: ++version, effectiveFrom: officialOnlyFixture ? '2026-12-01T00:00:00.000Z' : '2025-01-01T00:00:00Z',
      jurisdictionCode: law ? 'CL' : 'global', frameworkCode: packCode + '-' + seed, frameworkName: 'Synthetic framework',
      source: { sourceCode: seed, sourceType: law ? 'law' : 'standard',
        publisher: officialOnlyFixture ? 'Biblioteca del Congreso Nacional de Chile' : 'Synthetic test publisher',
        officialUri: 'https://example.invalid/fixture/' + seed, sourceChecksum: sha256(seed),
        licenseClassification: officialOnlyFixture ? 'fixture_public_law' : 'non_authoritative_test_pack',
        origin: officialOnlyFixture ? 'official_source' : 'received_preliminary_file', authorized: officialOnlyFixture, definitivePublication: true },
      governance: { authorityClass: officialOnlyFixture ? 'AUTHORIZED_NORMATIVE_SOURCE' : 'NON_AUTHORITATIVE_TEST_PACK',
        sourceRoles: [officialOnlyFixture ? 'authorized_normative_source' : 'test_data_source'], devDemoExecutionEligible: true,
        commercialPublicationEligible: false, certificationAssertionEligible: false,
        provenance: 'isolated-fixture:' + seed, contentScope: 'Synthetic test only', coverageScope: 'Declared fixture only' },
      importedByUserIdentityId: actor, importChecksum: '',
      units: [{ sourceLocator: seed + ':parent', parentSourceLocator: null, unitType: 'article', unitCode: '1', title: 'Synthetic parent',
        displayOrder: 1, contentLanguage: 'es', licensedContent: 'Synthetic parent', licensedContentRef: null,
        contentHash: sha256('Synthetic parent'), provenanceRef: 'fixture:' + seed, reviewed: false,
        effectiveFrom: '2025-02-01T00:00:00Z', effectiveTo: '2025-03-01T00:00:00Z' },
      { sourceLocator: seed + ':child', parentSourceLocator: seed + ':parent', unitType: 'paragraph', unitCode: 'a', title: 'Synthetic child',
        displayOrder: 1, contentLanguage: 'es', licensedContent: null, licensedContentRef: 'fixture://' + seed + '/child',
        contentHash: sha256('Synthetic child'), provenanceRef: 'fixture:' + seed, reviewed: false }],
      requirements: [{ sourceLocator: seed + ':statement', normativeUnitSourceLocator: seed + ':child', requirementCode: 'FIX-' + seed,
        statementOrdinal: 1, requirementKind: law ? 'legal_obligation' : 'shall', contentLanguage: 'es',
        licensedStatement: 'Synthetic obligation, not normative content', licensedContentRef: null,
        contentHash: sha256('Synthetic obligation, not normative content'), isMandatory: false,
        applicabilityGuidance: 'Tenant decision required', evidenceExpectations: null, provenanceRef: 'fixture:' + seed, reviewed: false,
        effectiveFrom: '2025-04-01T00:00:00Z', effectiveTo: null }],
      controls: [{ controlCode: 'FIX-' + seed, versionNumber: 7, name: 'Synthetic control',
        origin: ['ISO_IEC_27001_2022', 'ISO_IEC_42001_2023'].includes(packCode) ? 'regulatory_reference' : 'tcdx_baseline',
        objective: 'Synthetic objective', controlType: 'detective', nature: 'manual', frequencyCode: 'annual',
        executionMethod: 'Fixture', verificationMethod: 'Fixture', minimumEvidence: 'Fixture', suggestedOwnerRoleCode: null, reviewed: false }],
      requirementControlMappings: [{ requirementCode: 'FIX-' + seed, controlCode: 'FIX-' + seed, mappingType: 'supports',
        coverageContribution: null, rationale: 'Synthetic relation', provenanceRef: 'fixture:' + seed, reviewed: false }],
      normativeUnitControlMappings: [{ normativeUnitSourceLocator: seed + ':child', controlCode: 'FIX-' + seed,
        sourceLocator: seed + ':location', rationale: 'Synthetic location', provenanceRef: 'fixture:' + seed, reviewed: false }],
      crosswalks: [], coverageExpected: { normativeUnits: 2, requirements: 1, referenceControls: 1, editorialMappings: 1, complianceMappings: 1 }, approvals: []
    });
  }
  function crosswalk(source: RegulatoryPackImportInput, target: RegulatoryPackImportInput) {
    return {
      versionNumber: 3, targetFrameworkCode: target.frameworkCode, targetEdition: target.edition,
      direction: 'source_to_target' as const, provenanceRef: 'fixture:crosswalk', reviewed: false,
      mappings: (['normative_unit', 'requirement', 'control'] as const).map((objectType, index) => ({
        objectType, sourceCode: objectType === 'normative_unit' ? source.units[0]!.sourceLocator
          : objectType === 'requirement' ? source.requirements[0]!.requirementCode! : source.controls[0]!.controlCode,
        targetCode: objectType === 'normative_unit' ? target.units[0]!.sourceLocator
          : objectType === 'requirement' ? target.requirements[0]!.requirementCode! : target.controls[0]!.controlCode,
        relationshipType: 'overlaps' as const, rationale: 'Synthetic partial relation, not homologated',
        confidence: 0.5, reviewed: false, provenanceRef: 'fixture:relation:' + index, versionNumber: 4,
        effectiveFrom: '2025-05-01T00:00:00Z', effectiveTo: '2025-06-01T00:00:00Z'
      }))
    };
  }
  const counts = async () => (await sql<{ imports: string; units: string; versions: string; requirements: string; controls: string; crosswalks: string }>`SELECT
    (SELECT count(*) FROM regulatory.regulatory_pack_versions) versions,
    (SELECT count(*) FROM regulatory.regulatory_import_manifests) imports,
    (SELECT count(*) FROM regulatory.normative_units) units,
    (SELECT count(*) FROM regulatory.requirements) requirements,
    (SELECT count(*) FROM controls.control_versions) controls,
    (SELECT count(*) FROM regulatory.framework_crosswalks) crosswalks`.execute(db)).rows[0];
  beforeAll(async () => {
    if (process.env.DATABASE_HOST !== '127.0.0.1' || process.env.TCDX_ISOLATED_REBUILD !== 'true'
      || !process.env.TCDX_REGULATORY_TEST_CLUSTER?.startsWith('/private/tmp/tcdx-regulatory-pipeline.')) throw Error('TASK_OWNED_CLUSTER_REQUIRED');
    db = new Kysely<FoundationDatabase>({ dialect: new PostgresDialect({ pool: new pg.Pool({ host: '127.0.0.1',
      port: Number(process.env.DATABASE_PORT), database: 'tcdx-grc', user: process.env.DATABASE_USER, ssl: false, max: 8 }) }) });
    const identity = (await sql<{ directory: string; major: number }>`SELECT current_setting('data_directory') directory,
      current_setting('server_version_num')::int / 10000 major`.execute(db)).rows[0];
    expect(identity).toEqual({ directory: process.env.TCDX_REGULATORY_TEST_CLUSTER, major: 16 });
    await sql`INSERT INTO iam.user_identities(user_identity_id,identity_key,display_name,lifecycle_state)
      VALUES (${actor}::uuid,${actor},'Synthetic test actor','active')`.execute(db);
    pipeline = new RegulatoryPackPipeline(new PostgresRegulatoryPackRepository(db));
  });
  afterAll(async () => { await db?.destroy(); });

  it('materializes all six codes with canonical typed objects, without approving or publishing any fixture', async () => {
    for (const code of REGULATORY_PACK_CODES) {
      const input = fixture(code), imported = await pipeline.import(input);
      expect(imported.coverage.coveragePercent).toBe(0);
      expect(imported.candidateState).not.toBe('CANDIDATE_READY_FOR_HUMAN_REVIEW');
      const row = (await sql<{ state: string; approval: string | null; jurisdiction: string | null }>`SELECT pv.lifecycle_state state,
        cm.approved_by_user_identity_id approval,p.jurisdiction_code jurisdiction FROM regulatory.regulatory_pack_versions pv
        JOIN regulatory.regulatory_packs p USING(regulatory_pack_id)
        JOIN regulatory.regulatory_coverage_manifests cm USING(regulatory_pack_version_id)
        WHERE pv.regulatory_pack_version_id=${imported.regulatoryPackVersionId}::uuid`.execute(db)).rows[0]!;
      expect(row.state).not.toBe('published'); expect(row.approval).toBeNull();
      expect(row.jurisdiction).toBe(code.startsWith('CL_LEY_') ? 'CL' : 'global');
    }
  });
  it('preserves disposition-specific intervals and absence without copying the pack date', async () => {
    const input = fixture(), imported = await pipeline.import(input);
    const units = (await sql<{ code: string; start: string | null; end: string | null }>`SELECT unit_code code,
      to_char(effective_from AT TIME ZONE 'UTC','YYYY-MM-DD') start,to_char(effective_to AT TIME ZONE 'UTC','YYYY-MM-DD') "end"
      FROM regulatory.normative_units WHERE framework_version_id=${imported.frameworkVersionId}::uuid ORDER BY unit_code`.execute(db)).rows;
    expect(units).toEqual([{ code: '1', start: '2025-02-01', end: '2025-03-01' }, { code: 'a', start: null, end: null }]);
    const requirement = (await sql<{ start: string }>`SELECT to_char(effective_from AT TIME ZONE 'UTC','YYYY-MM-DD') start
      FROM regulatory.requirements WHERE framework_version_id=${imported.frameworkVersionId}::uuid`.execute(db)).rows[0];
    expect(requirement?.start).toBe('2025-04-01');
  });
  it('serializes first import and concurrent retry without duplicate manifests or objects', async () => {
    const input = fixture(), before = await counts();
    const results = await Promise.all([pipeline.import(input), pipeline.import(input)]);
    expect(results.filter(result => result.replayed)).toHaveLength(1);
    expect(results[0]!.regulatoryPackVersionId).toBe(results[1]!.regulatoryPackVersionId);
    const after = await counts(); expect(Number(after!.imports) - Number(before!.imports)).toBe(1);
    expect(Number(after!.units) - Number(before!.units)).toBe(2);
  });
  it('persists three typed crosswalks with source provenance, independent versions, intervals and draft state', async () => {
    const target = fixture(), source = fixture(); await pipeline.import(target);
    source.crosswalks = [crosswalk(source, target)]; await pipeline.import(finalized(source));
    const relations = (await sql<{ provenance_ref: string }>`SELECT direction,provenance_ref,mapping_version_number,mapping_status,effective_from,effective_to FROM regulatory.normative_unit_crosswalk_mappings
      UNION ALL SELECT direction,provenance_ref,mapping_version_number,mapping_status,effective_from,effective_to FROM regulatory.requirement_crosswalk_mappings
      UNION ALL SELECT direction,provenance_ref,mapping_version_number,mapping_status,effective_from,effective_to FROM regulatory.control_crosswalk_mappings`.execute(db)).rows;
    expect(relations).toHaveLength(3);
    for (const row of relations) expect(row).toMatchObject({ direction: 'source_to_target', mapping_version_number: '4', mapping_status: 'draft',
      effective_from: new Date('2025-05-01T00:00:00Z'), effective_to: new Date('2025-06-01T00:00:00Z') });
    expect(new Set(relations.map(row => row.provenance_ref))).toEqual(new Set(['fixture:relation:0','fixture:relation:1','fixture:relation:2']));
  });
  it('retains no_match with null target and source evidence, without a fabricated destination', async () => {
    const source = fixture(), target = fixture(); await pipeline.import(target);
    source.crosswalks = [{ ...crosswalk(source,target), mappings: crosswalk(source,target).mappings.map(mapping => ({ ...mapping, relationshipType: 'no_match', targetCode: null })) }];
    await pipeline.import(finalized(source));
    const rows = (await sql`SELECT target_normative_unit_id FROM regulatory.normative_unit_crosswalk_mappings WHERE relationship_type='no_match'`.execute(db)).rows;
    expect(rows).toEqual([{ target_normative_unit_id: null }]);
  });
  it('rejects an ambiguous target edition and atomically rolls back all imported objects', async () => {
    const target = fixture(), imported = await pipeline.import(target), source = fixture();
    await sql`INSERT INTO regulatory.framework_versions(framework_version_id,ownership_class,framework_id,version_number,edition,lifecycle_state,content_hash)
      SELECT ${newUuidV7()}::uuid,'GLOBAL_REFERENCE',framework_id,version_number+1,edition,'draft',content_hash
      FROM regulatory.framework_versions WHERE framework_version_id=${imported.frameworkVersionId}::uuid`.execute(db);
    source.crosswalks = [crosswalk(source,target)]; const before = await counts();
    await expect(pipeline.import(finalized(source))).rejects.toMatchObject({ code: 'TCDX.REGULATORY.CROSSWALK_TARGET_MISSING' });
    expect(await counts()).toEqual(before);
  });
  it('cannot use a tenant-owned framework as the target of a global import', async () => {
    const source = fixture(), privateCode = newUuidV7(), tenant = newUuidV7(), framework = newUuidV7();
    await sql`INSERT INTO platform.tenants(tenant_id,tenant_code,legal_name,display_name,default_timezone)
      VALUES (${tenant}::uuid,${tenant},'Synthetic tenant','Synthetic tenant','UTC')`.execute(db);
    await sql`INSERT INTO regulatory.frameworks(framework_id,ownership_class,tenant_id,framework_code,name,source_type,lifecycle_state)
      VALUES (${framework}::uuid,'TENANT_OWNED',${tenant}::uuid,${privateCode},'Private fixture','law','draft')`.execute(db);
    await sql`INSERT INTO regulatory.framework_versions(framework_version_id,ownership_class,tenant_id,framework_id,version_number,edition,lifecycle_state,content_hash)
      VALUES (${newUuidV7()}::uuid,'TENANT_OWNED',${tenant}::uuid,${framework}::uuid,1,'private','draft',${sha256('private')})`.execute(db);
    source.crosswalks = [{ ...crosswalk(source,source), targetFrameworkCode: privateCode, targetEdition: 'private' }];
    const before = await counts();
    await expect(pipeline.import(finalized(source))).rejects.toMatchObject({ code: 'TCDX.REGULATORY.CROSSWALK_TARGET_MISSING' });
    expect(await counts()).toEqual(before);
  });
  it('rejects changed source metadata in another version without rewriting the shared source', async () => {
    const first = fixture(); await pipeline.import(first);
    const changed = fixture(); changed.source = { ...first.source, publisher: 'Changed source identity' };
    const before = await counts();
    await expect(pipeline.import(finalized(changed))).rejects.toMatchObject({ code: 'TCDX.REGULATORY.SOURCE_DRIFT' });
    expect(await counts()).toEqual(before);
    const row = (await sql<{ publisher: string }>`SELECT publisher FROM regulatory.regulatory_sources WHERE source_code=${first.source.sourceCode}`.execute(db)).rows[0];
    expect(row?.publisher).toBe(first.source.publisher);
  });
  it('reuses an exact control version without mutations, supports an explicit successor, and rejects rewriting old content', async () => {
    const first = fixture(); await pipeline.import(first);
    const snapshot = async () => (await sql<{ body: unknown }>`SELECT to_jsonb(cv) body FROM controls.control_versions cv
      JOIN controls.controls c USING(control_id) WHERE c.control_code=${first.controls[0]!.controlCode} AND cv.version_number=7`.execute(db)).rows[0]!.body;
    const original = await snapshot(), reused = fixture(); reused.controls = first.controls;
    reused.requirementControlMappings = reused.requirementControlMappings.map(mapping => ({ ...mapping, controlCode: first.controls[0]!.controlCode }));
    reused.normativeUnitControlMappings = reused.normativeUnitControlMappings.map(mapping => ({ ...mapping, controlCode: first.controls[0]!.controlCode }));
    await pipeline.import(finalized(reused)); expect(await snapshot()).toEqual(original);
    const successor = { ...fixture(), controls: [{ ...first.controls[0]!, versionNumber: 8, objective: 'Synthetic successor' }],
      requirementControlMappings: [], normativeUnitControlMappings: [], coverageExpected: { normativeUnits: 2, requirements: 1, referenceControls: 1, editorialMappings: 0, complianceMappings: 0 } };
    await pipeline.import(finalized(successor)); expect(await snapshot()).toEqual(original);
    const changed = { ...successor, versionNumber: ++version, controls: [{ ...first.controls[0]!, objective: 'Invalid rewrite' }] };
    const before = await counts();
    await expect(pipeline.import(finalized(changed))).rejects.toMatchObject({ code: 'TCDX.REGULATORY.SOURCE_DRIFT' });
    expect(await counts()).toEqual(before); expect(await snapshot()).toEqual(original);
  });
  it('reads imported typed relations through the actual matrix source and retains version, provenance and permission denial', async () => {
    const input = fixture(), imported = await pipeline.import(input);
    const descriptor = NORMATIVE_LIBRARY.matrices.types.find(item => item.matrix_type === 'requirements_controls')!;
    const permissions = ['reporting.matrix.read', ...descriptor.required_source_permissions];
    const matrixActor: CoreActor = { tenantId: newUuidV7(), membershipId: newUuidV7(), userIdentityId: actor, runtimeEnvironment: 'test',
      permissions: new Set(permissions), scopes: new Set(['tenant']),
      permissionScopes: new Map(permissions.map(permission => [permission, new Set(['tenant' as const])])),
      capabilityGroups: new Set(['CORE_PLATFORM', ...descriptor.required_source_permissions.map(permission =>
        (NORMATIVE_LIBRARY.sourceCapabilities as Record<string,string>)[permission]!)]), roles: ['GRC_MANAGER'] };
    const query = parseMatrixQuery('requirements_controls', { source_framework_version_id: imported.frameworkVersionId, as_of: '2025-05-01T00:00:00Z' }, []);
    await db.transaction().setIsolationLevel('repeatable read').execute(async tx => {
      await sql`SET TRANSACTION READ ONLY`.execute(tx);
      const population = await loadMatrixPopulation(tx,matrixActor,query);
      expect(population.rows).toHaveLength(1); expect(population.columns).toHaveLength(1); expect(population.cells).toHaveLength(1);
      expect(population.rows[0]!.code).toBe(input.requirements[0]!.requirementCode);
      expect(population.columns[0]!.label).toBe(input.controls[0]!.controlCode + ' · v7');
      expect(population.cells[0]).toMatchObject({ relationship_type: 'supports', provenance_ref: input.requirementControlMappings[0]!.provenanceRef,
        stored_result: null, source_lifecycle_state: 'draft' });
      await expect(loadMatrixPopulation(tx,{ ...matrixActor, permissions: new Set(), permissionScopes: new Map() },query))
        .rejects.toMatchObject({ code: 'TCDX.AUTHORIZATION.DENIED' });
    });
  });
  it('resolves internal normative provenance from canonical PostgreSQL without H04 rows and preserves negative authorities',async()=>{
    const input=fixture(),imported=await pipeline.import(input);
    const platform:PlatformActor={identity:{principalClass:'HUMAN_INTERACTIVE',principalId:actor,tokenId:newUuidV7(),expiresAt:new Date(Date.now()+60000)},roles:['PLATFORM_ADMIN'],permissions:new Set(['knowledge.knowledge_item.read','platform.regulatory_pack_validation_access.create'])};
    const source=newUuidV7();
    await sql`INSERT INTO knowledge.knowledge_sources(knowledge_source_id,created_by_user_identity_id,ownership_class,source_code,name,source_kind,license_classification,lifecycle_state) VALUES(${source}::uuid,${actor}::uuid,'PLATFORM_CONTROL',${source},'Synthetic internal source','editorial','original','active')`.execute(db);
    const unit=(await sql<{normative_unit_id:string}>`SELECT normative_unit_id FROM regulatory.normative_units WHERE framework_version_id=${imported.frameworkVersionId}::uuid AND source_locator=${input.units[0]!.sourceLocator}`.execute(db)).rows[0]!;
    const body:KnowledgeWrite={content_language:'es',content:{comprender:{text:'Synthetic internal guidance',citations:[]},implementar:{text:'Synthetic steps',citations:[]},demostrar:{text:'Synthetic validation',citations:[]}},links:[{target:{normative_unit_id:unit.normative_unit_id},context_role:'comprender',source_locator:input.units[0]!.sourceLocator,provenance_ref:input.units[0]!.provenanceRef}],effective_from:new Date().toISOString(),rationale:'Isolated test, no actual rights or normative publication'};
    const parent={knowledge_item_id:newUuidV7(),knowledge_source_id:source,ownership_class:'PLATFORM_CONTROL' as const,tenant_id:null,license_classification:'original'};
    let evidenceCalls=0;const evidence={verify:async()=>{evidenceCalls++;throw Error('Internal work must not require a fabricated attestation');}};
    const before=(await sql<{n:number}>`SELECT count(*)::int AS n FROM knowledge.knowledge_source_usage_rights`.execute(db)).rows[0]!.n;
    await db.transaction().execute(async tx=>{
      // Missing persisted provenance is not inferred from the caller or input pack label.
      await expect(new CanonicalKnowledgePolicy('qa',evidence).assertWrite(tx,platform,parent,body,'create')).rejects.toMatchObject({statusCode:403});
      const manifests=await sql<{regulatory_import_manifest_id:string}>`SELECT regulatory_import_manifest_id FROM regulatory.regulatory_import_manifests WHERE regulatory_pack_version_id=${imported.regulatoryPackVersionId}::uuid AND import_checksum=${imported.importChecksum}`.execute(tx);
      expect(manifests.rows).toHaveLength(1);
      await validationProvenanceCreate(tx,platform,{key:newUuidV7(),correlationId:newUuidV7(),body:{regulatory_pack_version_id:imported.regulatoryPackVersionId,regulatory_import_manifest_id:manifests.rows[0]!.regulatory_import_manifest_id,source_role:'test_data_source',provenance_ref:input.units[0]!.provenanceRef}});
      for(const environment of ['development','test','qa'] as const)for(const phase of ['create','update','review','publish'] as const)await new CanonicalKnowledgePolicy(environment,evidence).assertWrite(tx,platform,parent,body,phase);
      await expect(new CanonicalKnowledgePolicy('production',evidence).assertWrite(tx,platform,parent,body,'create')).rejects.toMatchObject({statusCode:403});
      await expect(new CanonicalKnowledgePolicy('qa',evidence).assertWrite(tx,{...platform,permissions:new Set()},parent,body,'create')).rejects.toMatchObject({statusCode:403});
      await expect(new CanonicalKnowledgePolicy('qa',evidence).assertWrite(tx,platform,{...parent,ownership_class:'TENANT_OWNED',tenant_id:newUuidV7()},body,'create')).rejects.toMatchObject({statusCode:403});
      await expect(new CanonicalKnowledgePolicy('qa',evidence).assertWrite(tx,platform,parent,{...body,links:[{...body.links[0]!,target:{normative_unit_id:newUuidV7()}}]},'create')).rejects.toMatchObject({statusCode:404});
    });
    expect(evidenceCalls).toBe(0);
    expect((await sql<{n:number}>`SELECT count(*)::int AS n FROM knowledge.knowledge_source_usage_rights`.execute(db)).rows[0]!.n).toBe(before);
  });
});
