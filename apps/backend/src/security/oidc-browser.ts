import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey, type JWTPayload } from "jose";
import { sql, type Kysely, type Transaction } from "kysely";
import type { BackendConfig } from "../config.js";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";
import { persistAuditEvent, persistOutboxEvent } from "../persistence/foundation-records.js";
import { newUuidV7 } from "../uuid.js";
import { ApplicationTokenService, tokenFingerprint } from "./application-token.js";

const FLOW_COOKIE = "__Host-tcdx_oidc_flow";
const FLOW_MAX_AGE_SECONDS = 600;
const TOKEN_STORAGE_KEY = "tcdx.access_token";

export type OidcConfig = Required<Omit<BackendConfig["oidc"], "configured" | "requiredAmr" | "identityResolution">>
  & Pick<BackendConfig["oidc"], "requiredAmr" | "identityResolution">;
type Executor = Kysely<FoundationDatabase> | Transaction<FoundationDatabase>;
export type InvitationFlow = { invitationId: string; tokenDigest: string };
type FlowState = { state: string; nonce: string; verifier: string; expiresAt: number; invitation?: InvitationFlow };
type ProviderMetadata = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  grant_types_supported?: string[];
  code_challenge_methods_supported?: string[];
  id_token_signing_alg_values_supported?: string[];
  token_endpoint_auth_methods_supported?: string[];
};

export type ExternalClaims = { issuer: string; subject: string; email: string | null; displayName: string };
type CanonicalIdentity = { userIdentityId: string };

function authFailure(): FoundationError {
  return new FoundationError("TCDX.AUTHENTICATION.INVALID", "Authentication failed", 401);
}

function providerFailure(): FoundationError {
  return new FoundationError("TCDX.AUTHENTICATION.PROVIDER_UNAVAILABLE", "Authentication provider is unavailable", 502, true);
}

function base64url(bytes: number): string { return randomBytes(bytes).toString("base64url"); }

function parseCookie(header: string | undefined): string | undefined {
  for (const pair of header?.split(";") ?? []) {
    const separator = pair.indexOf("=");
    if (separator > 0 && pair.slice(0, separator).trim() === FLOW_COOKIE) return pair.slice(separator + 1).trim();
  }
  return undefined;
}

function flowCookie(value: string, maxAge: number): string {
  return `${FLOW_COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

function discoveryUrl(issuer: string): string {
  return `${issuer.replace(/\/$/, "")}/.well-known/openid-configuration`;
}

export function canonicalIdentityKey(issuer: string, subject: string): string {
  return `oidc:${createHash("sha256").update(issuer).update("\0").update(subject).digest("base64url")}`;
}

export function buildTokenEndpointRequest(config: OidcConfig, code: string, verifier: string): { body: URLSearchParams; headers: Record<string, string> } {
  const body = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: config.redirectUri, code_verifier: verifier });
  const headers: Record<string, string> = { accept: "application/json", "content-type": "application/x-www-form-urlencoded" };
  if (config.tokenEndpointAuthMethod === "client_secret_basic") {
    headers.authorization = `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`, "utf8").toString("base64")}`;
  } else if (config.tokenEndpointAuthMethod === "client_secret_post") {
    body.set("client_id", config.clientId);
    body.set("client_secret", config.clientSecret);
  } else {
    throw authFailure();
  }
  return { body, headers };
}

export async function verifyOidcIdentityProof(config: OidcConfig, idToken: string, nonce: string, keySet: JWTVerifyGetKey): Promise<ExternalClaims> {
  try {
    const { payload } = await jwtVerify(idToken, keySet, {
      issuer: config.issuer,
      audience: config.clientId,
      algorithms: config.allowedAlgorithms,
      requiredClaims: ["iss", "aud", "sub", "iat", "exp", "nonce", ...(config.requiredAmr?.length ? ["amr", "auth_time", "sid"] : [])]
    });
    if (payload.nonce !== nonce || !payload.iss || !payload.sub) throw authFailure();
    if (config.requiredAmr?.length) {
      const amr = payload.amr;
      const exactAudience = payload.aud === config.clientId
        || (Array.isArray(payload.aud) && payload.aud.length === 1 && payload.aud[0] === config.clientId);
      if (!exactAudience || !Number.isSafeInteger(payload.iat) || !Number.isSafeInteger(payload.exp)
        || payload.iat! > Math.floor(Date.now() / 1_000) + 5 || payload.exp! <= payload.iat!
        || !Array.isArray(amr) || !amr.every((value) => typeof value === "string" && value.length > 0)
        || !config.requiredAmr.every((value) => amr.includes(value))
        || !Number.isSafeInteger(payload.auth_time) || typeof payload.iat !== "number"
        || Number(payload.auth_time) > payload.iat || typeof payload.sid !== "string" || !payload.sid) throw authFailure();
    }
    return {
      issuer: payload.iss,
      subject: payload.sub,
      email: normalizeEmail(payload.email),
      displayName: normalizeDisplayName(payload)
    };
  } catch (error) {
    if (error instanceof FoundationError) throw error;
    throw authFailure();
  }
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim().toLowerCase();
}

