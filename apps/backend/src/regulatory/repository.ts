import type { NormalizedRegulatoryPack } from "./model.js";

export type PersistedRegulatoryPack = {
  regulatoryPackVersionId: string;
  frameworkVersionId: string;
  importChecksum: string;
  contentHash: string;
  lifecycleState: "draft" | "review" | "approved" | "published";
};

export interface RegulatoryPackTransaction {
  lock(packCode: string): Promise<void>;
  findImport(packCode: string, importChecksum: string): Promise<PersistedRegulatoryPack | null>;
  findVersion(packCode: string, versionNumber: number): Promise<PersistedRegulatoryPack | null>;
  persist(pack: NormalizedRegulatoryPack): Promise<PersistedRegulatoryPack>;

}

export interface RegulatoryPackRepository {
  transaction<T>(work: (transaction: RegulatoryPackTransaction) => Promise<T>): Promise<T>;
}
