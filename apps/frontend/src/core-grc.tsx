import React, { useEffect, useState } from "react";
import { ApiClient, ApiProblem } from "./api-client.js";
import { displayValue, fieldLabel, fieldPlaceholder, roleLabel } from "./i18n/display-text.js";
import { moduleLabels, uiText } from "./i18n/es.js";
import { statusLabel, statusTone } from "./i18n/status-labels.js";

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
    { state: "draft", label: uiText.actions.submit, permission: "compliance.applicability.submit", scopes: ["tenant", "owned_object"], suffix: "submit", fields: ["rationale"] },
    { state: "submitted", label: uiText.actions.approve, permission: "compliance.applicability.approve", scopes: ["tenant"], suffix: "approve" }
  ],
  requisitos: [
    { state: "not_assessed", label: uiText.actions.start, permission: "compliance.requirement_assessment.update", scopes: ["assigned_object", "tenant"], suffix: "start" },
    { state: "in_progress", label: uiText.actions.submitAssessment, permission: "compliance.requirement_assessment.submit", scopes: ["assigned_object", "tenant"], suffix: "submit", fields: ["result_status", "domain_conclusion", "coverage_percent"] },
    { state: "assessed", label: uiText.actions.approve, permission: "compliance.requirement_assessment.approve", scopes: ["tenant"], suffix: "approve" }
  ],
  soa: [{ state: "draft", label: uiText.actions.publish, permission: "compliance.soa.publish", scopes: ["tenant"], suffix: "publish", fields: ["reason"] }],
  "evaluaciones-control": [
    { state: "planned", label: uiText.actions.start, permission: "controls.control_assessment.update", scopes: ["assigned_object", "tenant"], suffix: "start" },
    { state: "completed", label: uiText.actions.review, permission: "controls.control_assessment.review", scopes: ["tenant"], suffix: "review" },
    { state: "reviewed", label: uiText.actions.approve, permission: "controls.control_assessment.approve", scopes: ["tenant"], suffix: "approve" }
  ],
  pruebas: [
    { state: "planned", label: uiText.actions.start, permission: "controls.assurance_test.execute", scopes: ["assigned_object", "audit_engagement"], suffix: "start" },
    { state: "in_progress", label: uiText.actions.execute, permission: "controls.assurance_test.execute", scopes: ["assigned_object"], suffix: "execute", fields: ["result_status", "domain_conclusion", "samples"] },
    { state: "completed", label: uiText.actions.review, permission: "controls.assurance_test.review", scopes: ["tenant", "audit_engagement"], suffix: "review" },
    { state: "reviewed", label: uiText.actions.approve, permission: "controls.assurance_test.approve", scopes: ["tenant"], suffix: "approve" }
  ],
  evidencias: [
    { state: "draft", label: uiText.actions.submit, permission: "evidence.evidence.submit", scopes: ["owned_object", "assigned_object"], suffix: "submit", versionResource: true },
    { state: "submitted", label: uiText.actions.startReview, permission: "evidence.evidence.review", scopes: ["assigned_object", "tenant"], suffix: "start-review", versionResource: true },
    { state: "under_review", label: uiText.actions.approve, permission: "evidence.evidence.approve", scopes: ["tenant"], suffix: "approve", fields: ["sufficiency", "relevance", "rationale"], versionResource: true },
    { state: "under_review", label: uiText.actions.reject, permission: "evidence.evidence.reject", scopes: ["tenant"], suffix: "reject", fields: ["sufficiency", "relevance", "rationale"], versionResource: true }
  ],
  issues: [
    { state: "open", label: uiText.actions.triage, permission: "remediation.issue.transition", scopes: ["tenant"], suffix: "triage", fields: ["severity", "priority", "business_owner_subject_id", "due_date"] },
    { state: "triaged", label: uiText.actions.startRemediation, permission: "remediation.issue.transition", scopes: ["tenant", "assigned_object", "owned_object"], suffix: "start-remediation" },
    { state: "remediation_in_progress", label: uiText.actions.requestVerification, permission: "remediation.issue.transition", scopes: ["tenant", "assigned_object", "owned_object"], suffix: "request-verification" },
    { state: "pending_verification", label: uiText.actions.verifyClose, permission: "remediation.issue.transition", scopes: ["tenant", "assigned_object", "owned_object"], suffix: "verify-close", fields: ["verification_decision", "rationale"] }
  ],
  acciones: [
    { state: "pending", label: uiText.actions.start, permission: "remediation.action.transition", scopes: ["assigned_object", "owned_object"], suffix: "start" },
    { state: "in_progress", label: uiText.actions.submitReview, permission: "remediation.action.transition", scopes: ["assigned_object", "owned_object"], suffix: "submit-for-review" },
    { state: "in_review", label: uiText.actions.complete, permission: "remediation.action.transition", scopes: ["assigned_object", "owned_object"], suffix: "complete", fields: ["evidence_version_id", "link_role"] },
    { state: "completed", label: uiText.actions.verify, permission: "remediation.action.verify", scopes: ["tenant"], suffix: "verify", fields: ["verification_decision", "rationale", "retest_reference"] }
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
  { id: "cumplimiento", label: moduleLabels.cumplimiento, path: "/requirement-applicabilities", permission: "compliance.applicability.read", capability: "ISO_COMPLIANCE", scopes: ["tenant", "organizational_unit", "process", "service", "assigned_object", "owned_object"], idField: "requirement_applicability_id", titleField: "applicability_decision", stateField: "lifecycle_state" },
  { id: "requisitos", label: moduleLabels.requisitos, path: "/requirement-assessments", permission: "compliance.requirement_assessment.read", capability: "ISO_COMPLIANCE", scopes: ["tenant", "organizational_unit", "process", "service", "assigned_object", "owned_object"], idField: "requirement_assessment_id", titleField: "domain_conclusion", stateField: "lifecycle_state" },
  { id: "soa", label: moduleLabels.soa, path: "/statements-of-applicability", permission: "compliance.soa.read", capability: "ISO_COMPLIANCE", scopes: ["tenant"], idField: "statement_of_applicability_id", titleField: "title", stateField: "lifecycle_state" },
  { id: "controles", label: moduleLabels.controles, path: "/controls", permission: "controls.control.read", capability: "CONTROLS_ASSURANCE", scopes: ["tenant", "organizational_unit", "process", "service", "assigned_object", "owned_object", "audit_engagement"], idField: "control_id", titleField: "name", stateField: "lifecycle_state" },
  { id: "evaluaciones-control", label: moduleLabels["evaluaciones-control"], path: "/control-assessments", permission: "controls.control_assessment.read", capability: "CONTROLS_ASSURANCE", scopes: ["tenant", "organizational_unit", "process", "service", "assigned_object", "owned_object", "audit_engagement"], idField: "control_assessment_id", titleField: "domain_conclusion", stateField: "lifecycle_state" },
  { id: "pruebas", label: moduleLabels.pruebas, path: "/assurance-tests", permission: "controls.assurance_test.read", capability: "CONTROLS_ASSURANCE", scopes: ["tenant", "assigned_object", "owned_object", "audit_engagement"], idField: "assurance_test_id", titleField: "test_code", stateField: "lifecycle_state" },
  { id: "solicitudes-evidencia", label: moduleLabels["solicitudes-evidencia"], path: "/evidence-requests", permission: "evidence.evidence_request.read", capability: "EVIDENCE_DOCUMENTS", scopes: ["tenant", "assigned_object", "owned_object", "audit_engagement"], idField: "evidence_request_id", titleField: "request_code", stateField: "lifecycle_state" },
  { id: "evidencias", label: moduleLabels.evidencias, path: "/evidence", permission: "evidence.evidence.read", capability: "EVIDENCE_DOCUMENTS", scopes: ["tenant", "assigned_object", "owned_object", "audit_engagement"], idField: "evidence_id", titleField: "evidence_code", stateField: "lifecycle_state" },
  { id: "issues", label: moduleLabels.issues, path: "/issues", permission: "remediation.issue.read", capability: "ISSUES_ACTIONS", scopes: ["tenant", "assigned_object", "owned_object", "audit_engagement"], idField: "issue_id", titleField: "title", stateField: "lifecycle_state" },
  { id: "acciones", label: moduleLabels.acciones, path: "/actions", permission: "remediation.action.read", capability: "ISSUES_ACTIONS", scopes: ["tenant", "assigned_object", "owned_object", "audit_engagement"], idField: "action_id", titleField: "title", stateField: "lifecycle_state" }
];

