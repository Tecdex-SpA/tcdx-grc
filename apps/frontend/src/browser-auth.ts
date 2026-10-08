import type { AccessTokenProvider, SelectedTenant } from "./auth-boundary.js";

const TOKEN_KEY = "tcdx.access_token";
const TENANT_KEY = "tcdx.tenant_id";

type ApplicationTokenMessage = { type: "tcdx.application-token"; token: string };

export class BrowserSession implements AccessTokenProvider {
  async getAccessToken(): Promise<string | null> { return sessionStorage.getItem(TOKEN_KEY); }
  storeAccessToken(token: string): void { sessionStorage.setItem(TOKEN_KEY, token); }
  async clearSession(): Promise<void> {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TENANT_KEY);
  }
  selectedTenant(): SelectedTenant {
    const tenantId = sessionStorage.getItem(TENANT_KEY);
    return tenantId ? { tenantId } : null;
  }
  selectTenant(tenantId: string | null): void {
    if (tenantId) sessionStorage.setItem(TENANT_KEY, tenantId);
    else sessionStorage.removeItem(TENANT_KEY);
  }
}

export function receiveApplicationToken(apiOrigin: string, openWindow: (url: string) => Window | null = (url) => window.open(url, "tcdx-oidc", "popup,width=620,height=760"), provider?: "zoho" | "tcdx-managed-identity"): Promise<string> {
  const expectedOrigin = new URL(apiOrigin).origin;
  const loginUrl = new URL("/auth/login", expectedOrigin);
  if (provider) loginUrl.searchParams.set("provider", provider);
  const popup = openWindow(loginUrl.toString());
  if (!popup) return Promise.reject(new Error("LOGIN_POPUP_BLOCKED"));
  return new Promise((resolve, reject) => {
    let closedAt: number | undefined;
    const timeout = window.setTimeout(() => finish(new Error("LOGIN_TIMEOUT")), 120_000);
    const listener = (event: MessageEvent<unknown>) => {
      if (event.origin !== expectedOrigin || event.source !== popup || !isApplicationTokenMessage(event.data)) return;
      finish(undefined, event.data.token);
    };
    const poll = window.setInterval(() => {
      if (!popup.closed) return;
      closedAt ??= Date.now();
      if (Date.now() - closedAt > 2_000) finish(new Error("LOGIN_CANCELLED"));
    }, 500);
    const finish = (error?: Error, token?: string) => {
      window.clearTimeout(timeout);
      window.clearInterval(poll);
      window.removeEventListener("message", listener);
      if (error) reject(error);
      else resolve(token!);
    };
    window.addEventListener("message", listener);
  });
}

export async function receiveInvitationApplicationToken(
  apiOrigin: string,
  invitationToken: string,
  openWindow: (url: string) => Window | null = (url) => window.open(url, "tcdx-oidc", "popup,width=620,height=760")
): Promise<string> {
  const expectedOrigin = new URL(apiOrigin).origin;
  const popup = openWindow("about:blank");
  if (!popup) throw new Error("LOGIN_POPUP_BLOCKED");
  let response: Response;
  try {
    response = await fetch(new URL("/auth/invitations/accept", expectedOrigin), {
      method: "POST",
      headers: { "content-type": "application/json", "accept": "application/json" },
      body: JSON.stringify({ invitation_token: invitationToken })
    });
    if (!response.ok) throw new Error("INVITATION_REJECTED");
    const body = await response.json() as { authentication_method?: unknown; authorization_url?: unknown };
    if (body.authentication_method !== "ZOHO" || typeof body.authorization_url !== "string"
      || new URL(body.authorization_url).protocol !== "https:") throw new Error("INVITATION_REJECTED");
    popup.location.assign(body.authorization_url);
  } catch (error) {
    popup.close();
    throw error;
  }
  return receiveTokenFromPopup(expectedOrigin, popup);
}

function receiveTokenFromPopup(expectedOrigin: string, popup: Window): Promise<string> {
  return new Promise((resolve, reject) => {
    let closedAt: number | undefined;
    const timeout = window.setTimeout(() => finish(new Error("LOGIN_TIMEOUT")), 120_000);
    const listener = (event: MessageEvent<unknown>) => {
      if (event.origin !== expectedOrigin || event.source !== popup || !isApplicationTokenMessage(event.data)) return;
      finish(undefined, event.data.token);
    };
    const poll = window.setInterval(() => {
      if (!popup.closed) return;
      closedAt ??= Date.now();
      if (Date.now() - closedAt > 2_000) finish(new Error("LOGIN_CANCELLED"));
    }, 500);
    const finish = (error?: Error, token?: string) => {
      window.clearTimeout(timeout);
      window.clearInterval(poll);
      window.removeEventListener("message", listener);
      if (error) reject(error);
      else resolve(token!);
    };
    window.addEventListener("message", listener);
  });
}

function isApplicationTokenMessage(value: unknown): value is ApplicationTokenMessage {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ApplicationTokenMessage>;
  return candidate.type === "tcdx.application-token" && typeof candidate.token === "string" && candidate.token.length > 0;
}
