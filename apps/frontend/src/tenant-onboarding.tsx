import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { CurrentPrincipalAuthorization } from "@tcdx-grc/contracts";
import { ApiClient, ApiProblem } from "./api-client.js";
import { ManagedIdentityWorkspace } from "./managed-identity.js";

export function tenantPresentationPermission(projection: CurrentPrincipalAuthorization | null, tenantId: string | undefined, code: string): boolean {
  const tenant = projection?.tenant_permissions;
  return !!tenantId && tenant?.tenant_id === tenantId && Array.isArray(tenant.permissions[code])
    && tenant.permissions[code]!.some(scope => !!scope && typeof scope === "object" && scope.scope_kind === "tenant" && Object.keys(scope).length === 1);
}
export const initialOnboardingPermissions = ["platform.tenant.create", "platform.user_identity.read"] as const;
export const addUserPermissions = ["platform.membership.create", "platform.user_identity.read", "platform.role.assign", "platform.role.read", "platform.membership.read"] as const;
export type DiscoveryIdentity = { user_identity_id: string; display_name: string | null; provider_display: string | null;
  lifecycle_state: "active"; username?: string | null; email_normalized?: string | null; existing_membership_id?: string };
type DiscoveryPage = { items: DiscoveryIdentity[]; meta: { has_more: boolean; next_cursor: string | null } };
type Role = { role_id: string; name: string; description?: string | null; ownership_class: string; tenant_id: string; lifecycle_state: string };
type Page<T> = { items: T[]; page: { has_more: boolean; next_cursor: string | null } };
type Company = { tenant_code: string; legal_name: string; display_name: string; default_timezone: string };
type Progress = { tenant_id?: string; completed_steps: string[]; pending_steps: string[] };
type Member = { tenant_membership_id: string; user_identity_id: string; tenant_id: string; membership_state: string;
  roles?: { role_id: string; scope_kind: string; valid_from: string; valid_to: string | null }[] };

export function onboardingError(error: unknown): string {
  if (error instanceof ApiProblem) {
    if (error.status === 401) return "La sesión terminó. Inicia sesión nuevamente.";
    if (error.status === 403) return "La operación no está autorizada. Revisa tus permisos y la habilitación comercial de la empresa.";
    if (error.status === 404) return "La identidad no está disponible para esta operación.";
    if (error.status === 409) return "La operación tiene un conflicto. Revisa el estado antes de continuar la misma incorporación.";
    if (error.status === 400 || error.status === 422) return "Revisa los datos ingresados.";
  }
  return "No se pudo confirmar el resultado. Revisa el estado antes de continuar la misma incorporación.";
}

export async function discoverIdentity(api: ApiClient, mode: "platform_search" | "tenant_exact", criterion: string, value: string, cursor?: string): Promise<DiscoveryPage> {
  if (!value.trim() || (mode === "tenant_exact" && (cursor || !["email", "username"].includes(criterion) || /[*%?]/.test(value)))) throw new Error("INVALID_LOOKUP");
  const query = new URLSearchParams({ mode, criterion, value });
  if (cursor) query.set("page[cursor]", cursor);
  const path = `/api/v1/user-identities?${query}`;
  const page = await (mode === "platform_search" ? api.platformGet<DiscoveryPage>(path, { cache: "no-store" }) : api.request<DiscoveryPage>(path, { cache: "no-store" }));
  if (!Array.isArray(page.items) || !page.meta || typeof page.meta.has_more !== "boolean"
    || (mode === "tenant_exact" && (page.items.length > 1 || page.meta.has_more || page.meta.next_cursor !== null))
    || page.items.some(i => typeof i.user_identity_id !== "string" || i.lifecycle_state !== "active")) throw new Error("INVALID_LOOKUP_RESPONSE");
  // Copy only the closed safe projection. Unexpected credential/subject metadata never reaches the UI.
  return { meta: page.meta, items: page.items.map(i => ({ user_identity_id: i.user_identity_id, display_name: i.display_name,
    provider_display: i.provider_display, lifecycle_state: i.lifecycle_state,
    ...(mode === "tenant_exact" ? (i.existing_membership_id ? { existing_membership_id: i.existing_membership_id } : {}) : { ...(i.username !== undefined ? { username: i.username } : {}), ...(i.email_normalized !== undefined ? { email_normalized: i.email_normalized } : {}) }) })) };
}