const nav = [
  ["dashboard", uiText.navigation.dashboard, "grid"], ["cumplimiento", uiText.navigation.compliance, "check"], ["requisitos", uiText.navigation.requirements, "list"],
  ["controles", uiText.navigation.controls, "shield"], ["evidencias", uiText.navigation.evidence, "file"], ["acciones", uiText.navigation.actions, "task"]
] as const;

function Icon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>,
    check: <><path d="M4 12l5 5L20 6"/><path d="M12 22a10 10 0 1 1 10-10"/></>,
    list: <><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/></>,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>,
    file: <><path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h6M9 17h6"/></>,
    task: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 12l3 3 6-7"/></>,
    alert: <><path d="M12 3 2.5 20h19z"/><path d="M12 9v4M12 17h.01"/></>,
    flag: <><path d="M5 22V4"/><path d="M5 5h11l-2 4 2 4H5"/></>
  };
  return <svg className="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">{paths[name]}</svg>;
}

function route(): string { return window.location.pathname.replace(/^\//, "") || "dashboard"; }
function navigate(id: string): void { history.pushState({}, "", `/${id}`); window.dispatchEvent(new PopStateEvent("popstate")); }

type UniversalState = "loading" | "empty" | "insufficient-data" | "not-available" | "permission-denied" | "error" | "partial-data" | "stale";

export function StatePanel({ kind, detail, retry }: { kind: UniversalState; detail?: string; retry?: () => void }) {
  const copy = {
    loading: [uiText.states.loading, ""],
    empty: [uiText.states.emptyTitle, uiText.states.emptyDetail],
    "insufficient-data": [uiText.states.insufficientTitle, detail ?? ""],
    "not-available": [uiText.states.unavailableTitle, detail ?? ""],
    "permission-denied": [uiText.states.permissionTitle, detail ?? uiText.states.permissionDetail],
    error: [uiText.states.errorTitle, detail ?? uiText.states.unexpected],
    "partial-data": [uiText.states.partialTitle, detail ?? ""],
    stale: [uiText.states.staleTitle, detail ?? ""]
  } as const;
  const [title, message] = copy[kind];
  return <div className={`state-panel state-${kind}`} role={kind === "error" || kind === "permission-denied" ? "alert" : "status"}>{kind === "loading" && <span className="spinner"/>}<strong>{title}</strong>{message && <span>{message}</span>}{retry && <button className="button secondary" onClick={retry}>{uiText.actions.retry}</button>}</div>;
}

function LoadingState() { return <StatePanel kind="loading"/>; }
function EmptyState() { return <StatePanel kind="empty"/>; }
function ErrorState({ unauthorized, retry }: { unauthorized: boolean; retry(): void }) { return <StatePanel kind={unauthorized ? "permission-denied" : "error"} {...(!unauthorized ? { retry } : {})}/>; }

export function StatusBadge({ value }: { value: unknown }) {
  const text = statusLabel(value);
  const tone = statusTone(value);
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
      setState({ state: "error", message: uiText.states.unexpected, unauthorized: problem?.status === 401 || problem?.status === 403 });
    });
    return () => controller.abort();
  }, [api, definition, enabled, lifecycleState, nonce]);
  const loadMore = () => {
    if (state.state !== "ready" || !state.page.next_cursor || state.loadingMore) return;
    const cursor = state.page.next_cursor;
    setState({ ...state, loadingMore: true });
    void load(cursor, true).catch(() => setState({ state: "error", message: uiText.states.listContinuationError, unauthorized: false }));
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

export function PageHeader({ title, action, filter }: { title: string; action?: React.ReactNode; filter?: React.ReactNode }) {
  return <div className="page-heading"><div><p className="eyebrow">{uiText.modules.eyebrow}</p><h1>{title}</h1><p>{uiText.modules.description}</p></div>{(action || filter) && <div className="toolbar">{action}{filter}</div>}</div>;
}

export function TableShell({ label, children }: { label: string; children: React.ReactNode }) {
  return <section className="data-card table-card" aria-label={label}>{children}</section>;
}

function ModuleTable({ api, definition, access }: { api: ApiClient; definition: ModuleDefinition; access: Access }) {
  const allowed = canRead(definition, access);
  const [stateFilter, setStateFilter] = useState("");
  const [load, retry, loadMore] = usePage(api, definition, allowed, stateFilter);
  const [selected, setSelected] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  if (!allowed) return <ErrorState unauthorized retry={() => undefined}/>;
  if (load.state === "loading") return <LoadingState/>;
  if (load.state === "error") return <ErrorState {...load} retry={retry}/>;
  return <>
    <PageHeader
      title={definition.label}
      action={canCreate(definition, access) ? <button className="button primary" onClick={() => setCreating(true)}>{uiText.modules.newRecord}</button> : undefined}
      filter={<label>{uiText.common.status}<select aria-label={uiText.common.filterStatus} value={stateFilter} onChange={(event) => setStateFilter(event.target.value)}><option value="">{uiText.common.all}</option>{(lifecycleStates[definition.id] ?? []).map((state) => <option value={state} key={state}>{statusLabel(state)}</option>)}</select></label>}
    />
    <TableShell label={definition.label}>
      {load.data.length === 0 ? <EmptyState/> : <div className="table-scroll"><table><thead><tr><th>{uiText.common.identifier}</th><th>{uiText.common.reference}</th><th>{uiText.common.status}</th><th>{uiText.common.version}</th><th><span className="sr-only">{uiText.common.actions}</span></th></tr></thead><tbody>{load.data.map((row) => <tr key={String(row[definition.idField])}><td><code>{String(row[definition.idField]).slice(0, 8)}…</code></td><td><strong>{displayValue(row[definition.titleField])}</strong></td><td><StatusBadge value={row[definition.stateField]}/></td><td>{displayValue(row.row_version)}</td><td><button className="link-button" onClick={() => setSelected(row)}>{uiText.actions.viewDetail}</button></td></tr>)}</tbody></table></div>}
    </TableShell>
    {load.page.has_more && <div className="pagination"><button className="button secondary" disabled={load.loadingMore} onClick={loadMore}>{load.loadingMore ? uiText.actions.loadingMore : uiText.actions.loadMore}</button></div>}
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
      try { body[field] = JSON.parse(body[field]); } catch { setError(uiText.forms.invalidJson); return; }
    }
    let path = contract.path;
    if (contract.pathField) {
      const value = String(body[contract.pathField] ?? "");
      if (!value) { setError(uiText.forms.requiredField); return; }
      path = path.replace(`{${contract.pathField}}`, value); delete body[contract.pathField];
    }
    setBusy(true); setError(undefined);
    try { await api.post(`/api/v1${path}`, body); completed(); }
    catch { setError(uiText.forms.createError); setBusy(false); }
  };
  return <div className="drawer-backdrop" role="presentation" onMouseDown={close}><aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="create-title" onMouseDown={(event) => event.stopPropagation()}>
    <header className="drawer-header"><div><p className="eyebrow">{uiText.forms.createEyebrow}</p><h2 id="create-title">{definition.label}</h2></div><button className="icon-button" onClick={close} aria-label={uiText.forms.closeCreate}>×</button></header>
    <div className="drawer-body"><p className="form-guidance">{uiText.forms.guidance}</p><div className="create-form">{contract.fields.map((field) => <label key={field}><span>{fieldLabel(field)}</span>{contract.jsonFields?.includes(field) ? <textarea aria-label={fieldLabel(field)} placeholder={fieldPlaceholder(field)} value={form[field] ?? ""} onChange={(event) => setForm((value) => ({ ...value, [field]: event.target.value }))}/> : <input aria-label={fieldLabel(field)} placeholder={fieldPlaceholder(field)} value={form[field] ?? ""} onChange={(event) => setForm((value) => ({ ...value, [field]: event.target.value }))}/>}</label>)}</div>{error && <p className="inline-feedback error" role="alert">{error}</p>}</div>
    <footer className="drawer-footer"><button className="button primary" disabled={busy} onClick={() => void submit()}>{busy ? uiText.actions.creating : uiText.actions.create}</button></footer>
  </aside></div>;
}

