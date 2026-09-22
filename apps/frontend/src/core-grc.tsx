import React, { useEffect, useMemo, useState } from "react";
import { ApiClient, ApiProblem } from "./api-client.js";

export type Access = { tenant_id: string; membership_id: string; permissions: string[]; scopes: string[]; capability_groups: string[]; roles: string[]; tenant_name?: string; user_name?: string };
type Row = Record<string, unknown>;
type PageMeta = { has_more: boolean; next_cursor: string | null };
type Page = { items: Row[]; page: PageMeta };
type LoadState = { state: "loading" } | { state: "ready"; data: Row[]; page: PageMeta; loadingMore?: boolean } | { state: "error"; message: string; unauthorized: boolean };

type ModuleDefinition = {
  id: string; label: string; path: string; permission: string; capability: string; scopes: readonly string[]; idField: string; titleField: string; stateField: string;
};

export type WorkflowAction = { state: string; label: string; permission: string; scopes: readonly string[]; suffix: string; fields?: readonly string[]; versionResource?: boolean };

const workflowActions: Readonly<Record<string, readonly WorkflowAction[]>> = {
  cumplimiento: [
    { state: "draft", label: "Enviar", permission: "compliance.applicability.submit", scopes: ["tenant", "owned_object"], suffix: "submit", fields: ["rationale"] },
    { state: "submitted", label: "Aprobar", permission: "compliance.applicability.approve", scopes: ["tenant"], suffix: "approve" }
  ],
  requisitos: [
    { state: "not_assessed", label: "Iniciar", permission: "compliance.requirement_assessment.update", scopes: ["assigned_object", "tenant"], suffix: "start" },
    { state: "in_progress", label: "Enviar evaluación", permission: "compliance.requirement_assessment.submit", scopes: ["assigned_object", "tenant"], suffix: "submit", fields: ["result_status", "domain_conclusion", "coverage_percent"] },
    { state: "assessed", label: "Aprobar", permission: "compliance.requirement_assessment.approve", scopes: ["tenant"], suffix: "approve" }
  ],
  soa: [{ state: "draft", label: "Publicar", permission: "compliance.soa.publish", scopes: ["tenant"], suffix: "publish", fields: ["reason"] }],
  "evaluaciones-control": [
    { state: "planned", label: "Iniciar", permission: "controls.control_assessment.update", scopes: ["assigned_object", "tenant"], suffix: "start" },
    { state: "completed", label: "Revisar", permission: "controls.control_assessment.review", scopes: ["tenant"], suffix: "review" },
    { state: "reviewed", label: "Aprobar", permission: "controls.control_assessment.approve", scopes: ["tenant"], suffix: "approve" }
  ],
  pruebas: [
    { state: "planned", label: "Iniciar", permission: "controls.assurance_test.execute", scopes: ["assigned_object", "audit_engagement"], suffix: "start" },
    { state: "in_progress", label: "Ejecutar", permission: "controls.assurance_test.execute", scopes: ["assigned_object"], suffix: "execute", fields: ["result_status", "domain_conclusion", "samples"] },
    { state: "completed", label: "Revisar", permission: "controls.assurance_test.review", scopes: ["tenant", "audit_engagement"], suffix: "review" },
    { state: "reviewed", label: "Aprobar", permission: "controls.assurance_test.approve", scopes: ["tenant"], suffix: "approve" }
  ],
  evidencias: [
    { state: "draft", label: "Enviar", permission: "evidence.evidence.submit", scopes: ["owned_object", "assigned_object"], suffix: "submit", versionResource: true },
    { state: "submitted", label: "Iniciar revisión", permission: "evidence.evidence.review", scopes: ["assigned_object", "tenant"], suffix: "start-review", versionResource: true },
    { state: "under_review", label: "Aprobar", permission: "evidence.evidence.approve", scopes: ["tenant"], suffix: "approve", fields: ["sufficiency", "relevance", "rationale"], versionResource: true },
    { state: "under_review", label: "Rechazar", permission: "evidence.evidence.reject", scopes: ["tenant"], suffix: "reject", fields: ["sufficiency", "relevance", "rationale"], versionResource: true }
  ],
  issues: [
    { state: "open", label: "Triar", permission: "remediation.issue.transition", scopes: ["tenant"], suffix: "triage", fields: ["severity", "priority", "business_owner_subject_id", "due_date"] },
    { state: "triaged", label: "Iniciar remediación", permission: "remediation.issue.transition", scopes: ["tenant", "assigned_object", "owned_object"], suffix: "start-remediation" },
    { state: "remediation_in_progress", label: "Solicitar verificación", permission: "remediation.issue.transition", scopes: ["tenant", "assigned_object", "owned_object"], suffix: "request-verification" },
    { state: "pending_verification", label: "Verificar cierre", permission: "remediation.issue.transition", scopes: ["tenant", "assigned_object", "owned_object"], suffix: "verify-close", fields: ["verification_decision", "rationale"] }
  ],
  acciones: [
    { state: "pending", label: "Iniciar", permission: "remediation.action.transition", scopes: ["assigned_object", "owned_object"], suffix: "start" },
    { state: "in_progress", label: "Enviar a revisión", permission: "remediation.action.transition", scopes: ["assigned_object", "owned_object"], suffix: "submit-for-review" },
    { state: "in_review", label: "Completar", permission: "remediation.action.transition", scopes: ["assigned_object", "owned_object"], suffix: "complete", fields: ["evidence_version_id", "link_role"] },
    { state: "completed", label: "Verificar", permission: "remediation.action.verify", scopes: ["tenant"], suffix: "verify", fields: ["verification_decision", "rationale", "retest_reference"] }
  ]
};