export async function tenantRoleCatalog(api: ApiClient, tenantId: string): Promise<Role[]> {
  const roles: Role[] = [], cursors = new Set<string>();
  let cursor: string | null = null;
  do {
    const page: Page<Role> = await api.request(`/api/v1/roles${cursor ? `?page%5Bcursor%5D=${encodeURIComponent(cursor)}` : ""}`);
    if (!Array.isArray(page.items) || !page.page || typeof page.page.has_more !== "boolean") throw new Error("INVALID_ROLE_PAGE");
    for (const role of page.items) {
      if (role.tenant_id !== tenantId || role.ownership_class !== "TENANT_OWNED") throw new Error("FOREIGN_ROLE");
      if (role.lifecycle_state === "published") roles.push(role);
    }
    cursor = page.page.has_more ? page.page.next_cursor : null;
    if (page.page.has_more && (!cursor || cursors.has(cursor))) throw new Error("INVALID_ROLE_CURSOR");
    if (cursor) cursors.add(cursor);
  } while (cursor);
  if (new Set(roles.map(role => role.role_id)).size !== roles.length) throw new Error("DUPLICATE_ROLE");
  return roles;
}

function IdentityLookup({ api, platform, authorize, selected, onSelect }: {
  api: ApiClient; platform: boolean; authorize(): Promise<boolean>; selected: DiscoveryIdentity | null; onSelect(identity: DiscoveryIdentity | null): void;
}) {
  const [criterion, setCriterion] = useState(platform ? "display_name" : "email");
  const [value, setValue] = useState("");
  const [result, setResult] = useState<DiscoveryPage | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false), guard = useRef(false), generation = useRef(0);
  const criterionId = useId(), feedbackId = useId();
  useEffect(() => () => { generation.current++; }, []);
  async function search(cursor?: string) {
    if (guard.current) return;
    guard.current = true; setBusy(true); setMessage("");
    const epoch = ++generation.current;
    try {
      if (!await authorize()) throw new ApiProblem({ code: "TCDX.AUTHORIZATION.DENIED", message: "Denied", correlation_id: "", retryable: false }, 403);
      const page = await discoverIdentity(api, platform ? "platform_search" : "tenant_exact", criterion, value, cursor);
      if (epoch !== generation.current) return;
      setResult(current => cursor && current ? { ...page, items: [...current.items, ...page.items] } : page);
      if (!page.items.length) setMessage("No hay una identidad elegible para incorporar con ese criterio.");
    } catch (error) { if (epoch === generation.current) { setResult(null); setMessage(onboardingError(error)); } }
    finally { guard.current = false; setBusy(false); }
  }
  const invalidate = () => { generation.current++; setResult(null); setMessage(""); onSelect(null); };
  return <section aria-label="Buscar identidad existente">
    <p>{platform ? "Busca una identidad existente y selecciona al administrador inicial." : "Ingresa el correo completo o el nombre de usuario exacto y pulsa Buscar. No se muestran directorios ni sugerencias."}</p>
    <form className="admin-form" aria-busy={busy} aria-describedby={message ? feedbackId : undefined} onSubmit={e => { e.preventDefault(); void search(); }}>
      <label><span id={criterionId}>Criterio de búsqueda</span><select aria-labelledby={criterionId} disabled={busy} value={criterion} onChange={e => { invalidate(); setCriterion(e.target.value); }}>
        {platform && <option value="display_name">Nombre</option>}<option value="email">Correo</option><option value="username">Nombre de usuario</option></select></label>
      <label>{criterion === "email" ? "Correo completo" : criterion === "username" ? "Nombre de usuario exacto" : "Nombre de la persona"}
        <input required maxLength={255} autoComplete="off" type={criterion === "email" ? "email" : "text"} disabled={busy} value={value}
          onChange={e => { invalidate(); setValue(e.target.value); }}/></label>
      <button className="button secondary" disabled={busy || !value.trim() || (!platform && /[*%?]/.test(value))} type="submit">{busy ? "Buscando…" : "Buscar"}</button>
    </form>
    {message && <p id={feedbackId} role="status">{message}</p>}
    {result && result.items.length > 1 && <p>Hay varias coincidencias. Revisa la persona o precisa el criterio.</p>}
    {result?.items.map(identity => <label className="onboarding-choice" key={identity.user_identity_id}>
      <input type="radio" name="identity-choice" checked={selected?.user_identity_id === identity.user_identity_id} onChange={() => onSelect(identity)}/>
      <span><strong>{identity.display_name ?? "Identidad disponible"}</strong><small>{identity.provider_display ?? "Proveedor no disponible"}</small>
        {platform && <small>{identity.username ?? identity.email_normalized ?? ""}</small>}{identity.existing_membership_id && <small>Ya está incorporada a esta empresa.</small>}</span>
    </label>)}
    {platform && result?.meta.has_more && result.meta.next_cursor && <button className="button secondary" disabled={busy} onClick={() => void search(result.meta.next_cursor!)}>Cargar más coincidencias</button>}
  </section>;
}

