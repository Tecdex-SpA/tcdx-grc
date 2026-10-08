import { useEffect, useRef, useState } from "react";
import { ApiClient, ApiProblem } from "./api-client.js";

const administerCode = "platform.role.administer";
const catalogCode = "platform.role.read";
const catalogPath = "/api/v1/roles?assignable_family=platform";
export type PlatformAssignment = { platform_role_assignment_id: string; user_identity_id: string;
  role_code: string; role_name: string; valid_from: string; valid_to: string | null };
export type PlatformRoleOption = { role_code: string; name: string };
type Collection<T> = { status: "loading" | "ready" | "error"; items: T[]; message: string };
type Intent = { kind: "assign" } | { kind: "revoke"; assignment: PlatformAssignment };
const text = (value: unknown): value is string => typeof value === "string" && value.length > 0;
const timestamp = (value: unknown): value is string => text(value) && Number.isFinite(Date.parse(value));
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

export function parsePlatformAssignments(value: unknown, targetId: string): PlatformAssignment[] {
  if (!record(value) || !Array.isArray(value.items)) throw new Error("INVALID_PLATFORM_ASSIGNMENT_PROJECTION");
  const ids = new Set<string>();
  return value.items.map((item: unknown) => {
    if (!record(item) || !text(item.platform_role_assignment_id) || ids.has(item.platform_role_assignment_id)
      || item.user_identity_id !== targetId || !text(item.role_code) || typeof item.role_name !== "string"
      || !timestamp(item.valid_from) || !(item.valid_to === null || timestamp(item.valid_to))) {
      throw new Error("INVALID_PLATFORM_ASSIGNMENT_PROJECTION");
    }
    ids.add(item.platform_role_assignment_id);
    return { platform_role_assignment_id: item.platform_role_assignment_id, user_identity_id: targetId,
      role_code: item.role_code, role_name: item.role_name, valid_from: item.valid_from, valid_to: item.valid_to };
  });
}

export async function loadPlatformRoleCatalog(api: ApiClient, signal?: AbortSignal): Promise<PlatformRoleOption[]> {
  const items: PlatformRoleOption[] = [], cursors = new Set<string>(), codes = new Set<string>();
  let cursor: string | null = null;
  do {
    const value: unknown = await api.platformGet(catalogPath + (cursor ? `&page%5Bcursor%5D=${encodeURIComponent(cursor)}` : ""),
      { cache: "no-store", ...(signal ? { signal } : {}) });
    if (!record(value) || !Array.isArray(value.items) || !record(value.page) || typeof value.page.has_more !== "boolean"
      || !(value.page.next_cursor === null || text(value.page.next_cursor))) throw new Error("INVALID_PLATFORM_ROLE_CATALOG");
    for (const item of value.items) {
      if (!record(item) || !text(item.role_code) || !text(item.name) || item.ownership_class !== "PLATFORM_CONTROL"
        || item.tenant_id !== null || item.is_baseline !== true || item.lifecycle_state !== "published" || codes.has(item.role_code)) {
        throw new Error("INVALID_PLATFORM_ROLE_CATALOG");
      }
      codes.add(item.role_code); items.push({ role_code: item.role_code, name: item.name });
    }
    cursor = value.page.has_more ? value.page.next_cursor as string | null : null;
    if (value.page.has_more && (!cursor || cursors.has(cursor))) throw new Error("INVALID_PLATFORM_ROLE_CURSOR");
    if (cursor) cursors.add(cursor);
  } while (cursor);
  return items;
}

export function sendPlatformRoleChange(api: ApiClient, targetId: string, change:
  { kind: "assign"; role_code: string; reason: string } | { kind: "revoke"; platform_role_assignment_id: string; reason: string }): Promise<unknown> {
  const reason = change.reason.trim();
  if (!reason || reason.length > 2000) throw new Error("INVALID_PLATFORM_ROLE_REASON");
  const base = `/api/v1/platform/user-identities/${encodeURIComponent(targetId)}/platform-roles`;
  return api.platformPost(change.kind === "assign" ? base : `${base}/${encodeURIComponent(change.platform_role_assignment_id)}:revoke`,
    change.kind === "assign" ? { role_code: change.role_code, reason } : { reason }, crypto.randomUUID());
}

