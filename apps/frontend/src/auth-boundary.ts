export interface AccessTokenProvider {
  getAccessToken(): Promise<string | null>;
  clearSession(): Promise<void>;
}

export type SelectedTenant = { tenantId: string } | null;
