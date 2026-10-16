import { createHash } from "node:crypto";
import { CompactSign, compactVerify, SignJWT, importPKCS8, importSPKI, jwtVerify, decodeJwt, createRemoteJWKSet, type JWTVerifyGetKey } from "jose";
import { validate as validateUuid } from "uuid";
import type { BackendConfig } from "../config.js";
import { FoundationError } from "../errors.js";
import type { IdentityVerifier, VerifiedIdentity } from "./authentication.js";

export type ApplicationJwtConfig = Required<Omit<BackendConfig["applicationJwt"], "configured">>;

export type MachineJwtProfile = {
  decision_id: string; environment: "qa"; issuer: string; client_id: string;
  principal_code: string; principal_kind: "MACHINE_TO_MACHINE"; display_name: string;
  ownership_class: "PLATFORM_CONTROL"; tenant_id: null; purpose: "STEP_6A3_IAM_PUBLICATION";
  audience: string; credential_ref: string; algorithms: ["RS256"];
  max_lifetime_seconds: number; clock_tolerance_seconds: number;
};
export type MachineIdentityProof = {
  issuerSha256: string; subjectSha256: string; clientId: string; tokenId: string; expiresAt: Date;
};
export type MachineJwtSupport = {
  profile: MachineJwtProfile;
  resolvePrincipal: (proof: MachineIdentityProof) => Promise<string>;
  keySet?: JWTVerifyGetKey;
};

type Session = { principalId: string; expiresAt: Date; revoked: boolean };

export interface ApplicationSessionStore {
  register(tokenId: string, principalId: string, expiresAt: Date): Promise<void>;
  isActive(tokenId: string, principalId: string, now: Date): Promise<boolean>;
  revoke(tokenId: string, principalId: string): Promise<void>;
  revokePrincipal(principalId: string): Promise<void>;
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

  async revokePrincipal(principalId: string): Promise<void> {
    for (const session of this.sessions.values()) if (session.principalId === principalId) session.revoked = true;
  }
}

function authenticationFailure(): FoundationError {
  return new FoundationError("TCDX.AUTHENTICATION.INVALID", "Authentication failed", 401);
}

export function tokenFingerprint(tokenId: string): string {
  return createHash("sha256").update(tokenId, "utf8").digest("hex");
}

export class ApplicationTokenService implements IdentityVerifier {
  private machine: (MachineJwtSupport & { keySet: JWTVerifyGetKey }) | undefined;
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
      // Unverified claims select a verifier only; every selected profile verifies the signature.
      if (decodeJwt(token).principal_class === "MACHINE_TO_MACHINE") {
        const proof = await this.verifyMachineProof(token);
        const principalId = await this.machine!.resolvePrincipal(proof);
        if (!validateUuid(principalId)) throw authenticationFailure();
        return { principalClass: "MACHINE_TO_MACHINE", principalId, tokenId: proof.tokenId, expiresAt: proof.expiresAt };
      }
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

  configureMachineProfile(support: MachineJwtSupport, environment: string): void {
    const p = support.profile;
    if (environment !== "qa" || p.environment !== "qa" || p.ownership_class !== "PLATFORM_CONTROL"
      || p.tenant_id !== null || p.principal_kind !== "MACHINE_TO_MACHINE" || p.purpose !== "STEP_6A3_IAM_PUBLICATION"
      || !p.decision_id || !/^[a-z][a-z0-9-]{0,159}$/.test(p.principal_code)
      || p.client_id !== p.principal_code || p.audience !== this.config.audience
      || new URL(p.issuer).protocol !== "https:" || new URL(p.issuer).search || new URL(p.issuer).hash
      || p.algorithms.length !== 1 || p.algorithms[0] !== "RS256"
      || !Number.isSafeInteger(p.max_lifetime_seconds) || p.max_lifetime_seconds <= 0 || p.max_lifetime_seconds > 300
      || !Number.isSafeInteger(p.clock_tolerance_seconds) || p.clock_tolerance_seconds < 0 || p.clock_tolerance_seconds > 5)
      throw new Error("INVALID_QA_MACHINE_PROFILE");
    this.machine = { ...support, keySet: support.keySet ?? createRemoteJWKSet(new URL(`${p.issuer}/protocol/openid-connect/certs`),
      { timeoutDuration: 8_000, cooldownDuration: 30_000 }) };
  }