export function platformRoleError(error: unknown, mutation = false): string {
  if (error instanceof ApiProblem) {
    if (error.status === 401) return "La sesión terminó. Inicia sesión nuevamente.";
    if (error.status === 403) return "No tienes autorización para esta operación de plataforma.";
    if (error.status === 400) return "Los datos enviados no son válidos. Revisa el rol y el motivo.";
    if (error.status === 404) return "La identidad o asignación ya no está disponible. Actualiza el estado.";
    if (error.status === 409) return "La operación fue rechazada por un conflicto. Puede existir una asignación vigente o protección del último administrador de plataforma. El servidor conserva la autoridad; actualiza el estado.";
  }
  return mutation ? "No se pudo confirmar el resultado. No repitas la operación; actualiza el estado del servidor antes de iniciar una nueva acción." :
    "No se pudo cargar el estado de plataforma. Intenta actualizar la lectura.";
}

export function PlatformRoleWorkspace({ api, targetId, permissions, authorizeFresh, onBusyChange, onEditingChange }: {
  api: ApiClient; targetId: string; permissions: ReadonlySet<string>; authorizeFresh(permission: string): Promise<boolean>;
  onBusyChange(busy: boolean): void; onEditingChange(editing: boolean): void;
}) {
  const canAdminister = permissions.has(administerCode), canCatalog = permissions.has(catalogCode);
  const [assignments, setAssignments] = useState<Collection<PlatformAssignment>>({ status: "loading", items: [], message: "" });
  const [catalog, setCatalog] = useState<Collection<PlatformRoleOption>>({ status: "loading", items: [], message: "" });
  const [intent, setIntent] = useState<Intent | null>(null);
  const [roleCode, setRoleCode] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [fieldError, setFieldError] = useState("");
  const busyRef = useRef(false), mounted = useRef(true), trigger = useRef<HTMLElement | null>(null);
  const focusRestorationPending = useRef(false);
  const refreshButton = useRef<HTMLButtonElement>(null);
  const firstField = useRef<HTMLSelectElement | HTMLTextAreaElement | null>(null);
  const callbacks = useRef({ onBusyChange, onEditingChange }); callbacks.current = { onBusyChange, onEditingChange };
  const assignmentPath = `/api/v1/platform/user-identities/${encodeURIComponent(targetId)}/platform-roles`;
  const readAssignments = async (signal?: AbortSignal): Promise<boolean> => {
    setAssignments(current => ({ ...current, status: "loading", message: "" }));
    try {
      const items = parsePlatformAssignments(await api.platformGet(assignmentPath, { cache: "no-store", ...(signal ? { signal } : {}) }), targetId);
      if (signal?.aborted || !mounted.current) return false;
      setAssignments({ status: "ready", items, message: "" }); return true;
    } catch (error) {
      if (!signal?.aborted && mounted.current) setAssignments(current => ({ ...current, status: "error", message: platformRoleError(error) }));
      return false;
    }
  };
  const readCatalog = async (signal?: AbortSignal) => {
    setCatalog(current => ({ ...current, status: "loading", message: "" }));
    try {
      const items = await loadPlatformRoleCatalog(api, signal);
      if (!signal?.aborted && mounted.current) setCatalog({ status: "ready", items, message: "" });
    } catch (error) {
      if (!signal?.aborted && mounted.current) setCatalog({ status: "error", items: [], message: platformRoleError(error) });
    }
  };
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; callbacks.current.onBusyChange(false); callbacks.current.onEditingChange(false); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    if (canAdminister) void readAssignments(controller.signal);
    else { setAssignments({ status: "error", items: [], message: "La lectura requiere autorización de administración de roles de plataforma." }); setIntent(null); callbacks.current.onEditingChange(false); }
    return () => controller.abort();
  }, [api, targetId, canAdminister]);
  useEffect(() => {
    const controller = new AbortController();
    if (canCatalog) void readCatalog(controller.signal);
    else { setCatalog({ status: "error", items: [], message: "El catálogo requiere el permiso de lectura de roles de plataforma." }); }
    return () => controller.abort();
  }, [api, canCatalog]);
  useEffect(() => { if (intent) firstField.current?.focus(); }, [intent]);

  useEffect(() => {
    if (!focusRestorationPending.current || busy || intent || !mounted.current) return;
    const target = trigger.current?.isConnected ? trigger.current : refreshButton.current;
    if (target && !(target instanceof HTMLButtonElement && target.disabled)) {
      target.focus(); focusRestorationPending.current = false;
    }
  }, [busy, intent]);
  function restoreFocus() { focusRestorationPending.current = true; }
  function begin(next: Intent, event: React.MouseEvent<HTMLButtonElement>) {
    trigger.current = event.currentTarget; setRoleCode(""); setReason(""); setFieldError(""); setFeedback("");
    setIntent(next); callbacks.current.onEditingChange(true);
  }
  function cancel() {
    if (busyRef.current) return;
    setIntent(null); setReason(""); setRoleCode(""); setFieldError(""); callbacks.current.onEditingChange(false); restoreFocus();
  }
  async function refresh() {
    if (busyRef.current || !canAdminister) return;
    busyRef.current = true; setBusy(true); callbacks.current.onBusyChange(true);
    try {
      if (await readAssignments()) {
        setUncertain(false); setIntent(null); setReason(""); setRoleCode(""); setFieldError("");
        setFeedback("Estado actualizado desde el servidor. Revisa las asignaciones vigentes antes de una nueva acción.");
        callbacks.current.onEditingChange(false); restoreFocus();
      }
      if (canCatalog) await readCatalog();
    } finally {
      busyRef.current = false; setBusy(false); callbacks.current.onBusyChange(false);
    }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!intent || busyRef.current || uncertain || !canAdminister || assignments.status !== "ready") return;
    if (!reason.trim() || reason.trim().length > 2000 || (intent.kind === "assign" && (!canCatalog || catalog.status !== "ready" || !catalog.items.some(item => item.role_code === roleCode)))) {
      setFieldError("Selecciona un rol disponible e indica un motivo no vacío de hasta 2000 caracteres."); return;
    }
    // One memory-only key per submitted intent. Never retry automatically or bind it to another payload.
    busyRef.current = true; setBusy(true); callbacks.current.onBusyChange(true); setFeedback(""); setFieldError("");
    let committed = false;
    try {
      if (!await authorizeFresh(administerCode) || (intent.kind === "assign" && !await authorizeFresh(catalogCode))) {
        setFeedback("El permiso ya no está vigente. No se envió la operación."); return;
      }
      await sendPlatformRoleChange(api, targetId, intent.kind === "assign" ? { kind: "assign", role_code: roleCode, reason } :
        { kind: "revoke", platform_role_assignment_id: intent.assignment.platform_role_assignment_id, reason });
      committed = true;
      const refreshed = await readAssignments();
      if (refreshed) { setFeedback("Operación completada. Estado actualizado desde el servidor."); setIntent(null); setReason(""); callbacks.current.onEditingChange(false); restoreFocus(); }
      else { setUncertain(true); setFeedback("El servidor confirmó la operación, pero no se pudo actualizar la lectura. Actualiza el estado antes de otra acción."); }
    } catch (error) {
      if (!mounted.current) return;
      setFeedback(platformRoleError(error, true));
      if (!(error instanceof ApiProblem) || error.status >= 500 || error.problem.retryable) setUncertain(true);
    } finally {
      busyRef.current = false;
      if (mounted.current) { setBusy(false); callbacks.current.onBusyChange(false); }
      // Failed operations preserve server-rendered assignments; successful POST data never becomes UI authority.
      if (committed) setFieldError("");
    }
  }
  const canAssign = canAdminister && canCatalog && assignments.status === "ready" && catalog.status === "ready" && catalog.items.length > 0;
  return <section className="platform-role-workspace" aria-labelledby="platform-role-title" aria-busy={busy}>
    <h3 id="platform-role-title">Roles de plataforma</h3>
    <p>Autoridad global de plataforma. Los roles de empresa/tenant se administran por separado.</p>
    {canAdminister ? <>
      {assignments.status === "loading" && <p role="status">Cargando roles de plataforma…</p>}
      {assignments.status === "error" && <p role="alert">{assignments.message}</p>}
      {assignments.status === "ready" && (assignments.items.length === 0 ? <p>Esta identidad no tiene roles de plataforma vigentes.</p> :
        <ul className="platform-role-list" aria-label="Asignaciones de plataforma vigentes">{assignments.items.map(assignment => <li key={assignment.platform_role_assignment_id}>
          <div><strong>{assignment.role_name}</strong><span>{assignment.role_code}</span><span>Vigente según el servidor</span>
            <small>Desde {assignment.valid_from}{assignment.valid_to ? ` · Hasta ${assignment.valid_to}` : ""}</small></div>
          <button type="button" className="button secondary" disabled={busy || uncertain || !!intent}
            aria-label={`Revocar rol ${assignment.role_name}`} onClick={event => begin({ kind: "revoke", assignment }, event)}>Revocar</button>
        </li>)}</ul>)}
      <button ref={refreshButton} type="button" className="button secondary" disabled={busy} onClick={() => void refresh()}>Actualizar roles de plataforma</button>
    </> : <p>La administración de roles de plataforma requiere su permiso efectivo.</p>}
    {canCatalog ? <>
      {catalog.status === "loading" && <p role="status">Cargando catálogo de roles de plataforma…</p>}
      {catalog.status === "error" && <p role="alert">{catalog.message}</p>}
      {catalog.status === "ready" && catalog.items.length === 0 && <p>No hay roles de plataforma asignables publicados.</p>}
    </> : <p>El catálogo requiere el permiso de lectura de roles de plataforma.</p>}
    {canAdminister && !intent && <button type="button" className="button primary" disabled={!canAssign || busy || uncertain}
      onClick={event => begin({ kind: "assign" }, event)}>Asignar rol de plataforma</button>}
    {feedback && <p id="platform-role-feedback" role="alert">{feedback}</p>}
    {uncertain && <p role="status">Resultado pendiente de verificación. Usa «Actualizar roles de plataforma» antes de iniciar una nueva intención.</p>}
    {intent && canAdminister && <form className="mi-form platform-role-confirmation" aria-labelledby="platform-role-confirm-title"
      aria-describedby={feedback ? "platform-role-feedback" : "platform-role-guidance"} onSubmit={event => void submit(event)}>
      <h4 id="platform-role-confirm-title">{intent.kind === "assign" ? "Asignar rol de plataforma" : `Revocar rol ${intent.assignment.role_name}`}</h4>
      <p id="platform-role-guidance">Confirma el cambio para esta identidad. Indica el motivo sin incluir credenciales ni secretos.</p>
      {intent.kind === "assign" && <div><label htmlFor="platform-role-code">Rol de plataforma</label><select id="platform-role-code" ref={node => { firstField.current = node; }} required value={roleCode}
        disabled={busy || uncertain || !canCatalog} onChange={event => { setRoleCode(event.target.value); setFieldError(""); }}>
        <option value="">Selecciona un rol</option>{catalog.items.map(item => <option key={item.role_code} value={item.role_code}>{item.name} · {item.role_code}</option>)}
      </select></div>}
      <label>Motivo del cambio de rol<textarea ref={node => { if (intent.kind === "revoke") firstField.current = node; }} required maxLength={2000}
        value={reason} disabled={busy || uncertain} aria-invalid={!!fieldError} aria-describedby={fieldError ? "platform-role-field-error" : "platform-role-guidance"}
        onChange={event => { setReason(event.target.value); setFieldError(""); }}/></label>
      {fieldError && <p id="platform-role-field-error" role="alert">{fieldError}</p>}
      <button type="submit" className="button primary" disabled={busy || uncertain || (intent.kind === "assign" && !canAssign)}>
        {busy ? "Procesando cambio…" : intent.kind === "assign" ? "Confirmar asignación de rol" : "Confirmar revocación de rol"}</button>
      <button type="button" className="button secondary" disabled={busy} onClick={cancel}>Cancelar cambio de rol</button>
    </form>}
  </section>;
}
