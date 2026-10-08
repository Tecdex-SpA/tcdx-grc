import { AddTenantUser, InitialCompanyWizard, TenantUserIntent, tenantPresentationPermission } from "./tenant-onboarding.js";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CONTROL_NATURES, CONTROL_TYPES } from "@tcdx-grc/shared-types";
import { ApiClient, ApiProblem } from "./api-client.js";
import { BrowserSession, receiveApplicationToken, receiveInvitationApplicationToken } from "./browser-auth.js";
import { displayValue, fieldLabel, fieldPlaceholder, roleLabel } from "./i18n/display-text.js";
import { moduleLabels, uiText } from "./i18n/es.js";
import { statusLabel, statusTone } from "./i18n/status-labels.js";
import type { CurrentPrincipalAuthorization } from "@tcdx-grc/contracts";
import { parseCurrentAuthorization, managedIdentityEligibility } from "./frontend-auth-projections.js";
import { BrandLogo, brandNames } from "./branding.js";
import { LoginEntry } from "./login-entry.js";
import { ManagedIdentityWorkspace } from "./managed-identity.js";

export type TenantContext = { tenant_id: string; tenant_display_name: string; tenant_membership_id: string; membership_state: string; effective_role_codes: string[] };
export type Access = { available_tenant_contexts: TenantContext[]; effective_platform_role_codes: string[] };
type Row = Record<string, unknown>;
type PageMeta = { has_more: boolean; next_cursor: string | null };
type FrameworkFilter = { framework_version_id: string; framework_code: string; framework_name: string; edition: string; access_mode?: "official" | "non_authoritative_validation" };
type Page = { items: Row[]; page: PageMeta; framework_filters?: FrameworkFilter[] };
type LoadState = { state: "loading" } | { state: "ready"; data: Row[]; page: PageMeta; frameworkFilters: FrameworkFilter[]; loadingMore?: boolean } | { state: "error"; message: string; unauthorized: boolean };

function membershipRoleValidity(role: Row, now: number): "future" | "active" | "ended" | "unknown" {
  const from = Date.parse(String(role.valid_from));
  const to = role.valid_to == null ? Number.POSITIVE_INFINITY : Date.parse(String(role.valid_to));
  if (Number.isNaN(from) || Number.isNaN(to)) return "unknown";
  if (to <= now) return "ended";
  return from > now ? "future" : "active";
}

type ModuleDefinition = {
  id: string; label: string; path: string; idField: string; titleField: string; stateField: string;
};

export type WorkflowAction = { state: string; label: string; suffix: string; fields?: readonly string[]; optionalFields?: readonly string[]; versionResource?: boolean };

const workflowActions: Readonly<Record<string, readonly WorkflowAction[]>> = {
  cumplimiento: [
    { state: "draft", label: uiText.actions.submit, suffix: "submit", fields: ["rationale"] },
    { state: "submitted", label: uiText.actions.approve, suffix: "approve" }
  ],
  requisitos: [
    { state: "not_assessed", label: uiText.actions.start, suffix: "start" },
    { state: "in_progress", label: uiText.actions.submitAssessment, suffix: "submit", fields: ["result_status", "domain_conclusion", "coverage_percent"] },
    { state: "assessed", label: uiText.actions.approve, suffix: "approve" }
  ],
  soa: [{ state: "draft", label: uiText.actions.publish, suffix: "publish", fields: ["reason"] }],
  "evaluaciones-control": [
    { state: "planned", label: uiText.actions.start, suffix: "start" },
    { state: "in_progress", label: uiText.actions.complete, suffix: "complete", fields: ["result_status", "domain_conclusion", "design_effectiveness", "operating_effectiveness", "coverage_percent"], optionalFields: ["domain_conclusion", "design_effectiveness", "operating_effectiveness", "coverage_percent"] },
    { state: "completed", label: uiText.actions.review, suffix: "review" },
    { state: "reviewed", label: uiText.actions.approve, suffix: "approve" }
  ],
  pruebas: [
    { state: "planned", label: uiText.actions.start, suffix: "start" },
    { state: "in_progress", label: uiText.actions.execute, suffix: "execute", fields: ["result_status", "domain_conclusion", "samples"] },
    { state: "completed", label: uiText.actions.review, suffix: "review" },
    { state: "reviewed", label: uiText.actions.approve, suffix: "approve" }
  ],
  "solicitudes-evidencia": [
    { state: "open", label: uiText.actions.fulfill, suffix: "fulfill", fields: ["evidence_version_id"] }
  ],
  evidencias: [
    { state: "draft", label: uiText.actions.submit, suffix: "submit", versionResource: true },
    { state: "submitted", label: uiText.actions.startReview, suffix: "start-review", versionResource: true },
    { state: "under_review", label: uiText.actions.approve, suffix: "approve", fields: ["sufficiency", "relevance", "rationale"], versionResource: true },
    { state: "under_review", label: uiText.actions.reject, suffix: "reject", fields: ["sufficiency", "relevance", "rationale"], versionResource: true }
  ],
  retencion: [
    { state: "draft", label: "Actualizar borrador", suffix: "update", fields: ["retention_seconds", "is_mandatory"] },
    { state: "draft", label: uiText.actions.review, suffix: "review" },
    { state: "under_review", label: uiText.actions.approve, suffix: "approve" },
    { state: "approved", label: uiText.actions.publish, suffix: "publish" }
  ],
  issues: [
    { state: "open", label: uiText.actions.triage, suffix: "triage", fields: ["severity", "priority", "business_owner_subject_id", "due_date"] },
    { state: "triaged", label: uiText.actions.startRemediation, suffix: "start-remediation" },
    { state: "remediation_in_progress", label: uiText.actions.requestVerification, suffix: "request-verification" },
    { state: "pending_verification", label: uiText.actions.verifyClose, suffix: "verify-close", fields: ["verification_decision", "rationale"] }
  ],
  acciones: [
    { state: "pending", label: uiText.actions.start, suffix: "start" },
    { state: "in_progress", label: uiText.actions.submitReview, suffix: "submit-for-review" },
    { state: "in_review", label: uiText.actions.complete, suffix: "complete", fields: ["evidence_version_id", "link_role"] },
    { state: "completed", label: uiText.actions.verify, suffix: "verify", fields: ["verification_decision", "rationale", "retest_reference"], optionalFields: ["retest_reference"] }
  ]
};

export function availableWorkflowActions(definition: ModuleDefinition, row: Row): readonly WorkflowAction[] {
  const version = definition.id === "evidencias" && Array.isArray(row.versions) ? row.versions[0] as Row | undefined : undefined;
  const state = String(version?.lifecycle_state ?? row[definition.stateField] ?? "");
  return (workflowActions[definition.id] ?? []).filter((action) => action.state === state);
}

type CreateContract = { path: string; fields: readonly string[]; jsonFields?: readonly string[]; pathField?: string };
const createContracts: Readonly<Record<string, CreateContract>> = {
  cumplimiento: { path: "/requirement-applicabilities", fields: ["requirement_id", "scope_subject_id", "applicability_decision", "rationale", "effective_from", "effective_to"] },
  requisitos: { path: "/requirement-assessments", fields: ["requirement_applicability_id", "methodology_version_ref", "effective_configuration_id"] },
  soa: { path: "/statements-of-applicability", fields: ["framework_version_id", "title", "effective_from", "items"], jsonFields: ["items"] },
  controles: { path: "/controls:instantiate", fields: ["based_on_control_version_id", "control_code", "name", "business_owner_subject_id", "objective", "control_type", "nature", "frequency_code", "execution_method", "verification_method", "minimum_evidence", "suggested_owner_role_code", "effective_from", "effective_to"] },
  "evaluaciones-control": { path: "/control-assessments", fields: ["control_id", "control_version_id", "methodology_version_ref", "effective_configuration_id"] },
  pruebas: { path: "/assurance-tests", fields: ["control_id", "control_version_id", "test_code", "planned_at"] },
  "solicitudes-evidencia": { path: "/evidence-requests", fields: ["request_code", "requirement_id", "control_id", "requirement_assessment_id", "control_assessment_id", "assurance_test_id", "assigned_membership_id", "due_at"] },
  evidencias: { path: "/evidence", fields: ["evidence_code", "evidence_type", "business_owner_subject_id", "valid_from", "valid_to", "retention_policy_id", "source_kind", "file_object_id", "period_start", "period_end", "effective_from", "effective_to", "expires_at", "provenance_ref", "links"], jsonFields: ["links"] },
  retencion: { path: "/retention-policies", fields: ["policy_code", "version_number", "policy_kind", "retention_seconds", "trigger_event_code", "precedence_rank", "is_mandatory"] },
  issues: { path: "/issues", fields: ["issue_code", "issue_kind", "title", "description", "severity", "priority", "business_owner_subject_id", "due_date", "requirement_assessment_id", "control_assessment_id", "assurance_test_id", "origin_role"] },
  acciones: { path: "/issues/{issue_id}/actions", pathField: "issue_id", fields: ["issue_id", "action_code", "title", "description", "priority", "assigned_membership_id", "due_date"] }
};

export function canCreate(definition: ModuleDefinition): boolean { return Boolean(createContracts[definition.id]); }

export const modules: ModuleDefinition[] = [
  { id: "cumplimiento", label: moduleLabels.cumplimiento, path: "/requirement-applicabilities", idField: "requirement_applicability_id", titleField: "applicability_decision", stateField: "lifecycle_state" },
  { id: "requisitos", label: moduleLabels.requisitos, path: "/requirement-assessments", idField: "requirement_assessment_id", titleField: "domain_conclusion", stateField: "lifecycle_state" },
  { id: "soa", label: moduleLabels.soa, path: "/statements-of-applicability", idField: "statement_of_applicability_id", titleField: "title", stateField: "lifecycle_state" },
  { id: "controles", label: moduleLabels.controles, path: "/controls", idField: "control_id", titleField: "name", stateField: "lifecycle_state" },
  { id: "evaluaciones-control", label: moduleLabels["evaluaciones-control"], path: "/control-assessments", idField: "control_assessment_id", titleField: "domain_conclusion", stateField: "lifecycle_state" },
  { id: "pruebas", label: moduleLabels.pruebas, path: "/assurance-tests", idField: "assurance_test_id", titleField: "test_code", stateField: "lifecycle_state" },
  { id: "solicitudes-evidencia", label: moduleLabels["solicitudes-evidencia"], path: "/evidence-requests", idField: "evidence_request_id", titleField: "request_code", stateField: "lifecycle_state" },
  { id: "evidencias", label: moduleLabels.evidencias, path: "/evidence", idField: "evidence_id", titleField: "evidence_code", stateField: "lifecycle_state" },
  { id: "retencion", label: moduleLabels.retencion, path: "/retention-policies", idField: "retention_policy_id", titleField: "policy_code", stateField: "lifecycle_state" },
  { id: "issues", label: moduleLabels.issues, path: "/issues", idField: "issue_id", titleField: "title", stateField: "lifecycle_state" },
  { id: "acciones", label: moduleLabels.acciones, path: "/actions", idField: "action_id", titleField: "title", stateField: "lifecycle_state" }
];

const nav = [
  ["dashboard", uiText.navigation.dashboard, "grid"], ["cumplimiento", uiText.navigation.compliance, "check"], ["requisitos", uiText.navigation.requirements, "list"],
  ["controles", uiText.navigation.controls, "shield"], ["evidencias", uiText.navigation.evidence, "file"], ["acciones", uiText.navigation.actions, "task"]
] as const;

const settingsRoutes = {
  companies: "configuraciones/empresas",
  users: "configuraciones/usuarios",
  managedIdentities: "configuraciones/identidades-gestionadas"
} as const;

function Icon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>,
    check: <><path d="M4 12l5 5L20 6"/><path d="M12 22a10 10 0 1 1 10-10"/></>,
    list: <><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/></>,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>,
    file: <><path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h6M9 17h6"/></>,
    task: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 12l3 3 6-7"/></>,
    alert: <><path d="M12 3 2.5 20h19z"/><path d="M12 9v4M12 17h.01"/></>,
    flag: <><path d="M5 22V4"/><path d="M5 5h11l-2 4 2 4H5"/></>,
    building: <><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 7h2m4 0h2M8 11h2m4 0h2M9 21v-5h6v5"/></>,
    users: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 6a3 3 0 0 1 0 6m1 3a5 5 0 0 1 3 5"/></>
  };
  return <svg className="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">{paths[name]}</svg>;
}