  async verifyMachineProof(token: string): Promise<MachineIdentityProof> {
    try {
      if (!this.machine) throw authenticationFailure();
      const p = this.machine.profile;
      const { payload, protectedHeader } = await jwtVerify(token, this.machine.keySet, {
        issuer: p.issuer, audience: p.audience, algorithms: p.algorithms,
        clockTolerance: p.clock_tolerance_seconds, requiredClaims: ["iss", "aud", "sub", "jti", "iat", "exp"]
      });
      const now = Math.floor(Date.now() / 1000);
      const realmAccess = payload.realm_access as { roles?: unknown } | undefined;
      const resources = payload.resource_access as Record<string, { roles?: unknown }> | undefined;
      const adminRoles = resources?.["realm-management"]?.roles;
      const realmRoles = realmAccess?.roles;
      if (!["JWT", "at+jwt"].includes(protectedHeader.typ ?? "") || !protectedHeader.kid
        || payload.principal_class !== "MACHINE_TO_MACHINE" || payload.typ !== "Bearer"
        || payload.azp !== p.client_id || (payload.client_id !== undefined && payload.client_id !== p.client_id)
        || !payload.sub || payload.sub.length > 512 || !payload.jti || payload.jti.length > 512
        || typeof payload.iat !== "number" || typeof payload.exp !== "number"
        || !Number.isInteger(payload.iat) || !Number.isInteger(payload.exp)
        || payload.iat > now + p.clock_tolerance_seconds || payload.exp <= payload.iat
        || payload.exp - payload.iat > p.max_lifetime_seconds
        || (Array.isArray(adminRoles) && adminRoles.length > 0)
        || (Array.isArray(realmRoles) && realmRoles.some(role => role === "admin" || role === "realm-admin"))) throw authenticationFailure();
      return { issuerSha256: tokenFingerprint(p.issuer), subjectSha256: tokenFingerprint(payload.sub),
        clientId: p.client_id, tokenId: payload.jti, expiresAt: new Date(payload.exp * 1000) };
    } catch { throw authenticationFailure(); }
  }

  /** Fresh OAuth proof, acquired with the dedicated external credential, never a human exchange. */
  async authenticateMachine(clientSecret: string, fetcher: typeof fetch = fetch): Promise<MachineIdentityProof> {
    try {
      if (!this.machine || !clientSecret || /\s/.test(clientSecret)) throw authenticationFailure();
      const p = this.machine.profile;
      const response = await fetcher(`${p.issuer}/protocol/openid-connect/token`, {
        method: "POST", redirect: "error", signal: AbortSignal.timeout(8_000),
        headers: { authorization: `Basic ${Buffer.from(`${p.client_id}:${clientSecret}`).toString("base64")}`,
          "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
        body: new URLSearchParams({ grant_type: "client_credentials" })
      });
      if (!response.ok) throw authenticationFailure();
      const body = await response.json() as { access_token?: unknown; token_type?: unknown };
      if (typeof body.access_token !== "string" || body.token_type?.toString().toLowerCase() !== "bearer") throw authenticationFailure();
      return await this.verifyMachineProof(body.access_token);
    } catch { throw authenticationFailure(); }
  }

  async revoke(identity: VerifiedIdentity): Promise<void> {
    await this.sessions.revoke(identity.tokenId, identity.principalId);
  }

  /** Domain-separated pagination evidence; never an authentication token. */
  async signReferenceCursor(payload: string): Promise<string> {
    return new CompactSign(new TextEncoder().encode(payload))
      .setProtectedHeader({ alg: this.config.algorithm, kid: this.config.keyId, typ: "tcdx-reference-cursor.v1" })
      .sign(this.privateKey);
  }

  async verifyReferenceCursor(value: string): Promise<string> {
    const result = await compactVerify(value, this.publicKey, { algorithms: [this.config.algorithm] });
    if (result.protectedHeader.typ !== "tcdx-reference-cursor.v1" || result.protectedHeader.kid !== this.config.keyId) {
      throw new Error("Invalid reference cursor");
    }
    return new TextDecoder().decode(result.payload);
  }

  async revokePrincipal(principalId: string): Promise<void> {
    if (!validateUuid(principalId)) throw authenticationFailure();
    await this.sessions.revokePrincipal(principalId);
  }
}