export function availableWorkflowActions(definition: ModuleDefinition, row: Row, access: Access): readonly WorkflowAction[] {
  const version = definition.id === "evidencias" && Array.isArray(row.versions) ? row.versions[0] as Row | undefined : undefined;
  const state = String(version?.lifecycle_state ?? row[definition.stateField] ?? "");
  return (workflowActions[definition.id] ?? []).filter((action) => action.state === state && access.permissions.includes(action.permission) && action.scopes.some((scope) => access.scopes.includes(scope)));
}

type CreateContract = { permission: string; scopes: readonly string[]; path: string; fields: readonly string[]; jsonFields?: readonly string[]; pathField?: string };
const createContracts: Readonly<Record<string, CreateContract>> = {
  cumplimiento: { permission: "compliance.applicability.create", scopes: ["tenant"], path: "/requirement-applicabilities", fields: ["requirement_id", "scope_subject_id", "applicability_decision", "rationale", "effective_from", "effective_to"] },
  requisitos: { permission: "compliance.requirement_assessment.create", scopes: ["tenant"], path: "/requirement-assessments", fields: ["requirement_applicability_id", "methodology_version_ref", "effective_configuration_id"] },
  soa: { permission: "compliance.soa.create", scopes: ["tenant"], path: "/statements-of-applicability", fields: ["framework_version_id", "title", "effective_from", "items"], jsonFields: ["items"] },
  controles: { permission: "controls.control.create", scopes: ["tenant"], path: "/controls:instantiate", fields: ["based_on_control_version_id", "control_code", "name", "business_owner_subject_id", "objective", "control_type", "nature", "frequency_code", "execution_method", "verification_method", "minimum_evidence", "suggested_owner_role_code", "effective_from", "effective_to"] },
  "evaluaciones-control": { permission: "controls.control_assessment.create", scopes: ["tenant", "owned_object"], path: "/control-assessments", fields: ["control_id", "control_version_id", "methodology_version_ref", "effective_configuration_id"] },
  pruebas: { permission: "controls.assurance_test.create", scopes: ["tenant", "audit_engagement"], path: "/assurance-tests", fields: ["control_id", "control_version_id", "test_code", "planned_at"] },
  "solicitudes-evidencia": { permission: "evidence.evidence_request.create", scopes: ["tenant"], path: "/evidence-requests", fields: ["request_code", "requirement_id", "control_id", "requirement_assessment_id", "control_assessment_id", "assurance_test_id", "assigned_membership_id", "due_at"] },
  evidencias: { permission: "evidence.evidence.create", scopes: ["tenant", "assigned_object", "owned_object"], path: "/evidence", fields: ["evidence_code", "evidence_type", "business_owner_subject_id", "valid_from", "valid_to", "retention_policy_id", "source_kind", "file_object_id", "period_start", "period_end", "effective_from", "effective_to", "expires_at", "provenance_ref", "links"], jsonFields: ["links"] },
  issues: { permission: "remediation.issue.create", scopes: ["tenant"], path: "/issues", fields: ["issue_code", "issue_kind", "title", "description", "severity", "priority", "business_owner_subject_id", "due_date", "requirement_assessment_id", "control_assessment_id", "assurance_test_id", "origin_role"] },
  acciones: { permission: "remediation.action.create", scopes: ["tenant"], path: "/issues/{issue_id}/actions", pathField: "issue_id", fields: ["issue_id", "action_code", "title", "description", "priority", "assigned_membership_id", "due_date"] }
};