function route(): string { return window.location.pathname.replace(/^\//, "") || "dashboard"; }
function navigate(id: string): void { history.pushState({}, "", `/${id}`); window.dispatchEvent(new PopStateEvent("popstate")); }

type UniversalState = "loading" | "empty" | "insufficient-data" | "not-available" | "permission-denied" | "error" | "partial-data" | "stale";

export function StatePanel({ kind, detail, retry }: { kind: UniversalState; detail?: string; retry?: () => void }) {
  const copy = {
    loading: [uiText.states.loading, detail ?? ""],
    empty: [uiText.states.emptyTitle, detail ?? uiText.states.emptyDetail],
    "insufficient-data": [uiText.states.insufficientTitle, detail ?? ""],
    "not-available": [uiText.states.unavailableTitle, detail ?? ""],
    "permission-denied": [uiText.states.permissionTitle, detail ?? uiText.states.permissionDetail],
    error: [uiText.states.errorTitle, detail ?? uiText.states.unexpected],
    "partial-data": [uiText.states.partialTitle, detail ?? ""],
    stale: [uiText.states.staleTitle, detail ?? ""]
  } as const;
  const [title, message] = copy[kind];
  return <div className={`state-panel state-${kind}`} role={kind === "error" || kind === "permission-denied" ? "alert" : "status"}>{kind === "loading" && <span className="spinner"/>}<strong>{title}</strong>{message && <span>{message}</span>}{retry && <button type="button" className="button secondary" onClick={retry}>{uiText.actions.retry}</button>}</div>;
}

function LoadingState() { return <StatePanel kind="loading"/>; }
function EmptyState() { return <StatePanel kind="empty"/>; }
function ErrorState({ unauthorized, retry }: { unauthorized: boolean; retry(): void }) { return <StatePanel kind={unauthorized ? "permission-denied" : "error"} {...(!unauthorized ? { retry } : {})}/>; }

export function StatusBadge({ value }: { value: unknown }) {
  const text = statusLabel(value);
  const tone = statusTone(value);
  return <span className={`status ${tone}`}><i aria-hidden="true"/>{text}</span>;
}

function usePage(api: ApiClient, definition: ModuleDefinition, enabled = true, lifecycleState = "", search = "", frameworkVersionId = "", applicability = "", implementation = ""): [LoadState, () => void, () => void] {
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<LoadState>({ state: "loading" });
  const load = (cursor?: string, append = false, signal?: AbortSignal) => {
    const query = new URLSearchParams({ "page[size]": "100" });
    if (cursor) query.set("page[cursor]", cursor);
    if (lifecycleState) query.set("filter[lifecycle_state]", lifecycleState);
    if (search && definition.id === "controles") query.set("filter[query]", search);
    if (frameworkVersionId && definition.id === "controles") query.set("filter[framework_version_id]", frameworkVersionId);
    if (applicability && definition.id === "controles") query.set("filter[applicability]", applicability);
    if (implementation && definition.id === "controles") query.set("filter[implementation]", implementation);
    return api.request<Page>(`/api/v1${definition.path}?${query}`, signal ? { signal } : {}).then((page) => setState((current) => ({
      state: "ready",
      data: append && current.state === "ready" ? [...current.data, ...page.items] : page.items,
      page: page.page,
      frameworkFilters: page.framework_filters ?? (current.state === "ready" ? current.frameworkFilters : [])
    })));
  };
  useEffect(() => {
    if (!enabled) {
      setState({ state: "ready", data: [], page: { has_more: false, next_cursor: null }, frameworkFilters: [] });
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
  }, [api, definition, enabled, lifecycleState, search, frameworkVersionId, applicability, implementation, nonce]);
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
  "solicitudes-evidencia": ["open", "fulfilled", "cancelled", "expired"], evidencias: ["draft", "submitted", "under_review", "approved", "rejected", "expired", "superseded"], retencion: ["draft", "under_review", "approved", "published"],
  issues: ["open", "triaged", "remediation_in_progress", "pending_verification", "verified_closed", "dismissed", "reopened"],
  acciones: ["pending", "in_progress", "in_review", "completed", "verified", "reopened", "cancelled"]
};

export function PageHeader({ title, action, filter }: { title: string; action?: React.ReactNode; filter?: React.ReactNode }) {
  return <div className="page-heading"><div><p className="eyebrow">{uiText.modules.eyebrow}</p><h1>{title}</h1><p>{uiText.modules.description}</p></div>{(action || filter) && <div className="toolbar">{action}{filter}</div>}</div>;
}

export function TableShell({ label, children }: { label: string; children: React.ReactNode }) {
  return <section className="data-card table-card" aria-label={label}>{children}</section>;
}

function ModuleTable({ api, definition }: { api: ApiClient; definition: ModuleDefinition }) {
  const [stateFilter, setStateFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [frameworkVersionId, setFrameworkVersionId] = useState("");
  const [applicabilityFilter, setApplicabilityFilter] = useState("");
  const [implementationFilter, setImplementationFilter] = useState("");
  const [load, retry, loadMore] = usePage(api, definition, true, stateFilter, search, frameworkVersionId, applicabilityFilter, implementationFilter);
  const [selected, setSelected] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  if (load.state === "loading") return <LoadingState/>;
  if (load.state === "error") return <ErrorState {...load} retry={retry}/>;
  return <>
    <PageHeader
      title={definition.label}
      action={canCreate(definition) ? <button className="button primary" onClick={() => setCreating(true)}>{uiText.modules.newRecord}</button> : undefined}
      filter={<>{definition.id === "controles" && <><form onSubmit={(event) => { event.preventDefault(); if (searchInput.trim().length === 0 || searchInput.trim().length >= 2) setSearch(searchInput.trim()); }}><label>Buscar controles<input aria-label="Buscar controles por nombre, código o referencia normativa" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Nombre, código o referencia"/></label><button className="button secondary" disabled={searchInput.trim().length === 1} type="submit">Buscar</button></form><label>Norma o ley<select aria-label="Filtrar por norma o ley" value={frameworkVersionId} onChange={(event) => setFrameworkVersionId(event.target.value)}><option value="">Todos los marcos habilitados</option>{load.frameworkFilters.map((framework) => <option key={framework.framework_version_id} value={framework.framework_version_id}>{framework.framework_name} · {framework.edition}{framework.access_mode === "non_authoritative_validation" ? " · Validación provisional" : ""}</option>)}</select></label><label>Aplicabilidad<select aria-label="Filtrar por aplicabilidad" value={applicabilityFilter} onChange={(event) => setApplicabilityFilter(event.target.value)}><option value="">Todas</option><option value="applicable">Aplicable</option><option value="not_applicable">No aplica</option></select></label><label>Implementación<select aria-label="Filtrar por implementación" value={implementationFilter} onChange={(event) => setImplementationFilter(event.target.value)}><option value="">Todas</option><option value="implemented">Implementado</option><option value="unimplemented">Sin implementar</option></select></label></>}<label>{uiText.common.status}<select aria-label={uiText.common.filterStatus} value={stateFilter} onChange={(event) => setStateFilter(event.target.value)}><option value="">{uiText.common.all}</option>{(lifecycleStates[definition.id] ?? []).map((state) => <option value={state} key={state}>{statusLabel(state)}</option>)}</select></label></>}
    />
    {definition.id === "controles" && load.data.some(hasProvisionalFramework) &&
      <p className="form-guidance" role="note">{provisionalWarning}</p>}
    <TableShell label={definition.label}>
      {load.data.length === 0 ? <EmptyState/> : definition.id === "controles" ? <div className="table-scroll"><table><thead><tr><th>Código</th><th>Control</th><th>Norma o ley</th><th>Aplicabilidad</th><th>Implementación</th><th>{uiText.common.status}</th><th>{uiText.common.version}</th><th><span className="sr-only">{uiText.common.actions}</span></th></tr></thead><tbody>{load.data.map((row) => {
        const frameworks = Array.isArray(row.normative_frameworks) ? row.normative_frameworks as Row[] : [];
        const applicability = Array.isArray(row.applicability_decisions) ? row.applicability_decisions as Row[] : null;
        const implementationCount = typeof row.implementation_count === "number" ? row.implementation_count : null;
        return <tr key={String(row.control_id)}><td><strong>{displayValue(row.control_code)}</strong></td><td><strong>{displayValue(row.name)}</strong><small className="admin-secondary">{displayValue(row.ownership_class)}</small>{hasProvisionalFramework(row) && <small className="admin-secondary">Validación provisional</small>}</td><td>{frameworks.length ? frameworks.map((framework) => <span className="catalog-relation" key={String(framework.framework_version_id)}>{String(framework.framework_name)} · {String(framework.edition)}{framework.access_mode === "non_authoritative_validation" ? " · Validación provisional" : " · Oficial"}</span>) : "Sin relación visible"}</td><td>{applicability === null ? "Acceso restringido" : applicability.length ? applicability.map((item) => `${displayValue(item.decision)} (${String(item.requirement_count)})`).join(", ") : "Sin decisión aprobada"}</td><td>{implementationCount === null ? "Acceso restringido" : implementationCount > 0 ? `Implementado${implementationCount > 1 ? ` (${implementationCount})` : ""}` : "Sin implementar"}</td><td><StatusBadge value={row.lifecycle_state}/></td><td>{row.version_number == null ? "—" : `v${String(row.version_number)}`}</td><td><button className="link-button" onClick={() => setSelected(row)}>{uiText.actions.viewDetail}</button></td></tr>;
      })}</tbody></table></div> : <div className="table-scroll"><table><thead><tr><th>{uiText.common.identifier}</th><th>{uiText.common.reference}</th><th>{uiText.common.status}</th><th>{uiText.common.version}</th><th><span className="sr-only">{uiText.common.actions}</span></th></tr></thead><tbody>{load.data.map((row) => <tr key={String(row[definition.idField])}><td><code>{String(row[definition.idField]).slice(0, 8)}…</code></td><td><strong>{displayValue(row[definition.titleField])}</strong></td><td><StatusBadge value={row[definition.stateField]}/></td><td>{displayValue(row.row_version)}</td><td><button className="link-button" onClick={() => setSelected(row)}>{uiText.actions.viewDetail}</button></td></tr>)}</tbody></table></div>}
    </TableShell>
    {load.page.has_more && <div className="pagination"><button className="button secondary" disabled={load.loadingMore} onClick={loadMore}>{load.loadingMore ? uiText.actions.loadingMore : uiText.actions.loadMore}</button></div>}
    {selected && (
      <DetailDrawer api={api} definition={definition} row={selected} close={() => setSelected(null)} completed={() => { setSelected(null); retry(); }}/>
    )}
    {creating && (
      <CreateDrawer api={api} definition={definition} close={() => setCreating(false)} completed={() => { setCreating(false); retry(); }}/>
    )}
  </>;
}

function hasProvisionalFramework(row: Row): boolean {
  return row.access_mode === "non_authoritative_validation"
    || (Array.isArray(row.normative_frameworks) && (row.normative_frameworks as Row[])
      .some((framework) => framework.access_mode === "non_authoritative_validation"));
}

function ControlVersionSelect({ api, value, onChange }: { api: ApiClient; value: string; onChange(value: string): void }) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [controls, setControls] = useState<Row[]>([]);
  const [controlId, setControlId] = useState("");
  const [versions, setVersions] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ "page[size]": "100" });
    if (search) query.set("filter[query]", search);
    setLoading(true); setError(false);
    void api.request<Page>(`/api/v1/controls?${query}`, { signal: controller.signal }).then((page) => {
      setControls(page.items.filter((item) => item.ownership_class === "PLATFORM_CONTROL" || item.ownership_class === "GLOBAL_REFERENCE"));
      setLoading(false);
    }).catch(() => { if (!controller.signal.aborted) { setError(true); setLoading(false); } });
    return () => controller.abort();
  }, [api, search]);
  useEffect(() => {
    if (!controlId) { setVersions([]); onChange(""); return; }
    const controller = new AbortController();
    void api.request<Row>(`/api/v1/controls/${encodeURIComponent(controlId)}`, { signal: controller.signal }).then((detail) => {
      const allowed = Array.isArray(detail.versions) ? detail.versions as Row[] : [];
      setVersions(allowed);
      onChange(typeof allowed[0]?.control_version_id === "string" ? allowed[0].control_version_id : "");
    }).catch(() => { if (!controller.signal.aborted) { setVersions([]); onChange(""); setError(true); } });
    return () => controller.abort();
  }, [api, controlId]);
  return <div className="control-version-selector"><form onSubmit={(event) => { event.preventDefault(); if (searchInput.trim().length === 0 || searchInput.trim().length >= 2) setSearch(searchInput.trim()); }}><label><span>Buscar control base</span><input aria-label="Buscar control base" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Código, nombre o norma"/></label><button className="button secondary" type="submit" disabled={searchInput.trim().length === 1}>Buscar</button></form>{controls.some(hasProvisionalFramework) && <p className="form-guidance" role="note">{provisionalWarning}</p>}<label><span>Control base autorizado</span><select aria-label="Control base autorizado" value={controlId} onChange={(event) => setControlId(event.target.value)} disabled={loading || error}><option value="">{loading ? "Cargando controles…" : "Selecciona un control"}</option>{controls.map((control) => <option value={String(control.control_id)} key={String(control.control_id)}>{String(control.control_code)} · {String(control.name)}{hasProvisionalFramework(control) ? " · Validación provisional" : ""}{Array.isArray(control.normative_frameworks) && control.normative_frameworks.length ? ` · ${(control.normative_frameworks as Row[]).map((framework) => String(framework.framework_name)).join(", ")}` : ""}</option>)}</select></label>{versions.length > 1 && <label><span>Versión base</span><select aria-label="Versión base" value={value} onChange={(event) => onChange(event.target.value)}>{versions.map((version) => <option key={String(version.control_version_id)} value={String(version.control_version_id)}>v{String(version.version_number)}</option>)}</select></label>}{error && <p className="form-error" role="alert">No fue posible cargar controles autorizados.</p>}{!loading && !error && controls.length === 0 && <p className="form-guidance">Sin controles base visibles. Revisa los marcos habilitados o la búsqueda.</p>}</div>;
}

function SubjectSelect({ api, value, onChange }: { api: ApiClient; value: string; onChange(value: string): void }) {
  const [query, setQuery] = useState("");
  const [subjects, setSubjects] = useState<Row[]>([]);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ "page[size]": "100" });
    if (query.trim().length >= 2) params.set("filter[query]", query.trim());
    void api.request<Page>(`/api/v1/subjects?${params}`, { signal: controller.signal })
      .then((page) => { setSubjects(page.items); setError(false); })
      .catch(() => { if (!controller.signal.aborted) { setSubjects([]); setError(true); } });
    return () => controller.abort();
  }, [api, query]);
  return <div className="control-version-selector"><label><span>Buscar responsable</span><input type="search" aria-label="Buscar Subject por nombre o clave" value={query} onChange={(event) => setQuery(event.target.value)}/></label><label><span>Responsable de negocio</span><select aria-label="Responsable de negocio" value={value} onChange={(event) => onChange(event.target.value)}><option value="">Selecciona un Subject</option>{subjects.map((subject) => <option key={String(subject.subject_id)} value={String(subject.subject_id)}>{String(subject.display_name)} · {String(subject.subject_type)} · {String(subject.canonical_key)}</option>)}</select></label>{error && <p className="form-error" role="alert">No fue posible cargar Subjects autorizados.</p>}</div>;
}

