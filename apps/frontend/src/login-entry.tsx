import { useEffect, useState } from "react";
import type { AuthenticationProvider } from "@tcdx-grc/contracts";
import type { ApiClient } from "./api-client.js";
import { parseProviderAvailability, providerLabels } from "./frontend-auth-projections.js";
import { uiText } from "./i18n/es.js";
import { BrandLogo, brandNames } from "./branding.js";

const displayOrder: AuthenticationProvider[] = ["ZOHO", "MICROSOFT_ENTRA_ID", "GOOGLE_WORKSPACE", "TCDX_MANAGED_IDENTITY"];

export function LoginEntry({ api, error, authenticating, onLogin }: {
  api: ApiClient; error?: string; authenticating?: boolean; onLogin(provider: "ZOHO" | "TCDX_MANAGED_IDENTITY"): void;
}) {
  const [availability, setAvailability] = useState<ReturnType<typeof parseProviderAvailability>>(null);
  const [failed, setFailed] = useState(false);
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setAvailability(null);
    setFailed(false);
    void api.authenticationProviders(controller.signal).then((response) => {
      if (controller.signal.aborted) return;
      const parsed = parseProviderAvailability(response);
      setAvailability(parsed);
      setFailed(!parsed);
    }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [api, nonce]);
  return <main className="standalone-state"><section className="auth-card" aria-labelledby="login-title">
    <BrandLogo/>
    <h1 id="login-title">{brandNames.product}</h1>
    <p>{error ?? "Selecciona un método de autenticación disponible."}</p>
    {failed ? <div role="alert"><p>No se pudo verificar la disponibilidad de los métodos. Inténtalo nuevamente.</p>
      <button className="button secondary" type="button" onClick={() => setNonce((value) => value + 1)}>Reintentar consulta</button></div> :
      !availability ? <p role="status">Consultando métodos disponibles…</p> :
      <div className="login-methods" role="group" aria-label="Métodos de autenticación">
        {displayOrder.map((provider) => {
          const configured = availability.providers.find((entry) => entry.provider === provider)?.available === true;
          const supportedFlow = provider === "ZOHO" || provider === "TCDX_MANAGED_IDENTITY";
          return <button key={provider} className="button secondary" type="button"
            disabled={!configured || !supportedFlow || authenticating}
            onClick={() => { if (provider === "ZOHO" || provider === "TCDX_MANAGED_IDENTITY") onLogin(provider); }}>
            <span>{providerLabels[provider]}</span><small>{configured && supportedFlow ? "Disponible" : "No disponible"}</small>
          </button>;
        })}
      </div>}
    {authenticating && <p role="status">{uiText.auth.connecting}</p>}
  </section></main>;
}