function normalizeDisplayName(payload: JWTPayload): string {
  if (typeof payload.name === "string" && payload.name.trim()) return payload.name.trim();
  if (typeof payload.sub === "string" && payload.sub.trim()) return payload.sub.trim();
  throw authFailure();
}

export class OidcFlowStore {
  private readonly flows = new Map<string, FlowState>();

  create(now = Date.now(), invitation?: InvitationFlow): { flowId: string; flow: FlowState } {
    const flowId = base64url(32);
    const flow: FlowState = { state: base64url(32), nonce: base64url(32), verifier: base64url(48), expiresAt: now + FLOW_MAX_AGE_SECONDS * 1_000, ...(invitation ? { invitation } : {}) };
    this.flows.set(flowId, flow);
    return { flowId, flow };
  }

  consume(flowId: string, state: string, now = Date.now()): FlowState {
    const flow = this.flows.get(flowId);
    this.flows.delete(flowId);
    if (!flow || flow.expiresAt <= now || !safeEqual(flow.state, state)) throw authFailure();
    return flow;
  }
}

export class PostgresOidcIdentityResolver {
  async resolveExisting(executor: Executor, claims: ExternalClaims): Promise<CanonicalIdentity> {
    const identityKey = canonicalIdentityKey(claims.issuer, claims.subject);
    const result = await sql<{ user_identity_id: string }>`
      UPDATE iam.user_identities
         SET last_authenticated_at=transaction_timestamp(),
             updated_at=transaction_timestamp(),
             updated_by_user_identity_id=user_identity_id,
             row_version=row_version+1
       WHERE identity_key=${identityKey} AND lifecycle_state='active'
       RETURNING user_identity_id
    `.execute(executor);
    if (result.rows.length !== 1) throw authFailure();
    return { userIdentityId: result.rows[0]!.user_identity_id };
  }

  async resolveOrCreate(executor: Executor, claims: ExternalClaims): Promise<CanonicalIdentity> {
    const userIdentityId = newUuidV7();
    const identityKey = canonicalIdentityKey(claims.issuer, claims.subject);
    const result = await sql<{ user_identity_id: string }>`
      INSERT INTO iam.user_identities
        (user_identity_id,identity_key,display_name,email_normalized,lifecycle_state,last_authenticated_at)
      VALUES (${userIdentityId}::uuid,${identityKey},${claims.displayName},${claims.email},'active',transaction_timestamp())
      ON CONFLICT (identity_key) DO UPDATE
        SET display_name=EXCLUDED.display_name,
            email_normalized=EXCLUDED.email_normalized,
            last_authenticated_at=transaction_timestamp(),
            updated_at=transaction_timestamp(),
            updated_by_user_identity_id=iam.user_identities.user_identity_id,
            row_version=iam.user_identities.row_version+1
      WHERE iam.user_identities.lifecycle_state='active'
      RETURNING user_identity_id
    `.execute(executor);
    const identity = result.rows[0];
    if (!identity) throw new FoundationError("TCDX.AUTHENTICATION.IDENTITY_INACTIVE", "Authentication failed", 403);
    return { userIdentityId: identity.user_identity_id };
  }
}