export function canCreate(definition: ModuleDefinition, access: Access): boolean {
  const contract = createContracts[definition.id];
  return Boolean(contract && access.permissions.includes(contract.permission) && access.capability_groups.includes(definition.capability) && contract.scopes.some((scope) => access.scopes.includes(scope)));
}

function canRead(definition: ModuleDefinition, access: Access): boolean {
  return access.permissions.includes(definition.permission)
    && access.capability_groups.includes(definition.capability)
    && definition.scopes.some((scope) => access.scopes.includes(scope));
}

export const modules: ModuleDefinition[] = [
  { id: "cumplimiento", label: "Aplicabilidad", path: "/requirement-applicabilities", permission: "compliance.applicability.read", capability: "ISO_COMPLIANCE", scopes: ["tenant", "organizational_unit", "process", "service", "assigned_object", "owned_object"], idField: "requirement_applicability_id", titleField: "applicability_decision", stateField: "lifecycle_state" },
  { id: "requisitos", label: "Evaluaciones de requisitos", path: "/requirement-assessments", permission: "compliance.requirement_assessment.read", capability: "ISO_COMPLIANCE", scopes: ["tenant", "organizational_unit", "process", "service", "assigned_object", "owned_object"], idField: "requirement_assessment_id", titleField: "domain_conclusion", stateField: "lifecycle_state" },
  { id: "soa", label: "Declaraciones de aplicabilidad", path: "/statements-of-applicability", permission: "compliance.soa.read", capability: "ISO_COMPLIANCE", scopes: ["tenant"], idField: "statement_of_applicability_id", titleField: "title", stateField: "lifecycle_state" },
  { id: "controles", label: "Controles", path: "/controls", permission: "controls.control.read", capability: "CONTROLS_ASSURANCE", scopes: ["tenant", "organizational_unit", "process", "service", "assigned_object", "owned_object", "audit_engagement"], idField: "control_id", titleField: "name", stateField: "lifecycle_state" },
  { id: "evaluaciones-control", label: "Evaluaciones de control", path: "/control-assessments", permission: "controls.control_assessment.read", capability: "CONTROLS_ASSURANCE", scopes: ["tenant", "organizational_unit", "process", "service", "assigned_object", "owned_object", "audit_engagement"], idField: "control_assessment_id", titleField: "domain_conclusion", stateField: "lifecycle_state" },
  { id: "pruebas", label: "Pruebas de aseguramiento", path: "/assurance-tests", permission: "controls.assurance_test.read", capability: "CONTROLS_ASSURANCE", scopes: ["tenant", "assigned_object", "owned_object", "audit_engagement"], idField: "assurance_test_id", titleField: "test_code", stateField: "lifecycle_state" },
  { id: "solicitudes-evidencia", label: "Solicitudes de evidencia", path: "/evidence-requests", permission: "evidence.evidence_request.read", capability: "EVIDENCE_DOCUMENTS", scopes: ["tenant", "assigned_object", "owned_object", "audit_engagement"], idField: "evidence_request_id", titleField: "request_code", stateField: "lifecycle_state" },
  { id: "evidencias", label: "Evidencias", path: "/evidence", permission: "evidence.evidence.read", capability: "EVIDENCE_DOCUMENTS", scopes: ["tenant", "assigned_object", "owned_object", "audit_engagement"], idField: "evidence_id", titleField: "evidence_code", stateField: "lifecycle_state" },
  { id: "issues", label: "Issues y brechas", path: "/issues", permission: "remediation.issue.read", capability: "ISSUES_ACTIONS", scopes: ["tenant", "assigned_object", "owned_object", "audit_engagement"], idField: "issue_id", titleField: "title", stateField: "lifecycle_state" },
  { id: "acciones", label: "Acciones", path: "/actions", permission: "remediation.action.read", capability: "ISSUES_ACTIONS", scopes: ["tenant", "assigned_object", "owned_object", "audit_engagement"], idField: "action_id", titleField: "title", stateField: "lifecycle_state" }
];

const nav = [
  ["dashboard", "Dashboard", "grid"], ["cumplimiento", "Cumplimiento", "check"], ["requisitos", "Requisitos", "list"],
  ["controles", "Controles", "shield"], ["evidencias", "Evidencias", "file"], ["acciones", "Acciones", "task"]
] as const;

function Icon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>,
    check: <><path d="M4 12l5 5L20 6"/><path d="M12 22a10 10 0 1 1 10-10"/></>,
    list: <><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/></>,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>,
    file: <><path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h6M9 17h6"/></>,
    task: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 12l3 3 6-7"/></>
  };
  return <svg className="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">{paths[name]}</svg>;
}