function MethodologySelect({ api, domain, value, onChange }: { api: ApiClient; domain: "compliance" | "controls"; value: string; onChange(value: string): void }) {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(false);
    void (async () => {
      const available: Row[] = [];
      let cursor: string | null = null;
      do {
        const query = new URLSearchParams({ "page[size]": "100" });
        if (cursor) query.set("page[cursor]", cursor);
        const page = await api.request<Page>(`/api/v1/${domain}-methodologies?${query}`, { signal: controller.signal });
        available.push(...page.items); cursor = page.page.has_more ? page.page.next_cursor : null;
      } while (cursor);
      setItems(available); setLoading(false);
    })().catch(() => { if (!controller.signal.aborted) { setItems([]); setError(true); setLoading(false); } });
    return () => controller.abort();
  }, [api, domain]);
  return <label><span>{fieldLabel("methodology_version_ref")}</span><select aria-label={fieldLabel("methodology_version_ref")} value={value} disabled={loading || error} onChange={(event) => onChange(event.target.value)}><option value="">{loading ? "Cargando metodologías…" : "Selecciona una metodología publicada"}</option>{items.map((item) => <option key={String(item.methodology_version_ref)} value={String(item.methodology_version_ref)}>{String(item.name)} · v{String(item.version_number)}</option>)}</select>{error && <span role="alert">No fue posible cargar metodologías autorizadas.</span>}{!loading && !error && items.length === 0 && <span>Sin metodologías publicadas disponibles.</span>}</label>;
}