export async function acceptMembershipInvitation(
  transaction: Transaction<FoundationDatabase>,
  identities: Pick<PostgresOidcIdentityResolver, "resolveOrCreate">,
  claims: ExternalClaims,
  invitationFlow: InvitationFlow,
  correlationId: string
): Promise<CanonicalIdentity> {
  const invitationResult = await sql<{
    tenant_membership_invitation_id: string; tenant_id: string; invitee_email: string; authentication_method: string;
    lifecycle_state: string; unexpired: boolean;
  }>`
    SELECT tenant_membership_invitation_id,tenant_id,invitee_email,authentication_method,lifecycle_state,
           (expires_at>transaction_timestamp()) AS unexpired
      FROM iam.tenant_membership_invitations
     WHERE tenant_membership_invitation_id=${invitationFlow.invitationId}::uuid
       AND token_digest=${invitationFlow.tokenDigest}
     FOR UPDATE
  `.execute(transaction);
  const invitation = invitationResult.rows[0];
  if (!invitation || invitation.authentication_method !== "ZOHO" || invitation.lifecycle_state !== "pending"
    || !invitation.unexpired || !claims.email || !safeEqual(invitation.invitee_email, claims.email)) throw authFailure();

  const identity = await identities.resolveOrCreate(transaction, claims);
  const proposedMembershipId = newUuidV7();
  const insertedMembership = await sql<{ tenant_membership_id: string }>`
    INSERT INTO iam.tenant_memberships
      (tenant_membership_id,tenant_id,user_identity_id,membership_state,joined_at,created_by_user_identity_id,updated_by_user_identity_id)
    VALUES (${proposedMembershipId}::uuid,${invitation.tenant_id}::uuid,${identity.userIdentityId}::uuid,'active',transaction_timestamp(),
            ${identity.userIdentityId}::uuid,${identity.userIdentityId}::uuid)
    ON CONFLICT (tenant_id,user_identity_id) DO NOTHING
    RETURNING tenant_membership_id
  `.execute(transaction);
  const createdMembership = insertedMembership.rows.length === 1;
  const memberships = createdMembership ? insertedMembership : await sql<{ tenant_membership_id: string }>`
    SELECT tenant_membership_id
      FROM iam.tenant_memberships
     WHERE tenant_id=${invitation.tenant_id}::uuid AND user_identity_id=${identity.userIdentityId}::uuid
       AND membership_state='active'
       AND (ended_at IS NULL OR ended_at>transaction_timestamp())
     FOR UPDATE
  `.execute(transaction);
  if (memberships.rows.length !== 1) throw authFailure();
  const membershipId = memberships.rows[0]!.tenant_membership_id;
  const accepted = await sql`
    UPDATE iam.tenant_membership_invitations
       SET lifecycle_state='accepted',accepted_at=transaction_timestamp(),accepted_by_user_identity_id=${identity.userIdentityId}::uuid,
           tenant_membership_id=${membershipId}::uuid,updated_at=transaction_timestamp(),updated_by_user_identity_id=${identity.userIdentityId}::uuid,
           row_version=row_version+1
     WHERE tenant_membership_invitation_id=${invitation.tenant_membership_invitation_id}::uuid
       AND lifecycle_state='pending' AND expires_at>transaction_timestamp()
  `.execute(transaction);
  if (Number(accepted.numAffectedRows) !== 1) throw authFailure();
  await persistAuditEvent(transaction, {
    auditEventId: newUuidV7(), ownershipClass: "TENANT_OWNED", tenantId: invitation.tenant_id,
    actor: { userIdentityId: identity.userIdentityId }, correlationId,
    eventCode: "audit.platform.membership_invitation.accept.v1", aggregateType: "TenantMembershipInvitation",
    aggregateId: invitation.tenant_membership_invitation_id, commandCode: "MEMBERSHIP_INVITATION_ACCEPT",
    outcome: "success", classification: "confidential",
    after: {
      tenant_membership_invitation_id: invitation.tenant_membership_invitation_id,
      tenant_membership_id: membershipId,
      authentication_method: "ZOHO",
      lifecycle_state: "accepted"
    }
  });
  await persistOutboxEvent(transaction, {
    outboxEventId: newUuidV7(), eventId: newUuidV7(), ownershipClass: "TENANT_OWNED", tenantId: invitation.tenant_id,
    actor: { userIdentityId: identity.userIdentityId }, correlationId,
    eventType: "iam.membership_invitation.accepted.v1", aggregateType: "TenantMembershipInvitation",
    aggregateId: invitation.tenant_membership_invitation_id, classification: "confidential",
    payload: {
      tenant_membership_invitation_id: invitation.tenant_membership_invitation_id,
      tenant_membership_id: membershipId,
      lifecycle_state: "accepted"
    }
  });
  if (createdMembership) await persistOutboxEvent(transaction, {
    outboxEventId: newUuidV7(), eventId: newUuidV7(), ownershipClass: "TENANT_OWNED", tenantId: invitation.tenant_id,
    actor: { userIdentityId: identity.userIdentityId }, correlationId,
    eventType: "iam.membership.created.v1", aggregateType: "TenantMembership", aggregateId: membershipId,
    classification: "confidential", payload: { tenant_membership_id: membershipId, membership_state: "active" }
  });
  return identity;
}