function route(): string { return window.location.pathname.replace(/^\//, "") || "dashboard"; }
function navigate(id: string): void { history.pushState({}, "", `/${id}`); window.dispatchEvent(new PopStateEvent("popstate")); }

function LoadingState() { return <div className="state-panel" role="status"><span className="spinner"/>Cargando información autorizada…</div>; }
function EmptyState({ label }: { label: string }) { return <div className="state-panel"><strong>Sin registros</strong><span>No hay {label.toLowerCase()} visibles en tu alcance.</span></div>; }
function ErrorState({ message, unauthorized, retry }: { message: string; unauthorized: boolean; retry(): void }) { return <div className="state-panel error" role="alert"><strong>{unauthorized ? "Acceso no autorizado" : "No fue posible cargar los datos"}</strong><span>{message}</span>{!unauthorized && <button className="button secondary" onClick={retry}>Reintentar</button>}</div>; }

export function StatusBadge({ value }: { value: unknown }) {
  const text = typeof value === "string" && value ? value.replaceAll("_", " ") : "Sin estado";
  const tone = /approved|published|verified|completed|fulfilled|active/.test(text) ? "positive" : /reject|closed|error|overdue/.test(text) ? "negative" : /review|progress|submitted|triaged/.test(text) ? "warning" : "neutral";
  return <span className={`status ${tone}`}><i aria-hidden="true"/>{text}</span>;
}

function usePage(api: ApiClient, definition: ModuleDefinition, enabled = true, lifecycleState = ""): [LoadState, () => void, () => void] {
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<LoadState>({ state: "loading" });
  const load = (cursor?: string, append = false, signal?: AbortSignal) => {
    const query = new URLSearchParams({ "page[size]": "100" });
    if (cursor) query.set("page[cursor]", cursor);
    if (lifecycleState) query.set("filter[lifecycle_state]", lifecycleState);
    return api.request<Page>(`/api/v1${definition.path}?${query}`, signal ? { signal } : {}).then((page) => setState((current) => ({
      state: "ready",
      data: append && current.state === "ready" ? [...current.data, ...page.items] : page.items,
      page: page.page
    })));
  };
  useEffect(() => {
    if (!enabled) {
      setState({ state: "ready", data: [], page: { has_more: false, next_cursor: null } });
      return;
    }
    const controller = new AbortController();
    setState({ state: "loading" });
    load(undefined, false, controller.signal).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      const problem = error instanceof ApiProblem ? error : null;
      setState({ state: "error", message: problem?.message ?? "Error inesperado", unauthorized: problem?.status === 401 || problem?.status === 403 });
    });
    return () => controller.abort();
  }, [api, definition, enabled, lifecycleState, nonce]);
  const loadMore = () => {
    if (state.state !== "ready" || !state.page.next_cursor || state.loadingMore) return;
    const cursor = state.page.next_cursor;
    setState({ ...state, loadingMore: true });
    void load(cursor, true).catch((error: unknown) => setState({ state: "error", message: error instanceof Error ? error.message : "No fue posible continuar la lista", unauthorized: false }));
  };
  return [state, () => setNonce((value) => value + 1), loadMore];
}

const lifecycleStates: Readonly<Record<string, readonly string[]>> = {
  cumplimiento: ["draft", "submitted", "approved", "superseded"], requisitos: ["not_assessed", "in_progress", "assessed", "approved", "superseded"],
  soa: ["draft", "published", "superseded"], controles: ["draft", "active", "archived"],
  "evaluaciones-control": ["planned", "in_progress", "completed", "reviewed", "approved"], pruebas: ["planned", "in_progress", "completed", "reviewed", "approved"],
  "solicitudes-evidencia": ["open", "fulfilled", "cancelled", "expired"], evidencias: ["draft", "submitted", "under_review", "approved", "rejected", "expired", "superseded"],
  issues: ["open", "triaged", "remediation_in_progress", "pending_verification", "verified_closed", "dismissed", "reopened"],
  acciones: ["pending", "in_progress", "in_review", "completed", "verified", "reopened", "cancelled"]
};