function CreateDrawer({ api, definition, close, completed }: { api: ApiClient; definition: ModuleDefinition; close(): void; completed(): void }) {
  const contract = createContracts[definition.id]!;
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File>();
  const [classification, setClassification] = useState("");
  const [sourceProvenance, setSourceProvenance] = useState("");
  const submit = async () => {
    const body: Row = Object.fromEntries(Object.entries(form).filter(([, value]) => value !== ""));
    if (definition.id === "controles" && !body.based_on_control_version_id) { setError("Selecciona un control base autorizado."); return; }
    if (definition.id === "controles" && !body.business_owner_subject_id) { setError("Selecciona un responsable autorizado."); return; }
    if (definition.id === "cumplimiento" && body.applicability_decision === "not_applicable" &&
        (typeof body.rationale !== "string" || !body.rationale.trim())) { setError("Indica la justificación para No aplica."); return; }
    for (const field of contract.jsonFields ?? []) if (typeof body[field] === "string") {
      try { body[field] = JSON.parse(body[field]); } catch { setError(uiText.forms.invalidJson); return; }
    }
    if (definition.id === "retencion") {
      for (const field of ["version_number", "retention_seconds", "precedence_rank"]) if (body[field] !== undefined) body[field] = Number(body[field]);
      if (body.is_mandatory === "true" || body.is_mandatory === "false") body.is_mandatory = body.is_mandatory === "true";
    }
    let path = contract.path;
    if (contract.pathField) {
      const value = String(body[contract.pathField] ?? "");
      if (!value) { setError(uiText.forms.requiredField); return; }
      path = path.replace(`{${contract.pathField}}`, value); delete body[contract.pathField];
    }
    setBusy(true); setError(undefined);
    try {
      if (definition.id === "evidencias" && file && !body.file_object_id) {
        if (!body.retention_policy_id || !classification || !sourceProvenance) { setError(uiText.forms.requiredField); setBusy(false); return; }
        body.file_object_id = await api.uploadEvidenceFile(file, String(body.retention_policy_id), classification, sourceProvenance);
        setForm((value) => ({ ...value, file_object_id: String(body.file_object_id) }));
      }
      await api.post(`/api/v1${path}`, body); completed();
    } catch { setError(file ? uiText.forms.fileError : uiText.forms.createError); setBusy(false); }
  };
  return <div className="drawer-backdrop" role="presentation" onMouseDown={close}><aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="create-title" onMouseDown={(event) => event.stopPropagation()}>
    <header className="drawer-header"><div><p className="eyebrow">{uiText.forms.createEyebrow}</p><h2 id="create-title">{definition.label}</h2></div><button className="icon-button" onClick={close} aria-label={uiText.forms.closeCreate}>×</button></header>
    <div className="drawer-body"><p className="form-guidance">{uiText.forms.guidance}</p><div className="create-form">{definition.id === "evidencias" && <><label><span>{uiText.forms.uploadFile}</span><input type="file" onChange={(event) => setFile(event.target.files?.[0])}/></label><label><span>{uiText.forms.fileClassification}</span><select value={classification} onChange={(event) => setClassification(event.target.value)}><option value="">—</option>{["public", "internal", "confidential", "restricted"].map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label><span>{uiText.forms.fileProvenance}</span><input value={sourceProvenance} onChange={(event) => setSourceProvenance(event.target.value)}/></label></>}{contract.fields.map((field) => field === "methodology_version_ref" ? <MethodologySelect key={field} api={api} domain={definition.id === "requisitos" ? "compliance" : "controls"} value={form[field] ?? ""} onChange={(value) => setForm((current) => ({ ...current, [field]: value }))}/> : definition.id === "controles" && field === "based_on_control_version_id" ? <ControlVersionSelect key={field} api={api} value={form[field] ?? ""} onChange={(value) => setForm((current) => ({ ...current, [field]: value }))}/> : definition.id === "controles" && field === "business_owner_subject_id" ? <SubjectSelect key={field} api={api} value={form[field] ?? ""} onChange={(value) => setForm((current) => ({ ...current, [field]: value }))}/> : <label key={field}><span>{fieldLabel(field)}</span>{definition.id === "cumplimiento" && field === "applicability_decision" ? <select aria-label={fieldLabel(field)} value={form[field] ?? ""} onChange={(event) => setForm((value) => ({ ...value, [field]: event.target.value }))}><option value="">Selecciona una decisión</option><option value="applicable">Aplicable</option><option value="not_applicable">No aplica</option></select> : definition.id === "controles" && (field === "control_type" || field === "nature") ? <select aria-label={fieldLabel(field)} value={form[field] ?? ""} onChange={(event) => setForm((value) => ({ ...value, [field]: event.target.value }))}><option value="">Selecciona una opción</option>{(field === "control_type" ? CONTROL_TYPES : CONTROL_NATURES).map((value) => <option value={value} key={value}>{displayValue(value)}</option>)}</select> : contract.jsonFields?.includes(field) ? <textarea aria-label={fieldLabel(field)} placeholder={fieldPlaceholder(field)} value={form[field] ?? ""} onChange={(event) => setForm((value) => ({ ...value, [field]: event.target.value }))}/> : <input aria-label={fieldLabel(field)} placeholder={fieldPlaceholder(field)} value={form[field] ?? ""} onChange={(event) => setForm((value) => ({ ...value, [field]: event.target.value }))}/>}</label>)}</div>{error && <p className="inline-feedback error" role="alert">{error}</p>}</div>
    <footer className="drawer-footer"><button className="button primary" disabled={busy} onClick={() => void submit()}>{busy ? uiText.actions.creating : uiText.actions.create}</button></footer>
  </aside></div>;
}

function ControlDetailContent({ row }: { row: Row }) {
  const versions = Array.isArray(row.versions) ? row.versions as Row[] : [];
  const current = versions[0];
  const relations = Array.isArray(row.normative_relations) ? row.normative_relations as Row[] : [];
  const applicability = Array.isArray(row.applicability_relations) ? row.applicability_relations as Row[] : null;
  return <>
    {(row.access_mode === "non_authoritative_validation" || relations.some((relation) => relation.access_mode === "non_authoritative_validation")) && <p className="form-guidance" role="note">{provisionalWarning}</p>}
    <section className="catalog-detail-section"><h3>Identidad</h3><dl><dt>Código</dt><dd>{displayValue(row.control_code)}</dd><dt>Nombre</dt><dd>{displayValue(row.name)}</dd><dt>Origen</dt><dd>{displayValue(row.ownership_class)}</dd><dt>Versión</dt><dd>{current ? `v${String(current.version_number)}` : "No informada"}</dd><dt>Estado</dt><dd><StatusBadge value={row.lifecycle_state}/></dd></dl></section>
    <section className="catalog-detail-section"><h3>Definición</h3>{current ? <dl>{(["objective", "control_type", "nature", "frequency_code", "execution_method", "verification_method", "minimum_evidence", "suggested_owner_role_code"] as const).map((field) => <React.Fragment key={field}><dt>{fieldLabel(field)}</dt><dd>{displayValue(current[field])}</dd></React.Fragment>)}</dl> : <StatePanel kind="insufficient-data" detail="Sin versión visible."/>}</section>
    <section className="catalog-detail-section"><h3>Trazabilidad normativa autorizada</h3>{relations.length ? <div className="table-scroll"><table><thead><tr><th>Norma o ley</th><th>Requisito o unidad</th><th>Referencia</th><th>Relación</th></tr></thead><tbody>{relations.map((relation) => <tr key={String(relation.mapping_id)}><td>{String(relation.framework_name)} · {String(relation.edition)}</td><td>{displayValue(relation.target_code)}</td><td>{displayValue(relation.locator)}</td><td>{displayValue(relation.mapping_type)}</td></tr>)}</tbody></table></div> : <p>Sin relaciones visibles con los marcos contratados.</p>}</section>
    {applicability !== null && <section className="catalog-detail-section"><h3>Aplicabilidad por requisito</h3>{applicability.length ? applicability.map((item) => <article className="catalog-applicability" key={String(item.requirement_applicability_id)}><strong>{String(item.requirement_code)} · {displayValue(item.applicability_decision)}</strong><StatusBadge value={item.lifecycle_state}/><p>{displayValue(item.rationale)}</p>{Boolean(item.approved_at) && <small>Fecha de aprobación: {adminDate(item.approved_at)}</small>}</article>) : <p>Sin decisiones de aplicabilidad vigentes registradas.</p>}</section>}
    {row.ownership_class === "TENANT_OWNED" && <section className="catalog-detail-section"><h3>Implementación de la organización</h3><p>Control implementado desde una versión base autorizada.</p><dl><dt>Responsable</dt><dd>{row.business_owner_subject_id ? "Subject vinculado" : "No informado"}</dd><dt>Vigente desde</dt><dd>{current?.effective_from ? adminDate(current.effective_from) : "No informado"}</dd><dt>Vigente hasta</dt><dd>{current?.effective_to ? adminDate(current.effective_to) : "Sin fecha de término"}</dd></dl></section>}
  </>;
}

function DetailDrawer({ api, definition, row: summary, close, completed }: { api: ApiClient; definition: ModuleDefinition; row: Row; close(): void; completed(): void }) {
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
  const actions = availableWorkflowActions(definition, row);
  const version = definition.id === "evidencias" && Array.isArray(row.versions) ? row.versions[0] as Row | undefined : undefined;
  const state = version?.lifecycle_state ?? row[definition.stateField];
  const download = async () => {
    const fileId = version?.file_object_id;
    if (typeof fileId !== "string") return;
    try {
      const { blob, filename } = await api.downloadFileObject(fileId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = filename; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch { setFeedback({ kind: "error", message: uiText.forms.fileError }); }
  };
  const submit = async (action: WorkflowAction) => {
    const missing = (action.fields ?? []).find((field) => !action.optionalFields?.includes(field) && !form[field]);
    if (missing) { setFeedback({ kind: "error", message: `${uiText.forms.requiredField} ${fieldLabel(missing)}` }); return; }
    const targetId = action.versionResource ? String(version?.evidence_version_id ?? "") : id;
    const targetPath = action.versionResource ? "/evidence-versions" : definition.path;
    const body: Row = { expected_version: Number(version?.row_version ?? row.row_version), ...Object.fromEntries((action.fields ?? []).filter((field) => form[field] !== undefined && form[field] !== "").map((field) => [field, form[field]])) };
    for (const field of ["coverage_percent", "design_effectiveness", "operating_effectiveness"]) if (body[field] !== undefined) body[field] = Number(body[field]);
    if (typeof body.samples === "string") { try { body.samples = JSON.parse(body.samples); } catch { setFeedback({ kind: "error", message: uiText.forms.invalidJson }); return; } }
    try {
      if (definition.id === "retencion") {
        const payload = action.suffix === "update" ? { retention_seconds: Number(form.retention_seconds), is_mandatory: form.is_mandatory === "true" } : {};
        await api.request(`/api/v1${targetPath}/${targetId}:${action.suffix}`, { method: "POST", headers: { "Idempotency-Key": crypto.randomUUID(), "If-Match": `"${Number(row.row_version)}"` }, body: JSON.stringify(payload) });
      } else await api.post(`/api/v1${targetPath}/${targetId}:${action.suffix}`, body);
      setFeedback({ kind: "success", message: uiText.forms.operationSuccess }); completed();
    } catch (error) {
      const problem = error instanceof ApiProblem ? error : null;
      setFeedback({ kind: "error", message: problem?.status === 409 ? uiText.forms.concurrencyError : uiText.forms.operationError });
    }
  };
  return <div className="drawer-backdrop" role="presentation" onMouseDown={close}><aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="detail-title" onMouseDown={(event) => event.stopPropagation()}>
    <header className="drawer-header"><div><p className="eyebrow">{uiText.forms.detailEyebrow}</p><h2 id="detail-title">{displayValue(row[definition.titleField] ?? definition.label)}</h2></div><button className="icon-button" onClick={close} aria-label={uiText.forms.closeDetail}>×</button></header>
    <div className="drawer-body">{detail.loading ? <LoadingState/> : <>{definition.id === "controles" ? <ControlDetailContent row={row}/> : <><StatusBadge value={state}/><dl>{Object.entries(row).filter(([, value]) => !Array.isArray(value) && typeof value !== "object").map(([key, value]) => <React.Fragment key={key}><dt>{fieldLabel(key)}</dt><dd>{displayValue(value)}</dd></React.Fragment>)}</dl></>}{detail.error && <p className="inline-feedback error" role="alert">{detail.error}</p>}{typeof version?.file_object_id === "string" && <button className="button secondary" onClick={() => void download()}>{uiText.forms.downloadFile}</button>}{actions.map((action) => <section className="workflow-action" key={action.suffix}><h3>{action.label}</h3>{action.fields?.map((field) => <label key={field}><span>{fieldLabel(field)}</span><input aria-label={fieldLabel(field)} placeholder={fieldPlaceholder(field)} value={form[field] ?? ""} onChange={(event) => setForm((value) => ({ ...value, [field]: event.target.value }))}/></label>)}<button className="button primary" onClick={() => void submit(action)}>{action.label}</button></section>)}{actions.length === 0 && <p className="read-only-note">{uiText.forms.noActions}</p>}{feedback && <p className={`inline-feedback ${feedback.kind}`} role={feedback.kind === "error" ? "alert" : "status"}>{feedback.message}</p>}</>}</div>
  </aside></div>;
}

export function KpiCard({ label, value, detail, tone, icon }: { label: string; value: string; detail: string; tone: "teal" | "orange" | "blue" | "green"; icon: string }) {
  return <article className={`kpi-card ${tone}`}><div className="kpi-heading"><p>{label}</p><span className="kpi-icon"><Icon name={icon}/></span></div><strong>{value}</strong><span>{detail}</span></article>;
}

export function DataCard({ title, subtitle, action, className = "", children }: { title: string; subtitle?: string; action?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return <article className={`data-card ${className}`}><header><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</header>{children}</article>;
}

export function ResponsiveChartFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="chart-frame" role="img" aria-label={label}>{children}</div>;
}

export type DistributionDatum = { value: string; label: string; count: number; percentage: number; tone: "success" | "warning" | "danger" | "info" | "neutral" };

function distributionTone(value: string): DistributionDatum["tone"] {
  if (value === "valid") return "success";
  if (value === "invalid") return "danger";
  if (value === "insufficient_data" || value === "insufficient_evidence" || value === "no_data") return "warning";
  return statusTone(value);
}

export function distributionFromRows(rows: Row[], field: string): DistributionDatum[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = row[field];
    if (typeof value === "string" && value.length > 0) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
  if (total === 0) return [];
  return [...counts.entries()].map(([value, count]) => ({ value, label: displayValue(value), count, percentage: count / total * 100, tone: distributionTone(value) }));
}

export function StackedDistribution({ rows, field, emptyDetail }: { rows: Row[]; field: string; emptyDetail: string }) {
  const distribution = distributionFromRows(rows, field);
  if (distribution.length === 0) return <StatePanel kind="insufficient-data" detail={emptyDetail}/>;
  const total = distribution.reduce((sum, item) => sum + item.count, 0);
  return <ResponsiveChartFrame label={`${uiText.dashboard.distributionAria}: ${total} ${uiText.common.visibleCount}`}>
    <p className="dataset-label">{uiText.common.visibleDataset} · {total}</p>
    <div className="stacked-bar" aria-hidden="true">{distribution.map((item) => <i className={`distribution-segment ${item.tone}`} style={{ width: `${item.percentage}%` }} key={item.value}/>)}</div>
    <div className="distribution-legend">{distribution.map((item) => <div key={item.value} title={`${item.label}: ${item.count} ${uiText.dashboard.distributionTooltip}`}><span><i className={`legend-marker ${item.tone}`} aria-hidden="true"/>{item.label}</span><strong>{item.count}<small>{Math.round(item.percentage)}%</small></strong></div>)}</div>
  </ResponsiveChartFrame>;
}

function EntityDistribution({ label, rows, field = "lifecycle_state" }: { label: string; rows: Row[]; field?: string }) {
  const distribution = distributionFromRows(rows, field);
  if (distribution.length === 0) return null;
  return <section className="entity-distribution"><div className="entity-distribution-heading"><strong>{label}</strong><span>{rows.length}</span></div>{distribution.map((item) => <div className="compact-bar" key={item.value} title={`${item.label}: ${item.count} ${uiText.dashboard.distributionTooltip}`}><span><i className={`legend-marker ${item.tone}`} aria-hidden="true"/>{item.label}</span><b>{item.count}</b><div><i className={item.tone} style={{ width: `${item.percentage}%` }}/></div></div>)}</section>;
}

function Dashboard({ api }: { api: ApiClient }) {
  const dashboardModules = [modules[1]!, modules[4]!, modules[6]!, modules[7]!, modules[8]!, modules[9]!];
  const assessmentLoad = usePage(api, dashboardModules[0]!)[0];
  const controlAssessmentLoad = usePage(api, dashboardModules[1]!)[0];
  const evidenceRequestLoad = usePage(api, dashboardModules[2]!)[0];
  const evidenceLoad = usePage(api, dashboardModules[3]!)[0];
  const issueLoad = usePage(api, dashboardModules[4]!)[0];
  const actionLoad = usePage(api, dashboardModules[5]!)[0];
  const loads = [assessmentLoad, controlAssessmentLoad, evidenceRequestLoad, evidenceLoad, issueLoad, actionLoad];
  if (loads.some((load) => load.state === "loading")) return <LoadingState/>;
  const validLoads = loads.map((load) => load.state === "ready" ? load.data : []);
  const [assessments, controlAssessments, evidenceRequests, evidence, issues, actions] = validLoads;
  const accessPartial = loads.some((load) => load.state === "error");
  const pagePartial = loads.some((load) => load.state === "ready" && load.page.has_more);
  const cards = [
    { label: uiText.dashboard.assessments, value: String(assessments!.length), detail: uiText.common.visibleDataset, tone: "teal" as const, icon: "check" },
    { label: uiText.dashboard.controlAssessments, value: String(controlAssessments!.length), detail: uiText.common.visibleDataset, tone: "blue" as const, icon: "shield" },
    { label: uiText.dashboard.issues, value: String(issues!.length), detail: uiText.common.visibleDataset, tone: "orange" as const, icon: "alert" },
    { label: uiText.dashboard.evidenceRequests, value: String(evidenceRequests!.length), detail: uiText.common.visibleDataset, tone: "green" as const, icon: "file" }
  ];
  const attentionRows: Array<Row & { entityLabel: string }> = [
    ...issues!.map((row) => ({ ...row, entityLabel: uiText.dashboard.issueItems })),
    ...actions!.map((row) => ({ ...row, entityLabel: uiText.dashboard.actionItems })),
    ...evidenceRequests!.map((row) => ({ ...row, entityLabel: uiText.dashboard.evidenceRequestItems }))
  ].slice(0, 5);
  return <>
    <div className="page-heading dashboard-heading"><div><p className="eyebrow">{uiText.dashboard.eyebrow}</p><h1>{uiText.dashboard.greeting}</h1><p>{uiText.dashboard.description}</p></div><span className="context-pill">{uiText.common.currentTenantData}</span></div>
    {(accessPartial || pagePartial) && <div className="state-inline"><StatePanel kind="partial-data" detail={pagePartial ? uiText.dashboard.partialDataset : uiText.states.permissionDetail}/></div>}
    <section className="kpi-grid">{cards.map((card) => <KpiCard {...card} key={card.label}/>)}</section>
    <section className="executive-grid">
      <DataCard title={uiText.dashboard.assessmentDistribution} subtitle={uiText.dashboard.assessmentDistributionDetail} className="primary-visual" action={<button className="link-button" onClick={() => navigate("requisitos")}>{uiText.dashboard.seeAssessments} →</button>}><StackedDistribution rows={assessments!} field="result_status" emptyDetail={uiText.dashboard.noAssessments}/></DataCard>
      <DataCard title={uiText.dashboard.operationalAttention} subtitle={uiText.dashboard.operationalAttentionDetail} className="attention-card">{attentionRows.map((row, index) => <div className="activity" key={index}><span className="activity-icon"><Icon name="alert"/></span><div><small>{String(row.entityLabel)}</small><strong>{displayValue(row.title ?? row.request_code ?? row.issue_code ?? row.action_code ?? uiText.dashboard.record)}</strong><StatusBadge value={row.lifecycle_state}/></div></div>)}{attentionRows.length === 0 && <StatePanel kind="insufficient-data" detail={uiText.dashboard.noAttention}/>}</DataCard>
    </section>
    <section className="operational-grid">
      <DataCard title={uiText.dashboard.controlsDistribution} subtitle={uiText.dashboard.controlsDistributionDetail} className="compact-visual" action={<button className="link-button" onClick={() => navigate("controles")}>{uiText.dashboard.seeControls} →</button>}>{controlAssessments!.length === 0 ? <StatePanel kind="insufficient-data" detail={uiText.dashboard.noControlAssessments}/> : <ResponsiveChartFrame label={uiText.dashboard.controlsDistribution}><p className="dataset-label">{uiText.common.visibleDataset} · {controlAssessments!.length}</p><EntityDistribution label={uiText.dashboard.controlAssessmentItems} rows={controlAssessments!}/></ResponsiveChartFrame>}</DataCard>
      <DataCard title={uiText.dashboard.remediationDistribution} subtitle={uiText.dashboard.remediationDistributionDetail} className="compact-visual" action={<button className="link-button" onClick={() => navigate("acciones")}>{uiText.dashboard.seeActions} →</button>}>{issues!.length + actions!.length === 0 ? <StatePanel kind="insufficient-data" detail={uiText.dashboard.noRemediation}/> : <ResponsiveChartFrame label={uiText.dashboard.remediationDistribution}><p className="dataset-label">{uiText.common.visibleDataset} · {issues!.length + actions!.length}</p><div className="entity-pair"><EntityDistribution label={uiText.dashboard.issueItems} rows={issues!}/><EntityDistribution label={uiText.dashboard.actionItems} rows={actions!}/></div></ResponsiveChartFrame>}</DataCard>
      <DataCard title={uiText.dashboard.evidenceDistribution} subtitle={uiText.dashboard.evidenceDistributionDetail} className="compact-visual" action={<button className="link-button" onClick={() => navigate("evidencias")}>{uiText.dashboard.seeEvidence} →</button>}>{evidenceRequests!.length + evidence!.length === 0 ? <StatePanel kind="insufficient-data" detail={uiText.dashboard.noEvidence}/> : <ResponsiveChartFrame label={uiText.dashboard.evidenceDistribution}><p className="dataset-label">{uiText.common.visibleDataset} · {evidenceRequests!.length + evidence!.length}</p><div className="entity-pair"><EntityDistribution label={uiText.dashboard.evidenceRequestItems} rows={evidenceRequests!}/><EntityDistribution label={uiText.dashboard.evidenceItems} rows={evidence!}/></div></ResponsiveChartFrame>}</DataCard>
    </section>
  </>;
}

function Sidebar({ active, open, close, platformAdmin, tenantAdmin, hasTenant, managedIdentity }: { active: string; open: boolean; close(): void; platformAdmin: boolean; tenantAdmin: boolean; hasTenant: boolean; managedIdentity: boolean }) {
  return <aside className={`sidebar ${open ? "open" : ""}`}><div className="brand"><BrandLogo/><span>GRC</span></div><nav aria-label={uiText.navigation.mainAria}>
    {hasTenant && nav.map(([id, label, icon]) => <button key={id} className={active === id ? "active" : ""} onClick={() => { navigate(id); close(); }}><Icon name={icon}/><span>{label}</span></button>)}
    {(platformAdmin || tenantAdmin || managedIdentity) && <p className="sidebar-section-label">{uiText.navigation.settings}</p>}
    {(platformAdmin || tenantAdmin) && <><button className={active === settingsRoutes.companies ? "active" : ""} onClick={() => { navigate(settingsRoutes.companies); close(); }}><Icon name="building"/><span>{uiText.navigation.companies}</span></button><button className={active === settingsRoutes.users ? "active" : ""} onClick={() => { navigate(settingsRoutes.users); close(); }}><Icon name="users"/><span>{uiText.navigation.users}</span></button></>}
    {managedIdentity && <button className={active === settingsRoutes.managedIdentities ? "active" : ""} onClick={() => { navigate(settingsRoutes.managedIdentities); close(); }}><Icon name="shield"/><span>Identidades gestionadas</span></button>}
  </nav><div className="sidebar-footer"><strong>{brandNames.product}</strong><span>{uiText.shell.productContext}</span></div></aside>;
}

const workspaceGroups: Readonly<Record<string, readonly string[]>> = {
  cumplimiento: ["cumplimiento", "soa"], requisitos: ["requisitos"], controles: ["controles", "evaluaciones-control", "pruebas"],
  evidencias: ["solicitudes-evidencia", "evidencias", "retencion"], acciones: ["issues", "acciones"]
};

function ModuleWorkspace({ api, active }: { api: ApiClient; active: string }) {
  const choices = (workspaceGroups[active] ?? [active])
    .map((id) => modules.find((module) => module.id === id))
    .filter((definition): definition is ModuleDefinition => Boolean(definition));
  const [selectedId, setSelectedId] = useState(choices[0]?.id ?? "");
  useEffect(() => setSelectedId(choices[0]?.id ?? ""), [active]);
  const selected = choices.find((choice) => choice.id === selectedId) ?? choices[0];
  if (!selected) return <ErrorState unauthorized retry={() => undefined}/>;
  return <><div className="module-tabs" role="tablist" aria-label={uiText.navigation.submodulesAria}>{choices.map((choice) => <button role="tab" aria-selected={selected.id === choice.id} className={selected.id === choice.id ? "active" : ""} key={choice.id} onClick={() => setSelectedId(choice.id)}>{choice.label}</button>)}</div><ModuleTable api={api} definition={selected}/></>;
}

type InvitationCreateEnvelope = {
  result: {
    tenant_membership_invitation_id: string;
    invitee_email: string;
    authentication_method: "ZOHO";
    expires_at: string;
    invitation_token: string | null;
  };
};

function invitationTokenFromLocation(): string | null {
  const match = /^#membership-invitation=([A-Za-z0-9_-]{43})$/.exec(window.location.hash);
  if (!match) return null;
  history.replaceState({}, "", `${window.location.pathname}${window.location.search}`);
  return match[1]!;
}

function InvitationAdmin({ api, tenantId, created }: { api: ApiClient; tenantId: string; created(): void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [link, setLink] = useState<string>();
  const create = async () => {
    setBusy(true); setError(undefined); setLink(undefined);
    try {
      const envelope = await api.platformPost<InvitationCreateEnvelope>("/api/v1/platform/membership-invitations", {
        tenant_id: tenantId,
        invitee_email: email,
        authentication_method: "ZOHO"
      });
      const token = envelope.result.invitation_token;
      if (!token) throw new Error("INVITATION_SECRET_NOT_AVAILABLE");
      setLink(`${window.location.origin}/#membership-invitation=${encodeURIComponent(token)}`);
      created();
    } catch {
      setError(uiText.invitation.createError);
    } finally {
      setBusy(false);
    }
  };
  return <section className="data-card invitation-admin" aria-label={uiText.invitation.adminTitle}>
    <header><div><h2>{uiText.invitation.adminTitle}</h2><p>{uiText.invitation.adminDetail}</p></div><button className="button secondary" onClick={() => setOpen((value) => !value)}>{uiText.invitation.create}</button></header>
    {open && <div className="invitation-form"><label><span>{uiText.invitation.email}</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={uiText.invitation.emailPlaceholder}/></label><button className="button primary" disabled={busy || !email.trim()} onClick={() => void create()}>{busy ? uiText.invitation.creating : uiText.invitation.generate}</button></div>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {link && <div className="invitation-result" role="status"><strong>{uiText.invitation.linkTitle}</strong><p>{uiText.invitation.linkDetail}</p><textarea readOnly aria-label={uiText.invitation.linkTitle} value={link}/><button className="link-button" onClick={() => setLink(undefined)}>{uiText.forms.closeDetail}</button></div>}
  </section>;
}

type AdminPageState = { state: "loading" } | { state: "ready"; page: Page } | { state: "error"; forbidden: boolean };

function useAdminPage(api: ApiClient, path: string, platform: boolean, enabled = true): [AdminPageState, () => void, () => void] {
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<AdminPageState>({ state: "loading" });
  const fetchPage = (cursor?: string, signal?: AbortSignal) => {
    const url = new URL(path, window.location.origin);
    url.searchParams.set("page[size]", "100");
    if (cursor) url.searchParams.set("page[cursor]", cursor);
    const target = `${url.pathname}${url.search}`;
    return platform ? api.platformGet<Page>(target, signal ? { signal } : {}) : api.request<Page>(target, signal ? { signal } : {});
  };
  useEffect(() => {
    if (!enabled) { setState({ state: "ready", page: { items: [], page: { has_more: false, next_cursor: null } } }); return; }
    const controller = new AbortController();
    setState({ state: "loading" });
    void fetchPage(undefined, controller.signal).then((page) => setState({ state: "ready", page })).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      setState({ state: "error", forbidden: error instanceof ApiProblem && (error.status === 401 || error.status === 403) });
    });
    return () => controller.abort();
  }, [api, path, platform, enabled, nonce]);
  const loadMore = () => {
    if (state.state !== "ready" || !state.page.page.next_cursor) return;
    void fetchPage(state.page.page.next_cursor).then((next) => setState((current) => current.state === "ready" ? {
      state: "ready", page: { items: [...current.page.items, ...next.items], page: next.page }
    } : current)).catch(() => setState({ state: "error", forbidden: false }));
  };
  return [state, () => setNonce((value) => value + 1), loadMore];
}

function AdminPageBody({ state, retry, loadMore, children }: { state: AdminPageState; retry(): void; loadMore(): void; children(items: Row[]): React.ReactNode }) {
  if (state.state === "loading") return <LoadingState/>;
  if (state.state === "error") return <ErrorState unauthorized={state.forbidden} retry={retry}/>;
  return <>{children(state.page.items)}{state.page.page.has_more && <div className="pagination"><button className="button secondary" onClick={loadMore}>{uiText.actions.loadMore}</button></div>}</>;
}

function adminDate(value: unknown): string {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) return uiText.common.noData;
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function readableRole(code: unknown, name?: unknown): string {
  const localized = roleLabel(typeof code === "string" ? code : undefined);
  return localized === "Rol personalizado" && typeof name === "string" && name.trim() ? name : localized;
}

function ContractedPacks({ api, subscriptionId, platform }: { api: ApiClient; subscriptionId?: string; platform: boolean }) {
  const [items, setItems] = useState<Row[]>([]);
  const [page, setPage] = useState<PageMeta>({ has_more: false, next_cursor: null });
  const [versions, setVersions] = useState<Row[]>([]);
  const [versionId, setVersionId] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [feedback, setFeedback] = useState("");
  const [nonce, setNonce] = useState(0);
  const path = platform && subscriptionId ? `/api/v1/subscriptions/${encodeURIComponent(subscriptionId)}/regulatory-packs`
    : "/api/v1/subscriptions/current/regulatory-packs";
  useEffect(() => {
    if (platform && !subscriptionId) return;
    const controller = new AbortController();
    void (platform ? api.platformGet<Page>(path, { signal: controller.signal }) : api.request<Page>(path, { signal: controller.signal }))
      .then((result) => { setItems(result.items); setPage(result.page); }).catch(() => { if (!controller.signal.aborted) setFeedback("No fue posible cargar los marcos contratados."); });
    if (platform) void api.platformGet<Page>("/api/v1/platform/regulatory-pack-versions", { signal: controller.signal })
      .then((page) => setVersions(page.items)).catch(() => { if (!controller.signal.aborted) setFeedback("No fue posible cargar versiones disponibles."); });
    return () => controller.abort();
  }, [api, path, platform, subscriptionId, nonce]);
  const activate = async () => {
    if (!versionId || !effectiveFrom || !subscriptionId) { setFeedback("Selecciona una versión y fecha de inicio."); return; }
    try {
      await api.platformPost(path, { regulatory_pack_version_id: versionId, effective_from: new Date(effectiveFrom).toISOString() });
      setFeedback("Marco activado."); setNonce((value) => value + 1);
    } catch { setFeedback("No fue posible activar el marco."); }
  };
  const loadMore = async () => {
    if (!page.next_cursor) return;
    const target = `${path}?page%5Bcursor%5D=${encodeURIComponent(page.next_cursor)}`;
    try {
      const result = platform ? await api.platformGet<Page>(target) : await api.request<Page>(target);
      setItems((current) => [...current, ...result.items]); setPage(result.page);
    } catch { setFeedback("No fue posible continuar la lista de marcos."); }
  };
  const revoke = async (item: Row) => {
    const reason = window.prompt("Motivo de revocación");
    if (!reason?.trim()) return;
    try {
      await api.request(`/api/v1/subscription-regulatory-packs/${encodeURIComponent(String(item.subscription_regulatory_pack_id))}:revoke`,
        { method: "POST", headers: { "Idempotency-Key": crypto.randomUUID(), "If-Match": `"${String(item.row_version)}"` }, body: JSON.stringify({ reason: reason.trim() }) },
        { tenantContext: "omit" });
      setFeedback("Marco revocado."); setNonce((value) => value + 1);
    } catch { setFeedback("No fue posible revocar el marco."); }
  };
  return <DataCard title="Marcos contratados" className="admin-section">
    {feedback && <p className="inline-feedback" role="status">{feedback}</p>}
    {items.length === 0 ? <p>Sin marcos contratados.</p> : <div className="table-scroll"><table><thead><tr><th>Pack</th><th>Edición</th><th>Licencia</th><th>Contrato</th><th>Vigencia</th><th>Desde</th><th>Hasta</th>{platform && <th>Acción</th>}</tr></thead><tbody>{items.map((item) => <tr key={String(item.subscription_regulatory_pack_id)}><td><strong>{String(item.name)}</strong><small className="admin-secondary">{String(item.pack_code)}</small></td><td>{String(item.edition)}</td><td>{displayValue(item.license_classification)}</td><td><StatusBadge value={item.lifecycle_state}/></td><td><StatusBadge value={item.effective_state}/></td><td>{adminDate(item.effective_from)}</td><td>{item.effective_to ? adminDate(item.effective_to) : "—"}</td>{platform && <td>{item.effective_state === "effective" && <button className="link-button" onClick={() => void revoke(item)}>Revocar</button>}</td>}</tr>)}</tbody></table></div>}
    {page.has_more && <button className="button secondary" onClick={() => void loadMore()}>{uiText.actions.loadMore}</button>}
    {platform && subscriptionId && <form className="admin-form" onSubmit={(event) => { event.preventDefault(); void activate(); }}><label><span>Versión del marco</span><select value={versionId} onChange={(event) => setVersionId(event.target.value)}><option value="">Selecciona una versión publicada</option>{versions.map((version) => <option key={String(version.regulatory_pack_version_id)} value={String(version.regulatory_pack_version_id)}>{String(version.name)} · {String(version.edition)}</option>)}</select></label><label><span>Vigente desde</span><input type="datetime-local" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)}/></label><button className="button primary" type="submit">Activar marco</button></form>}
  </DataCard>;
}

const provisionalWarning = "Contenido provisional/no autoritativo para validación. No corresponde al texto oficial/licenciado de la norma.";

type ValidationCandidate = {
  regulatory_pack_version_id: string;
  regulatory_pack_validation_provenance_id: string;
  name: string;
  pack_code: string;
  edition: string;
  version_state: string;
  license_classification: string;
  authority_class: string;
  source_role: string;
  provenance_ref: string;
  version_effective_from: string | null;
  version_effective_to: string | null;
};
type CandidateState = { state: "loading" } | { state: "error" } |
  { state: "ready"; items: ValidationCandidate[]; page: PageMeta; loadingMore?: boolean };

function accessInstant(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function validationCreateError(cause: unknown): string {
  if (!(cause instanceof ApiProblem)) return uiText.validation.createError;
  switch (cause.status) {
    case 400: return uiText.validation.invalidInterval;
    case 401: return uiText.validation.authenticationRequired;
    case 403: return uiText.validation.accessDenied;
    case 404: return uiText.validation.staleCandidate;
    case 409: return uiText.validation.conflict;
    default: return uiText.validation.createError;
  }
}

function ValidationPacks({ api, tenantId, platform }: { api: ApiClient; tenantId?: string; platform: boolean }) {
  const [items, setItems] = useState<Row[]>([]);
  const [page, setPage] = useState<PageMeta>({ has_more: false, next_cursor: null });
  const [error, setError] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; message: string }>();
  const [revokingId, setRevokingId] = useState<string>();
  const [nonce, setNonce] = useState(0);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);
  const [candidateState, setCandidateState] = useState<CandidateState>({ state: "loading" });
  const candidateGeneration = useRef(0);
  const [candidateNonce, setCandidateNonce] = useState(0);
  const [candidateId, setCandidateId] = useState("");
  const [accessFrom, setAccessFrom] = useState("");
  const [accessTo, setAccessTo] = useState("");
  const path = platform ? `/api/v1/platform/tenants/${encodeURIComponent(tenantId ?? "")}/regulatory-pack-validation-accesses`
    : "/api/v1/regulatory-pack-validation-accesses/current";
  useEffect(() => {
    if (platform && !tenantId) return;
    const controller = new AbortController();
    setItems([]); setError(false);
    void (platform ? api.platformGet<Page>(path, { signal: controller.signal }) : api.request<Page>(path, { signal: controller.signal }))
      .then((result) => { setItems(result.items); setPage(result.page); setError(false); })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [api, path, platform, tenantId, nonce]);
  const candidateFilter = accessInstant(accessFrom);
  const candidatePath = `/api/v1/platform/regulatory-pack-validation-candidates${candidateFilter
    ? `?${new URLSearchParams({ "filter[effective_from]": candidateFilter })}` : ""}`;
  useEffect(() => {
    candidateGeneration.current += 1;
    if (!platform || !tenantId || !creating) return;
    const controller = new AbortController();
    setCandidateState({ state: "loading" });
    setCandidateId("");
    void api.platformGet<{ items: ValidationCandidate[]; page: PageMeta }>(candidatePath, { signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) setCandidateState({ state: "ready", ...result }); })
      .catch(() => { if (!controller.signal.aborted) setCandidateState({ state: "error" }); });
    return () => controller.abort();
  }, [api, platform, tenantId, creating, candidatePath, candidateNonce]);
  const loadMoreCandidates = async () => {
    if (candidateState.state !== "ready" || !candidateState.page.next_cursor || candidateState.loadingMore) return;
    const generation = candidateGeneration.current;
    const cursor = candidateState.page.next_cursor;
    setCandidateState({ ...candidateState, loadingMore: true });
    const url = new URL(candidatePath, "http://local.invalid");
    url.searchParams.set("page[cursor]", cursor);
    try {
      const next = await api.platformGet<{ items: ValidationCandidate[]; page: PageMeta }>(`${url.pathname}${url.search}`);
      if (generation !== candidateGeneration.current) return;
      setCandidateState((current) => current.state === "ready" ? {
        state: "ready", items: [...current.items, ...next.items], page: next.page
      } : current);
    } catch { if (generation === candidateGeneration.current) setCandidateState({ state: "error" }); }
  };
  const selectedCandidate = candidateState.state === "ready"
    ? candidateState.items.find((item) => item.regulatory_pack_validation_provenance_id === candidateId) : undefined;
  const create = async () => {
    if (!platform || !tenantId || submitLock.current) return;
    const from = accessInstant(accessFrom);
    const to = accessInstant(accessTo);
    if (!selectedCandidate || !from || (accessTo && !to) || (to && to <= from)) {
      setFeedback({ kind: "error", message: uiText.validation.invalidInterval }); return;
    }
    submitLock.current = true;
    setSubmitting(true);
    setFeedback(undefined);
    const key = crypto.randomUUID();
    try {
      await api.platformPost("/api/v1/platform/regulatory-pack-validation-accesses", {
        tenant_id: tenantId,
        regulatory_pack_version_id: selectedCandidate.regulatory_pack_version_id,
        regulatory_pack_validation_provenance_id: selectedCandidate.regulatory_pack_validation_provenance_id,
        effective_from: from,
        ...(to ? { effective_to: to } : {})
      }, key);
      setCreating(false); setCandidateId(""); setAccessFrom(""); setAccessTo("");
      setFeedback({ kind: "success", message: uiText.validation.created });
      setNonce((value) => value + 1);
    } catch (cause) {
      setFeedback({ kind: "error", message: validationCreateError(cause) });
      if (cause instanceof ApiProblem && cause.status === 404) {
        setCandidateNonce((value) => value + 1);
        setNonce((value) => value + 1);
      }
    } finally { submitLock.current = false; setSubmitting(false); }
  };
  const loadMore = async () => {
    if (!page.next_cursor) return;
    const target = `${path}?page%5Bcursor%5D=${encodeURIComponent(page.next_cursor)}`;
    try {
      const result = platform ? await api.platformGet<Page>(target) : await api.request<Page>(target);
      setItems((current) => [...current,...result.items]); setPage(result.page);
    } catch { setError(true); }
  };
  const canRevoke = (item: Row) => item.lifecycle_state === "active"
    && (item.effective_state === "effective" || item.effective_state === "future");
  const revoke = async (item: Row) => {
    if (!platform || !tenantId || !canRevoke(item)) return;
    const reason = window.prompt("Motivo de revocación del acceso de validación");
    if (reason === null) return;
    if (!reason.trim()) { setFeedback({ kind: "error", message: "Ingresa un motivo de revocación." }); return; }
    const id = String(item.regulatory_pack_validation_access_id);
    const version = Number(item.row_version);
    if (!Number.isSafeInteger(version) || version < 1) {
      setFeedback({ kind: "error", message: "No fue posible verificar la versión del acceso." }); return;
    }
    setRevokingId(id); setFeedback(undefined);
    try {
      await api.request(`/api/v1/platform/regulatory-pack-validation-accesses/${encodeURIComponent(id)}:revoke`, {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID(), "If-Match": `"${version}"` },
        body: JSON.stringify({ reason: reason.trim() })
      }, { tenantContext: "omit" });
      setFeedback({ kind: "success", message: "Acceso de validación revocado." });
      setNonce((value) => value + 1);
    } catch (cause) {
      setFeedback({ kind: "error", message: cause instanceof ApiProblem && cause.status === 409
        ? "Conflicto de concurrencia. Actualiza la lista antes de reintentar."
        : "No fue posible revocar el acceso de validación." });
    } finally { setRevokingId(undefined); }
  };
  return <DataCard title={uiText.validation.sectionTitle} className="admin-section">
    <p className="form-guidance">{provisionalWarning}</p>
    {platform && tenantId && <button className="button secondary" type="button" disabled={submitting}
      onClick={() => { setCreating((value) => !value); setFeedback(undefined); }}>{creating ? uiText.validation.closeCreate : uiText.validation.openCreate}</button>}
    {feedback && <p className={`inline-feedback ${feedback.kind}`} role={feedback.kind === "error" ? "alert" : "status"}>{feedback.message}</p>}
    {platform && tenantId && creating && <form className="admin-form" onSubmit={(event) => { event.preventDefault(); void create(); }}>
      <p className="form-guidance" role="note">{uiText.validation.nonAuthoritativeDetail}</p>
      <label><span>{uiText.validation.requestedFrom}</span><input type="datetime-local" required value={accessFrom}
        onChange={(event) => setAccessFrom(event.target.value)}/></label>
      <label><span>{uiText.validation.requestedTo}</span><input type="datetime-local" value={accessTo}
        onChange={(event) => setAccessTo(event.target.value)}/></label>
      {candidateState.state === "loading" ? <StatePanel kind="loading" detail={uiText.validation.loadingCandidates}/> :
        candidateState.state === "error" ? <StatePanel kind="error" detail={uiText.validation.candidatesError}
          retry={() => setCandidateNonce((value) => value + 1)}/> :
        candidateState.items.length === 0 ? <StatePanel kind="empty" detail={uiText.validation.noCandidates}/> : <>
          <label><span>{uiText.validation.candidate}</span><select required value={candidateId} onChange={(event) => setCandidateId(event.target.value)}>
            <option value="">{uiText.validation.selectCandidate}</option>
            {candidateState.items.map((item) => <option key={item.regulatory_pack_validation_provenance_id}
              value={item.regulatory_pack_validation_provenance_id}>{item.name} · {item.pack_code} · {item.edition}</option>)}
          </select></label>
          {candidateState.page.has_more && <button type="button" className="button secondary" onClick={() => void loadMoreCandidates()}
            disabled={candidateState.loadingMore}>{uiText.actions.loadMore}</button>}
          {selectedCandidate && <div className="form-guidance" role="group" aria-label={uiText.validation.candidateDetails}>
            <strong>{uiText.validation.nonAuthoritative}</strong>
            <p>{selectedCandidate.name} · {selectedCandidate.pack_code} · {selectedCandidate.edition}</p>
            <p>{uiText.validation.versionState}: {displayValue(selectedCandidate.version_state)} · {uiText.validation.license}: {displayValue(selectedCandidate.license_classification)}</p>
            <p>{uiText.validation.authority}: {displayValue(selectedCandidate.authority_class)} · {uiText.validation.sourceRole}: {displayValue(selectedCandidate.source_role)}</p>
            <p>{uiText.validation.provenance}: {selectedCandidate.provenance_ref}</p>
            <p>{uiText.validation.versionValidity}: {selectedCandidate.version_effective_from ? adminDate(selectedCandidate.version_effective_from) : uiText.validation.noStart}
              {" — "}{selectedCandidate.version_effective_to ? adminDate(selectedCandidate.version_effective_to) : uiText.validation.noEnd}</p>
          </div>}
        </>}
      <button className="button primary" type="submit" disabled={submitting || candidateState.state !== "ready" || !selectedCandidate}>
        {submitting ? uiText.validation.creating : uiText.validation.submitCreate}</button>
    </form>}
    {error ? <StatePanel kind="error" detail="No fue posible cargar los marcos de validación."/> :
      items.length === 0 ? <p>Sin marcos habilitados para validación.</p> :
      <div className="table-scroll"><table><thead><tr><th>Versión exacta</th><th>Acceso</th><th>Vigencia</th><th>Desde</th><th>Hasta</th>{platform && <th>Acción</th>}</tr></thead><tbody>
        {items.map((item) => <tr key={String(item.regulatory_pack_validation_access_id)}><td><strong>{String(item.name)}</strong><small className="admin-secondary">{String(item.pack_code)} · {String(item.edition)} · {String(item.license_classification)}</small></td>
          <td><StatusBadge value={item.lifecycle_state}/></td><td><StatusBadge value={item.effective_state}/></td>
          <td>{adminDate(item.effective_from)}</td><td>{item.effective_to ? adminDate(item.effective_to) : "—"}</td>
          {platform && <td>{canRevoke(item) &&
            <button className="link-button" disabled={revokingId === item.regulatory_pack_validation_access_id}
              onClick={() => void revoke(item)}>Revocar acceso de validación</button>}</td>}</tr>)}
      </tbody></table></div>}
    {page.has_more && <button className="button secondary" onClick={() => void loadMore()}>{uiText.actions.loadMore}</button>}
  </DataCard>;
}