export class OidcBrowserClient {
  private metadataCache?: { metadata: ProviderMetadata; expiresAt: number };
  private keySet?: ReturnType<typeof createRemoteJWKSet>;

  constructor(
    readonly config: OidcConfig,
    readonly frontendOrigin: string,
    private readonly database: Kysely<FoundationDatabase>,
    private readonly applicationTokens: ApplicationTokenService,
    private readonly identities = new PostgresOidcIdentityResolver(),
    private readonly flows = new OidcFlowStore(),
    private readonly fetcher: typeof fetch = fetch
  ) {}

  async metadata(now = Date.now()): Promise<ProviderMetadata> {
    if (this.metadataCache && this.metadataCache.expiresAt > now) return this.metadataCache.metadata;
    let response: Response;
    try {
      response = await this.fetcher(discoveryUrl(this.config.issuer), { headers: { accept: "application/json" }, signal: AbortSignal.timeout(5_000) });
    } catch { throw providerFailure(); }
    if (!response.ok) throw providerFailure();
    const metadata = await response.json() as ProviderMetadata;
    const secureEndpoints = [metadata.authorization_endpoint, metadata.token_endpoint, metadata.jwks_uri]
      .every((value) => { try { return new URL(value).protocol === "https:"; } catch { return false; } });
    const allowedAlgorithms = this.config.allowedAlgorithms.every((algorithm) => metadata.id_token_signing_alg_values_supported?.includes(algorithm));
    const allowedClientAuthentication = !metadata.token_endpoint_auth_methods_supported
      || metadata.token_endpoint_auth_methods_supported.includes(this.config.tokenEndpointAuthMethod);
    if (metadata.issuer !== this.config.issuer || !secureEndpoints || !metadata.grant_types_supported?.includes("authorization_code")
      || !metadata.code_challenge_methods_supported?.includes("S256") || !allowedAlgorithms || !allowedClientAuthentication) throw providerFailure();
    this.metadataCache = { metadata, expiresAt: now + 60 * 60_000 };
    this.keySet = createRemoteJWKSet(new URL(metadata.jwks_uri), { timeoutDuration: 5_000, cooldownDuration: 30_000, cacheMaxAge: 10 * 60_000 });
    return metadata;
  }

  private authorizationRequestFor(invitation?: InvitationFlow): Promise<{ url: string; flowId: string }> {
    return this.metadata().then((metadata) => {
      const { flowId, flow } = this.flows.create(Date.now(), invitation);
      const challenge = createHash("sha256").update(flow.verifier, "ascii").digest("base64url");
      const url = new URL(metadata.authorization_endpoint);
      url.search = new URLSearchParams({
        response_type: "code",
        client_id: this.config.clientId,
        redirect_uri: this.config.redirectUri,
        scope: this.config.scopes.join(" "),
        state: flow.state,
        nonce: flow.nonce,
        code_challenge: challenge,
        code_challenge_method: "S256"
      }).toString();
      return { url: url.toString(), flowId };
    });
  }

  authorizationRequest(): Promise<{ url: string; flowId: string }> {
    return this.authorizationRequestFor();
  }

