import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BrandLogo } from "./branding.js";
import { LoginEntry } from "./login-entry.js";
import { ManagedIdentityWorkspace } from "./managed-identity.js";
import { providerLabels, parseProviderAvailability } from "./frontend-auth-projections.js";
import type { ApiClient } from "./api-client.js";

describe("commercial branding preserves technical IAM boundaries", () => {
  it("renders the canonical local logo and commercial product name on login", () => {
    const html = renderToStaticMarkup(<LoginEntry api={{} as ApiClient} onLogin={() => undefined}/>);
    expect(html).toContain("Tecdex GRC");
    expect(html).not.toContain("TCDX GRC");
    expect(html).toContain(renderToStaticMarkup(<BrandLogo/>).replace(/<link[^>]+\/>/, ""));
    expect(html).toContain('alt="Tecdex"');
  });

  it("changes only the visible provider label, preserving configuration-based availability", () => {
    expect(providerLabels.TCDX_MANAGED_IDENTITY).toBe("Tecdex Managed Identity");
    const providers = Object.keys(providerLabels).map((provider) => ({ provider, available: false }));
    expect(parseProviderAvailability({ providers })?.providers.every((entry) => !entry.available)).toBe(true);
    expect(parseProviderAvailability({ providers: providers.map((entry) => ({ ...entry, provider: providerLabels[entry.provider as keyof typeof providerLabels] })) })).toBeNull();
    const html = renderToStaticMarkup(<ManagedIdentityWorkspace api={{} as ApiClient}
      permissions={new Set(["platform.managed_identity.read"])} authorizeFresh={async () => false}/>);
    expect(html).toContain("Tecdex Managed Identity");
    expect(html).not.toContain("TCDX Managed Identity");
  });
});
