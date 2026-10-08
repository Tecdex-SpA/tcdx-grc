import { useEffect, useRef, useState } from "react";
import { ApiClient, ApiProblem } from "./api-client.js";
import { ManagedIdentityTenantAccess, CentralTenantUserIntent } from "./managed-identity-tenant-access.js";
import { PlatformRoleWorkspace } from "./platform-roles.js";
import { brandNames } from "./branding.js";

const base = "/api/v1/platform/managed-identities";
const readCode = "platform.managed_identity.read";
const createCode = "platform.managed_identity.create";
const administerCode = "platform.managed_identity.administer";

export type ManagedIdentity = {
  user_identity_id: string; provider: "tcdx-managed-identity"; issuer: string; subject_reference: string;
  username: string; display_name: string; identity_lifecycle_state: string; enabled: boolean; mfa_enrolled: boolean;
};
type Page = { items: ManagedIdentity[]; page: { has_more: boolean; next_cursor: string | null } };
export type CredentialResult = { identity: ManagedIdentity; credential_disclosed: boolean; temporary_credential?: string };
type Action = "disable" | "enable" | "password-reset" | "mfa-reset" | "session-revoke";
const actions: Readonly<Record<Action, { label: string; suffix: string; guidance: string }>> = {
  disable: { label: "Deshabilitar", suffix: ":disable", guidance: "La identidad dejará de iniciar sesión. Membership, roles e historial permanecen." },
  enable: { label: "Habilitar", suffix: ":enable", guidance: "Habilitar la identidad no reactiva Membership ni roles." },
  "password-reset": { label: "Restablecer contraseña", suffix: ":password-reset", guidance: "Se emitirá una nueva credencial temporal una sola vez. Entrega por un canal autorizado." },
  "mfa-reset": { label: "Restablecer MFA", suffix: ":mfa-reset", guidance: "La persona deberá enrolar MFA nuevamente en el flujo aprobado." },
  "session-revoke": { label: "Revocar sesiones", suffix: "/sessions:revoke", guidance: "Se revocarán las sesiones de esta identidad." }
};

function safeError(error: unknown): string {
  if (error instanceof ApiProblem) {
    if (error.status === 401) return "La sesión terminó. Inicia sesión nuevamente.";
    if (error.status === 403) return "No tienes autorización para esta operación.";
    if (error.status === 404) return "La identidad no está disponible para esta operación.";
    if (error.status === 409) return "La operación no pudo completarse por un conflicto.";
  }
  return "No se pudo establecer el resultado. Revisa el estado antes de realizar otra acción.";
}