  async invitationAuthorizationRequest(invitationToken: string): Promise<{ url: string; flowId: string }> {
    if (this.config.identityResolution === "existing_only") throw authFailure();
    if (!/^[A-Za-z0-9_-]{43}$/.test(invitationToken)) throw authFailure();
    const tokenDigest = createHash("sha256").update(invitationToken, "ascii").digest("hex");
    const result = await sql<{ tenant_membership_invitation_id: string }>`
      SELECT tenant_membership_invitation_id
        FROM iam.tenant_membership_invitations
       WHERE token_digest=${tokenDigest}
         AND authentication_method='ZOHO'
         AND lifecycle_state='pending'
         AND expires_at>transaction_timestamp()
    `.execute(this.database);
    const invitation = result.rows[0];
    if (!invitation || result.rows.length !== 1) throw authFailure();
    return this.authorizationRequestFor({ invitationId: invitation.tenant_membership_invitation_id, tokenDigest });
  }

  private async exchange(code: string, verifier: string): Promise<{ idToken: string }> {
    const metadata = await this.metadata();
    const request = buildTokenEndpointRequest(this.config, code, verifier);
    let response: Response;
    try {
      response = await this.fetcher(metadata.token_endpoint, {
        method: "POST",
        headers: request.headers,
        body: request.body,
        signal: AbortSignal.timeout(8_000)
      });
    } catch { throw providerFailure(); }
    if (!response.ok) throw providerFailure();
    const token = await response.json() as { id_token?: unknown };
    if (typeof token.id_token !== "string") throw authFailure();
    return { idToken: token.id_token };
  }

  private async validateIdentityProof(idToken: string, nonce: string): Promise<ExternalClaims> {
    await this.metadata();
    if (!this.keySet) throw providerFailure();
    return verifyOidcIdentityProof(this.config, idToken, nonce, this.keySet);
  }

  async complete(code: string, state: string, flowId: string, correlationId: string): Promise<string> {
    const flow = this.flows.consume(flowId, state);
    const external = await this.exchange(code, flow.verifier);
    const claims = await this.validateIdentityProof(external.idToken, flow.nonce);
    let issued: Awaited<ReturnType<ApplicationTokenService["issue"]>> | undefined;
    try {
      return await this.database.transaction().execute(async (transaction) => {
        const identity = flow.invitation
          ? await acceptMembershipInvitation(transaction, this.identities, claims, flow.invitation, correlationId)
          : this.config.identityResolution === "existing_only"
            ? await this.identities.resolveExisting(transaction, claims)
            : await this.identities.resolveOrCreate(transaction, claims);
        issued = await this.applicationTokens.issue(identity.userIdentityId, newUuidV7());
        await persistAuditEvent(transaction, {
          auditEventId: newUuidV7(), ownershipClass: "PLATFORM_CONTROL", tenantId: null,
          actor: { userIdentityId: identity.userIdentityId }, correlationId,
          eventCode: "audit.iam.application_token.issue.v1", aggregateType: "UserIdentity", aggregateId: identity.userIdentityId,
          commandCode: "oidc.session.establish", outcome: "success", classification: "restricted",
          after: {
            token_id_fingerprint: tokenFingerprint(issued.identity.tokenId),
            issuer_fingerprint: createHash("sha256").update(this.applicationTokens.config.issuer).digest("hex"),
            key_id_fingerprint: createHash("sha256").update(this.applicationTokens.config.keyId).digest("hex"),
            expires_at: issued.identity.expiresAt.toISOString()
          }
        });
        return issued.token;
      });
    } catch (error) {
      if (issued) await this.applicationTokens.revoke(issued.identity).catch(() => undefined);
      throw error;
    }
  }

  async logout(token: string, correlationId: string): Promise<void> {
    const identity = await this.applicationTokens.verifyBearerToken(token);
    await this.applicationTokens.revoke(identity);
    await this.database.transaction().execute((transaction) => persistAuditEvent(transaction, {
      auditEventId: newUuidV7(), ownershipClass: "PLATFORM_CONTROL", tenantId: null,
      actor: { userIdentityId: identity.principalId }, correlationId,
      eventCode: "audit.iam.application_token.revoke.v1", aggregateType: "UserIdentity", aggregateId: identity.principalId,
      commandCode: "application.session.logout", outcome: "success", classification: "restricted",
      after: { token_id_fingerprint: tokenFingerprint(identity.tokenId) }
    }));
  }
}