export function InitialCompanyWizard({ api, permissions, authorizeFresh, refetch }: {
  api: ApiClient; permissions: ReadonlySet<string>; authorizeFresh(code: string): Promise<boolean>; refetch(): Promise<void>;
}) {
  const canStart = initialOnboardingPermissions.every(code => permissions.has(code));
  const [open, setOpen] = useState(false), [step, setStep] = useState(0);
  const [company, setCompany] = useState<Company>({ tenant_code: "", legal_name: "", display_name: "", default_timezone: "" });
  const [method, setMethod] = useState<"existing_identity" | "provisioned_managed_identity">("existing_identity");
  const [identity, setIdentity] = useState<DiscoveryIdentity | null>(null);
  const [message, setMessage] = useState(""), [progress, setProgress] = useState<Progress | null>(null), [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false), guard = useRef(false), key = useRef<string | null>(null), title = useRef<HTMLHeadingElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const [reconciled, setReconciled] = useState(false);
  const [miSession, setMiSession] = useState(false);
  useLayoutEffect(() => { if (open) title.current?.focus(); else trigger.current?.focus(); }, [open, step, done]);
  const authorize = async () => { for (const code of initialOnboardingPermissions) if (!await authorizeFresh(code)) return false; return true; };
  async function reconcile() {
    if (guard.current) return;
    setBusy(true); guard.current = true;
    try {
      if (!await authorize()) throw new Error("NO_PERMISSION");
      if (progress?.tenant_id) await api.platformGet(`/api/v1/platform/tenants/${encodeURIComponent(progress.tenant_id)}`);
      await refetch(); setReconciled(true);
      if (progress && !progress.pending_steps.length && progress.completed_steps.includes("tenant_bootstrap")) { setDone(true); setStep(3); setMessage(""); }
      else setMessage("Estado actualizado. Puedes continuar la misma alta inicial.");
    } catch (error) { setMessage(onboardingError(error)); }
    finally { guard.current = false; setBusy(false); }
  }
  async function confirm() {
    if (guard.current || !identity || !canStart || done || (key.current && !reconciled)) return;
    guard.current = true; setBusy(true); setMessage(""); key.current ??= crypto.randomUUID(); setReconciled(false);
    let receipt: Progress | undefined;
    try {
      if (!await authorize()) throw new ApiProblem({ code: "TCDX.AUTHORIZATION.DENIED", message: "Denied", correlation_id: "", retryable: false }, 403);
      const result = await api.platformPost<Progress>("/api/v1/platform/tenants:initial-onboarding", { tenant: company,
        initial_administrator: { kind: method, user_identity_id: identity.user_identity_id } }, key.current);
      if (!result.tenant_id || result.pending_steps.length || !result.completed_steps.includes("tenant_bootstrap")) throw new Error("INVALID_ONBOARDING_RESULT");
      receipt = result; setProgress(result); await refetch(); setDone(true); setStep(3);
    } catch (error) {
      if (error instanceof ApiProblem) {
        const details = error.problem.details as { onboarding_progress?: Progress } | undefined;
        if (details?.onboarding_progress) setProgress(details.onboarding_progress);
      }
      setMessage(receipt ? "Empresa creada y administrador inicial establecido. La actualización de la lista quedó pendiente; revisa el estado." : `${method === "provisioned_managed_identity" ? "La identidad fue creada. La incorporación a la empresa quedó pendiente. " : ""}${onboardingError(error)}`);
      await refetch().catch(() => undefined);
    } finally { guard.current = false; setBusy(false); }
  }
  function close() {
    if (guard.current) return;
    setOpen(false); setMiSession(false);
    if (!done && (key.current || (identity && method === "provisioned_managed_identity"))) { setStep(2); return; }
    setStep(0); setCompany({ tenant_code: "", legal_name: "", display_name: "", default_timezone: "" });
    setIdentity(null); setMessage(""); setProgress(null); setDone(false); key.current = null; setReconciled(false);
  }
  return <>
    {canStart && !open && <button ref={trigger} className="button primary" onClick={() => setOpen(true)}>{!done && (key.current || (identity && method === "provisioned_managed_identity")) ? "Continuar alta inicial" : "Crear empresa"}</button>}
    {open && <section className="data-card onboarding-wizard" aria-labelledby="onboarding-title">
      <h2 ref={title} tabIndex={-1} id="onboarding-title">{["Datos de empresa", "Administrador inicial", "Resumen", "Resultado"][step]}</h2>
      <ol className="onboarding-steps" aria-label="Pasos de creación"><li aria-current={step === 0 ? "step" : undefined}>Datos de empresa</li><li aria-current={step === 1 ? "step" : undefined}>Administrador inicial</li><li aria-current={step === 2 ? "step" : undefined}>Resumen</li><li aria-current={step === 3 ? "step" : undefined}>Resultado</li></ol>
      {step === 0 && <form className="admin-form" onSubmit={e => { e.preventDefault(); try { new Intl.DateTimeFormat("es", { timeZone: company.default_timezone }); setMessage(""); setStep(1); } catch { setMessage("Ingresa una zona horaria IANA válida."); } }} aria-describedby={message ? "onboarding-feedback" : undefined}>
        {([["tenant_code", "Código de empresa"], ["legal_name", "Razón social"], ["display_name", "Nombre visible de empresa"], ["default_timezone", "Zona horaria IANA"]] as const).map(([field, label]) => <label key={field}>{label}<input required value={company[field]} maxLength={field === "tenant_code" || field === "default_timezone" ? 64 : undefined} onChange={e => setCompany(current => ({ ...current, [field]: e.target.value }))}/></label>)}
        <button className="button primary" type="submit">Continuar</button>
      </form>}
      {step === 1 && <>
        <fieldset disabled={busy || (!!identity && method === "provisioned_managed_identity")}><legend>Identidad del administrador inicial</legend>
          <label><input type="radio" name="identity-method" checked={method === "existing_identity"} onChange={() => { setMethod("existing_identity"); setIdentity(null); }}/>Identidad existente</label>
          {permissions.has("platform.managed_identity.create") && <label><input type="radio" name="identity-method" checked={method === "provisioned_managed_identity"} onChange={() => { setMethod("provisioned_managed_identity"); setIdentity(null); setMiSession(true); }}/>Nueva Tecdex Managed Identity</label>}
        </fieldset>
        {method === "existing_identity" && <IdentityLookup api={api} platform authorize={authorize} selected={identity} onSelect={setIdentity}/>}
        <button className="button primary" disabled={!identity || busy} onClick={() => setStep(2)}>Revisar resumen</button>
      </>}
      {method === "provisioned_managed_identity" && miSession && step >= 1 && <ManagedIdentityWorkspace api={api} permissions={permissions} authorizeFresh={authorizeFresh} provisionOnly
        onProvisionBusy={value => { guard.current = value; setBusy(value); }}
        onProvisioned={item => setIdentity({ user_identity_id: item.user_identity_id, display_name: item.display_name, provider_display: "Tecdex Managed Identity", lifecycle_state: "active" })}/>}
      {step === 2 && <>
        <dl><dt>Empresa</dt><dd>{company.display_name}</dd><dt>Razón social</dt><dd>{company.legal_name}</dd><dt>Código de empresa</dt><dd>{company.tenant_code}</dd><dt>Zona horaria</dt><dd>{company.default_timezone}</dd><dt>Administrador inicial</dt><dd>{identity?.display_name ?? "Identidad seleccionada"}</dd><dt>Proveedor</dt><dd>{identity?.provider_display ?? "Proveedor no disponible"}</dd></dl>
        <p>Se establecerá al administrador inicial y se prepararán los roles base. La habilitación comercial posterior es independiente.</p>
        {!!progress?.pending_steps.length && progress.completed_steps.includes("tenant_create") && <p role="status">Empresa creada. Administrador inicial pendiente de completar.</p>}
        {key.current && !reconciled ? <button className="button secondary" disabled={busy} onClick={() => void reconcile()}>Revisar estado para continuar</button> :
          <button className="button primary" disabled={busy || !canStart} onClick={() => void confirm()}>{busy ? "Confirmando…" : key.current ? "Continuar alta inicial" : "Confirmar creación"}</button>}
      </>}
      {step === 3 && <div role="status"><h3>Empresa creada</h3><p>Administrador inicial establecido.</p><p>Roles base preparados.</p><p>La habilitación comercial queda pendiente de su gestión independiente.</p></div>}
      {message && <p id="onboarding-feedback" role="alert" aria-label="Resultado de creación de empresa">{message}</p>}
      <div className="onboarding-actions">{step > 0 && step < 3 && !key.current && method === "existing_identity" && <button className="button secondary" disabled={busy} onClick={() => setStep(step - 1)}>Anterior</button>}
        <button className="button secondary" disabled={busy} onClick={close}>{key.current && !done ? "Salir del resultado pendiente" : done ? "Cerrar resultado" : "Cancelar"}</button></div>
    </section>}
  </>;
}