function SubjectsAdmin({ api }: { api: ApiClient }) {
  const [items, setItems] = useState<Row[]>([]);
  const [form, setForm] = useState({ subject_type: "process", canonical_key: "", display_name: "" });
  const [feedback, setFeedback] = useState("");
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void api.request<Page>("/api/v1/subjects?page%5Bsize%5D=100", { signal: controller.signal })
      .then((page) => setItems(page.items))
      .catch(() => { if (!controller.signal.aborted) setFeedback("No fue posible cargar Subjects."); });
    return () => controller.abort();
  }, [api, nonce]);
  const create = async () => {
    try {
      await api.request("/api/v1/subjects", { method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify(form) });
      setForm({ ...form, canonical_key: "", display_name: "" }); setFeedback("Subject creado."); setNonce((value) => value + 1);
    } catch (error) {
      setFeedback(error instanceof ApiProblem && error.status === 409 ? "Ya existe un Subject activo con esa clave y tipo." : "No fue posible crear el Subject.");
    }
  };
  return <DataCard title="Subjects de la empresa" className="admin-section">
    <p className="form-guidance">Entidades canónicas disponibles como responsables y ámbitos de control.</p>
    {feedback && <p className="inline-feedback" role="status">{feedback}</p>}
    {items.length ? <div className="table-scroll"><table><thead><tr><th>Nombre</th><th>Tipo</th><th>Clave</th></tr></thead><tbody>
      {items.map((item) => <tr key={String(item.subject_id)}><td>{String(item.display_name)}</td><td>{String(item.subject_type)}</td><td>{String(item.canonical_key)}</td></tr>)}
    </tbody></table></div> : <p>Sin Subjects vigentes.</p>}
    <form className="admin-form" onSubmit={(event) => { event.preventDefault(); void create(); }}>
      <label><span>Tipo</span><select value={form.subject_type} onChange={(event) => setForm({ ...form, subject_type: event.target.value })}>
        {["organization", "organizational_unit", "process", "service", "asset", "system", "application", "data_asset", "supplier", "project", "location"].map((type) => <option key={type} value={type}>{displayValue(type)}</option>)}
      </select></label>
      <label><span>Clave canónica</span><input required maxLength={255} value={form.canonical_key} onChange={(event) => setForm({ ...form, canonical_key: event.target.value })}/></label>
      <label><span>Nombre</span><input required value={form.display_name} onChange={(event) => setForm({ ...form, display_name: event.target.value })}/></label>
      <button className="button primary" type="submit">Crear Subject</button>
    </form>
  </DataCard>;
}

