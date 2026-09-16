import type { NormalizedRegulatoryPack } from "./model.js";

export type PersistedRegulatoryPack = {
  regulatoryPackVersionId: string;
  frameworkVersionId: string;
  importChecksum: string;
  contentHash: string;
  lifecycleState: "draft" | "review" | "approved" | "published";
};

export interface RegulatoryPackTransaction {
  findImport(packCode: string, importChecksum: string): Promise<PersistedRegulatoryPack | null>;
  findVersion(packCode: string, versionNumber: number): Promise<PersistedRegulatoryPack | null>;
  persist(pack: NormalizedRegulatoryPack): Promise<PersistedRegulatoryPack>;
  publish(command: {
    regulatoryPackVersionId: string;
    actorUserIdentityId: string;
    approvalRefs: ReadonlyArray<string>;
    correlationId: string;
    idempotencyKey: string;
    requestHash: string;
  }): Promise<void>;
}

export interface RegulatoryPackRepository {
  transaction<T>(work: (transaction: RegulatoryPackTransaction) => Promise<T>): Promise<T>;
}