function ModuleTable({ api, definition, access }: { api: ApiClient; definition: ModuleDefinition; access: Access }) {
  const allowed = canRead(definition, access);
  const [stateFilter, setStateFilter] = useState("");
  const [load, retry, loadMore] = usePage(api, definition, allowed, stateFilter);
  const [selected, setSelected] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  if (!allowed) return <ErrorState message="Tu permiso, alcance o plan no habilita esta vista." unauthorized retry={() => undefined}/>;
  if (load.state === "loading") return <LoadingState/>;
  if (load.state === "error") return <ErrorState {...load} retry={retry}/>;
  return <>
    <div className="page-heading"><div><p className="eyebrow">Core GRC</p><h1>{definition.label}</h1><p>Registros vigentes y autorizados para el tenant seleccionado.</p></div><div className="toolbar">{canCreate(definition, access) && <button className="button primary" onClick={() => setCreating(true)}>Nuevo registro</button>}<label>Estado <select aria-label="Filtrar por estado" value={stateFilter} onChange={(event) => setStateFilter(event.target.value)}><option value="">Todos</option>{(lifecycleStates[definition.id] ?? []).map((state) => <option value={state} key={state}>{state.replaceAll("_", " ")}</option>)}</select></label></div></div>
    <section className="data-card table-card" aria-label={definition.label}>
      {load.data.length === 0 ? <EmptyState label={definition.label}/> : <div className="table-scroll"><table><thead><tr><th>Identificador</th><th>Referencia</th><th>Estado</th><th>Versión</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{load.data.map((row) => <tr key={String(row[definition.idField])}><td><code>{String(row[definition.idField]).slice(0, 12)}…</code></td><td><strong>{String(row[definition.titleField] ?? "Sin dato")}</strong></td><td><StatusBadge value={row[definition.stateField]}/></td><td>{String(row.row_version ?? "—")}</td><td><button className="link-button" onClick={() => setSelected(row)}>Ver detalle</button></td></tr>)}</tbody></table></div>}
    </section>
    {load.page.has_more && <div className="pagination"><button className="button secondary" disabled={load.loadingMore} onClick={loadMore}>{load.loadingMore ? "Cargando…" : "Cargar más"}</button></div>}
    {selected && (
      <DetailDrawer api={api} access={access} definition={definition} row={selected} close={() => setSelected(null)} completed={() => { setSelected(null); retry(); }}/>
    )}
    {creating && (
      <CreateDrawer api={api} definition={definition} close={() => setCreating(false)} completed={() => { setCreating(false); retry(); }}/>
    )}
  </>;
}

function CreateDrawer({ api, definition, close, completed }: { api: ApiClient; definition: ModuleDefinition; close(): void; completed(): void }) {
  const contract = createContracts[definition.id]!;
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const body: Row = Object.fromEntries(Object.entries(form).filter(([, value]) => value !== ""));
    for (const field of contract.jsonFields ?? []) if (typeof body[field] === "string") {
      try { body[field] = JSON.parse(body[field]); } catch { setError(`${field} debe ser JSON válido.`); return; }
    }
    let path = contract.path;
    if (contract.pathField) {
      const value = String(body[contract.pathField] ?? "");
      if (!value) { setError(`Completa ${contract.pathField}.`); return; }
      path = path.replace(`{${contract.pathField}}`, value); delete body[contract.pathField];
    }
    setBusy(true); setError(undefined);
    try { await api.post(`/api/v1${path}`, body); completed(); }
    catch (caught) { const problem = caught instanceof ApiProblem ? caught : null; setError(problem?.message ?? "No fue posible crear el registro."); setBusy(false); }
  };
  return <div className="drawer-backdrop" role="presentation" onMouseDown={close}><aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="create-title" onMouseDown={(event) => event.stopPropagation()}><header><div><p className="eyebrow">Nuevo registro</p><h2 id="create-title">{definition.label}</h2></div><button className="icon-button" onClick={close} aria-label="Cerrar creación">×</button></header><p className="form-guidance">Los identificadores deben corresponder a objetos visibles del tenant. Los campos complejos aceptan JSON tipado por contrato.</p><div className="create-form">{contract.fields.map((field) => <label key={field}>{field.replaceAll("_", " ")}{contract.jsonFields?.includes(field) ? <textarea value={form[field] ?? ""} onChange={(event) => setForm((value) => ({ ...value, [field]: event.target.value }))}/> : <input value={form[field] ?? ""} onChange={(event) => setForm((value) => ({ ...value, [field]: event.target.value }))}/>}</label>)}</div>{error && <p className="inline-feedback error" role="alert">{error}</p>}<button className="button primary" disabled={busy} onClick={() => void submit()}>{busy ? "Creando…" : "Crear registro"}</button></aside></div>;
}