function TenantCompany({ api, context }: { api: ApiClient; context: TenantContext }) {
  return <><PageHeader title={uiText.navigation.companies}/><DataCard title={context.tenant_display_name}><ContractedPacks api={api} platform={false}/><ValidationPacks api={api} platform={false}/><SubjectsAdmin api={api}/></DataCard></>;
}

function CompaniesAdmin({ api, authorization, authorizeFresh }: { api: ApiClient; authorization: CurrentPrincipalAuthorization | null; authorizeFresh(code: string): Promise<boolean> }) {
  const [state, retry, loadMore] = useAdminPage(api, "/api/v1/platform/tenants", true);
  const [selectedId, setSelectedId] = useState<string>();
  const [detail, setDetail] = useState<Row>();
  const [detailError, setDetailError] = useState(false);
  useEffect(() => {
    if (!selectedId) { setDetail(undefined); return; }
    setDetail(undefined); setDetailError(false);
    void api.platformGet<Row>(`/api/v1/platform/tenants/${encodeURIComponent(selectedId)}`)
      .then(setDetail).catch(() => setDetailError(true));
  }, [api, selectedId]);
  const refetch = async () => { await api.platformGet("/api/v1/platform/tenants"); retry(); };
  return <>
    <div className="page-heading"><div><p className="eyebrow">{uiText.navigation.settings}</p><h1>{uiText.navigation.companies}</h1><p>{uiText.administration.companiesDetail}</p></div></div>
    <InitialCompanyWizard api={api} permissions={new Set(authorization?.platform_permissions ?? [])} authorizeFresh={authorizeFresh} refetch={refetch}/>
    <AdminPageBody state={state} retry={retry} loadMore={loadMore}>{(items) => <TableShell label={uiText.navigation.companies}>{items.length === 0 ? <EmptyState/> : <div className="table-scroll"><table><thead><tr><th>{uiText.navigation.companies}</th><th>{uiText.common.status}</th><th>{uiText.administration.plan}</th><th><span className="sr-only">{uiText.common.actions}</span></th></tr></thead><tbody>{items.map((item) => {
      const subscription = item.current_subscription as Row | null;
      return <tr key={String(item.tenant_id)}><td><strong>{String(item.display_name)}</strong><small className="admin-secondary">{String(item.legal_name)}</small></td><td><StatusBadge value={item.lifecycle_state}/></td><td>{subscription ? `${String(subscription.plan_name)} · v${String(subscription.plan_version_number)}` : uiText.administration.noPlan}</td><td><button className="link-button" onClick={() => setSelectedId(String(item.tenant_id))}>{uiText.actions.viewDetail}</button></td></tr>;
    })}</tbody></table></div>}</TableShell>}</AdminPageBody>
    {selectedId && <div className="drawer-backdrop" role="presentation" onMouseDown={() => setSelectedId(undefined)}><aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="company-detail-title" onMouseDown={(event) => event.stopPropagation()}><header className="drawer-header"><div><p className="eyebrow">{uiText.navigation.settings}</p><h2 id="company-detail-title">{detail ? String(detail.display_name) : uiText.navigation.companies}</h2></div><button className="icon-button" onClick={() => setSelectedId(undefined)} aria-label={uiText.forms.closeDetail}>×</button></header><div className="drawer-body">{detailError ? <StatePanel kind="error" detail={uiText.administration.loadError}/> : !detail ? <LoadingState/> : <><p>{String(detail.legal_name)}</p><p><StatusBadge value={detail.lifecycle_state}/></p><p>{uiText.administration.companyCode}: {String(detail.tenant_code)}</p><p>{uiText.administration.timezone}: {String(detail.default_timezone)}</p><p>{uiText.administration.plan}: {detail.current_subscription ? String((detail.current_subscription as Row).plan_name) : uiText.administration.noPlan}</p>{detail.current_subscription && <ContractedPacks api={api} platform subscriptionId={String((detail.current_subscription as Row).subscription_id)}/>}<ValidationPacks key={selectedId} api={api} platform tenantId={selectedId}/><button className="button secondary" onClick={() => { navigate(`${settingsRoutes.users}?tenant_id=${encodeURIComponent(selectedId)}`); setSelectedId(undefined); }}>{uiText.administration.viewUsers}</button></>}</div></aside></div>}
  </>;
}