function DetailDrawer({ api, access, definition, row: summary, close, completed }: { api: ApiClient; access: Access; definition: ModuleDefinition; row: Row; close(): void; completed(): void }) {
  const [detail, setDetail] = useState<{ loading: boolean; row: Row; error?: string }>({ loading: true, row: summary });
  const [form, setForm] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; message: string }>();
  const id = String(summary[definition.idField]);
  useEffect(() => {
    const controller = new AbortController();
    api.request<Row>(`/api/v1${definition.path}/${id}`, { signal: controller.signal }).then((row) => setDetail({ loading: false, row })).catch((error: unknown) => {
      if (!controller.signal.aborted) setDetail({ loading: false, row: summary, error: uiText.forms.detailUnavailable });
    });
    return () => controller.abort();
  }, [api, definition, id, summary]);
  const row = detail.row;
  const actions = availableWorkflowActions(definition, row, access);
  const version = definition.id === "evidencias" && Array.isArray(row.versions) ? row.versions[0] as Row | undefined : undefined;
  const state = version?.lifecycle_state ?? row[definition.stateField];
  const submit = async (action: WorkflowAction) => {
    const missing = (action.fields ?? []).find((field) => field !== "retest_reference" && !form[field]);
    if (missing) { setFeedback({ kind: "error", message: `${uiText.forms.requiredField} ${fieldLabel(missing)}` }); return; }
    const targetId = action.versionResource ? String(version?.evidence_version_id ?? "") : id;
    const targetPath = action.versionResource ? "/evidence-versions" : definition.path;
    const body: Row = { expected_version: Number(version?.row_version ?? row.row_version), ...form };
    for (const field of ["coverage_percent", "design_effectiveness", "operating_effectiveness"]) if (body[field] !== undefined) body[field] = Number(body[field]);
    if (typeof body.samples === "string") { try { body.samples = JSON.parse(body.samples); } catch { setFeedback({ kind: "error", message: uiText.forms.invalidJson }); return; } }
    try {
      await api.post(`/api/v1${targetPath}/${targetId}:${action.suffix}`, body);
      setFeedback({ kind: "success", message: uiText.forms.operationSuccess }); completed();
    } catch (error) {
      const problem = error instanceof ApiProblem ? error : null;
      setFeedback({ kind: "error", message: problem?.status === 409 ? uiText.forms.concurrencyError : uiText.forms.operationError });
    }
  };
  return <div className="drawer-backdrop" role="presentation" onMouseDown={close}><aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="detail-title" onMouseDown={(event) => event.stopPropagation()}>
    <header className="drawer-header"><div><p className="eyebrow">{uiText.forms.detailEyebrow}</p><h2 id="detail-title">{displayValue(row[definition.titleField] ?? definition.label)}</h2></div><button className="icon-button" onClick={close} aria-label={uiText.forms.closeDetail}>×</button></header>
    <div className="drawer-body">{detail.loading ? <LoadingState/> : <><StatusBadge value={state}/>{detail.error && <p className="inline-feedback error" role="alert">{detail.error}</p>}<dl>{Object.entries(row).filter(([, value]) => !Array.isArray(value) && typeof value !== "object").map(([key, value]) => <React.Fragment key={key}><dt>{fieldLabel(key)}</dt><dd>{displayValue(value)}</dd></React.Fragment>)}</dl>{actions.map((action) => <section className="workflow-action" key={action.suffix}><h3>{action.label}</h3>{action.fields?.map((field) => <label key={field}><span>{fieldLabel(field)}</span><input aria-label={fieldLabel(field)} placeholder={fieldPlaceholder(field)} value={form[field] ?? ""} onChange={(event) => setForm((value) => ({ ...value, [field]: event.target.value }))}/></label>)}<button className="button primary" onClick={() => void submit(action)}>{action.label}</button></section>)}{actions.length === 0 && <p className="read-only-note">{uiText.forms.noActions}</p>}{feedback && <p className={`inline-feedback ${feedback.kind}`} role={feedback.kind === "error" ? "alert" : "status"}>{feedback.message}</p>}</>}</div>
  </aside></div>;
}

