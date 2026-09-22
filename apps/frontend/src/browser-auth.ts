import type { AccessTokenProvider, SelectedTenant } from "./auth-boundary.js";

const TOKEN_KEY = "tcdx.access_token";
const TENANT_KEY = "tcdx.tenant_id";

export class BrowserSessionTokenProvider implements AccessTokenProvider {
  async getAccessToken(): Promise<string | null> { return sessionStorage.getItem(TOKEN_KEY); }
  async clearSession(): Promise<void> { sessionStorage.removeItem(TOKEN_KEY); }
}

export function selectedTenant(): SelectedTenant {
  const tenantId = sessionStorage.getItem(TENANT_KEY);
  return tenantId ? { tenantId } : null;
}