function DetailDrawer({ api, access, definition, row: summary, close, completed }: { api: ApiClient; access: Access; definition: ModuleDefinition; row: Row; close(): void; completed(): void }) {
  const [detail, setDetail] = useState<{ loading: boolean; row: Row; error?: string }>({ loading: true, row: summary });
  const [form, setForm] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; message: string }>();
  const id = String(summary[definition.idField]);
  useEffect(() => {
    const controller = new AbortController();
    api.request<Row>(`/api/v1${definition.path}/${id}`, { signal: controller.signal }).then((row) => setDetail({ loading: false, row })).catch((error: unknown) => {
      if (!controller.signal.aborted) setDetail({ loading: false, row: summary, error: error instanceof Error ? error.message : "Detalle no disponible" });
    });
    return () => controller.abort();
  }, [api, definition, id, summary]);
  const row = detail.row;
  const actions = availableWorkflowActions(definition, row, access);
  const version = definition.id === "evidencias" && Array.isArray(row.versions) ? row.versions[0] as Row | undefined : undefined;
  const state = version?.lifecycle_state ?? row[definition.stateField];
  const submit = async (action: WorkflowAction) => {
    const missing = (action.fields ?? []).find((field) => field !== "retest_reference" && !form[field]);
    if (missing) { setFeedback({ kind: "error", message: `Completa el campo ${missing.replaceAll("_", " ")}.` }); return; }
    const targetId = action.versionResource ? String(version?.evidence_version_id ?? "") : id;
    const targetPath = action.versionResource ? "/evidence-versions" : definition.path;
    const body: Row = { expected_version: Number(version?.row_version ?? row.row_version), ...form };
    for (const field of ["coverage_percent", "design_effectiveness", "operating_effectiveness"]) if (body[field] !== undefined) body[field] = Number(body[field]);
    if (typeof body.samples === "string") { try { body.samples = JSON.parse(body.samples); } catch { setFeedback({ kind: "error", message: "El campo samples debe ser JSON válido." }); return; } }
    try {
      await api.post(`/api/v1${targetPath}/${targetId}:${action.suffix}`, body);
      setFeedback({ kind: "success", message: "Operación completada y auditada." }); completed();
    } catch (error) {
      const problem = error instanceof ApiProblem ? error : null;
      setFeedback({ kind: "error", message: problem?.status === 409 ? "Conflicto de concurrencia: recarga el registro antes de continuar." : problem?.message ?? "No fue posible completar la operación." });
    }
  };
  return <div className="drawer-backdrop" role="presentation" onMouseDown={close}><aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="detail-title" onMouseDown={(event) => event.stopPropagation()}><header><div><p className="eyebrow">Detalle</p><h2 id="detail-title">{String(row[definition.titleField] ?? definition.label)}</h2></div><button className="icon-button" onClick={close} aria-label="Cerrar detalle">×</button></header>{detail.loading ? <LoadingState/> : <><StatusBadge value={state}/>{detail.error && <p className="inline-feedback error" role="alert">{detail.error}</p>}<dl>{Object.entries(row).filter(([, value]) => !Array.isArray(value) && typeof value !== "object").map(([key, value]) => <React.Fragment key={key}><dt>{key.replaceAll("_", " ")}</dt><dd>{value === null ? "No informado" : String(value)}</dd></React.Fragment>)}</dl>{actions.map((action) => <section className="workflow-action" key={action.suffix}><h3>{action.label}</h3>{action.fields?.map((field) => <label key={field}>{field.replaceAll("_", " ")}<input value={form[field] ?? ""} onChange={(event) => setForm((value) => ({ ...value, [field]: event.target.value }))}/></label>)}<button className="button primary" onClick={() => void submit(action)}>{action.label}</button></section>)}{actions.length === 0 && <p className="read-only-note">Sin acciones ejecutables para tu rol y el estado actual.</p>}{feedback && <p className={`inline-feedback ${feedback.kind}`} role={feedback.kind === "error" ? "alert" : "status"}>{feedback.message}</p>}</>}</aside></div>;
}

