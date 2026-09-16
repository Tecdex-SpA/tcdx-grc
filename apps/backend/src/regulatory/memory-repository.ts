import { newUuidV7 } from "../uuid.js";
import type { NormalizedRegulatoryPack } from "./model.js";
import type { PersistedRegulatoryPack, RegulatoryPackRepository, RegulatoryPackTransaction } from "./repository.js";

type State = { imports: Map<string, PersistedRegulatoryPack>; versions: Map<string, PersistedRegulatoryPack> };

export class MemoryRegulatoryPackRepository implements RegulatoryPackRepository {
  private state: State = { imports: new Map(), versions: new Map() };
  failNextPersist = false;

  async transaction<T>(work: (transaction: RegulatoryPackTransaction) => Promise<T>): Promise<T> {
    const staged: State = { imports: new Map(this.state.imports), versions: new Map(this.state.versions) };
    const transaction: RegulatoryPackTransaction = {
      findImport: async (packCode, checksum) => staged.imports.get(`${packCode}:${checksum}`) ?? null,
      findVersion: async (packCode, versionNumber) => staged.versions.get(`${packCode}:${versionNumber}`) ?? null,
      persist: async (pack: NormalizedRegulatoryPack) => {
        if (this.failNextPersist) {
          this.failNextPersist = false;
          throw new Error("injected persistence failure");
        }
        const persisted: PersistedRegulatoryPack = {
          regulatoryPackVersionId: newUuidV7(),
          frameworkVersionId: newUuidV7(),
          importChecksum: pack.importChecksum,
          contentHash: pack.contentHash,
          lifecycleState: pack.governance.authorityClass === "NON_AUTHORITATIVE_TEST_PACK" ? "draft" : "review"
        };
        staged.imports.set(`${pack.packCode}:${pack.importChecksum}`, persisted);
        staged.versions.set(`${pack.packCode}:${pack.versionNumber}`, persisted);
        return persisted;
      },
      publish: async (command) => {
        for (const [key, value] of staged.versions) {
          if (value.regulatoryPackVersionId === command.regulatoryPackVersionId) staged.versions.set(key, { ...value, lifecycleState: "published" });
        }
      }
    };
    const result = await work(transaction);
    this.state = staged;
    return result;
  }
}
