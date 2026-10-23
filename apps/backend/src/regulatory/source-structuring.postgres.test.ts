import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Kysely, PostgresDialect, sql } from 'kysely';
import pg from 'pg';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash, generateKeyPairSync } from 'node:crypto';
import type { FoundationDatabase } from '../database.js';
import { UnavailableFileStoragePort } from '../ports/file-storage.js';
import { newUuidV7 } from '../uuid.js';
import { buildApp } from '../app.js';
import { ApplicationTokenService } from '../security/application-token.js';
import { publishRuntimeBindingData } from '../security/runtime-binding-publication.js';
import { composeNormativeLibrary } from '../normative-library/composition.js';
import { loadCatalogV11, materializeCatalogV11 } from './catalog-v1.1.js';
import { RegulatoryPackPipeline } from './pipeline.js';
import { PostgresRegulatoryPackRepository } from './postgres-repository.js';
import { calculateImportChecksum } from './validator.js';
import type { ImportResult, RegulatoryPackImportInput } from './model.js';

// Actual source locators/hashes, technical identities only. No rights receipt,
// operational approval, publication or external environment is exercised here.
describe.skipIf(process.env.TCDX_NORMATIVE_STRUCTURING_INTEGRATION !== 'true')('received-source preparation on task-owned PostgreSQL 16', () => {
  let db: Kysely<FoundationDatabase>, pipeline: RegulatoryPackPipeline;
  let app: ReturnType<typeof buildApp>, bearer: string;
  const actor = newUuidV7(), principal = newUuidV7();
  const inputs = new Map<string, RegulatoryPackImportInput>();
  const results = new Map<string, ImportResult>();
  const finalize = (input: RegulatoryPackImportInput) => ({ ...input, importChecksum: calculateImportChecksum(input) });
  const scalar = async (query: ReturnType<typeof sql<{ n: string }>>) => Number((await query.execute(db)).rows[0]!.n);
  const counts = async () => (await sql`SELECT
    (SELECT count(*) FROM regulatory.regulatory_pack_versions) versions,
    (SELECT count(*) FROM regulatory.normative_units) units,
    (SELECT count(*) FROM regulatory.requirements) requirements,
    (SELECT count(*) FROM regulatory.framework_crosswalks) crosswalks,
    (SELECT count(*) FROM controls.control_versions) controls,
    (SELECT count(*) FROM regulatory.regulatory_import_manifests) imports`.execute(db)).rows[0];
  beforeAll(async () => {
    if (process.env.DATABASE_HOST !== '127.0.0.1' || process.env.DATABASE_PORT !== '55561'
      || process.env.TCDX_ISOLATED_REBUILD !== 'true'
      || !process.env.TCDX_RUNTIME_BINDINGS_TEST_CLUSTER?.startsWith('/private/tmp/tcdx-runtime-bindings.')) throw Error('TASK_OWNED_PG16_REQUIRED');
    const directory = resolve(process.env.TCDX_SOURCE_PREPARATION_DIRECTORY ?? '');
    if (!directory.split('/').includes('.release-custody')) throw Error('EXPLICIT_PRIVATE_SOURCE_DIRECTORY_REQUIRED');
    db = new Kysely({ dialect: new PostgresDialect({ pool: new pg.Pool({ host: '127.0.0.1', port: 55561,
      database: 'tcdx-grc', user: process.env.DATABASE_USER, ssl: false, max: 8 }) }) });
    expect((await sql<{ directory: string; major: number }>`SELECT current_setting('data_directory') directory,
      current_setting('server_version_num')::int/10000 major`.execute(db)).rows[0])
      .toEqual({ directory: process.env.TCDX_RUNTIME_BINDINGS_TEST_CLUSTER, major: 16 });
    await sql`INSERT INTO iam.user_identities(user_identity_id,identity_key,display_name,lifecycle_state)
      VALUES(${actor}::uuid,${actor},'Synthetic local source importer','active')`.execute(db);
    // The existing v1.1 import preserves the historical candidates being compared.
    const client = new pg.Client({ host: '127.0.0.1', port: 55561, database: 'tcdx-grc', user: process.env.DATABASE_USER });
    await client.connect();
    try { await materializeCatalogV11(client, loadCatalogV11(resolve('data/regulatory/catalogs/tcdx-unified-compliance-control-catalog/v1.1')), actor); }
    finally { await client.end(); }
    pipeline = new RegulatoryPackPipeline(new PostgresRegulatoryPackRepository(db));
    const manifest = JSON.parse(readFileSync(join(directory, 'manifest.json'), 'utf8')) as Array<{pack_code: string; filename?: string; sha256?: string}>;
    for (const entry of manifest) {
      if (!entry.filename) continue;
      const bytes = readFileSync(join(directory, entry.filename));
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(entry.sha256);
      const input = finalize({ ...JSON.parse(bytes.toString('utf8')), importedByUserIdentityId: actor });
      inputs.set(entry.pack_code, input);
      results.set(entry.pack_code, await pipeline.import(input));
    }
    await sql`INSERT INTO iam.service_principals(service_principal_id,ownership_class,principal_code,display_name,principal_kind,lifecycle_state)
      VALUES(${principal}::uuid,'PLATFORM_CONTROL',${principal},'Synthetic local binding publisher','integration','active')`.execute(db);
    await db.transaction().execute(tx => publishRuntimeBindingData(tx, principal, newUuidV7(), []));
    await sql`INSERT INTO iam.platform_role_assignments(platform_role_assignment_id,ownership_class,user_identity_id,role_id,valid_from)
      SELECT ${newUuidV7()}::uuid,'PLATFORM_CONTROL',${actor}::uuid,role_id,statement_timestamp()-interval '1 second'
      FROM iam.roles WHERE role_code='REGULATORY_CONTENT_STEWARD' AND tenant_id IS NULL AND ownership_class='PLATFORM_CONTROL'`.execute(db);
    const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const tokens = await ApplicationTokenService.create({ issuer: 'https://isolated-structuring.test', audience: 'tcdx-grc-api',
      privateKey: keys.privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
      publicKey: keys.publicKey.export({ format: 'pem', type: 'spki' }).toString(), keyId: newUuidV7(),
      algorithm: 'RS256', maxLifetimeSeconds: 3600, clockToleranceSeconds: 0 });
    bearer = (await tokens.issue(actor, newUuidV7())).token;
    const custody = { prepare: async (): Promise<never> => { throw Error('No Knowledge writes in this fixture'); },
      read: async (): Promise<never> => { throw Error('No Knowledge reads in this fixture'); } };
    app = buildApp(async () => true, { database: db, identityVerifier: tokens, fileStorage: new UnavailableFileStoragePort(), runtimeEnvironment: 'test',
      normativeLibrary: composeNormativeLibrary({ database: db, rightsEvidence: { verify: async () => false }, environment: 'test', cursor: tokens, custody }) });
  }, 60000);
  afterAll(async () => { await app?.close(); await db?.destroy(); });

  it('persists five source-bound versions without inventing the sixth definitive source', async () => {
    expect(results.size).toBe(5);
    expect(inputs.has('ISO_9001_2026')).toBe(false);
    for (const [code, result] of results) {
      expect(result.coverage.coveragePercent).toBe(0);
      expect(result.replayed).toBe(false);
      expect(inputs.get(code)!.approvals).toEqual([]);
    }
    expect([...inputs.values()].reduce((n, p) => n + p.units.length, 0)).toBe(619);
    expect([...inputs.values()].reduce((n, p) => n + p.requirements.length, 0)).toBe(7);
  });
  it('preserves exact parents, source hashes and nullable disposition dates without storing source bodies', async () => {
    for (const [code, result] of results) {
      const rows = (await sql<{ source_locator: string; parent: string | null; content_hash: string; licensed_content: string | null; effective_from: Date | null }>`
        SELECT u.source_locator,p.source_locator parent,u.content_hash,u.licensed_content,u.effective_from
        FROM regulatory.normative_units u LEFT JOIN regulatory.normative_units p ON p.normative_unit_id=u.parent_normative_unit_id
        WHERE u.framework_version_id=${result.frameworkVersionId}::uuid`.execute(db)).rows;
      const expected = inputs.get(code)!.units;
      expect(rows).toHaveLength(expected.length);
      for (const unit of expected) expect(rows.find(r => r.source_locator === unit.sourceLocator)).toEqual({ source_locator: unit.sourceLocator,
        parent: unit.parentSourceLocator, content_hash: unit.contentHash, licensed_content: null, effective_from: null });
    }
  });
  it('keeps 55 permanent legal articles and six transitory articles separate from ISO clauses', async () => {
    const id = results.get('CL_LEY_21663')!.frameworkVersionId;
    expect(await scalar(sql`SELECT count(*)::text n FROM regulatory.normative_units WHERE framework_version_id=${id}::uuid AND unit_code ~ '^article-[0-9]+$'`)).toBe(55);
    expect(await scalar(sql`SELECT count(*)::text n FROM regulatory.normative_units WHERE framework_version_id=${id}::uuid AND unit_type='transitory_provision'`)).toBe(6);
    expect(await scalar(sql`SELECT count(*)::text n FROM regulatory.normative_units WHERE framework_version_id=${id}::uuid AND unit_type IN ('clause','subclause')`)).toBe(0);
  });
  it('preserves amending-law context and bis articles without inventing a consolidated Law19628 edition', async () => {
    const id = results.get('CL_LEY_21719')!.frameworkVersionId;
    const rows = (await sql<{ unit_code: string; parent: string }>`SELECT u.unit_code,p.unit_code parent FROM regulatory.normative_units u
      JOIN regulatory.normative_units p ON p.normative_unit_id=u.parent_normative_unit_id WHERE u.framework_version_id=${id}::uuid AND u.unit_code LIKE '%quoted-article-1-bis'`.execute(db)).rows;
    expect(rows).toEqual([{ unit_code: 'amending/primero/quoted-article-1-bis', parent: 'amending/primero' }]);
  });
  it('keeps Annex A controls distinct from modal Requirements and retains the historical control identities', async () => {
    for (const code of ['ISO_IEC_27001_2022', 'ISO_IEC_42001_2023']) {
      const id = results.get(code)!.frameworkVersionId;
      expect(await scalar(sql`SELECT count(*)::text n FROM regulatory.requirements r JOIN regulatory.normative_units u USING(normative_unit_id)
        WHERE r.framework_version_id=${id}::uuid AND u.unit_code LIKE 'A.%'`)).toBe(0);
      expect(await scalar(sql`SELECT count(*)::text n FROM regulatory.normative_unit_control_mappings m JOIN regulatory.normative_units u USING(normative_unit_id)
        WHERE u.framework_version_id=${id}::uuid`)).toBe(inputs.get(code)!.controls.length);
    }
    expect(await scalar(sql`SELECT count(*)::text n FROM controls.controls WHERE control_code IN ('ISO42001-REF-A.6.2','ISO42001-REF-A.6.1.2') AND tenant_id IS NULL`)).toBe(2);
  });
  it('resolves nine correction relations to the exact historical framework version instead of the same-edition successor', async () => {
    const id = results.get('ISO_IEC_42001_2023')!.frameworkVersionId;
    const rows = (await sql<{ version_number: number; relationship_type: string; lifecycle_state: string; confidence: string }>`
      SELECT target.version_number::integer,m.relationship_type,c.lifecycle_state,m.confidence::text
      FROM regulatory.framework_crosswalks c JOIN regulatory.framework_versions target ON target.framework_version_id=c.target_framework_version_id
      JOIN regulatory.control_crosswalk_mappings m USING(framework_crosswalk_id) WHERE c.source_framework_version_id=${id}::uuid`.execute(db)).rows;
    expect(rows).toHaveLength(9);
    for (const row of rows) { expect(row.version_number).toBe(1); expect(row.relationship_type).toBe('supersedes'); expect(row.lifecycle_state).toBe('draft'); expect(Number(row.confidence)).toBe(0); }
  });
  it('persists seven justified cross-framework proposals as draft, never as equivalent or homologated', async () => {
    const ids = [...results.values()].map(r => r.frameworkVersionId);
    const rows = (await sql<{ confidence: string; lifecycle_state: string; provenance_ref: string; relationship_type: string }>`
      SELECT m.confidence::text,c.lifecycle_state,m.provenance_ref,m.relationship_type FROM regulatory.normative_unit_crosswalk_mappings m
      JOIN regulatory.framework_crosswalks c USING(framework_crosswalk_id) WHERE c.source_framework_version_id=ANY(${ids}::uuid[])`.execute(db)).rows;
    expect(rows).toHaveLength(7);
    for (const row of rows) { expect(Number(row.confidence)).toBe(0); expect(row.lifecycle_state).toBe('draft'); expect(row.provenance_ref).toContain('source_fragment_sha256'); expect(row.relationship_type).not.toBe('equivalent'); }
  });
  it('binds the selected document-control requirement to record protection as partial support with no invented coverage', async () => {
    const id = results.get('ISO_IEC_27001_2022')!.frameworkVersionId;
    const rows = (await sql<{ control_code: string; mapping_type: string; coverage_contribution: string | null; lifecycle_state: string }>`
      SELECT c.control_code,m.mapping_type,m.coverage_contribution::text,m.lifecycle_state
      FROM regulatory.requirement_control_mappings m JOIN regulatory.requirements r USING(requirement_id)
      JOIN controls.control_versions v USING(control_version_id) JOIN controls.controls c USING(control_id)
      WHERE r.framework_version_id=${id}::uuid`.execute(db)).rows;
    expect(rows).toEqual([{ control_code: 'ISO27001-REF-A.5.33', mapping_type: 'supports', coverage_contribution: null, lifecycle_state: 'draft' }]);
  });
  it('replays exact inputs concurrently without duplicated rows', async () => {
    const before = await counts(), input = inputs.get('ISO_IEC_42001_2023')!;
    const replay = await Promise.all([pipeline.import(input), pipeline.import(input)]);
    expect(replay.every(result => result.replayed)).toBe(true);
    expect(await counts()).toEqual(before);
  });
  it('rolls back all writes when an edition without a version selector is ambiguous', async () => {
    const original = inputs.get('ISO_9001_2015')!;
    const bad = structuredClone(original);
    bad.versionNumber = 3;
    // Requirement codes are global canonical identities. This negative target
    // test writes units only, avoiding an unrelated duplicate identity rejection.
    bad.requirements = [];
    bad.requirementControlMappings = [];
    bad.coverageExpected = { ...bad.coverageExpected, requirements: 0 };
    const { targetVersionNumber: _version, ...unqualified } = inputs.get('ISO_IEC_42001_2023')!.crosswalks.find(c => c.targetFrameworkCode === 'ISO_IEC_42001_2023')!;
    bad.crosswalks = [{ ...unqualified, mappings: [] }];
    const before = await counts();
    await expect(pipeline.import(finalize(bad))).rejects.toMatchObject({ code: 'TCDX.REGULATORY.CROSSWALK_TARGET_MISSING' });
    expect(await counts()).toEqual(before);
  });
  it('fails closed for a missing exact target version without falling back to another version', async () => {
    const bad = structuredClone(inputs.get('ISO_9001_2015')!);
    bad.versionNumber = 3;
    bad.requirements = [];
    bad.requirementControlMappings = [];
    bad.coverageExpected = { ...bad.coverageExpected, requirements: 0 };
    bad.crosswalks = bad.crosswalks.map(c => ({ ...c, targetVersionNumber: 999999 }));
    const before = await counts();
    await expect(pipeline.import(finalize(bad))).rejects.toMatchObject({ code: 'TCDX.REGULATORY.CROSSWALK_TARGET_MISSING' });
    expect(await counts()).toEqual(before);
  });
  it('rejects changed source content and leaves all persisted versions intact', async () => {
    const bad = structuredClone(inputs.get('CL_LEY_21663')!);
    bad.units = [{ ...bad.units[0]!, title: 'Changed source title' }, ...bad.units.slice(1)];
    const before = await counts();
    await expect(pipeline.import(finalize(bad))).rejects.toMatchObject({ code: 'TCDX.REGULATORY.SOURCE_DRIFT' });
    expect(await counts()).toEqual(before);
  });
  it('exposes source preparation through the existing authenticated metadata reader and rejects tenant authority', async () => {
    const id = results.get('ISO_IEC_42001_2023')!.regulatoryPackVersionId;
    const url = '/api/v1/platform/regulatory-pack-versions/' + id + '/publication';
    const authorized = await app.inject({ method: 'GET', url, headers: { authorization: 'Bearer ' + bearer } });
    expect(authorized.statusCode, authorized.body).toBe(200);
    expect((await app.inject({ method: 'GET', url })).statusCode).toBe(401);
    expect((await app.inject({ method: 'GET', url, headers: { authorization: 'Bearer ' + bearer, 'x-tcdx-tenant-id': newUuidV7() } })).statusCode).toBe(403);
    expect(await scalar(sql`SELECT count(*)::text n FROM regulatory.regulatory_pack_validation_receipts`)).toBe(0);
    expect(await scalar(sql`SELECT count(*)::text n FROM knowledge.knowledge_source_usage_rights`)).toBe(0);
    const ids = [...results.values()].map(r => r.regulatoryPackVersionId);
    const snapshot = (await sql`SELECT p.pack_code,v.regulatory_pack_version_id,v.version_number,v.edition,v.lifecycle_state,
      i.import_checksum,i.row_count,c.normative_units_imported,c.requirements_imported,c.reference_controls_imported,c.coverage_percent
      FROM regulatory.regulatory_pack_versions v JOIN regulatory.regulatory_packs p USING(regulatory_pack_id)
      JOIN regulatory.regulatory_import_manifests i USING(regulatory_pack_version_id)
      JOIN regulatory.regulatory_coverage_manifests c USING(regulatory_pack_version_id)
      WHERE v.regulatory_pack_version_id=ANY(${ids}::uuid[]) ORDER BY p.pack_code`.execute(db)).rows;
    writeFileSync(join(resolve(process.env.TCDX_SOURCE_PREPARATION_DIRECTORY!), '..', 'postgres-source-snapshot.json'),
      JSON.stringify({ scope: 'Actual disposable PostgreSQL query; identifiers are local technical fixtures only',
        persisted: snapshot, human_approvals: 0, rights_receipts_created: 0, publication_executed: false }, null, 2) + '\n');
  });
});