export function KpiCard({ label, value, detail, tone, icon }: { label: string; value: string; detail: string; tone: "teal" | "orange" | "blue" | "green"; icon: string }) {
  return <article className={`kpi-card ${tone}`}><div className="kpi-heading"><p>{label}</p><span className="kpi-icon"><Icon name={icon}/></span></div><strong>{value}</strong><span>{detail}</span></article>;
}

export function DataCard({ title, action, className = "", children }: { title: string; action?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return <article className={`data-card ${className}`}><header><h2>{title}</h2>{action}</header>{children}</article>;
}

export function ResponsiveChartFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="chart-frame" role="img" aria-label={label}>{children}</div>;
}

function DistributionBars({ rows, states }: { rows: Row[]; states: readonly string[] }) {
  return <div className="progress-list">{states.map((state) => { const value = rows.filter((row) => row.lifecycle_state === state).length; const width = rows.length === 0 ? 0 : Math.round(value / rows.length * 100); return <div key={state}><span><span>{statusLabel(state)}</span><b>{value}</b></span><div className="progress"><i style={{ width: `${width}%` }}/></div></div>; })}</div>;
}

function Dashboard({ api, access }: { api: ApiClient; access: Access }) {
  const dashboardModules = [modules[1]!, modules[7]!, modules[8]!, modules[9]!];
  const moduleAccess = dashboardModules.map((definition) => canRead(definition, access));
  const assessmentLoad = usePage(api, dashboardModules[0]!, moduleAccess[0]!)[0];
  const evidenceLoad = usePage(api, dashboardModules[1]!, moduleAccess[1]!)[0];
  const issueLoad = usePage(api, dashboardModules[2]!, moduleAccess[2]!)[0];
  const actionLoad = usePage(api, dashboardModules[3]!, moduleAccess[3]!)[0];
  const loads = [assessmentLoad, evidenceLoad, issueLoad, actionLoad];
  if (loads.some((load) => load.state === "loading")) return <LoadingState/>;
  const validLoads = loads.map((load) => load.state === "ready" ? load.data : []);
  const [assessments, evidence, issues, actions] = validLoads;
  const partial = loads.some((load) => load.state === "error") || moduleAccess.some((allowed) => !allowed);
  const validAssessments = assessments!.filter((row) => row.result_status === "valid").length;
  const insufficientAssessments = assessments!.filter((row) => String(row.result_status).startsWith("insufficient_") || row.result_status === "no_data").length;
  const count = (rows: Row[] | undefined, states: string[]) => (rows ?? []).filter((row) => states.includes(String(row.lifecycle_state))).length;
  const cards = [
    { label: uiText.dashboard.assessments, value: moduleAccess[0] ? String(assessments!.length) : "—", detail: moduleAccess[0] ? `${validAssessments} ${uiText.dashboard.validResult}` : uiText.states.unavailableTitle, tone: "teal" as const, icon: "check" },
    { label: uiText.dashboard.issues, value: moduleAccess[2] ? String(issues!.length) : "—", detail: moduleAccess[2] ? `${count(issues, ["open", "triaged", "remediation_in_progress", "pending_verification"])} ${uiText.dashboard.openFlow}` : uiText.states.unavailableTitle, tone: "orange" as const, icon: "alert" },
    { label: uiText.dashboard.actions, value: moduleAccess[3] ? String(actions!.length) : "—", detail: moduleAccess[3] ? `${count(actions, ["pending", "in_progress", "in_review", "completed"])} ${uiText.dashboard.activeInView}` : uiText.states.unavailableTitle, tone: "blue" as const, icon: "task" },
    { label: uiText.dashboard.evidence, value: moduleAccess[1] ? String(evidence!.length) : "—", detail: moduleAccess[1] ? uiText.dashboard.evidenceContext : uiText.states.unavailableTitle, tone: "green" as const, icon: "file" }
  ];
  const actionStates = ["pending", "in_progress", "in_review", "completed", "verified"];
  return <>
    <div className="page-heading dashboard-heading"><div><p className="eyebrow">{uiText.dashboard.eyebrow}</p><h1>{uiText.dashboard.greeting}{access.user_name ? `, ${access.user_name.split(" ")[0]}` : ""}</h1><p>{uiText.dashboard.description}</p></div><span className="context-pill">{uiText.common.currentTenantData}</span></div>
    {partial && <div className="state-inline"><StatePanel kind="partial-data" detail={uiText.states.permissionDetail}/></div>}
    <section className="kpi-grid">{cards.map((card) => <KpiCard {...card} key={card.label}/>)}</section>
    <section className="dashboard-grid">
      <DataCard title={uiText.dashboard.assessmentDistribution} className="chart-card" action={<button className="link-button" onClick={() => navigate("requisitos")}>{uiText.dashboard.seeAssessments} →</button>}>{assessments!.length === 0 ? <StatePanel kind="insufficient-data" detail={uiText.dashboard.noAssessments}/> : <ResponsiveChartFrame label={uiText.dashboard.assessmentDistribution}><div className="metric-bars"><div><span><i className="dot success"/>{uiText.dashboard.valid}</span><strong>{validAssessments}</strong></div><div><span><i className="dot warning"/>{uiText.dashboard.insufficient}</span><strong>{insufficientAssessments}</strong></div><div><span><i className="dot"/>{uiText.dashboard.otherStates}</span><strong>{assessments!.length - validAssessments - insufficientAssessments}</strong></div></div></ResponsiveChartFrame>}</DataCard>
      <DataCard title={uiText.dashboard.actionDistribution} className="chart-card" action={<button className="link-button" onClick={() => navigate("acciones")}>{uiText.dashboard.seeActions} →</button>}>{actions!.length === 0 ? <StatePanel kind="insufficient-data" detail={uiText.dashboard.noActions}/> : <ResponsiveChartFrame label={uiText.dashboard.actionDistribution}><DistributionBars rows={actions!} states={actionStates}/></ResponsiveChartFrame>}</DataCard>
      <DataCard title={uiText.dashboard.recentRecords} className="activity-card">{[...issues!, ...actions!, ...evidence!].slice(0, 6).map((row, index) => <div className="activity" key={index}><span className="activity-icon"><Icon name="check"/></span><div><strong>{displayValue(row.title ?? row.evidence_code ?? row.issue_code ?? row.action_code ?? uiText.dashboard.record)}</strong><StatusBadge value={row.lifecycle_state}/></div></div>)}{issues!.length + actions!.length + evidence!.length === 0 && <EmptyState/>}</DataCard>
    </section>
    <aside className="phase-callout"><span className="flag"><Icon name="flag"/></span><div><strong>{uiText.dashboard.phase}</strong><p>{uiText.dashboard.phaseDetail}</p></div><span className="review-badge">{uiText.dashboard.humanReview}</span></aside>
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
  return <aside className={`sidebar ${open ? "open" : ""}`}><div className="brand"><img src="/tecdex-logo-light.svg" alt="Tecdex"/><span>GRC</span></div><nav aria-label={uiText.navigation.mainAria}>{nav.filter(([id]) => visible(id)).map(([id, label, icon]) => <button key={id} className={active === id ? "active" : ""} onClick={() => { navigate(id); close(); }}><Icon name={icon}/><span>{label}</span></button>)}</nav><div className="sidebar-footer"><strong>TCDX GRC</strong><span>{uiText.shell.productStage}</span></div></aside>;
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
  if (!selected) return <ErrorState unauthorized retry={() => undefined}/>;
  return <><div className="module-tabs" role="tablist" aria-label={uiText.navigation.submodulesAria}>{choices.map((choice) => <button role="tab" aria-selected={selected.id === choice.id} className={selected.id === choice.id ? "active" : ""} key={choice.id} onClick={() => setSelectedId(choice.id)}>{choice.label}</button>)}</div><ModuleTable api={api} access={access} definition={selected}/></>;
}

