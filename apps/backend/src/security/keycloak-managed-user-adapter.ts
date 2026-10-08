import { FoundationError } from "../errors.js";
import { validate as validateUuid } from "uuid";

export const PROVISION_RECONCILIATION_ATTRIBUTE = "tcdx_provision_reconciliation_marker";

export type ManagedUser = {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  enabled: boolean;
  requiredActions: string[];
  attributes: Record<string, string[]>;
  mfaEnrolled: boolean;
};

export interface ManagedUserAdminPort {
  createManagedUser(input: { username: string; displayName: string; email?: string; marker: string }): Promise<string>;
  getManagedUser(id: string): Promise<ManagedUser | null>;
  listManagedUsers(first: number, max: number, reconciliationMarker?: string): Promise<ManagedUser[]>;
  setManagedUserEnabled(id: string, enabled: boolean): Promise<void>;
  setTemporaryPassword(id: string, credential: string): Promise<void>;
  removeManagedUserTotpCredential(id: string): Promise<void>;
  revokeManagedUserSessions(id: string): Promise<void>;
}

type KeycloakUser = {
  id?: unknown;
  username?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  enabled?: unknown;
  requiredActions?: unknown;
  attributes?: unknown;
};

function providerFailure(): FoundationError {
  return new FoundationError("TCDX.PROVIDER.FAILURE", "Identity provider operation failed", 502);
}

function dependencyUnavailable(): FoundationError {
  return new FoundationError("TCDX.DEPENDENCY.UNAVAILABLE", "Identity provider unavailable", 503, true);
}

function validUserId(id: string): string {
  if (!validateUuid(id)) throw providerFailure();
  return id;
}

function parseUser(value: KeycloakUser, mfaEnrolled = false): ManagedUser {
  if (typeof value.id !== "string" || typeof value.username !== "string" || typeof value.enabled !== "boolean") throw providerFailure();
  const attributes = value.attributes && typeof value.attributes === "object" && !Array.isArray(value.attributes)
    ? Object.fromEntries(Object.entries(value.attributes).filter((entry): entry is [string, string[]] =>
      Array.isArray(entry[1]) && entry[1].every((item) => typeof item === "string")))
    : {};
  return {
    id: validUserId(value.id), username: value.username,
    ...(typeof value.firstName === "string" ? { firstName: value.firstName } : {}),
    ...(typeof value.lastName === "string" ? { lastName: value.lastName } : {}),
    ...(typeof value.email === "string" ? { email: value.email } : {}),
    enabled: value.enabled,
    requiredActions: Array.isArray(value.requiredActions)
      ? value.requiredActions.filter((item): item is string => typeof item === "string") : [],
    attributes, mfaEnrolled
  };
}

export class KeycloakManagedUserAdapter implements ManagedUserAdminPort {
  private readonly realm = "tcdx-managed-identity";
  private readonly base: string;

  constructor(private readonly config: { baseUrl: URL; clientId: string; clientSecret: string; issuer: string },
    private readonly fetcher: typeof fetch = fetch) {
    if (config.issuer !== "https://iam.grc.tecdex.net/realms/tcdx-managed-identity"
      || config.clientId !== "tcdx-grc-managed-identity-provisioner") throw providerFailure();
    this.base = config.baseUrl.origin;
  }

