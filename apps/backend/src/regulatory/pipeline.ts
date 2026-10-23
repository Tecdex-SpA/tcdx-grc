import { FoundationError } from "../errors.js";
import { assertRegulatoryAssertionAllowed, authorizeRegulatoryExecution, candidateState, validateAndNormalize } from "./validator.js";
import type { ImportResult, RegulatoryAssertionKind, RegulatoryExecutionContext, RegulatoryExecutionEnvelope, RegulatoryPackImportInput } from "./model.js";
import type { RegulatoryPackRepository } from "./repository.js";

export class RegulatoryPackPipeline {
  constructor(private readonly repository: RegulatoryPackRepository) {}

  async import(input: RegulatoryPackImportInput): Promise<ImportResult> {
    const normalized = validateAndNormalize(input);
    const state = candidateState(input, normalized.coverage.coveragePercent);
    return this.repository.transaction(async (transaction) => {
      await transaction.lock(input.packCode);
      const replay = await transaction.findImport(input.packCode, input.importChecksum);
      if (replay) return {
        packCode: input.packCode,
        regulatoryPackVersionId: replay.regulatoryPackVersionId,
        frameworkVersionId: replay.frameworkVersionId,
        importChecksum: replay.importChecksum,
        replayed: true,
        authorityClass: input.governance.authorityClass,
        candidateState: state,
        coverage: normalized.coverage
      };
      const existing = await transaction.findVersion(input.packCode, input.versionNumber);
      if (existing && (existing.contentHash !== normalized.contentHash || existing.importChecksum !== input.importChecksum)) {
        throw new FoundationError("TCDX.REGULATORY.SOURCE_DRIFT", "A regulatory version cannot be silently replaced", 409);
      }
      if (existing?.lifecycleState === "published") {
        throw new FoundationError("TCDX.REGULATORY.PUBLISHED_IMMUTABLE", "Published regulatory content is immutable", 409);
      }
      const persisted = await transaction.persist(normalized);
      return {
        packCode: input.packCode,
        regulatoryPackVersionId: persisted.regulatoryPackVersionId,
        frameworkVersionId: persisted.frameworkVersionId,
        importChecksum: persisted.importChecksum,
        replayed: false,
        authorityClass: input.governance.authorityClass,
        candidateState: state,
        coverage: normalized.coverage
      };
    });
  }

  authorizeExecution(input: RegulatoryPackImportInput, context: RegulatoryExecutionContext): RegulatoryExecutionEnvelope {
    return authorizeRegulatoryExecution(input, context);
  }

  authorizeResultAssertion(envelope: RegulatoryExecutionEnvelope, assertionKind: RegulatoryAssertionKind): void {
    assertRegulatoryAssertionAllowed(envelope, assertionKind);
  }

}