export function CoreGrcApp({ api }: { api: ApiClient }) {
  const [active, setActive] = useState(route());
  const [menu, setMenu] = useState(false);
  const [access, setAccess] = useState<{ loading: boolean; value?: Access; error?: string }>({ loading: true });
  useEffect(() => { const listener = () => setActive(route()); addEventListener("popstate", listener); return () => removeEventListener("popstate", listener); }, []);
  useEffect(() => { api.request<Access>("/api/v1/access/me").then((value) => setAccess({ loading: false, value })).catch(() => setAccess({ loading: false, error: uiText.states.unavailableTitle })); }, [api]);
  if (access.loading) return <main className="standalone-state"><LoadingState/></main>;
  if (!access.value) return <main className="standalone-state"><section className="auth-card"><img src="/tecdex-logo-light.svg" alt="Tecdex"/><h1>{uiText.auth.title}</h1><p>{uiText.auth.detail}</p></section></main>;
  return <div className="app-shell"><Sidebar active={active} access={access.value} open={menu} close={() => setMenu(false)}/><div className="app-column"><header className="topbar"><button className="menu-button" aria-label={uiText.navigation.open} onClick={() => setMenu(!menu)}>☰</button><label className="search"><span className="sr-only">{uiText.shell.searchLabel}</span><input type="search" placeholder={uiText.shell.searchPlaceholder}/></label><div className="tenant-context"><span>{uiText.shell.tenant}</span><strong>{access.value.tenant_name ?? access.value.tenant_id.slice(0, 8)}</strong></div><div className="user-context"><span className="avatar">{(access.value.user_name ?? "U").slice(0, 1).toUpperCase()}</span><div><strong>{access.value.user_name ?? uiText.shell.authorizedUser}</strong><span>{roleLabel(access.value.roles[0])}</span></div></div></header><main className="workspace">{active === "dashboard" ? <Dashboard api={api} access={access.value}/> : <ModuleWorkspace api={api} access={access.value} active={active}/>}</main></div>{menu && <button className="sidebar-scrim" aria-label={uiText.navigation.close} onClick={() => setMenu(false)}/>}</div>;
}