function Dashboard({ api, access }: { api: ApiClient; access: Access }) {
  const dashboardModules = [modules[1]!, modules[7]!, modules[8]!, modules[9]!];
  const assessmentLoad = usePage(api, dashboardModules[0]!, canRead(dashboardModules[0]!, access))[0];
  const evidenceLoad = usePage(api, dashboardModules[1]!, canRead(dashboardModules[1]!, access))[0];
  const issueLoad = usePage(api, dashboardModules[2]!, canRead(dashboardModules[2]!, access))[0];
  const actionLoad = usePage(api, dashboardModules[3]!, canRead(dashboardModules[3]!, access))[0];
  const loads = [assessmentLoad, evidenceLoad, issueLoad, actionLoad];
  if (loads.some((load) => load.state === "loading")) return <LoadingState/>;
  const validLoads = loads.map((load) => load.state === "ready" ? load.data : []);
  const [assessments, evidence, issues, actions] = validLoads;
  const validAssessments = assessments!.filter((row) => row.result_status === "valid").length;
  const insufficientAssessments = assessments!.filter((row) => String(row.result_status).startsWith("insufficient_") || row.result_status === "no_data").length;
  const count = (rows: Row[] | undefined, states: string[]) => (rows ?? []).filter((row) => states.includes(String(row.lifecycle_state))).length;
  const cards = [
    { label: "Evaluaciones visibles", value: String(assessments!.length), detail: `${validAssessments} con resultado válido; no sustituye un indicador oficial`, tone: "teal" },
    { label: "Issues visibles", value: String(issues!.length), detail: `${count(issues, ["open", "triaged", "remediation_in_progress", "pending_verification"])} en flujo abierto`, tone: "orange" },
    { label: "Acciones visibles", value: String(actions!.length), detail: `${count(actions, ["pending", "in_progress", "in_review", "completed"])} activas en la vista`, tone: "orange" },
    { label: "Evidencias visibles", value: String(evidence!.length), detail: "Estado oficial en la versión de evidencia", tone: "teal" }
  ];
  const actionStates = ["pending", "in_progress", "in_review", "completed", "verified"];
  return <>
    <div className="page-heading dashboard-heading"><div><p className="eyebrow">Vista consolidada</p><h1>Hola{access.user_name ? `, ${access.user_name.split(" ")[0]}` : ""}</h1><p>Estado operativo del Core GRC dentro de tu alcance autorizado.</p></div><span className="context-pill">Datos actuales del tenant</span></div>
    <section className="kpi-grid">{cards.map((card) => <article className={`kpi-card ${card.tone}`} key={card.label}><div className="kpi-icon"><Icon name={card.label === "Evidencias" ? "file" : card.label === "Cumplimiento" ? "check" : "task"}/></div><p>{card.label}</p><strong>{card.value}</strong><span>{card.detail}</span></article>)}</section>
    <section className="dashboard-grid">
      <article className="data-card compliance-card"><header><h2>Estado de evaluaciones visibles</h2><button className="link-button" onClick={() => navigate("requisitos")}>Ver evaluaciones →</button></header>{assessments!.length === 0 ? <div className="insufficient"><strong>Datos insuficientes</strong><span>No existen evaluaciones visibles; no se publica un valor de cumplimiento.</span></div> : <div className="donut-layout"><ul><li><i className="dot success"/>Resultado válido <strong>{validAssessments}</strong></li><li><i className="dot warning"/>Sin datos o insuficiente <strong>{insufficientAssessments}</strong></li><li><i className="dot"/>Otros estados <strong>{assessments!.length - validAssessments - insufficientAssessments}</strong></li></ul></div>}</article>
      <article className="data-card"><header><h2>Distribución de acciones visibles</h2><button className="link-button" onClick={() => navigate("acciones")}>Ver acciones →</button></header>{actions!.length === 0 ? <div className="insufficient"><strong>Sin acciones visibles</strong><span>No se representa la ausencia como avance.</span></div> : <div className="progress-list">{actionStates.map((state) => { const value = count(actions, [state]); const percent = Math.round(value / actions!.length * 100); return <div key={state}><span>{state.replaceAll("_", " ")} <b>{value}</b></span><div className="progress"><i style={{ width: `${percent}%` }}/></div></div>; })}</div>}</article>
      <article className="data-card activity-card"><header><h2>Registros recientes visibles</h2></header>{[...issues!, ...actions!, ...evidence!].slice(0, 6).map((row, index) => <div className="activity" key={index}><span className="activity-icon"><Icon name="check"/></span><div><strong>{String(row.title ?? row.evidence_code ?? row.issue_code ?? row.action_code ?? "Registro GRC")}</strong><StatusBadge value={row.lifecycle_state}/></div></div>)}{issues!.length + actions!.length + evidence!.length === 0 && <EmptyState label="registros recientes"/>}</article>
    </section>
    <aside className="phase-callout"><span className="flag">⚑</span><div><strong>Fase 5 — Core GRC</strong><p>Aplicabilidad, evaluaciones, controles, evidencia, issues y acciones.</p></div><span className="review-badge">Revisión UI humana pendiente</span></aside>
  </>;
}

