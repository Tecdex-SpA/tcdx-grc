import { createHash } from "node:crypto";
import type { VerifiedIdentity } from "./authentication.js";
import { ApplicationTokenService } from "./application-token.js";
import { FoundationError } from "../errors.js";
import { newUuidV7 } from "../uuid.js";

type Issued = { token: string; identity: VerifiedIdentity };
type Renewal = {
  issued: Issued;
  idleUntil: number;
  absoluteUntil: number;
  refresh: () => Promise<void>;
  pending?: Promise<string>;
};
const fingerprint = (token: string) => createHash("sha256").update(token).digest("hex");
const denied = () => new FoundationError("TCDX.AUTHENTICATION.INVALID", "Authentication failed", 401);

/** Provider refresh credentials remain in process memory, outside browser and GRC DB.
 * Missing state (including after restart) fails closed. No offline session is used.
 */
export class BrowserTokenRenewal {
  private readonly records = new Map<string, Renewal>();
  constructor(private readonly tokens: ApplicationTokenService,
    private readonly policy: { idleSeconds: number; maxSeconds: number }) {}

  establish(issued: Issued, authenticatedAt: number, refresh: () => Promise<void>): void {
    const now = Date.now();
    for (const [key, record] of this.records) {
      if (Math.min(record.idleUntil, record.absoluteUntil) <= now) this.records.delete(key);
    }
    this.records.set(fingerprint(issued.token), { issued, refresh,
      idleUntil: now + this.policy.idleSeconds * 1000,
      absoluteUntil: authenticatedAt + this.policy.maxSeconds * 1000 });
  }

  async renew(token: string, audit: (issued: Issued) => Promise<void>): Promise<string> {
    const key = fingerprint(token);
    const record = this.records.get(key);
    if (!record) throw denied();
    if (record.pending) return record.pending;
    record.pending = this.rotate(key, record, audit);
    try { return await record.pending; }
    finally { delete record.pending; }
  }

  private async assertActive(record: Renewal): Promise<void> {
    if (Date.now() >= Math.min(record.idleUntil, record.absoluteUntil)
      || !await this.tokens.isUnrevokedForRenewal(record.issued.identity)) throw denied();
  }

  private async rotate(key: string, record: Renewal, audit: (issued: Issued) => Promise<void>): Promise<string> {
    let next: Issued | undefined;
    try {
      await this.assertActive(record);
      await record.refresh(); // Provider enforces enabled user, revocation, idle and absolute bounds.
      await this.assertActive(record);
      next = await this.tokens.issue(record.issued.identity.principalId, newUuidV7(), new Date(), new Date(record.absoluteUntil), true);
      await audit(next);
      // Revocation during provider, signing or audit work must win over renewal.
      await this.assertActive(record);
      await this.tokens.revoke(record.issued.identity);
      this.records.delete(key);
      record.issued = next;
      record.idleUntil = Date.now() + this.policy.idleSeconds * 1000;
      this.records.set(fingerprint(next.token), record);
      return next.token;
    } catch (error) {
      if (next) await this.tokens.revoke(next.identity);
      if (error instanceof FoundationError && error.statusCode === 401) {
        await this.tokens.revoke(record.issued.identity);
        this.records.delete(key);
      }
      throw error;
    }
  }
}