export class TenantUserIntent {
  readonly membershipKey = crypto.randomUUID();
  private keys = new Map<string, string>();
  membershipId: string | undefined;
  constructor(readonly tenantId: string, readonly identity: DiscoveryIdentity, readonly roles: string[]) { this.membershipId = identity.existing_membership_id; }
  async reconcile(api: ApiClient): Promise<Member | undefined> {
    let member: Member | undefined;
    if (this.membershipId) member = await api.request<Member>(`/api/v1/memberships/${encodeURIComponent(this.membershipId)}`);
    else {
      const cursors = new Set<string>(); let cursor: string | null = null;
      do {
        const page: Page<Member> = await api.request(`/api/v1/memberships${cursor ? `?page%5Bcursor%5D=${encodeURIComponent(cursor)}` : ""}`);
        if (!Array.isArray(page.items) || !page.page) throw new Error("INVALID_MEMBERSHIP_PAGE");
        const matches = page.items.filter(m => m.user_identity_id === this.identity.user_identity_id);
        if (matches.length > 1 || (member && matches.length)) throw new Error("AMBIGUOUS_MEMBERSHIP");
        member ??= matches[0];
        cursor = page.page.has_more ? page.page.next_cursor : null;
        if (page.page.has_more && (!cursor || cursors.has(cursor))) throw new Error("INVALID_MEMBERSHIP_CURSOR");
        if (cursor) cursors.add(cursor);
      } while (cursor);
      if (member) { this.membershipId = member.tenant_membership_id; member = await api.request<Member>(`/api/v1/memberships/${encodeURIComponent(this.membershipId)}`); }
    }
    if (member && (member.tenant_id !== this.tenantId || member.user_identity_id !== this.identity.user_identity_id || member.membership_state !== "active")) throw new Error("INVALID_MEMBERSHIP");
    return member;
  }
  async complete(api: ApiClient, refetch: () => Promise<void>): Promise<void> {
    let member = await this.reconcile(api);
    if (!member) {
      const response = await api.post<{ result: Member }>("/api/v1/memberships", { user_identity_id: this.identity.user_identity_id }, this.membershipKey);
      const created = response.result;
      if (!created?.tenant_membership_id || created.tenant_id !== this.tenantId || created.user_identity_id !== this.identity.user_identity_id || created.membership_state !== "active") throw new Error("INVALID_CREATED_MEMBERSHIP");
      this.membershipId = created.tenant_membership_id; await refetch(); member = await this.reconcile(api);
    }
    if (!member || !Array.isArray(member.roles)) throw new Error("MISSING_ROLE_STATE");
    for (const roleId of this.roles) {
      if (member.roles.some(role => role.role_id === roleId && role.scope_kind === "tenant" && Date.parse(role.valid_from) <= Date.now() && (!role.valid_to || Date.parse(role.valid_to) > Date.now()))) continue;
      const key = this.keys.get(roleId) ?? crypto.randomUUID(); this.keys.set(roleId, key);
      await api.post(`/api/v1/memberships/${encodeURIComponent(this.membershipId!)}/role-assignments`, { role_id: roleId, scope_kind: "tenant" }, key);
      await refetch(); member = await this.reconcile(api);
      if (!member || !Array.isArray(member.roles)) throw new Error("MISSING_ROLE_STATE");
      if (!member.roles.some(role => role.role_id === roleId && role.scope_kind === "tenant" && Date.parse(role.valid_from) <= Date.now() && (!role.valid_to || Date.parse(role.valid_to) > Date.now()))) throw new Error("ROLE_NOT_CONFIRMED_BY_SERVER");
    }
    await refetch();
  }
}