function callbackHtml(token: string, frontendOrigin: string, nonce: string): string {
  const serializedToken = JSON.stringify(token).replace(/</g, "\\u003c");
  const serializedOrigin = JSON.stringify(frontendOrigin);
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>Autenticación completada</title></head><body><script nonce="${nonce}">if(window.opener){window.opener.postMessage({type:"tcdx.application-token",token:${serializedToken}},${serializedOrigin});window.close();}else{document.body.textContent="Autenticación completada. Cierre esta ventana.";}</script></body></html>`;
}

function secureHtml(reply: FastifyReply, nonce: string): FastifyReply {
  return reply.header("cache-control", "no-store").header("pragma", "no-cache").header("referrer-policy", "no-referrer")
    .header("x-frame-options", "DENY")
    .header("content-security-policy", `default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'`)
    .type("text/html; charset=utf-8");
}

function bearer(request: FastifyRequest): string {
  const value = request.headers.authorization;
  if (!value?.startsWith("Bearer ") || value.length < 8) throw authFailure();
  return value.slice(7);
}

const MANAGED_FLOW_PREFIX = "managed.";

export function registerOidcBrowserRoutes(app: FastifyInstance, client?: OidcBrowserClient, managedClient?: OidcBrowserClient): void {
  app.get("/auth/login", async (request: FastifyRequest<{ Querystring: { provider?: unknown } }>, reply) => {
    const provider = request.query.provider;
    if (provider !== undefined && provider !== "zoho" && provider !== "tcdx-managed-identity") throw authFailure();
    const managed = provider === "tcdx-managed-identity";
    const selected = managed ? managedClient : client;
    if (!selected) throw new FoundationError("TCDX.AUTHENTICATION.NOT_CONFIGURED", "Authentication is not configured", 503);
    const authorization = await selected.authorizationRequest();
    const flowId = managed ? `${MANAGED_FLOW_PREFIX}${authorization.flowId}` : authorization.flowId;
    return reply.header("set-cookie", flowCookie(flowId, FLOW_MAX_AGE_SECONDS)).redirect(authorization.url, 302);
  });

  app.post("/auth/invitations/accept", async (request: FastifyRequest<{ Body: { invitation_token?: unknown } }>, reply) => {
    if (!client) throw new FoundationError("TCDX.AUTHENTICATION.NOT_CONFIGURED", "Authentication is not configured", 503);
    const token = request.body?.invitation_token;
    if (typeof token !== "string") throw authFailure();
    const authorization = await client.invitationAuthorizationRequest(token);
    return reply.header("set-cookie", flowCookie(authorization.flowId, FLOW_MAX_AGE_SECONDS))
      .header("cache-control", "no-store")
      .code(202)
      .send({ authentication_method: "ZOHO", authorization_url: authorization.url });
  });

  app.get("/auth/callback", async (request: FastifyRequest<{ Querystring: { code?: unknown; state?: unknown; error?: unknown } }>, reply) => {
    reply.header("set-cookie", flowCookie("", 0)).header("cache-control", "no-store").header("referrer-policy", "no-referrer");
    if (!client && !managedClient) throw new FoundationError("TCDX.AUTHENTICATION.NOT_CONFIGURED", "Authentication is not configured", 503);
    if (request.query.error || typeof request.query.code !== "string" || typeof request.query.state !== "string") throw authFailure();
    const cookie = parseCookie(request.headers.cookie);
    if (!cookie) throw authFailure();
    const managed = cookie.startsWith(MANAGED_FLOW_PREFIX);
    const selected = managed ? managedClient : client;
    const flowId = managed ? cookie.slice(MANAGED_FLOW_PREFIX.length) : cookie;
    if (!selected || !flowId) throw authFailure();
    const token = await selected.complete(request.query.code, request.query.state, flowId, String(reply.getHeader("x-correlation-id")));
    const nonce = base64url(24);
    return secureHtml(reply, nonce).send(callbackHtml(token, selected.frontendOrigin, nonce));
  });

  app.post("/auth/logout", async (request, reply) => {
    const selected = client ?? managedClient;
    if (!selected) throw new FoundationError("TCDX.AUTHENTICATION.NOT_CONFIGURED", "Authentication is not configured", 503);
    await selected.logout(bearer(request), String(reply.getHeader("x-correlation-id")));
    return reply.code(204).send();
  });
}

export const browserAuthContract = { tokenStorageKey: TOKEN_STORAGE_KEY } as const;
