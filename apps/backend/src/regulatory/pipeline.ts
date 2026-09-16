import type { AuthorizationFacts } from "../security/authorization.js";
import { authorize } from "../security/authorization.js";
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
      if (existing?.contentHash !== undefined && existing.contentHash !== normalized.contentHash) {
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

  async publish(input: RegulatoryPackImportInput, command: {
    regulatoryPackVersionId: string;
    actorUserIdentityId: string;
    correlationId: string;
    idempotencyKey: string;
    requestHash: string;
  }, authorization: AuthorizationFacts): Promise<void> {
    authorize(authorization, { permission: "knowledge.regulatory_pack.publish", allowedScopes: new Set(["platform"]) });
    const normalized = validateAndNormalize(input);
    if (candidateState(input, normalized.coverage.coveragePercent) !== "CANDIDATE_READY_FOR_HUMAN_REVIEW") {
      throw new FoundationError("TCDX.REGULATORY.PUBLICATION_BLOCKED", "Regulatory pack has not satisfied source, coverage and approval guards", 409);
    }
    const publisher = input.approvals.find((approval) => approval.role === "GRC_MANAGER");
    if (publisher?.userIdentityId !== command.actorUserIdentityId) {
      throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "GRC Manager approval must match the publishing actor", 403);
    }
    await this.repository.transaction((transaction) => transaction.publish({
      regulatoryPackVersionId: command.regulatoryPackVersionId,
      actorUserIdentityId: command.actorUserIdentityId,
      approvalRefs: input.approvals.map((approval) => approval.approvalRef),
      correlationId: command.correlationId,
      idempotencyKey: command.idempotencyKey,
      requestHash: command.requestHash
    }));
  }
}