function UsersAdmin({ api, platformAdmin, context, authorization, authorizeTenantFresh, authorizePlatformFresh }: { api: ApiClient; platformAdmin: boolean; context?: TenantContext; authorization: CurrentPrincipalAuthorization | null; authorizeTenantFresh(codes: readonly string[]): Promise<boolean>; authorizePlatformFresh(code: string): Promise<boolean> }) {
  const [selectedTenantId, setSelectedTenantId] = useState(() => platformAdmin ? new URLSearchParams(window.location.search).get("tenant_id") ?? context?.tenant_id ?? "" : context?.tenant_id ?? "");
  const [companyState, retryCompanies, moreCompanies] = useAdminPage(api, "/api/v1/platform/tenants", true, platformAdmin);
  const platformRead = platformAdmin && !!authorization?.platform_permissions.includes("platform.membership.read");
  const platformRoleRead = platformAdmin && !!authorization?.platform_permissions.includes("platform.role.read");
  const tenantQuery = platformRead && selectedTenantId ? `?tenant_id=${encodeURIComponent(selectedTenantId)}` : "";
  const membershipQuery = platformRead ? tenantQuery : "", roleQuery = platformRoleRead ? tenantQuery : "";
  const ownContext = context?.tenant_id === selectedTenantId;
  const enabled = Boolean(selectedTenantId);
  const [memberships, retryMemberships, moreMemberships] = useAdminPage(api, `/api/v1/memberships${membershipQuery}`, platformRead, enabled && (platformRead || (ownContext && tenantPresentationPermission(authorization, selectedTenantId, "platform.membership.read"))));
  const [roles, retryRoles, moreRoles] = useAdminPage(api, `/api/v1/roles${roleQuery}`, platformRoleRead, enabled && (platformRoleRead || (ownContext && tenantPresentationPermission(authorization, selectedTenantId, "platform.role.read"))));
  const [invitations, retryInvitations, moreInvitations] = useAdminPage(api, `/api/v1/platform/membership-invitations${tenantQuery}`, true, platformAdmin && enabled);
  const [selectedMembershipId, setSelectedMembershipId] = useState<string>();
  const [selectedMembership, setSelectedMembership] = useState<Row>();
  const [assignmentRoleId, setAssignmentRoleId] = useState("");
  const [assignmentBusy, setAssignmentBusy] = useState(false);
  const [roleRevokeBusy, setRoleRevokeBusy] = useState<string>();
  const [feedback, setFeedback] = useState<string>();
  const [revokeBusy, setRevokeBusy] = useState<string>();
  const roleGuard = useRef(false), assignmentIntents = useRef(new Map<string, TenantUserIntent>());
  const revokeIntents = useRef(new Map<string, { key: string; reason: string; etag: string }>());
  const canAssign = tenantPresentationPermission(authorization, selectedTenantId, "platform.role.assign") && context?.tenant_id === selectedTenantId;
  const platformRevoke = platformAdmin && !!authorization?.platform_permissions.includes("platform.role.assign");
  const canRevokeRole = canAssign || platformRevoke;
  const refetchUsers = async () => { await (platformRead ? api.platformGet(`/api/v1/memberships${membershipQuery}`) : api.request("/api/v1/memberships")); retryMemberships(); };
  const closeMembership = () => { if (!roleGuard.current) setSelectedMembershipId(undefined); };
  useEffect(() => {
    if (!selectedMembershipId) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = document.querySelector<HTMLElement>('[aria-labelledby="membership-detail-title"]');
    dialog?.querySelector<HTMLButtonElement>('button')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); closeMembership(); }
      if (event.key !== "Tab" || !dialog) return;
      const fields = [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]')];
      const first = fields[0], last = fields.at(-1);
      if (event.shiftKey && document.activeElement === first && last) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last && first) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); if (previous?.isConnected) previous.focus(); };
  }, [selectedMembershipId]);
  useEffect(() => { setSelectedMembershipId(undefined); setSelectedMembership(undefined); }, [selectedTenantId]);
  useEffect(() => {
    if (!selectedMembershipId) return;
    const target = `/api/v1/memberships/${encodeURIComponent(selectedMembershipId)}${membershipQuery}`;
    void (platformRead ? api.platformGet<Row>(target) : api.request<Row>(target)).then(setSelectedMembership).catch(() => setFeedback(uiText.administration.loadError));
  }, [api, selectedMembershipId, membershipQuery, platformRead]);
  const assign = async () => {
    if (roleGuard.current || !selectedMembershipId || !selectedMembership || typeof selectedMembership.user_identity_id !== "string" || !assignmentRoleId || !canAssign) return;
    roleGuard.current = true; setAssignmentBusy(true); setFeedback(undefined);
    try {
      if (!await authorizeTenantFresh(["platform.role.assign"])) throw new Error("AUTHORIZATION_DENIED");
      const intentId = `${selectedTenantId}:${selectedMembershipId}:${assignmentRoleId}`;
      let intent = assignmentIntents.current.get(intentId);
      if (!intent) { intent = new TenantUserIntent(selectedTenantId, { user_identity_id: selectedMembership.user_identity_id, existing_membership_id: selectedMembershipId, display_name: null, provider_display: null, lifecycle_state: "active" }, [assignmentRoleId]); assignmentIntents.current.set(intentId, intent); }
      await intent.complete(api, refetchUsers);
      const target = `/api/v1/memberships/${encodeURIComponent(selectedMembershipId)}${membershipQuery}`;
      setSelectedMembership(await (platformRead ? api.platformGet<Row>(target) : api.request<Row>(target)));
      assignmentIntents.current.delete(intentId); setAssignmentRoleId(""); setFeedback(uiText.administration.roleAssigned);
    } catch { setFeedback(uiText.administration.roleAssignmentError); }
    finally { roleGuard.current = false; setAssignmentBusy(false); }
  };
  const revoke = async (invitation: Row) => {
    const id = String(invitation.tenant_membership_invitation_id);
    setRevokeBusy(id); setFeedback(undefined);
    try {
      await api.request(`/api/v1/platform/membership-invitations/${encodeURIComponent(id)}/revoke`, {
        method: "POST", headers: { "Idempotency-Key": crypto.randomUUID(), "If-Match": `"${Number(invitation.row_version)}"` }, body: "{}"
      }, { tenantContext: "omit" });
      retryInvitations();
    } catch { setFeedback(uiText.administration.revokeError); }
    finally { setRevokeBusy(undefined); }
  };
  const revokeRole = async (assignment: Row) => {
    if (roleGuard.current || !selectedMembershipId || !selectedTenantId || !canRevokeRole) return;
    const id = String(assignment.membership_role_id);
    let intent = revokeIntents.current.get(id);
    const roleName = readableRole(assignment.role_code, assignment.role_name);
    if (!intent) {
      if (!window.confirm(`${uiText.administration.removeRoleConfirm} «${roleName}»?`)) return;
      const reason = window.prompt(`${uiText.administration.removeRoleReason}: ${roleName}`)?.trim();
      if (!reason) return;
      intent = { key: crypto.randomUUID(), reason, etag: String(assignment.etag) }; revokeIntents.current.set(id, intent);
    }
    roleGuard.current = true; setRoleRevokeBusy(id); setFeedback(undefined);
    try {
      if (!await (platformRevoke ? authorizePlatformFresh("platform.role.assign") : authorizeTenantFresh(["platform.role.assign"]))) throw new Error("AUTHORIZATION_DENIED");
      const target = `/api/v1/memberships/${encodeURIComponent(selectedMembershipId)}${membershipQuery}`;
      let member = await (platformRead ? api.platformGet<Row>(target) : api.request<Row>(target));
      if (member.tenant_id !== selectedTenantId || member.tenant_membership_id !== selectedMembershipId || !Array.isArray(member.roles)) throw new Error("INVALID_REVOKE_TARGET");
      const current = (member.roles as Row[]).find(role => role.membership_role_id === id);
      if (!current) throw new Error("MISSING_REVOKE_TARGET");
      if (!["active", "ended"].includes(membershipRoleValidity(current, Date.now()))) throw new Error("INVALID_REVOKE_VALIDITY");
      if (membershipRoleValidity(current, Date.now()) !== "ended") {
        await api.request(`/api/v1/role-assignments/${encodeURIComponent(id)}:revoke${platformRevoke ? tenantQuery : ""}`, {
          method: "POST", headers: { "Idempotency-Key": intent.key, "If-Match": `"${intent.etag}"` }, body: JSON.stringify({ reason: intent.reason })
        }, { tenantContext: platformRevoke ? "omit" : "required" });
        member = await (platformRead ? api.platformGet<Row>(target) : api.request<Row>(target));
        if (member.tenant_id !== selectedTenantId || member.tenant_membership_id !== selectedMembershipId || !Array.isArray(member.roles) || !(member.roles as Row[]).some(role => role.membership_role_id === id && membershipRoleValidity(role, Date.now()) === "ended")) throw new Error("REVOKE_NOT_CONFIRMED_BY_SERVER");
      }
      setSelectedMembership(member); await refetchUsers(); revokeIntents.current.delete(id); setFeedback(uiText.administration.roleRemoved);
    } catch (error) {
      setFeedback(error instanceof ApiProblem ? `${uiText.administration.roleRemovalError} (${error.problem.code})` : uiText.administration.roleRemovalError);
      await refetchUsers().catch(() => undefined);
    } finally { roleGuard.current = false; setRoleRevokeBusy(undefined); }
  };
  const assigned = selectedMembership && Array.isArray(selectedMembership.roles) ? selectedMembership.roles as Row[] : [];
  const roleOptions = roles.state === "ready" ? roles.page.items.filter((role) => role.tenant_id === selectedTenantId && role.ownership_class === "TENANT_OWNED" && role.lifecycle_state === "published" && !assigned.some((entry) => entry.role_id === role.role_id && ["active", "future"].includes(membershipRoleValidity(entry, Date.now())))) : [];
  return <>
    <div className="page-heading"><div><p className="eyebrow">{uiText.navigation.settings}</p><h1>{uiText.navigation.users}</h1><p>{uiText.administration.usersDetail}</p></div>{platformAdmin && companyState.state === "ready" && <label className="admin-company-picker"><span>{uiText.shell.tenant}</span><select aria-label={uiText.administration.selectCompany} disabled={assignmentBusy || !!roleRevokeBusy} value={selectedTenantId} onChange={(event) => setSelectedTenantId(event.target.value)}><option value="">{uiText.administration.selectCompany}</option>{companyState.page.items.map((tenant) => <option key={String(tenant.tenant_id)} value={String(tenant.tenant_id)}>{String(tenant.display_name)}</option>)}</select></label>}</div>
    {platformAdmin && companyState.state === "error" && <ErrorState unauthorized={companyState.forbidden} retry={retryCompanies}/>}
    {platformAdmin && companyState.state === "ready" && companyState.page.page.has_more && <button className="link-button" onClick={moreCompanies}>{uiText.actions.loadMore}</button>}
    {!selectedTenantId ? <StatePanel kind="empty" detail={uiText.administration.selectCompany}/> : <>
      {context?.tenant_id === selectedTenantId && <AddTenantUser key={selectedTenantId} api={api} tenantId={selectedTenantId} projection={authorization} authorizeFresh={authorizeTenantFresh} refetch={refetchUsers}/>}
      {feedback && <p className="inline-feedback" role="status">{feedback}</p>}
      <DataCard title={uiText.administration.memberships} subtitle={uiText.administration.usersDetail} className="admin-section"><AdminPageBody state={memberships} retry={retryMemberships} loadMore={moreMemberships}>{(items) => items.length === 0 ? <EmptyState/> : <div className="table-scroll"><table><thead><tr><th>{uiText.administration.user}</th><th>Identidad</th><th>Incorporación a la empresa</th><th>{uiText.administration.roles}</th><th><span className="sr-only">{uiText.common.actions}</span></th></tr></thead><tbody>{items.map((membership) => {
        const person = membership.user_identity as Row;
        const assignedRoles = Array.isArray(membership.roles)
          ? (membership.roles as Row[]).filter((entry) => membershipRoleValidity(entry, Date.now()) === "active") : [];
        return <tr key={String(membership.tenant_membership_id)}><td><strong>{String(person.display_name || person.email_normalized || uiText.shell.authorizedUser)}</strong><small className="admin-secondary">{String(person.email_normalized ?? "")}</small><small className="admin-secondary">{String(person.provider_display ?? "Proveedor no disponible")}</small></td><td><StatusBadge value={person.lifecycle_state}/></td><td><StatusBadge value={membership.membership_state}/></td><td>{assignedRoles.length ? assignedRoles.map((role) => readableRole(role.role_code, role.role_name)).join(" · ") : uiText.administration.noRoles}</td><td><button className="link-button" onClick={() => setSelectedMembershipId(String(membership.tenant_membership_id))}>{uiText.actions.viewDetail}</button></td></tr>;
      })}</tbody></table></div>}</AdminPageBody></DataCard>
      {platformAdmin && <><InvitationAdmin key={selectedTenantId} api={api} tenantId={selectedTenantId} created={retryInvitations}/><DataCard title={uiText.administration.invitations} className="admin-section"><AdminPageBody state={invitations} retry={retryInvitations} loadMore={moreInvitations}>{(items) => items.length === 0 ? <EmptyState/> : <div className="table-scroll"><table><thead><tr><th>{uiText.invitation.email}</th><th>{uiText.common.status}</th><th>{uiText.administration.expiry}</th><th><span className="sr-only">{uiText.common.actions}</span></th></tr></thead><tbody>{items.map((invitation) => <tr key={String(invitation.tenant_membership_invitation_id)}><td><strong>{String(invitation.invitee_email)}</strong></td><td><StatusBadge value={invitation.effective_state}/></td><td>{adminDate(invitation.expires_at)}</td><td>{invitation.effective_state === "pending" && <button className="link-button" disabled={revokeBusy === invitation.tenant_membership_invitation_id} onClick={() => void revoke(invitation)}>{uiText.administration.revoke}</button>}</td></tr>)}</tbody></table></div>}</AdminPageBody></DataCard></>}
    </>}
    {selectedMembershipId && <div className="drawer-backdrop" role="presentation" onMouseDown={closeMembership}><aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="membership-detail-title" onMouseDown={(event) => event.stopPropagation()}><header className="drawer-header"><div><p className="eyebrow">{uiText.navigation.users}</p><h2 id="membership-detail-title">{selectedMembership ? String((selectedMembership.user_identity as Row).display_name || (selectedMembership.user_identity as Row).email_normalized || uiText.shell.authorizedUser) : uiText.administration.user}</h2></div><button className="icon-button" onClick={closeMembership} disabled={assignmentBusy || !!roleRevokeBusy} aria-label={uiText.forms.closeDetail}>×</button></header><div className="drawer-body">{!selectedMembership ? <LoadingState/> : <><p><StatusBadge value={selectedMembership.membership_state}/></p><p>{uiText.administration.joined}: {adminDate(selectedMembership.joined_at)}</p><h3>{uiText.administration.roles}</h3>{assigned.length ? <ul className="admin-role-list">{assigned.map((entry) => { const validity = membershipRoleValidity(entry, Date.now()); return <li key={String(entry.membership_role_id)}><strong>{readableRole(entry.role_code, entry.role_name)}</strong><span>{validity === "ended" ? `${uiText.administration.roleValidityEnded} · ` : validity === "future" ? `${uiText.administration.roleValidityFuture} · ` : ""}{adminDate(entry.valid_from)} – {entry.valid_to ? adminDate(entry.valid_to) : uiText.common.noData}</span>{canRevokeRole && validity === "active" && <button className="link-button" disabled={assignmentBusy || !!roleRevokeBusy} onClick={() => void revokeRole(entry)}>{uiText.administration.removeRole}</button>}</li>; })}</ul> : <p className="form-guidance">{uiText.administration.noRoles}</p>}{canAssign && selectedMembership.membership_state === "active" && <div className="admin-form"><label><span>{uiText.administration.assignRole}</span><select aria-label={uiText.administration.selectRole} disabled={assignmentBusy || !!roleRevokeBusy} value={assignmentRoleId} onChange={(event) => setAssignmentRoleId(event.target.value)}><option value="">{uiText.administration.selectRole}</option>{roleOptions.map((role) => <option key={String(role.role_id)} value={String(role.role_id)}>{readableRole(role.role_code, role.name)}</option>)}</select></label><button className="button primary" disabled={!assignmentRoleId || assignmentBusy} onClick={() => void assign()}>{uiText.administration.assignRole}</button></div>}</>}</div></aside></div>}
  </>;
}