  private async token(): Promise<string> {
    try {
      const response = await this.fetcher(`${this.base}/realms/${this.realm}/protocol/openid-connect/token`, {
        method: "POST",
        headers: { authorization: `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString("base64")}`,
          "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
        body: new URLSearchParams({ grant_type: "client_credentials" }), signal: AbortSignal.timeout(8_000)
      });
      if (!response.ok) throw providerFailure();
      const body: unknown = await response.json();
      if (!body || typeof body !== "object" || typeof (body as { access_token?: unknown }).access_token !== "string") throw providerFailure();
      return (body as { access_token: string }).access_token;
    } catch (error) {
      if (error instanceof FoundationError) throw error;
      throw dependencyUnavailable();
    }
  }

  private async authHeaders(): Promise<Record<string, string>> {
    return { authorization: `Bearer ${await this.token()}`, accept: "application/json" };
  }

  private async expect(response: Response, allowed: readonly number[] = [200, 204]): Promise<void> {
    if (allowed.includes(response.status)) return;
    if (response.status === 404) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
    if (response.status === 409) throw new FoundationError("TCDX.CONFLICT.RESOURCE", "Identity conflict", 409);
    if (response.status >= 500) throw dependencyUnavailable();
    throw providerFailure();
  }

  private async call<T>(run: () => Promise<T>): Promise<T> {
    try { return await run(); }
    catch (error) {
      if (error instanceof FoundationError) throw error;
      throw dependencyUnavailable();
    }
  }

  async createManagedUser(input: { username: string; displayName: string; email?: string; marker: string }): Promise<string> {
    return this.call(async () => {
      const headers = await this.authHeaders();
      const profileResponse = await this.fetcher(`${this.base}/admin/realms/${this.realm}/users/profile`, {
        headers, signal: AbortSignal.timeout(8_000)
      });
      await this.expect(profileResponse, [200]);
      const profile: unknown = await profileResponse.json();
      const attributes = profile && typeof profile === "object" && !Array.isArray(profile)
        ? (profile as { attributes?: unknown }).attributes : undefined;
      const markerProfile = Array.isArray(attributes) ? attributes.find((attribute) => attribute
        && typeof attribute === "object" && (attribute as { name?: unknown }).name === PROVISION_RECONCILIATION_ATTRIBUTE) : undefined;
      const permissions = markerProfile && typeof markerProfile === "object"
        ? (markerProfile as { permissions?: unknown }).permissions : undefined;
      const profileAccess = permissions && typeof permissions === "object"
        ? permissions as { view?: unknown; edit?: unknown } : {};
      if (!Array.isArray(profileAccess.view) || profileAccess.view.length !== 1 || profileAccess.view[0] !== "admin"
        || !Array.isArray(profileAccess.edit) || profileAccess.edit.length !== 1 || profileAccess.edit[0] !== "admin"
        || (markerProfile as { required?: unknown }).required !== undefined) {
        throw providerFailure();
      }
      const response = await this.fetcher(`${this.base}/admin/realms/${this.realm}/users`, {
        method: "POST", headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({ username: input.username, firstName: input.displayName,
          ...(input.email ? { email: input.email } : {}), enabled: true,
          requiredActions: ["UPDATE_PASSWORD", "CONFIGURE_TOTP"],
          attributes: { [PROVISION_RECONCILIATION_ATTRIBUTE]: [input.marker] } }),
        signal: AbortSignal.timeout(8_000)
      });
      await this.expect(response, [201]);
      const location = response.headers.get("location");
      const id = location?.split("/").at(-1);
      if (!id) throw providerFailure();
      return validUserId(id);
    });
  }

  async getManagedUser(id: string): Promise<ManagedUser | null> {
    return this.call(async () => {
      const headers = await this.authHeaders();
      const response = await this.fetcher(`${this.base}/admin/realms/${this.realm}/users/${encodeURIComponent(validUserId(id))}`, {
        headers, signal: AbortSignal.timeout(8_000)
      });
      if (response.status === 404) return null;
      await this.expect(response, [200]);
      const user = parseUser(await response.json() as KeycloakUser);
      const credentials = await this.fetcher(`${this.base}/admin/realms/${this.realm}/users/${encodeURIComponent(user.id)}/credentials`, {
        headers, signal: AbortSignal.timeout(8_000)
      });
      await this.expect(credentials, [200]);
      const items: unknown = await credentials.json();
      if (!Array.isArray(items)) throw providerFailure();
      return { ...user, mfaEnrolled: items.some((item) => item && typeof item === "object" && (item as { type?: unknown }).type === "otp") };
    });
  }

  async listManagedUsers(first: number, max: number, reconciliationMarker?: string): Promise<ManagedUser[]> {
    if (!Number.isSafeInteger(first) || first < 0 || !Number.isSafeInteger(max) || max < 1 || max > 100) throw providerFailure();
    if (reconciliationMarker !== undefined && !/^[A-Za-z0-9_-]{22,128}$/.test(reconciliationMarker)) throw providerFailure();
    return this.call(async () => {
      const query = new URLSearchParams({ first: String(first), max: String(max), briefRepresentation: "false" });
      if (reconciliationMarker) query.set("q", `${PROVISION_RECONCILIATION_ATTRIBUTE}:${reconciliationMarker}`);
      const response = await this.fetcher(`${this.base}/admin/realms/${this.realm}/users?${query}`, {
        headers: await this.authHeaders(), signal: AbortSignal.timeout(8_000)
      });
      await this.expect(response, [200]);
      const items: unknown = await response.json();
      if (!Array.isArray(items) || items.length > max) throw providerFailure();
      const parsed = items.map((item) => parseUser(item as KeycloakUser));
      if (reconciliationMarker && parsed.some((user) => user.attributes[PROVISION_RECONCILIATION_ATTRIBUTE]?.length !== 1
        || user.attributes[PROVISION_RECONCILIATION_ATTRIBUTE]?.[0] !== reconciliationMarker)) throw providerFailure();
      return parsed;
    });
  }

  async setManagedUserEnabled(id: string, enabled: boolean): Promise<void> {
    await this.call(async () => {
      const response = await this.fetcher(`${this.base}/admin/realms/${this.realm}/users/${encodeURIComponent(validUserId(id))}`, {
        method: "PUT", headers: { ...await this.authHeaders(), "content-type": "application/json" },
        body: JSON.stringify({ enabled }), signal: AbortSignal.timeout(8_000)
      });
      await this.expect(response);
    });
  }

  async setTemporaryPassword(id: string, credential: string): Promise<void> {
    await this.call(async () => {
      const response = await this.fetcher(`${this.base}/admin/realms/${this.realm}/users/${encodeURIComponent(validUserId(id))}/reset-password`, {
        method: "PUT", headers: { ...await this.authHeaders(), "content-type": "application/json" },
        body: JSON.stringify({ type: "password", value: credential, temporary: true }), signal: AbortSignal.timeout(8_000)
      });
      await this.expect(response);
    });
  }

  async removeManagedUserTotpCredential(id: string): Promise<void> {
    await this.call(async () => {
      const user = await this.getManagedUser(id);
      if (!user) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
      const headers = await this.authHeaders();
      const credentials = await this.fetcher(`${this.base}/admin/realms/${this.realm}/users/${encodeURIComponent(user.id)}/credentials`, {
        headers, signal: AbortSignal.timeout(8_000)
      });
      await this.expect(credentials, [200]);
      const items: unknown = await credentials.json();
      if (!Array.isArray(items)) throw providerFailure();
      const otpIds = items.filter((item) => item && typeof item === "object" && (item as { type?: unknown }).type === "otp")
        .map((item) => (item as { id?: unknown }).id);
      if (otpIds.some((item) => typeof item !== "string")) throw providerFailure();
      for (const credentialId of otpIds as string[]) {
        const deleted = await this.fetcher(`${this.base}/admin/realms/${this.realm}/users/${encodeURIComponent(user.id)}/credentials/${encodeURIComponent(credentialId)}`, {
          method: "DELETE", headers, signal: AbortSignal.timeout(8_000)
        });
        await this.expect(deleted);
      }
      const requiredActions = [...new Set([...user.requiredActions, "CONFIGURE_TOTP"])];
      const updated = await this.fetcher(`${this.base}/admin/realms/${this.realm}/users/${encodeURIComponent(user.id)}`, {
        method: "PUT", headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({ requiredActions }), signal: AbortSignal.timeout(8_000)
      });
      await this.expect(updated);
    });
  }

  async revokeManagedUserSessions(id: string): Promise<void> {
    await this.call(async () => {
      const response = await this.fetcher(`${this.base}/admin/realms/${this.realm}/users/${encodeURIComponent(validUserId(id))}/logout`, {
        method: "POST", headers: await this.authHeaders(), signal: AbortSignal.timeout(8_000)
      });
      await this.expect(response);
    });
  }
}
