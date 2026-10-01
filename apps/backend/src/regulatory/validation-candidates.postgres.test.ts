import { describe, expect, it } from "vitest";
import { loadConfig } from "../config.js";
import { createDatabase, sql } from "../database.js";
import { newUuidV7 } from "../uuid.js";
import { listValidationAccessCandidates } from "./validation-candidates.js";

const enabled = process.env.TCDX_PHASE5_LIFECYCLE_INTEGRATION === "true";
const rollback = Symbol("validation-candidates-rollback");
const at = "2026-09-29T12:00:00.000Z";

describe.skipIf(!enabled)("validation candidate physical authority in isolated PostgreSQL", () => {
  it("requires every exact provenance chain predicate and never crosses into commercial assignment", async () => {
    if (process.env.DATABASE_HOST !== "127.0.0.1" || process.env.DATABASE_PORT !== "55432" ||
        process.env.TCDX_ISOLATED_REBUILD !== "true") throw new Error("ISOLATED_POSTGRES_REQUIRED");
    const database = createDatabase(loadConfig(process.env));
    const identityId = newUuidV7();
    let completed = false;
    try {
      await database.transaction().execute(async (tx) => {
        await sql`INSERT INTO iam.user_identities (user_identity_id,identity_key,display_name,lifecycle_state)
          VALUES (${identityId}::uuid,${`candidate-test:${identityId}`},'Candidate test actor','active')`.execute(tx);
        const sources = await sql<{
          regulatory_pack_id: string; regulatory_pack_version_id: string; regulatory_import_manifest_id: string;
          regulatory_source_id: string; import_checksum: string; pack_code: string;
        }>`
          SELECT p.regulatory_pack_id,pv.regulatory_pack_version_id,im.regulatory_import_manifest_id,
                 im.regulatory_source_id,im.import_checksum,p.pack_code
            FROM regulatory.regulatory_packs p
            JOIN regulatory.regulatory_pack_versions pv ON pv.regulatory_pack_id=p.regulatory_pack_id
            JOIN regulatory.regulatory_import_manifests im ON im.regulatory_pack_version_id=pv.regulatory_pack_version_id
           WHERE p.pack_code IN ('ISO_IEC_27001_2022','ISO_IEC_42001_2023','ISO_9001_2026')
           ORDER BY p.pack_code
        `.execute(tx);
        if (sources.rows.length !== 3) throw new Error("LOCAL_CATALOG_V11_REQUIRED");
        const first = sources.rows.find((row) => row.pack_code === "ISO_IEC_27001_2022")!;
        const second = sources.rows.find((row) => row.pack_code === "ISO_IEC_42001_2023")!;
        const otherVersion = sources.rows.find((row) => row.pack_code === "ISO_9001_2026")!;
        const query = { "filter[effective_from]": at };
        const list = () => listValidationAccessCandidates(tx, query, "qa");
        const hasFirst = async () => (await list()).items.some((item) => item.regulatory_pack_version_id === first.regulatory_pack_version_id);
        const assignmentsBefore = await sql<{ count: string }>`SELECT count(*)::text AS count FROM platform.subscription_regulatory_packs`.execute(tx);
        expect(await hasFirst()).toBe(false); // no persisted provenance
        const provenanceId = newUuidV7();
        await sql`INSERT INTO regulatory.regulatory_pack_validation_provenances
          (regulatory_pack_validation_provenance_id,regulatory_pack_version_id,regulatory_import_manifest_id,
           regulatory_source_id,source_role,provenance_ref,source_checksum,created_by_user_identity_id)
          VALUES (${provenanceId}::uuid,${first.regulatory_pack_version_id}::uuid,
            ${first.regulatory_import_manifest_id}::uuid,${first.regulatory_source_id}::uuid,
            'provisional_supporting_reference','approved catalog provenance',${first.import_checksum},${identityId}::uuid)`.execute(tx);
        expect(await hasFirst()).toBe(true);
        const exact = (await list()).items.filter((item) => item.regulatory_pack_version_id === first.regulatory_pack_version_id);
        expect(exact).toHaveLength(1);
        expect(Object.keys(exact[0]!).sort()).toEqual([
          "authority_class", "edition", "license_classification", "name", "pack_code", "pack_state",
          "provenance_ref", "regulatory_pack_validation_provenance_id", "regulatory_pack_version_id",
          "source_role", "version_effective_from", "version_effective_to", "version_state"
        ]);

        // The authority class is physically closed; an invalid value cannot become a candidate.
        await sql`SAVEPOINT candidate_authority_check`.execute(tx);
        await expect(sql`UPDATE regulatory.regulatory_pack_validation_provenances SET authority_class='OFFICIAL'
          WHERE regulatory_pack_validation_provenance_id=${provenanceId}::uuid`.execute(tx)).rejects.toMatchObject({ code: "23514" });
        await sql`ROLLBACK TO SAVEPOINT candidate_authority_check`.execute(tx);
        await sql`RELEASE SAVEPOINT candidate_authority_check`.execute(tx);

        const exclusions: Array<[string, () => Promise<unknown>, () => Promise<unknown>]> = [
          ["disallowed source role", () => sql`UPDATE regulatory.regulatory_pack_validation_provenances SET source_role='official_metadata' WHERE regulatory_pack_validation_provenance_id=${provenanceId}::uuid`.execute(tx),
            () => sql`UPDATE regulatory.regulatory_pack_validation_provenances SET source_role='provisional_supporting_reference' WHERE regulatory_pack_validation_provenance_id=${provenanceId}::uuid`.execute(tx)],
          ["provenance/version mismatch", () => sql`UPDATE regulatory.regulatory_pack_validation_provenances SET regulatory_pack_version_id=${otherVersion.regulatory_pack_version_id}::uuid WHERE regulatory_pack_validation_provenance_id=${provenanceId}::uuid`.execute(tx),
            () => sql`UPDATE regulatory.regulatory_pack_validation_provenances SET regulatory_pack_version_id=${first.regulatory_pack_version_id}::uuid WHERE regulatory_pack_validation_provenance_id=${provenanceId}::uuid`.execute(tx)],
          ["manifest/version mismatch", () => sql`UPDATE regulatory.regulatory_pack_validation_provenances SET regulatory_import_manifest_id=${second.regulatory_import_manifest_id}::uuid WHERE regulatory_pack_validation_provenance_id=${provenanceId}::uuid`.execute(tx),
            () => sql`UPDATE regulatory.regulatory_pack_validation_provenances SET regulatory_import_manifest_id=${first.regulatory_import_manifest_id}::uuid WHERE regulatory_pack_validation_provenance_id=${provenanceId}::uuid`.execute(tx)],
          ["source mismatch", () => sql`UPDATE regulatory.regulatory_pack_validation_provenances SET regulatory_source_id=${second.regulatory_source_id}::uuid WHERE regulatory_pack_validation_provenance_id=${provenanceId}::uuid`.execute(tx),
            () => sql`UPDATE regulatory.regulatory_pack_validation_provenances SET regulatory_source_id=${first.regulatory_source_id}::uuid WHERE regulatory_pack_validation_provenance_id=${provenanceId}::uuid`.execute(tx)],
          ["checksum mismatch", () => sql`UPDATE regulatory.regulatory_pack_validation_provenances SET source_checksum=${"0".repeat(64)} WHERE regulatory_pack_validation_provenance_id=${provenanceId}::uuid`.execute(tx),
            () => sql`UPDATE regulatory.regulatory_pack_validation_provenances SET source_checksum=${first.import_checksum} WHERE regulatory_pack_validation_provenance_id=${provenanceId}::uuid`.execute(tx)],
          ["unaccepted manifest outcome", () => sql`UPDATE regulatory.regulatory_import_manifests SET outcome='rejected' WHERE regulatory_import_manifest_id=${first.regulatory_import_manifest_id}::uuid`.execute(tx),
            () => sql`UPDATE regulatory.regulatory_import_manifests SET outcome='validated' WHERE regulatory_import_manifest_id=${first.regulatory_import_manifest_id}::uuid`.execute(tx)],
          ["unaccepted source license", () => sql`UPDATE regulatory.regulatory_sources SET license_classification='PUBLIC_LAW' WHERE regulatory_source_id=${first.regulatory_source_id}::uuid`.execute(tx),
            () => sql`UPDATE regulatory.regulatory_sources SET license_classification='NOT_YET_LICENSED' WHERE regulatory_source_id=${first.regulatory_source_id}::uuid`.execute(tx)],
          ["unaccepted version license", () => sql`UPDATE regulatory.regulatory_pack_versions SET license_classification='PUBLIC_LAW' WHERE regulatory_pack_version_id=${first.regulatory_pack_version_id}::uuid`.execute(tx),
            () => sql`UPDATE regulatory.regulatory_pack_versions SET license_classification='NOT_YET_LICENSED' WHERE regulatory_pack_version_id=${first.regulatory_pack_version_id}::uuid`.execute(tx)],
          ["pack not draft", () => sql`UPDATE regulatory.regulatory_packs SET lifecycle_state='published' WHERE regulatory_pack_id=${first.regulatory_pack_id}::uuid`.execute(tx),
            () => sql`UPDATE regulatory.regulatory_packs SET lifecycle_state='draft' WHERE regulatory_pack_id=${first.regulatory_pack_id}::uuid`.execute(tx)],
          ["version not draft", () => sql`UPDATE regulatory.regulatory_pack_versions SET lifecycle_state='published' WHERE regulatory_pack_version_id=${first.regulatory_pack_version_id}::uuid`.execute(tx),
            () => sql`UPDATE regulatory.regulatory_pack_versions SET lifecycle_state='draft' WHERE regulatory_pack_version_id=${first.regulatory_pack_version_id}::uuid`.execute(tx)]
        ];
        for (const [label, breakAuthority, restore] of exclusions) {
          await breakAuthority();
          expect(await hasFirst(), label).toBe(false);
          await restore();
          expect(await hasFirst(), `${label} restored`).toBe(true);
        }

        expect((await listValidationAccessCandidates(tx,{"filter[effective_from]":"2022-10-24T23:59:59Z"},"qa")).items
          .some((item) => item.regulatory_pack_version_id === first.regulatory_pack_version_id)).toBe(false);
        await sql`UPDATE regulatory.regulatory_pack_versions SET effective_to=${at}::timestamptz
          WHERE regulatory_pack_version_id=${first.regulatory_pack_version_id}::uuid`.execute(tx);
        expect(await hasFirst()).toBe(false); // effective_to is exclusive
        await sql`UPDATE regulatory.regulatory_pack_versions SET effective_to=NULL
          WHERE regulatory_pack_version_id=${first.regulatory_pack_version_id}::uuid`.execute(tx);
        expect(await hasFirst()).toBe(true);
        await sql`UPDATE regulatory.regulatory_pack_versions SET effective_to='2026-09-29T12:00:00.000500Z'::timestamptz
          WHERE regulatory_pack_version_id=${first.regulatory_pack_version_id}::uuid`.execute(tx);
        expect((await listValidationAccessCandidates(tx,{"filter[effective_from]":"2026-09-29T12:00:00.000499Z"},"qa")).items
          .some((item) => item.regulatory_pack_version_id === first.regulatory_pack_version_id)).toBe(true);
        expect((await listValidationAccessCandidates(tx,{"filter[effective_from]":"2026-09-29T12:00:00.000500Z"},"qa")).items
          .some((item) => item.regulatory_pack_version_id === first.regulatory_pack_version_id)).toBe(false);
        await sql`UPDATE regulatory.regulatory_pack_versions SET effective_to=NULL
          WHERE regulatory_pack_version_id=${first.regulatory_pack_version_id}::uuid`.execute(tx);
        expect((await listValidationAccessCandidates(tx,{},"qa")).items
          .some((item) => item.regulatory_pack_version_id === first.regulatory_pack_version_id)).toBe(true);
        await expect(listValidationAccessCandidates(tx,{},"production")).rejects.toMatchObject({ code:"TCDX.AUTHORIZATION.DENIED" });

        const secondProvenanceId = newUuidV7();
        await sql`INSERT INTO regulatory.regulatory_pack_validation_provenances
          (regulatory_pack_validation_provenance_id,regulatory_pack_version_id,regulatory_import_manifest_id,
           regulatory_source_id,source_role,provenance_ref,source_checksum,created_by_user_identity_id)
          VALUES (${secondProvenanceId}::uuid,${second.regulatory_pack_version_id}::uuid,
            ${second.regulatory_import_manifest_id}::uuid,${second.regulatory_source_id}::uuid,
            'test_data_source','approved catalog provenance',${second.import_checksum},${identityId}::uuid)`.execute(tx);
        const firstPage = await listValidationAccessCandidates(tx,{...query,"page[size]":"1"},"qa");
        expect(firstPage.items).toHaveLength(1);
        expect(firstPage.page.has_more).toBe(true);
        const secondPage = await listValidationAccessCandidates(tx,{...query,"page[size]":"1",
          "page[cursor]":firstPage.page.next_cursor},"qa");
        expect(secondPage.items).toHaveLength(1);
        expect(secondPage.items[0]!.regulatory_pack_version_id).not.toBe(firstPage.items[0]!.regulatory_pack_version_id);
        expect(secondPage.page.has_more).toBe(false);
        await expect(listValidationAccessCandidates(tx,{...query,"page[cursor]":firstPage.page.next_cursor,
          "filter[effective_from]":"2026-09-30T12:00:00Z"},"qa"))
          .rejects.toMatchObject({code:"TCDX.VALIDATION.FAILED"});

        const commercial = await sql<{ regulatory_pack_version_id: string }>`
          SELECT pv.regulatory_pack_version_id FROM regulatory.regulatory_pack_versions pv
          JOIN regulatory.regulatory_packs p ON p.regulatory_pack_id=pv.regulatory_pack_id
          WHERE pv.lifecycle_state='published' AND p.lifecycle_state='published'
            AND (pv.effective_from IS NULL OR pv.effective_from<=transaction_timestamp())
            AND (pv.effective_to IS NULL OR pv.effective_to>transaction_timestamp())
        `.execute(tx);
        expect(commercial.rows.some((row) => row.regulatory_pack_version_id === first.regulatory_pack_version_id)).toBe(false);
        const assignmentsAfter = await sql<{ count: string }>`SELECT count(*)::text AS count FROM platform.subscription_regulatory_packs`.execute(tx);
        expect(assignmentsAfter.rows[0]?.count).toBe(assignmentsBefore.rows[0]?.count);
        completed = true;
        throw rollback;
      });
    } catch (error) { if (error !== rollback) throw error; }
    finally { await database.destroy(); }
    expect(completed).toBe(true);
  });
});
