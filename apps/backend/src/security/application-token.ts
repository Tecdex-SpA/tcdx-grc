import { createHash } from "node:crypto";
import { SignJWT, importPKCS8, importSPKI, jwtVerify } from "jose";
import { validate as validateUuid } from "uuid";
import type { BackendConfig } from "../config.js";
import { FoundationError } from "../errors.js";
import type { IdentityVerifier, VerifiedIdentity } from "./authentication.js";

export type ApplicationJwtConfig = Required<Omit<BackendConfig["applicationJwt"], "configured">>;

type Session = { principalId: string; expiresAt: Date; revoked: boolean };

export interface ApplicationSessionStore {
  register(tokenId: string, principalId: string, expiresAt: Date): Promise<void>;
  isActive(tokenId: string, principalId: string, now: Date): Promise<boolean>;
  revoke(tokenId: string, principalId: string): Promise<void>;
}

/**
 * Runtime-security state, deliberately outside the canonical GRC database.
 * A process restart invalidates every prior token because an unknown jti is DENY.
 */
export class FailClosedMemorySessionStore implements ApplicationSessionStore {
  private readonly sessions = new Map<string, Session>();

  async register(tokenId: string, principalId: string, expiresAt: Date): Promise<void> {
    this.sessions.set(tokenId, { principalId, expiresAt, revoked: false });
  }

  async isActive(tokenId: string, principalId: string, now: Date): Promise<boolean> {
    const session = this.sessions.get(tokenId);
    if (!session || session.revoked || session.principalId !== principalId || session.expiresAt <= now) return false;
    return true;
  }

  async revoke(tokenId: string, principalId: string): Promise<void> {
    const session = this.sessions.get(tokenId);
    if (!session || session.principalId !== principalId) throw authenticationFailure();
    session.revoked = true;
  }
}

function authenticationFailure(): FoundationError {
  return new FoundationError("TCDX.AUTHENTICATION.INVALID", "Authentication failed", 401);
}

export function tokenFingerprint(tokenId: string): string {
  return createHash("sha256").update(tokenId, "utf8").digest("hex");
}

export class ApplicationTokenService implements IdentityVerifier {
  private constructor(
    readonly config: ApplicationJwtConfig,
    private readonly privateKey: CryptoKey,
    private readonly publicKey: CryptoKey,
    private readonly sessions: ApplicationSessionStore
  ) {}

  static async create(config: ApplicationJwtConfig, sessions: ApplicationSessionStore = new FailClosedMemorySessionStore()): Promise<ApplicationTokenService> {
    const [privateKey, publicKey] = await Promise.all([
      importPKCS8(config.privateKey, config.algorithm),
      importSPKI(config.publicKey, config.algorithm)
    ]);
    const probe = await new SignJWT({ key_pair_probe: true })
      .setProtectedHeader({ alg: config.algorithm, kid: config.keyId })
      .setIssuer(config.issuer)
      .setAudience(config.audience)
      .setIssuedAt()
      .setExpirationTime("1m")
      .sign(privateKey);
    try {
      await jwtVerify(probe, publicKey, { issuer: config.issuer, audience: config.audience, algorithms: [config.algorithm] });
    } catch {
      throw new Error("Application JWT signing keys do not form a valid pair");
    }
    return new ApplicationTokenService(config, privateKey, publicKey, sessions);
  }

  async issue(principalId: string, tokenId: string, now = new Date()): Promise<{ token: string; identity: VerifiedIdentity }> {
    if (!validateUuid(principalId) || !validateUuid(tokenId)) throw authenticationFailure();
    const issuedAt = Math.floor(now.getTime() / 1_000);
    const expiresAt = new Date((issuedAt + this.config.maxLifetimeSeconds) * 1_000);
    const token = await new SignJWT({ principal_class: "HUMAN_INTERACTIVE" })
      .setProtectedHeader({ alg: this.config.algorithm, kid: this.config.keyId, typ: "at+jwt" })
      .setIssuer(this.config.issuer)
      .setAudience(this.config.audience)
      .setSubject(principalId)
      .setJti(tokenId)
      .setIssuedAt(issuedAt)
      .setNotBefore(issuedAt)
      .setExpirationTime(Math.floor(expiresAt.getTime() / 1_000))
      .sign(this.privateKey);
    await this.sessions.register(tokenId, principalId, expiresAt);
    return { token, identity: { principalClass: "HUMAN_INTERACTIVE", principalId, tokenId, expiresAt } };
  }

  async verifyBearerToken(token: string): Promise<VerifiedIdentity> {
    try {
      const { payload, protectedHeader } = await jwtVerify(token, this.publicKey, {
        issuer: this.config.issuer,
        audience: this.config.audience,
        algorithms: [this.config.algorithm],
        clockTolerance: this.config.clockToleranceSeconds,
        requiredClaims: ["iss", "aud", "sub", "jti", "iat", "exp", "nbf"]
      });
      if (protectedHeader.typ !== "at+jwt" || protectedHeader.kid !== this.config.keyId) throw authenticationFailure();
      if (payload.principal_class !== "HUMAN_INTERACTIVE" || !payload.sub || !payload.jti || payload.iat === undefined || payload.exp === undefined) {
        throw authenticationFailure();
      }
      if (!validateUuid(payload.sub) || !validateUuid(payload.jti)) throw authenticationFailure();
      const lifetime = payload.exp - payload.iat;
      if (lifetime <= 0 || lifetime > this.config.maxLifetimeSeconds) throw authenticationFailure();
      const expiresAt = new Date(payload.exp * 1_000);
      if (!await this.sessions.isActive(payload.jti, payload.sub, new Date())) throw authenticationFailure();
      return { principalClass: "HUMAN_INTERACTIVE", principalId: payload.sub, tokenId: payload.jti, expiresAt };
    } catch (error) {
      if (error instanceof FoundationError) throw error;
      throw authenticationFailure();
    }
  }

  async revoke(identity: VerifiedIdentity): Promise<void> {
    await this.sessions.revoke(identity.tokenId, identity.principalId);
  }
}