export function CoreGrcApp({ api, session, apiOrigin }: { api: ApiClient; session: BrowserSession; apiOrigin: string }) {
  const [active, setActive] = useState(route());
  const [menu, setMenu] = useState(false);
  const [contextVersion, setContextVersion] = useState(0);
  const [invitationToken, setInvitationToken] = useState(() => invitationTokenFromLocation());
  const [access, setAccess] = useState<{ loading: boolean; value?: Access; error?: string; authenticating?: boolean }>({ loading: true });
  const [authorization, setAuthorization] = useState<CurrentPrincipalAuthorization | null>(null);
  const authorizationEpoch = useRef(0);
  const selectedAuthorizationTenant = session.selectedTenant()?.tenantId ?? null;
  const refreshAuthorization = async (requiredPermission?: string, epoch = authorizationEpoch.current): Promise<boolean> => {
    const token = await session.getAccessToken();
    if (!token) { if (epoch === authorizationEpoch.current) setAuthorization(null); return false; }
    try {
      const projection = parseCurrentAuthorization(await api.currentAuthorization(selectedAuthorizationTenant), selectedAuthorizationTenant);
      if (!projection || epoch !== authorizationEpoch.current || token !== await session.getAccessToken()
        || selectedAuthorizationTenant !== (session.selectedTenant()?.tenantId ?? null)) {
        if (epoch === authorizationEpoch.current) setAuthorization(null);
        return false;
      }
      setAuthorization(projection);
      return requiredPermission ? projection.platform_permissions.includes(requiredPermission) : true;
    } catch (error) {
      if (epoch === authorizationEpoch.current) setAuthorization(null);
      if (epoch === authorizationEpoch.current && error instanceof ApiProblem && error.status === 401) setAccess({ loading: false });
      return false;
    }
  };
  useEffect(() => { const listener = () => setActive(route()); addEventListener("popstate", listener); return () => removeEventListener("popstate", listener); }, []);
  useLayoutEffect(() => {
    const epoch = ++authorizationEpoch.current;
    if (!access.value) { setAuthorization(null); return; }
    setAuthorization(null);
    void refreshAuthorization(undefined, epoch);
    const visible = () => { if (document.visibilityState === "visible") {
      const visibleEpoch = ++authorizationEpoch.current;
      setAuthorization(null);
      void refreshAuthorization(undefined, visibleEpoch);
    } };
    document.addEventListener("visibilitychange", visible);
    return () => { authorizationEpoch.current++; document.removeEventListener("visibilitychange", visible); };
  }, [api, access.value, selectedAuthorizationTenant, active]);
  const applyAccess = (value: Access) => {
    const contexts = value.available_tenant_contexts;
    const current = session.selectedTenant()?.tenantId;
    if (contexts.length === 1) session.selectTenant(contexts[0]!.tenant_id);
    else if (!contexts.some(({ tenant_id }) => tenant_id === current)) session.selectTenant(null);
    setAccess({ loading: false, value });
  };
  const loadAccess = () => api.accessMe<Access>().then(applyAccess).catch((error: unknown) => {
    const problem = error instanceof ApiProblem ? error : null;
    setAccess(problem?.status === 401 ? { loading: false } : { loading: false, error: uiText.states.unavailableTitle });
  });
  useEffect(() => { void loadAccess(); }, [api]);
  const login = async (provider: "ZOHO" | "TCDX_MANAGED_IDENTITY") => {
    setAccess(({ error: _error, ...current }) => ({ ...current, authenticating: true }));
    try {
      session.storeAccessToken(await receiveApplicationToken(apiOrigin, undefined, provider === "ZOHO" ? "zoho" : "tcdx-managed-identity"));
      await loadAccess();
    } catch {
      setAccess({ loading: false, error: uiText.auth.loginError });
    }
  };
  const acceptInvitation = async () => {
    if (!invitationToken) return;
    setAccess(({ error: _error, ...current }) => ({ ...current, authenticating: true }));
    try {
      session.storeAccessToken(await receiveInvitationApplicationToken(apiOrigin, invitationToken));
      setInvitationToken(null);
      await loadAccess();
    } catch {
      setAccess({ loading: false, error: uiText.invitation.acceptError });
    }
  };
  const logout = async () => {
    authorizationEpoch.current++;
    setAuthorization(null);
    await api.logout().catch(() => undefined);
    setAccess({ loading: false });
  };
  if (access.loading) return <main className="standalone-state"><LoadingState/></main>;
  if (!access.value) return invitationToken ? <main className="standalone-state"><section className="auth-card"><BrandLogo/><h1>{uiText.invitation.acceptTitle}</h1><p>{access.error ?? uiText.invitation.acceptDetail}</p><button className="button primary" disabled={access.authenticating} onClick={() => void acceptInvitation()}>{access.authenticating ? uiText.auth.connecting : uiText.invitation.accept}</button></section></main> :
    <LoginEntry api={api} {...(access.error ? { error: access.error } : {})} authenticating={Boolean(access.authenticating)} onLogin={(provider) => void login(provider)}/>;
  const contexts = access.value.available_tenant_contexts;
  const selectedId = session.selectedTenant()?.tenantId;
  const context = contexts.find(({ tenant_id }) => tenant_id === selectedId);
  const platformAdmin = !!authorization?.platform_permissions.includes("platform.tenant.read");
  const tenantAdmin = tenantPresentationPermission(authorization, context?.tenant_id, "platform.membership.read");
  const authorizeTenantFresh = async (codes: readonly string[]): Promise<boolean> => {
    const tenantId = session.selectedTenant()?.tenantId ?? null;
    const token = await session.getAccessToken();
    if (!tenantId || !token || context?.tenant_id !== tenantId) return false;
    try {
      const next = parseCurrentAuthorization(await api.currentAuthorization(tenantId), tenantId);
      if (!next || token !== await session.getAccessToken() || tenantId !== session.selectedTenant()?.tenantId) { setAuthorization(null); return false; }
      setAuthorization(next); return codes.every(code => tenantPresentationPermission(next, tenantId, code));
    } catch { setAuthorization(null); return false; }
  };
  const miPermissions = managedIdentityEligibility(authorization);
  const managedIdentity = miPermissions.has("platform.managed_identity.read") || miPermissions.has("platform.managed_identity.create") || miPermissions.has("platform.managed_identity.administer");
  if (!context && !platformAdmin && !managedIdentity) return <main className="standalone-state"><section className="auth-card"><BrandLogo/><h1>{contexts.length ? uiText.tenant.selectTitle : uiText.tenant.noneTitle}</h1><p>{contexts.length ? uiText.tenant.selectDetail : uiText.tenant.noneDetail}</p>{contexts.length > 0 && <select className="tenant-select" aria-label={uiText.tenant.selectorLabel} defaultValue="" onChange={(event) => { session.selectTenant(event.target.value || null); setContextVersion((value) => value + 1); }}><option value="" disabled>{uiText.tenant.selectorPlaceholder}</option>{contexts.map((item) => <option value={item.tenant_id} key={item.tenant_id}>{item.tenant_display_name}</option>)}</select>}<button className="button secondary" onClick={() => void logout()}>{uiText.auth.logout}</button></section></main>;
  const effectiveRoles = [...access.value.effective_platform_role_codes, ...(context?.effective_role_codes ?? [])];
  const roleSummary = effectiveRoles.map((role) => roleLabel(role)).join(" · ") || uiText.administration.noRoles;
  const administrativePage = active === settingsRoutes.companies || active === settingsRoutes.users || active === settingsRoutes.managedIdentities;
  return <div className="app-shell"><Sidebar active={active} open={menu} close={() => setMenu(false)} platformAdmin={platformAdmin} tenantAdmin={tenantAdmin} hasTenant={Boolean(context)} managedIdentity={managedIdentity}/><div className="app-column"><header className="topbar"><button className="menu-button" aria-label={uiText.navigation.open} onClick={() => setMenu(!menu)}>☰</button><label className="search"><span className="sr-only">{uiText.shell.searchLabel}</span><input type="search" placeholder={uiText.shell.searchPlaceholder}/></label>{context ? <label className="tenant-context"><span>{uiText.shell.tenant}</span><select aria-label={uiText.tenant.selectorLabel} value={context.tenant_id} onChange={(event) => { session.selectTenant(event.target.value); setContextVersion((value) => value + 1); }}>{contexts.map((item) => <option value={item.tenant_id} key={item.tenant_id}>{item.tenant_display_name}</option>)}</select></label> : <span className="context-pill">{uiText.administration.platformContext}</span>}<div className="user-context"><span className="avatar">U</span><div><strong>{uiText.shell.authorizedUser}</strong><span className="user-role-summary" title={roleSummary}>{platformAdmin && `${uiText.administration.platformContext} · `}{context ? `${context.tenant_display_name} · ` : ""}{roleSummary}</span></div><button className="link-button" onClick={() => void logout()}>{uiText.auth.logout}</button></div></header><main className="workspace" key={`${context?.tenant_id ?? "platform"}:${contextVersion}`}>
    {active === settingsRoutes.managedIdentities ? managedIdentity ? <ManagedIdentityWorkspace api={api} permissions={new Set(authorization?.platform_permissions ?? [])} authorizeFresh={refreshAuthorization}/> : <StatePanel kind="permission-denied"/> :
    active === settingsRoutes.companies ? platformAdmin ? <CompaniesAdmin api={api} authorization={authorization} authorizeFresh={refreshAuthorization}/> : tenantAdmin && context ? <TenantCompany api={api} context={context}/> : <StatePanel kind="permission-denied"/> :
      active === settingsRoutes.users ? platformAdmin || tenantAdmin ? <UsersAdmin api={api} platformAdmin={platformAdmin} authorization={authorization} authorizeTenantFresh={authorizeTenantFresh} authorizePlatformFresh={refreshAuthorization} {...(context ? { context } : {})}/> : <StatePanel kind="permission-denied"/> :
      context ? active === "dashboard" ? <Dashboard api={api}/> : <ModuleWorkspace api={api} active={active}/> :
      <StatePanel kind={administrativePage ? "permission-denied" : "not-available"} detail={uiText.tenant.selectDetail}/>}
  </main></div>{menu && <button className="sidebar-scrim" aria-label={uiText.navigation.close} onClick={() => setMenu(false)}/>}</div>;
}