function Sidebar({ active, access, open, close }: { active: string; access: Access; open: boolean; close(): void }) {
  const visible = (id: string) => {
    if (id === "dashboard") return true;
    const moduleIds: Record<string, readonly string[]> = {
      cumplimiento: ["cumplimiento", "soa"], requisitos: ["requisitos"], controles: ["controles", "evaluaciones-control", "pruebas"],
      evidencias: ["solicitudes-evidencia", "evidencias"], acciones: ["issues", "acciones"]
    };
    return (moduleIds[id] ?? []).some((moduleId) => {
      const definition = modules.find((module) => module.id === moduleId);
      return Boolean(definition && canRead(definition, access));
    });
  };
  return <aside className={`sidebar ${open ? "open" : ""}`}><div className="brand"><img src="/tecdex-logo-light.svg" alt="Tecdex"/><span>GRC</span></div><nav aria-label="Navegación principal">{nav.filter(([id]) => visible(id)).map(([id, label, icon]) => <button key={id} className={active === id ? "active" : ""} onClick={() => { navigate(id); close(); }}><Icon name={icon}/><span>{label}</span></button>)}</nav><div className="sidebar-footer"><strong>TCDX GRC</strong><span>Core GRC · Fase 5</span></div></aside>;
}

const workspaceGroups: Readonly<Record<string, readonly string[]>> = {
  cumplimiento: ["cumplimiento", "soa"], requisitos: ["requisitos"], controles: ["controles", "evaluaciones-control", "pruebas"],
  evidencias: ["solicitudes-evidencia", "evidencias"], acciones: ["issues", "acciones"]
};

function ModuleWorkspace({ api, access, active }: { api: ApiClient; access: Access; active: string }) {
  const choices = (workspaceGroups[active] ?? [active])
    .map((id) => modules.find((module) => module.id === id))
    .filter((definition): definition is ModuleDefinition => Boolean(definition && canRead(definition, access)));
  const [selectedId, setSelectedId] = useState(choices[0]?.id ?? "");
  useEffect(() => setSelectedId(choices[0]?.id ?? ""), [active]);
  const selected = choices.find((choice) => choice.id === selectedId) ?? choices[0];
  if (!selected) return <ErrorState message="Tu permiso, alcance o plan no habilita este espacio." unauthorized retry={() => undefined}/>;
  return <><div className="module-tabs" role="tablist" aria-label="Submódulos">{choices.map((choice) => <button role="tab" aria-selected={selected.id === choice.id} className={selected.id === choice.id ? "active" : ""} key={choice.id} onClick={() => setSelectedId(choice.id)}>{choice.label}</button>)}</div><ModuleTable api={api} access={access} definition={selected}/></>;
}

export function CoreGrcApp({ api }: { api: ApiClient }) {
  const [active, setActive] = useState(route());
  const [menu, setMenu] = useState(false);
  const [access, setAccess] = useState<{ loading: boolean; value?: Access; error?: string }>({ loading: true });
  useEffect(() => { const listener = () => setActive(route()); addEventListener("popstate", listener); return () => removeEventListener("popstate", listener); }, []);
  useEffect(() => { api.request<Access>("/api/v1/access/me").then((value) => setAccess({ loading: false, value })).catch((error: unknown) => setAccess({ loading: false, error: error instanceof Error ? error.message : "Acceso no disponible" })); }, [api]);
  if (access.loading) return <main className="standalone-state"><LoadingState/></main>;
  if (!access.value) return <main className="standalone-state"><section className="auth-card"><img src="/tecdex-logo-light.svg" alt="Tecdex"/><h1>Autenticación requerida</h1><p>{access.error}. Configura una sesión OIDC autorizada para ingresar.</p></section></main>;
  return <div className="app-shell"><Sidebar active={active} access={access.value} open={menu} close={() => setMenu(false)}/><div className="app-column"><header className="topbar"><button className="menu-button" aria-label="Abrir navegación" onClick={() => setMenu(!menu)}>☰</button><label className="search"><span className="sr-only">Buscar</span><input type="search" placeholder="Buscar requisitos, controles, evidencias y acciones…"/></label><div className="tenant-context"><span>Empresa</span><strong>{access.value.tenant_name ?? access.value.tenant_id.slice(0, 8)}</strong></div><div className="user-context"><span className="avatar">{(access.value.user_name ?? "U").slice(0, 1).toUpperCase()}</span><div><strong>{access.value.user_name ?? "Usuario autorizado"}</strong><span>{access.value.roles[0] ?? "Rol acotado"}</span></div></div></header><main className="workspace">{active === "dashboard" ? <Dashboard api={api} access={access.value}/> : <ModuleWorkspace api={api} access={access.value} active={active}/>}</main></div>{menu && <button className="sidebar-scrim" aria-label="Cerrar navegación" onClick={() => setMenu(false)}/>}</div>;
}