export function ManagedIdentityWorkspace({ api, permissions, authorizeFresh, provisionOnly = false, onProvisioned, onProvisionBusy }: {
  api: ApiClient; permissions: ReadonlySet<string>; authorizeFresh(permission: string): Promise<boolean>;
  onProvisionBusy?(busy: boolean): void; provisionOnly?: boolean; onProvisioned?(identity: ManagedIdentity): void;
}) {
  const canRead = !provisionOnly && permissions.has(readCode);
  const canCreate = permissions.has(createCode);
  const canAdminister = permissions.has(administerCode);
  const [items, setItems] = useState<ManagedIdentity[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [selected, setSelected] = useState<ManagedIdentity | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [provisionOpen, setProvisionOpen] = useState(provisionOnly);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [personRef, setPersonRef] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [credential, setCredential] = useState<string | null>(null);
  const [replayed, setReplayed] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [provisionedIdentity,setProvisionedIdentity] = useState<ManagedIdentity | null>(null);
  const companyIntents = useRef(new Map<string,CentralTenantUserIntent>());
  const [accessEditing,setAccessEditing] = useState(false);
  const [roleEditing, setRoleEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const intentKey = useRef<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const lastTrigger = useRef<HTMLElement | null>(null);

  const loadPage = async (next: string | null = null) => {
    if (!canRead) return;
    setLoading(true);
    try {
      const url = next ? `${base}?page%5Bcursor%5D=${encodeURIComponent(next)}` : base;
      const page = await api.platformGet<Page>(url);
      if (!Array.isArray(page.items) || !page.page || typeof page.page.has_more !== "boolean") throw new Error("INVALID_MI_PAGE");
      setItems((current) => next ? [...current, ...page.items] : page.items);
      setCursor(page.page.has_more ? page.page.next_cursor : null);
    } catch (error) { setFeedback(safeError(error)); if (!next) { setItems([]); setCursor(null); } }
    finally { setLoading(false); }
  };
  useEffect(() => { if (canRead) void loadPage(); else { setItems([]); setSelected(null); } }, [canRead, api]);

  useEffect(() => {
    if (!selected && !provisionOpen) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (provisionOnly) return;
      if (event.key === "Escape") { event.preventDefault(); close(); }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])")];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first && last) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last && first) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selected?.user_identity_id, provisionOpen]);

  function clearIntent(): void {
    intentKey.current = null;
    setCredential(null);
    setReplayed(false);
    setRecovery(false);
    setReason("");
    setPersonRef("");
    setFeedback("");
  }
  function close(): void {
    if (busyRef.current) return;
    setSelected(null);
    setProvisionedIdentity(null);
    setAccessEditing(false);
    setRoleEditing(false);
    setAction(null);
    setProvisionOpen(false);
    clearIntent();
    lastTrigger.current?.focus();
  }
  function beginProvision(event: React.MouseEvent<HTMLButtonElement>): void {
    lastTrigger.current = event.currentTarget;
    clearIntent();
    setProvisionedIdentity(null);
    setDisplayName(""); setUsername(""); setEmail("");
    setProvisionOpen(true);
  }
  async function openIdentity(identity: ManagedIdentity, event: React.MouseEvent<HTMLButtonElement>): Promise<void> {
    if (!canRead) return;
    lastTrigger.current = event.currentTarget;
    clearIntent();
    setSelected(null);
    try {
      const result = await api.platformGet<ManagedIdentity>(`${base}/${encodeURIComponent(identity.user_identity_id)}`);
      setSelected(result);
    } catch (error) { setFeedback(safeError(error)); }
  }
  function chooseAction(next: Action): void {
    clearIntent();
    setAction(next);
  }
  async function submitProvision(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!canCreate || busyRef.current || recovery) return;
    if (!displayName.trim() || !username.trim() || !personRef.trim()) { setFeedback("Completa los campos obligatorios."); return; }
    busyRef.current = true; setBusy(true); onProvisionBusy?.(true); setFeedback(""); setCredential(null);
    intentKey.current ??= crypto.randomUUID();
    try {
      if (!await authorizeFresh(createCode)) { setFeedback("El permiso ya no está vigente."); return; }
      const result = await api.platformPost<CredentialResult>(base, {
        display_name: displayName.trim(), username: username.trim(), person_verification_ref: personRef.trim(),
        ...(email.trim() ? { email: email.trim() } : {})
      }, intentKey.current);
      setReplayed(result.credential_disclosed === false);
      setCredential(result.credential_disclosed === true && typeof result.temporary_credential === "string"
        ? result.temporary_credential : null);
      setFeedback(result.credential_disclosed ? "Identidad creada. Entrega la credencial por un canal autorizado." :
        "La credencial ya fue emitida y no puede recuperarse desde este resultado.");
      setProvisionedIdentity(result.identity);
      onProvisioned?.(result.identity);
      intentKey.current = null;
      void loadPage();
    } catch (error) {
      if (error instanceof ApiProblem && error.problem.code === "TCDX.CONFLICT.RECOVERY_REQUIRED") {
        setRecovery(true); setFeedback("El resultado no pudo establecerse con seguridad. Verifica el estado y realiza una nueva acción explícita autorizada.");
      } else setFeedback(safeError(error));
    } finally { busyRef.current = false; setBusy(false); onProvisionBusy?.(false); }
  }
  async function submitAction(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!selected || !action || !canAdminister || busyRef.current || recovery) return;
    if (!reason.trim() || (action === "password-reset" && !personRef.trim())) {
      setFeedback("Indica el motivo y la referencia de verificación requerida."); return;
    }
    busyRef.current = true; setBusy(true); setFeedback(""); setCredential(null);
    intentKey.current ??= crypto.randomUUID();
    try {
      if (!await authorizeFresh(administerCode)) { setFeedback("El permiso ya no está vigente."); return; }
      const result = await api.platformPost<ManagedIdentity | CredentialResult>(
        `${base}/${encodeURIComponent(selected.user_identity_id)}${actions[action].suffix}`,
        { reason: reason.trim(), ...(action === "password-reset" ? { person_verification_ref: personRef.trim() } : {}) },
        intentKey.current
      );
      const credentialResult = result as CredentialResult;
      setSelected(action === "password-reset" ? credentialResult.identity : result as ManagedIdentity);
      setReplayed(action === "password-reset" && credentialResult.credential_disclosed === false);
      setCredential(action === "password-reset" && credentialResult.credential_disclosed === true
        && typeof credentialResult.temporary_credential === "string" ? credentialResult.temporary_credential : null);
      setFeedback(action === "password-reset" ? credentialResult.credential_disclosed
        ? "Nueva credencial emitida. Entrégala por un canal autorizado." : "La credencial ya fue emitida y no puede recuperarse." :
        "Operación completada.");
      intentKey.current = null;
      setAction(null);
      void loadPage();
    } catch (error) {
      if (error instanceof ApiProblem && error.problem.code === "TCDX.CONFLICT.RECOVERY_REQUIRED") {
        setRecovery(true);
        setFeedback("El resultado no pudo establecerse con seguridad. No se repetirá automáticamente. Verifica el estado y solicita una nueva acción explícita autorizada.");
      } else setFeedback(safeError(error));
    } finally { busyRef.current = false; setBusy(false); }
  }

  const dialogOpen = selected !== null || provisionOpen;
  const intentLocked = intentKey.current !== null;
  return <section className="mi-workspace" aria-labelledby={provisionOnly ? "mi-dialog-title" : "mi-title"}>
    {!provisionOnly && <div className="page-heading"><div><p className="eyebrow">Administración de plataforma</p><h1 id="mi-title">Identidades gestionadas</h1>
      <p>Metadatos de identidad {brandNames.managedIdentity}. Las credenciales y MFA permanecen en IAM.</p></div>
      {canCreate && <button type="button" className="button primary" onClick={beginProvision}>Provisionar identidad</button>}</div>}
    {feedback && !dialogOpen && <p role="alert" aria-label="Estado de identidades" className="mi-feedback">{feedback}</p>}
    {canRead ? <section className="data-card" aria-label="Listado de identidades">
      {loading && items.length === 0 ? <p role="status">Cargando identidades…</p> :
        items.length === 0 ? <p>Sin identidades visibles.</p> :
        <div className="table-scroll"><table><thead><tr><th>Nombre</th><th>Usuario</th><th>Estado</th><th>MFA</th><th><span className="sr-only">Acción</span></th></tr></thead>
          <tbody>{items.map((identity) => <tr key={identity.user_identity_id}><td data-label="Nombre">{identity.display_name}</td><td data-label="Usuario">{identity.username}</td>
            <td data-label="Estado">{identity.enabled ? "Habilitada" : "Deshabilitada"}</td><td data-label="MFA">{identity.mfa_enrolled ? "Enrolado" : "Pendiente"}</td>
            <td data-label="Acción"><button type="button" className="link-button" onClick={(event) => void openIdentity(identity, event)}>Ver detalle</button></td></tr>)}</tbody></table></div>}
      {cursor && <button type="button" className="button secondary" disabled={loading} onClick={() => void loadPage(cursor)}>Cargar más</button>}
    </section> : !provisionOnly && <p>El listado requiere el permiso de lectura de plataforma.</p>}
    {dialogOpen && <div className={provisionOnly ? "onboarding-provision" : "drawer-backdrop"} role="presentation"><aside ref={dialogRef} className={provisionOnly ? "data-card" : "drawer"} role={provisionOnly ? "region" : "dialog"} aria-modal={provisionOnly ? undefined : true}
      aria-labelledby="mi-dialog-title"><header className="drawer-header"><h2 id="mi-dialog-title">{provisionOpen ? "Provisionar identidad" : selected?.display_name}</h2>
        {!provisionOnly && <button ref={closeRef} type="button" className="icon-button" aria-label="Cerrar detalle" onClick={close}>×</button>}</header>
      <div className="drawer-body">
        {provisionOpen ? <form className="mi-form" aria-describedby={feedback ? "mi-dialog-feedback" : undefined} onSubmit={(event) => void submitProvision(event)}>
          <label>Nombre visible<input required maxLength={255} value={displayName} disabled={busy || intentLocked || replayed || !!credential || !!provisionedIdentity} onChange={(event) => setDisplayName(event.target.value)}/></label>
          <label>Nombre de usuario<input required maxLength={255} value={username} disabled={busy || intentLocked || replayed || !!credential || !!provisionedIdentity} onChange={(event) => setUsername(event.target.value)}/></label>
          <label>Referencia de verificación de persona<input required maxLength={255} value={personRef} disabled={busy || intentLocked || replayed || !!credential || !!provisionedIdentity} onChange={(event) => setPersonRef(event.target.value)}/></label>
          <label>Correo opcional<input type="email" value={email} disabled={busy || intentLocked || replayed || !!credential || !!provisionedIdentity} onChange={(event) => setEmail(event.target.value)}/></label>
          {!recovery && !replayed && !credential && !provisionedIdentity && <button className="button primary" type="submit" disabled={busy}>Confirmar provisión</button>}
        </form> : selected && <><dl><dt>Usuario</dt><dd>{selected.username}</dd><dt>Estado</dt><dd>{selected.enabled ? "Habilitada" : "Deshabilitada"}</dd>
          <dt>MFA</dt><dd>{selected.mfa_enrolled ? "Enrolado" : "Pendiente de enrolamiento"}</dd><dt>Issuer</dt><dd>{selected.issuer}</dd>
          <dt>Subject</dt><dd>{selected.subject_reference}</dd></dl>
          {!roleEditing && !action && !credential && !replayed && !recovery && <ManagedIdentityTenantAccess key={`company-${selected.user_identity_id}`} api={api}
            userId={selected.user_identity_id} permissions={permissions} authorizeFresh={authorizeFresh} intents={companyIntents.current}
            onBusyChange={value=>{busyRef.current=value;setBusy(value);}} onEditingChange={setAccessEditing}/>}
          {!accessEditing && !action && !credential && !replayed && !recovery && <PlatformRoleWorkspace key={selected.user_identity_id} api={api}
            targetId={selected.user_identity_id} permissions={permissions} authorizeFresh={authorizeFresh}
            onBusyChange={value => { busyRef.current = value; setBusy(value); }} onEditingChange={setRoleEditing}/>}
          {canAdminister && !roleEditing && !accessEditing && !action && !credential && !replayed && !recovery && <div className="mi-actions" role="group" aria-label="Acciones de identidad">
            {(Object.keys(actions) as Action[]).filter((candidate) => candidate === "disable" ? selected.enabled : candidate === "enable" ? !selected.enabled : true)
              .map((candidate) => <button key={candidate} type="button" className="button secondary" onClick={() => chooseAction(candidate)}>{actions[candidate].label}</button>)}
          </div>}
          {canAdminister && action && <form className="mi-form" aria-describedby={feedback ? "mi-dialog-feedback" : undefined} onSubmit={(event) => void submitAction(event)}>
            <h3>{actions[action].label}</h3><p>{actions[action].guidance}</p>
            <label>Motivo<textarea required maxLength={2000} value={reason} disabled={busy || intentLocked} onChange={(event) => setReason(event.target.value)}/></label>
            {action === "password-reset" && <label>Referencia de verificación de persona<input required maxLength={255} value={personRef} disabled={busy || intentLocked} onChange={(event) => setPersonRef(event.target.value)}/></label>}
            {!recovery && <button className="button primary" type="submit" disabled={busy}>Confirmar {actions[action].label.toLowerCase()}</button>}
            <button className="button secondary" type="button" disabled={busy} onClick={() => { setAction(null); clearIntent(); }}>Cancelar</button>
          </form>}</>}
        {feedback && <p id="mi-dialog-feedback" role="alert" aria-label="Resultado de identidad" className="mi-feedback">{feedback}</p>}
        {credential && <section className="mi-credential" aria-label="Credencial temporal"><h3>Credencial temporal</h3>
          <p>Visible sólo ahora. Entrégala externamente por un canal autorizado; no podrá recuperarse.</p>
          <output aria-label="Credencial temporal emitida">{credential}</output>
          <button type="button" className="button secondary" onClick={() => void navigator.clipboard.writeText(credential).catch(() => setFeedback("No se pudo copiar. Usa el valor visible ahora."))}>Copiar</button>
          <button type="button" className="button secondary" disabled={busy} onClick={()=>setCredential(null)}>Ya custodié la credencial</button>
        </section>}
        {provisionOpen && provisionedIdentity && !provisionOnly && <>
          <ManagedIdentityTenantAccess key={`provision-company-${provisionedIdentity.user_identity_id}`} api={api} userId={provisionedIdentity.user_identity_id}
            permissions={permissions} authorizeFresh={authorizeFresh} intents={companyIntents.current} optional
            onBusyChange={value=>{busyRef.current=value;setBusy(value);}} onEditingChange={setAccessEditing}/>
          <button type="button" className="button secondary" disabled={busy} onClick={close}>Finalizar sólo con identidad</button>
        </>}
        {recovery && !provisionOnly && <button type="button" className="button secondary" onClick={() => { clearIntent(); setAction(null); setProvisionOpen(false); setSelected(null); }}>Iniciar nueva acción explícita</button>}
      </div>{!provisionOnly && <footer className="drawer-footer"><button type="button" className="button secondary" disabled={busy} onClick={close}>Cerrar</button></footer>}
    </aside></div>}
  </section>;
}