export function AddTenantUser({ api, tenantId, projection, authorizeFresh, refetch }: {
  api: ApiClient; tenantId: string; projection: CurrentPrincipalAuthorization | null; authorizeFresh(codes: readonly string[]): Promise<boolean>; refetch(): Promise<void>;
}) {
  const eligible = addUserPermissions.every(code => tenantPresentationPermission(projection, tenantId, code));
  const [open, setOpen] = useState(false), [handoff, setHandoff] = useState(false), [identity, setIdentity] = useState<DiscoveryIdentity | null>(null);
  const [roles, setRoles] = useState<Role[]>([]), [selectedRoles, setSelectedRoles] = useState<string[]>([]), [catalogReady, setCatalogReady] = useState(false);
  const [busy, setBusy] = useState(false), guard = useRef(false), intent = useRef<TenantUserIntent | null>(null);
  const [message, setMessage] = useState(""), [done, setDone] = useState(false), title = useRef<HTMLHeadingElement>(null), trigger = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => { if (open) title.current?.focus(); else trigger.current?.focus(); }, [open]);
  useEffect(() => {
    if (!open || handoff || !eligible) return;
    let current = true; setCatalogReady(false);
    void tenantRoleCatalog(api, tenantId).then(list => { if (current) { setRoles(list); setCatalogReady(true); } }).catch(error => { if (current) setMessage(onboardingError(error)); });
    return () => { current = false; };
  }, [open, handoff, eligible, api, tenantId]);
  async function confirm() {
    if (guard.current || !identity || !eligible || !catalogReady || !selectedRoles.length || done) return;
    guard.current = true; setBusy(true); setMessage("");
    try {
      if (!await authorizeFresh(addUserPermissions)) throw new ApiProblem({ code: "TCDX.AUTHORIZATION.DENIED", message: "Denied", correlation_id: "", retryable: false }, 403);
      intent.current ??= new TenantUserIntent(tenantId, identity, selectedRoles);
      await intent.current.complete(api, refetch); setDone(true); setMessage("Usuario incorporado. Roles confirmados desde el servidor.");
    } catch (error) {
      setMessage(`${intent.current?.membershipId ? "Usuario incorporado. Algunos roles quedaron pendientes. " : ""}${onboardingError(error)}`);
      await refetch().catch(() => undefined);
    } finally { guard.current = false; setBusy(false); }
  }
  function close() { if (guard.current) return; setOpen(false); if (intent.current && !done) return; setIdentity(null); setSelectedRoles([]); setMessage(""); setHandoff(false); setDone(false); intent.current = null; }
  return <>
    {eligible && !open && <button ref={trigger} className="button primary" onClick={() => setOpen(true)}>{intent.current && !done ? "Continuar incorporación" : "Agregar usuario"}</button>}
    {open && <section className="data-card onboarding-wizard" aria-labelledby="add-user-title">
      <h2 id="add-user-title" tabIndex={-1} ref={title}>Agregar usuario</h2>
      {!intent.current && <fieldset disabled={busy}><legend>Identidad</legend><label><input type="radio" name="tenant-identity-method" checked={!handoff} onChange={() => setHandoff(false)}/>Identidad existente</label><label><input type="radio" name="tenant-identity-method" checked={handoff} onChange={() => { setHandoff(true); setIdentity(null); }}/>Nueva Tecdex Managed Identity</label></fieldset>}
      {handoff ? <><p>Las credenciales Tecdex Managed Identity son administradas a nivel de plataforma. Solicita a un administrador de plataforma crear la identidad y luego vuelve a incorporarla a esta empresa.</p>
        {projection?.platform_permissions.includes("platform.managed_identity.create") && <a href="/configuraciones/identidades-gestionadas">Ir a Identidades gestionadas</a>}</> : <>
        {!intent.current && <IdentityLookup api={api} platform={false} authorize={() => authorizeFresh(["platform.user_identity.read"])} selected={identity} onSelect={setIdentity}/>}
        {identity && <><p>Persona seleccionada: {identity.display_name ?? "Identidad disponible"} · {identity.provider_display ?? "Proveedor no disponible"}</p>
          <fieldset disabled={busy || !!intent.current || !catalogReady}><legend>Roles</legend>{!catalogReady ? <p role="status">Cargando roles…</p> : !roles.length ? <p>No hay roles disponibles para asignar.</p> : roles.map(role => <label className="onboarding-choice" key={role.role_id}><input type="checkbox" checked={selectedRoles.includes(role.role_id)} onChange={e => setSelectedRoles(current => e.target.checked ? [...current, role.role_id] : current.filter(id => id !== role.role_id))}/><span>{role.name}{role.description && <small>{role.description}</small>}</span></label>)}</fieldset>
          {!done && <button className="button primary" disabled={busy || !eligible || !catalogReady || !selectedRoles.length} onClick={() => void confirm()}>{busy ? "Confirmando…" : intent.current ? "Revisar y completar roles pendientes" : "Confirmar incorporación"}</button>}
        </>}
      </>}
      {message && <p role="status">{message}</p>}
      <button className="button secondary" disabled={busy} onClick={close}>{done ? "Cerrar resultado" : intent.current ? "Salir del resultado pendiente" : "Cancelar"}</button>
    </section>}
  </>;
}
