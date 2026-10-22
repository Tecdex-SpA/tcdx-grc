import { WorkspaceSearch, ContractingDocuments } from "./workspace-search.js";
import {KnowledgeWorkspace, MatrixWorkspace, ControlAdjustments, ApplicabilityKnowledgeSelect, TargetKnowledgePanel} from "./normative-library-workspace.js";
import {validateLibrarySchema} from "@tcdx-grc/contracts/normative-library";
import {BusinessOriginFields} from './business-origin-fields.js';
import {originFields} from './business-forms.js';
import { formForPath, normalizeForm, validateForm, problemErrors, formFailure, type FormErrors } from "./business-forms.js";
import { BusinessFields, BusinessScalarField, FormErrorSummary, useBusinessDialog } from "./business-form-fields.js";
import { retentionPolicyDisplayLabel, businessLabel } from "./reference-read.js";
import { BusinessEntityLabel, AuthorizedRetentionReference, HistoricalReferenceLabel, ApprovedEvidenceReferenceField, StructuredCollectionEditor, TypedReferenceField, RequirementReferenceField } from "./structured-reference-fields.js";
import { TenantTimezoneContext, TenantLocalDateTimeField, tenantInstantToUtc, isUtcEndAfterStart, TenantInstantPreview, normalizeSamplePeriods, selectedTenantTimezone, explicitUtcInstant } from "./tenant-timezone.js";
import { BusinessReferenceSelect, EntityReferenceSelect, ContractVocabularySelect, ControlVersionSelect, SubjectSelect, MethodologySelect } from "./reference-selectors.js";
import { AddTenantUser, InitialCompanyWizard, TenantUserIntent, tenantPresentationPermission } from "./tenant-onboarding.js";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ApiClient, ApiProblem } from "./api-client.js";
import { BrowserSession, receiveApplicationToken, receiveInvitationApplicationToken } from "./browser-auth.js";
import { displayValue, fieldLabel, fieldPlaceholder, roleLabel } from "./i18n/display-text.js";
import { moduleLabels, uiText } from "./i18n/es.js";
import { statusLabel, statusTone } from "./i18n/status-labels.js";
import { FORM_VOCABULARIES, type FormVocabularyKey, type CurrentPrincipalAuthorization } from "@tcdx-grc/contracts";
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
    { state: "draft", label: "Actualizar borrador", suffix: "update", fields: ["retention_seconds", "is_mandatory"], optionalFields: ["retention_seconds"] },
    { state: "draft", label: "Enviar a revisión", suffix: "submit-for-review" },
    { state: "draft", label: uiText.actions.review, suffix: "review" },
    { state: "under_review", label: uiText.actions.approve, suffix: "approve" },
    { state: "approved", label: uiText.actions.publish, suffix: "publish" }
  ],
  "aplicabilidad-retencion": [
    { state: "draft", label: "Vincular fuente inicial", suffix: "bind-initial-source", fields: ["source_evidence_version_id", "source_clause_ref", "effective_from", "effective_to"], optionalFields: ["effective_to"] },
    { state: "draft", label: "Enviar a revisión", suffix: "submit-for-review" },
    { state: "draft", label: uiText.actions.review, suffix: "review" },
    { state: "under_review", label: uiText.actions.approve, suffix: "approve" },
    { state: "approved", label: uiText.actions.publish, suffix: "publish" },
    { state: "published", label: "Levantar legal hold", suffix: "release-hold", fields: ["reason"], optionalFields: [] }
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
  return (workflowActions[definition.id] ?? []).filter((action) => action.state === state &&
    (action.suffix !== "bind-initial-source" || row.initial_source_bind_allowed === true) &&
    (action.suffix !== "release-hold" || (row.policy_kind === "legal_hold" && !row.hold_release_id)));
}

export function retentionActionPermission(suffix: string): string | null {
  return ({
    "bind-initial-source": "privacy.retention_policy.update",
    update: "privacy.retention_policy.update",
    "submit-for-review": "privacy.retention_policy.update",
    review: "privacy.retention_policy.review",
    approve: "privacy.retention_policy.approve",
    publish: "privacy.retention_policy.publish",
    "release-hold": "privacy.retention_policy.legal_hold.release"
  } as Record<string, string>)[suffix] ?? null;
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
  evidencias: { path: "/evidence", fields: ["evidence_code", "evidence_type", "business_owner_subject_id", "valid_from", "valid_to", "retention_policy_id", "retention_policy_applicability_id", "source_kind", "file_object_id", "period_start", "period_end", "effective_from", "effective_to", "expires_at", "provenance_ref", "links"], jsonFields: ["links"] },
  retencion: { path: "/retention-policies", fields: ["policy_code", "version_number", "policy_kind", "retention_seconds", "trigger_event_code", "precedence_rank", "is_mandatory"] },
  "aplicabilidad-retencion": { path: "/retention-policy-applicabilities", fields: ["retention_policy_id", "version_number", "classification", "scope_subject_id", "source_evidence_version_id", "source_clause_ref", "effective_from", "effective_to", "supersedes_applicability_id"] },
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
  { id: "aplicabilidad-retencion", label: moduleLabels["aplicabilidad-retencion"], path: "/retention-policy-applicabilities", idField: "retention_policy_applicability_id", titleField: "classification", stateField: "lifecycle_state" },
  { id: "issues", label: moduleLabels.issues, path: "/issues", idField: "issue_id", titleField: "title", stateField: "lifecycle_state" },
  { id: "acciones", label: moduleLabels.acciones, path: "/actions", idField: "action_id", titleField: "title", stateField: "lifecycle_state" }
];

const nav = [
  ["dashboard", uiText.navigation.dashboard, "grid"], ["normas", uiText.navigation.norms, "list"], ["cumplimiento", uiText.navigation.compliance, "check"], ["requisitos", uiText.navigation.requirements, "list"],
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

function usePage(api: ApiClient, definition: ModuleDefinition, enabled = true, lifecycleState = "", search = "", frameworkVersionId = ""): [LoadState, () => void, () => void] {
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<LoadState>({ state: "loading" });
  const load = (cursor?: string, append = false, signal?: AbortSignal) => {
    const query = new URLSearchParams({ "page[size]": "100" });
    if (cursor) query.set("page[cursor]", cursor);
    if (lifecycleState && definition.id !== "controles") query.set("filter[lifecycle_state]", lifecycleState);
    if (search && definition.id === "controles") query.set("filter[query]", search);
    if (frameworkVersionId && definition.id === "controles") query.set("filter[framework_version_id]", frameworkVersionId);
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
  }, [api, definition, enabled, lifecycleState, search, frameworkVersionId, nonce]);
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
  "solicitudes-evidencia": ["open", "fulfilled", "cancelled", "expired"], evidencias: ["draft", "submitted", "under_review", "approved", "rejected", "expired", "superseded"], retencion: ["draft", "under_review", "approved", "published"], "aplicabilidad-retencion": ["draft", "under_review", "approved", "published"],
  issues: ["open", "triaged", "remediation_in_progress", "pending_verification", "verified_closed", "dismissed", "reopened"],
  acciones: ["pending", "in_progress", "in_review", "completed", "verified", "reopened", "cancelled"]
};

export function PageHeader({ title, action, filter }: { title: string; action?: React.ReactNode; filter?: React.ReactNode }) {
  return <><div className="page-heading"><div><p className="eyebrow">{uiText.modules.eyebrow}</p><h1>{title}</h1><p>{uiText.modules.description}</p></div>{action && <div className="page-actions">{action}</div>}</div>{filter && <section className="toolbar filter-bar" aria-label={`Filtros de ${title}`}>{filter}</section>}</>;
}

export function TableShell({ label, children }: { label: string; children: React.ReactNode }) {
  return <section className="data-card table-card" aria-label={label}>{children}</section>;
}

function ModuleTable({ api, definition, allowKnowledgeContext = false, allowCreate = true, allowAction = () => true }: {
  api: ApiClient; definition: ModuleDefinition; allowCreate?: boolean; allowKnowledgeContext?:boolean;
  allowAction?: ((action: WorkflowAction) => boolean) | undefined;
}) {
  const [stateFilter, setStateFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [frameworkVersionId, setFrameworkVersionId] = useState("");
  const [load, retry, loadMore] = usePage(api, definition, true, stateFilter, search, frameworkVersionId);
  const [selected, setSelected] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  if (load.state === "loading") return <LoadingState/>;
  if (load.state === "error") return <ErrorState {...load} retry={retry}/>;
  return <>
    <PageHeader
      title={definition.label}
      action={allowCreate && canCreate(definition) ? <button className="button primary" onClick={() => setCreating(true)}>{uiText.modules.newRecord}</button> : undefined}
      filter={<>{definition.id === "controles" && <><form onSubmit={(event) => { event.preventDefault(); if (searchInput.trim().length === 0 || searchInput.trim().length >= 2) setSearch(searchInput.trim()); }}><label>Buscar controles<input aria-label="Buscar controles por nombre, código o referencia normativa" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Nombre, código o referencia"/></label><button className="button secondary" disabled={searchInput.trim().length === 1} type="submit">Buscar</button></form><label>Norma o ley<select aria-label="Filtrar por norma o ley" value={frameworkVersionId} onChange={(event) => setFrameworkVersionId(event.target.value)}><option value="">Todos los marcos habilitados</option>{load.frameworkFilters.map((framework) => <option key={framework.framework_version_id} value={framework.framework_version_id}>{framework.framework_name} · {framework.edition}{framework.access_mode === "non_authoritative_validation" ? " · Validación provisional" : ""}</option>)}</select></label></>}<label>{uiText.common.status}<select aria-label={uiText.common.filterStatus} aria-describedby={definition.id === "controles" ? "control-status-filter-unavailable" : undefined} disabled={definition.id === "controles"} value={definition.id === "controles" ? "" : stateFilter} onChange={(event) => setStateFilter(event.target.value)}><option value="">{uiText.common.all}</option>{definition.id !== "controles" && (lifecycleStates[definition.id] ?? []).map((state) => <option value={state} key={state}>{statusLabel(state)}</option>)}</select></label>{definition.id === "controles" && <p id="control-status-filter-unavailable" className="form-guidance" role="status">El estado se consulta en cada registro.</p>}</>}
    />
    {definition.id === "controles" && load.data.some(hasProvisionalFramework) &&
      <p className="form-guidance" role="note">{provisionalWarning}</p>}
    <TableShell label={definition.label}>
      {load.data.length === 0 ? <EmptyState/> : definition.id === "controles" ? <div className="table-scroll"><table><thead><tr><th>Código</th><th>Control</th><th>Norma o ley</th><th>Aplicabilidad</th><th>Implementación</th><th>{uiText.common.status}</th><th>{uiText.common.version}</th><th><span className="sr-only">{uiText.common.actions}</span></th></tr></thead><tbody>{load.data.map((row) => {
        const frameworks = Array.isArray(row.normative_frameworks) ? row.normative_frameworks as Row[] : [];
        const applicability = Array.isArray(row.applicability_decisions) ? row.applicability_decisions as Row[] : null;
        const implementationCount = typeof row.implementation_count === "number" ? row.implementation_count : null;
        return <tr key={String(row.control_id)}><td><strong>{displayValue(row.control_code)}</strong></td><td><strong>{displayValue(row.name)}</strong><small className="admin-secondary">{displayValue(row.ownership_class)}</small>{hasProvisionalFramework(row) && <small className="admin-secondary">Validación provisional</small>}</td><td>{frameworks.length ? frameworks.map((framework) => <span className="catalog-relation" key={String(framework.framework_version_id)}>{String(framework.framework_name)} · {String(framework.edition)}{framework.access_mode === "non_authoritative_validation" ? " · Validación provisional" : " · Oficial"}</span>) : "Sin relación visible"}</td><td>{applicability === null ? "Acceso restringido" : applicability.length ? applicability.map((item) => `${displayValue(item.decision)} (${String(item.requirement_count)})`).join(", ") : "Sin decisión aprobada"}</td><td>{implementationCount === null ? "Acceso restringido" : implementationCount > 0 ? `Implementado${implementationCount > 1 ? ` (${implementationCount})` : ""}` : "Sin implementar"}</td><td><StatusBadge value={row.lifecycle_state}/></td><td>{row.version_number == null ? "—" : `v${String(row.version_number)}`}</td><td><button className="link-button" onClick={() => setSelected(row)}>{uiText.actions.viewDetail}</button></td></tr>;
      })}</tbody></table></div> : <div className="table-scroll"><table><thead><tr><th>{definition.id==="retencion"?"Código":"Registro"}</th><th>{uiText.common.reference}</th><th>{uiText.common.status}</th><th>{uiText.common.version}</th><th><span className="sr-only">{uiText.common.actions}</span></th></tr></thead><tbody>{load.data.map((row) => <tr key={String(row[definition.idField])}><td>{definition.id==="retencion"?<strong>{String(row.policy_code)}</strong>:<strong>{businessLabel(row) || definition.label}</strong>}</td><td><strong>{definition.id==="retencion"?retentionPolicyDisplayLabel(row):displayValue(row[definition.titleField])}</strong>{definition.id==="aplicabilidad-retencion"&&typeof row.retention_policy_id==="string"&&<small className="admin-secondary"><AuthorizedRetentionReference api={api} entity="retentionPolicy" value={row.retention_policy_id}/></small>}</td><td><StatusBadge value={row[definition.stateField]}/></td><td>{displayValue(["retencion","aplicabilidad-retencion"].includes(definition.id)?row.version_number:row.row_version)}</td><td><button className="link-button" onClick={() => setSelected(row)}>{uiText.actions.viewDetail}</button></td></tr>)}</tbody></table></div>}
    </TableShell>
    {load.page.has_more && <div className="pagination"><button className="button secondary" disabled={load.loadingMore} onClick={loadMore}>{load.loadingMore ? uiText.actions.loadingMore : uiText.actions.loadMore}</button></div>}
    {selected && (
      <DetailDrawer api={api} definition={definition} row={selected} allowAction={allowAction} close={() => setSelected(null)} completed={() => { setSelected(null); retry(); }}/>
    )}
    {creating && allowCreate && (
      <CreateDrawer api={api} definition={definition} allowKnowledgeContext={allowKnowledgeContext} close={() => setCreating(false)} completed={() => { setCreating(false); retry(); }}/>
    )}
  </>;
}

function hasProvisionalFramework(row: Row): boolean {
  return row.access_mode === "non_authoritative_validation"
    || (Array.isArray(row.normative_frameworks) && (row.normative_frameworks as Row[])
      .some((framework) => framework.access_mode === "non_authoritative_validation"));
}

// RetentionPolicyCreateRequest: exact policy_kind/precedence pairs in
// docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml. Backend revalidates.
const retentionPolicyPrecedence: Readonly<Record<string, number>> = {
  legal_hold: 500, mandatory_regulatory_policy: 400, contractual_policy: 300,
  tenant_policy: 200, product_baseline: 100
};

function retentionMandatorySelection(value: string | undefined): boolean | undefined {
  return value === "true" ? true : value === "false" ? false : undefined;
}

function RetentionMandatoryField({ value, onChange }: { value: string; onChange(value: string): void }) {
  return <label><span>{fieldLabel("is_mandatory")}</span><select aria-label={fieldLabel("is_mandatory")} required value={value} onChange={event => onChange(event.target.value)}>
    <option value="">Selecciona Sí o No</option><option value="true">Sí</option><option value="false">No</option>
  </select></label>;
}

const evidenceInstantFields = ["valid_from", "valid_to", "period_start", "period_end", "effective_from", "effective_to", "expires_at"];

export function CreateDrawer({ api, definition, close, completed, allowKnowledgeContext=false }: { api: ApiClient; definition: ModuleDefinition; close(): void; completed(): void; allowKnowledgeContext?:boolean }) {
  const [knowledgeContext,setKnowledgeContext]=useState("");
  const contract = createContracts[definition.id]!;
  const businessForm = formForPath(contract.path);
  const schema = businessForm?.schema ?? "RetentionApplicabilityCreateRequest";
  const [fieldErrors,setFieldErrors] = useState<FormErrors>({});
  const timezone = React.useContext(TenantTimezoneContext);
  const [form, setFormState] = useState<Record<string, string>>({});
  useEffect(()=>setKnowledgeContext(""),[form.scope_subject_id]);
  const setForm:React.Dispatch<React.SetStateAction<Record<string,string>>>=(update)=>{setFieldErrors({});setError(undefined);setFormState(update);};
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const dialogRef=useBusinessDialog(close,busy);
  const intent=useRef<{fingerprint:string;key:string}|undefined>(undefined);
  const [file, setFile] = useState<File>();
  const [classification, setClassification] = useState("");
  const [sourceProvenance, setSourceProvenance] = useState("");
  const [retentionContext,setRetentionContext]=useState<Row>();
  useEffect(() => { setRetentionContext(undefined); }, [form.retention_policy_id, classification, form.business_owner_subject_id]);
  const createSchema:Record<string,string>={controles:"ControlInstantiateRequest",evidencias:"EvidenceCreateRequest",issues:"IssueCreateRequest",acciones:"ActionCreateRequest",cumplimiento:"ApplicabilityCreateRequest",retencion:"RetentionPolicyCreateRequest"};
  // Both approved request fields reference FileClassification (CV-01); reuse its generated projection.
  const vocabularyField=(field:string):FormVocabularyKey|undefined=> {if(definition.id === "aplicabilidad-retencion" && field === "classification") return "UploadIntentCreateRequest.classification";const key=`${createSchema[definition.id]}.${field}`;return Object.hasOwn(FORM_VOCABULARIES,key)?key as FormVocabularyKey:undefined;};
  const assignmentParents=definition.id==="acciones"?{issue_id:form.issue_id??""}:Object.fromEntries(["requirement_id","control_id","requirement_assessment_id","control_assessment_id","assurance_test_id"].filter(key=>form[key]).map(key=>[key,form[key]!]));
  const submit = async () => {
    if(busy)return;
    setFieldErrors({});
    let body: Row = Object.fromEntries(Object.entries(form).filter(([, value]) => value !== ""));
    if (definition.id === "controles" && !body.based_on_control_version_id) { setFieldErrors({based_on_control_version_id:"Selecciona un control base autorizado."});setError("Selecciona un control base autorizado."); return; }
    if (definition.id === "controles" && !body.business_owner_subject_id) { setFieldErrors({business_owner_subject_id:"Selecciona un responsable autorizado."});setError("Selecciona un responsable autorizado."); return; }
    if (definition.id === "cumplimiento" && body.applicability_decision === "not_applicable" &&
        (typeof body.rationale !== "string" || !body.rationale.trim())) { setError("Indica la justificación para No aplica."); return; }
    for (const field of contract.jsonFields ?? []) if (typeof body[field] === "string") {
      try { body[field] = JSON.parse(body[field]); } catch { setError(uiText.forms.invalidJson); return; }
    }
    if (definition.id === "retencion") {
      const precedence = retentionPolicyPrecedence[String(body.policy_kind ?? "")];
      if (precedence === undefined) { setError("Selecciona un tipo de política válido."); return; }
      body.precedence_rank = precedence;
      for (const field of ["version_number", "retention_seconds"]) if (body[field] !== undefined) body[field] = Number(body[field]);
      if (body.policy_kind === "legal_hold") delete body.retention_seconds;
      const mandatory = retentionMandatorySelection(form.is_mandatory);
      if (mandatory === undefined) { setError("Selecciona Sí o No en Obligatoria."); return; }
      body.is_mandatory = mandatory;
    }
    if (definition.id === "aplicabilidad-retencion") {
      body.version_number = Number(body.version_number);
      if (!body.retention_policy_id || !Number.isSafeInteger(body.version_number) || Number(body.version_number) < 1 ||
          !FORM_VOCABULARIES["UploadIntentCreateRequest.classification"].includes(body.classification as never)) {
        setError("Selecciona una política publicada, una versión de aplicabilidad válida y una clasificación del catálogo."); return;
      }
      if (body.source_clause_ref && !body.source_evidence_version_id) { setError("Selecciona la versión de evidencia aprobada antes de indicar su cláusula o disposición."); return; }
      for (const field of ["effective_from", "effective_to"]) if (body[field]) {
        const utc = String(body[field]).endsWith("Z") ? tenantInstantToUtc(String(body[field]),timezone) : null;
        if (!utc) { setError(`Revisa ${fieldLabel(field)} y selecciona una hora local válida y sin ambigüedad en la zona de la empresa.`); return; }
        body[field] = utc;
      }
      if (body.effective_from && body.effective_to && !isUtcEndAfterStart(String(body.effective_from),String(body.effective_to))) {
        setError("Vigente hasta debe ser posterior a Vigente desde."); return;
      }
    }
    if (definition.id === "evidencias") {
      for (const field of evidenceInstantFields) if (body[field] !== undefined) {
        const value = String(body[field]);
        const utc = value.endsWith("Z") ? tenantInstantToUtc(value, timezone) : null;
        if (!utc) { setError(`Revisa ${fieldLabel(field)} y selecciona una hora local válida y sin ambigüedad en la zona de la empresa.`); return; }
        body[field] = utc;
      }
      for (const [start, end] of [["valid_from", "valid_to"], ["period_start", "period_end"], ["effective_from", "effective_to"]] as const) {
        if (body[start] && body[end] && !isUtcEndAfterStart(String(body[start]), String(body[end]))) {
          setError(`${fieldLabel(end)} debe ser posterior a ${fieldLabel(start)}.`); return;
        }
      }
    }
    let path = contract.path;
    if (contract.pathField) {
      const value = String(body[contract.pathField] ?? "");
      if (!value) { setError(uiText.forms.requiredField); return; }
      path = path.replace(`{${contract.pathField}}`, value); delete body[contract.pathField];
    }
    const uploadApplicability=body.retention_policy_applicability_id;
    if (businessForm) {
      if (definition.id === "evidencias") { delete body.retention_policy_applicability_id; if(!body.links)body.links=[]; }
      const normalized=normalizeForm(schema,body,timezone);body=normalized.body;
      const errors={...validateForm(schema,body),...normalized.errors};
      if(definition.id==="evidencias"&&file)delete errors.file_object_id;
      if(definition.id==="evidencias"&&retentionContext?.lifecycle_state==="published"&&(!Array.isArray(body.links)||body.links.length===0))errors.links="Agrega al menos un vínculo al objeto que sustenta esta evidencia ordinaria.";
      if(Object.keys(errors).length){setFieldErrors(errors);setError("Revisa los campos indicados antes de continuar.");return;}
    }
    if(definition.id==='cumplimiento'&&allowKnowledgeContext&&knowledgeContext){
      body.context_knowledge_version_id=knowledgeContext;
      if(!validateLibrarySchema('ApplicabilityCreateRequest',body).valid){setError('Revisa la versión de contexto empresarial.');return;}
    }
    setBusy(true); setError(undefined);
    let transferInProgress = false;
    try {
      if (definition.id === "evidencias" && file && !body.file_object_id) {
        if (!body.retention_policy_id || !uploadApplicability || !classification || !sourceProvenance) { setError(uiText.forms.requiredField); setBusy(false); return; }
        transferInProgress = true;
        body.file_object_id = await api.uploadEvidenceFile(file, String(body.retention_policy_id), String(uploadApplicability), classification, sourceProvenance, {
          ...(body.business_owner_subject_id ? {scope_subject_id:String(body.business_owner_subject_id)} : {}),
          ...(typeof retentionContext?.processing_activity_id === "string" ? {processing_activity_id:retentionContext.processing_activity_id} : {})
        });
        transferInProgress = false;
        setForm((value) => ({ ...value, file_object_id: String(body.file_object_id) }));
      }
      if (definition.id === "evidencias") {
        delete body.retention_policy_applicability_id;
        if (!body.links) body.links = [];
      }
      if(businessForm){const errors=validateForm(schema,body);if(Object.keys(errors).length){setFieldErrors(errors);setError("Revisa los campos indicados.");setBusy(false);return;}}
      const fingerprint=JSON.stringify([api.currentTenantId(),path,body]);
      if(intent.current?.fingerprint!==fingerprint)intent.current={fingerprint,key:crypto.randomUUID()};
      await api.post(`/api/v1${path}`, body,intent.current!.key); completed();
    } catch (failure) {
      setFieldErrors(problemErrors(failure));
      const message = transferInProgress ? uiText.forms.fileError : uiText.forms.createError;
      const field = failure instanceof ApiProblem ? failure.problem.details?.field : undefined;
      setError(failure instanceof ApiProblem
        ? `${message}${typeof field === "string" ? ` Revisa: ${fieldLabel(field)}.` : ""} Correlación: ${failure.problem.correlation_id}`
        : message);
      if(failure instanceof ApiProblem && [401,403,404,409,422].includes(failure.status))setError(formFailure(failure));
      setBusy(false);
    }
  };
  return <div className="drawer-backdrop" role="presentation" onMouseDown={()=>{if(!busy)close();}}><aside ref={dialogRef} className="drawer" role="dialog" aria-modal="true" aria-labelledby="create-title" onMouseDown={(event) => event.stopPropagation()}>
    <header className="drawer-header"><div><p className="eyebrow">{uiText.forms.createEyebrow}</p><h2 id="create-title">{businessForm?.title ?? definition.label}</h2></div><button className="icon-button" onClick={close} disabled={busy} aria-label={uiText.forms.closeCreate}>×</button></header>
    <div className="drawer-body"><p className="form-guidance">{uiText.forms.guidance}</p><fieldset disabled={busy} className="create-form business-form-controls">{definition.id === "evidencias" && <><label><span>{uiText.forms.uploadFile}</span><input type="file" onChange={(event) => setFile(event.target.files?.[0])}/></label><ContractVocabularySelect schemaField="UploadIntentCreateRequest.classification" label={uiText.forms.fileClassification} value={classification} onChange={value=>{setClassification(value);setForm(current=>({...current,retention_policy_applicability_id:"",file_object_id:""}));}}/><label><span>{uiText.forms.fileProvenance}</span><input value={sourceProvenance} onChange={(event) => setSourceProvenance(event.target.value)}/></label></>}<BusinessFields schema={schema} referenceOrigin={originFields(schema).length?<BusinessOriginFields api={api} schema={schema} values={form} errors={fieldErrors} onChange={setForm}/>:undefined} fields={contract.fields.filter(field=>!originFields(schema).includes(field)&&!(definition.id==="retencion"&&form.policy_kind==="legal_hold"&&field==="retention_seconds"))} values={form} errors={fieldErrors} render={(field) => ((definition.id === "aplicabilidad-retencion" && ["effective_from","effective_to"].includes(field)) || (definition.id === "evidencias" && evidenceInstantFields.includes(field))) ? <TenantLocalDateTimeField key={field} label={fieldLabel(field)} value={form[field]??""} onChange={value=>setForm(current=>({...current,[field]:value}))}/> : field === "framework_version_id" ? <BusinessReferenceSelect key={field} api={api} label="Versión normativa" context={{kind:"framework",purpose:"select"}} value={form[field]??""} onChange={value=>setForm(current=>({...current,[field]:value,items:""}))}/> : field === "assigned_membership_id" ? <BusinessReferenceSelect key={field} api={api} label="Responsable" disabled={Object.values(assignmentParents).filter(Boolean).length!==1} context={{kind:"membership",purpose:definition.id==="acciones"?"action-assignment":"evidence-request-assignment",parents:assignmentParents}} value={form[field]??""} onChange={value=>setForm(current=>({...current,[field]:value}))}/> : (field === "retention_policy_applicability_id" || field === "supersedes_applicability_id") ? <TypedReferenceField key={field} api={api} field={field} form={form} onRetentionContext={setRetentionContext} publishedOnly={definition.id==="evidencias"} classification={definition.id==="evidencias"?classification:undefined} value={form[field]??""} onChange={value=>setForm(current=>({...current,[field]:value}))}/> : field === "source_evidence_version_id" ? <ApprovedEvidenceReferenceField key={field} api={api} value={form[field]??""} onChange={value=>setForm(current=>({...current,[field]:value}))}/> : field === "retention_policy_id" && definition.id === "aplicabilidad-retencion" ? <React.Fragment key={field}><EntityReferenceSelect api={api} entity="retentionPolicy" label="Política de retención" required context={{publishedOnly:true}} value={form[field]??""} onChange={value=>setForm(current=>({...current,[field]:value,supersedes_applicability_id:"",version_number:""}))}/><p className="form-guidance">Selecciona la política y su versión publicada. Una política aprobada debe publicarse primero. La versión de aplicabilidad se registra por separado. La fuente jurídica es opcional para políticas ordinarias.</p></React.Fragment> : field === "retention_policy_id" ? <React.Fragment key={field}><BusinessReferenceSelect key={field} api={api} label="Política de retención" context={{kind:"retention",purpose:file?"upload":"evidence",...(!file && form.file_object_id?{parents:{file_object_id:form.file_object_id}}:{})}} value={form[field]??""} onChange={value=>setForm(current=>({...current,[field]:value,retention_policy_applicability_id:"",file_object_id:""}))}/><p className="form-guidance" role="status">Selecciona una política operativa aplicable. La configuración ordinaria no requiere una fuente jurídica; las obligaciones formales conservan sus controles.</p></React.Fragment> : field === "issue_id" ? <EntityReferenceSelect key={field} api={api} entity="issue" label="Hallazgo" value={form[field]??""} onChange={value=>setForm(current=>({...current,[field]:value,assigned_membership_id:""}))}/> : definition.id === "aplicabilidad-retencion" && field === "version_number" ? <label key={field}><span>Versión de aplicabilidad</span><input aria-label="Versión de aplicabilidad" type="number" min="1" step="1" required value={form[field]??""} onChange={event=>setForm(current=>({...current,[field]:event.target.value}))}/><small>Primera versión: 1. Para sustituir una aplicabilidad publicada, usa la versión siguiente y selecciona la anterior.</small></label> : definition.id === "retencion" && field === "is_mandatory" ? <RetentionMandatoryField key={field} value={form[field] ?? ""} onChange={value => setForm(current => ({ ...current, [field]: value }))}/> : definition.id === "retencion" && field === "precedence_rank" ? <label key={field}><span>{fieldLabel(field)}</span><input aria-label={fieldLabel(field)} readOnly value={retentionPolicyPrecedence[form.policy_kind ?? ""] ?? ""}/><small>Se determina por el tipo de política seleccionado.</small></label> : vocabularyField(field) ? <ContractVocabularySelect key={field} schemaField={vocabularyField(field)!} label={fieldLabel(field)} value={form[field]??""} onChange={value=>setForm(current=>({...current,[field]:value}))}/> : ["items","links"].includes(field) ? <StructuredCollectionEditor key={field} api={api} errors={fieldErrors} kind={field as "items"|"links"} value={form[field]??""} onChange={value=>setForm(current=>({...current,[field]:value}))}/> : field === "requirement_id" ? <RequirementReferenceField key={field} api={api} value={form[field]??""} onChange={value=>setForm(current=>({...current,[field]:value}))}/> : ["control_id","control_version_id","requirement_applicability_id","requirement_assessment_id","control_assessment_id","assurance_test_id","evidence_request_id","scope_subject_id","business_owner_subject_id","effective_configuration_id"].includes(field) ? <TypedReferenceField key={field} api={api} field={field} form={form} value={form[field]??""} onChange={value=>setForm(current=>({...current,[field]:value,...(field==="control_id"?{control_version_id:""}:{}),...(field==="issue_id"?{assigned_membership_id:""}:{})}))}/> : field === "file_object_id" ? <p key={field} className="form-guidance">{file ? `Archivo seleccionado: ${file.name}` : "Selecciona el archivo que deseas cargar."}</p> : field === "methodology_version_ref" ? <MethodologySelect key={field} api={api} domain={definition.id === "requisitos" ? "compliance" : "controls"} value={form[field] ?? ""} onChange={(value) => setForm((current) => ({ ...current, [field]: value }))}/> : definition.id === "controles" && field === "based_on_control_version_id" ? <ControlVersionSelect key={field} api={api} value={form[field] ?? ""} onChange={(value) => setForm((current) => ({ ...current, [field]: value }))}/> : definition.id === "controles" && field === "business_owner_subject_id" ? <SubjectSelect key={field} api={api} value={form[field] ?? ""} onChange={(value) => setForm((current) => ({ ...current, [field]: value }))}/> : <BusinessScalarField schema={schema} field={field} value={form[field]??""} onChange={value=>setForm(current=>({...current,[field]:value}))}/>} />{definition.id==='cumplimiento'&&allowKnowledgeContext&&<ApplicabilityKnowledgeSelect key={form.scope_subject_id??''} api={api} value={knowledgeContext} subjectId={form.scope_subject_id??''} onChange={setKnowledgeContext}/>}</fieldset><FormErrorSummary errors={fieldErrors}/>{error && <p className="inline-feedback error" role="alert">{error}</p>}</div>
    <footer className="drawer-footer"><button className="button primary" disabled={busy} onClick={() => void submit()}>{busy ? uiText.actions.creating : uiText.actions.create}</button></footer>
  </aside></div>;
}

function ControlDetailContent({ api,row }: { api:ApiClient;row: Row }) {
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
    {row.ownership_class === "TENANT_OWNED" && <section className="catalog-detail-section"><h3>Implementación de la organización</h3><p>Control implementado desde una versión base autorizada.</p><dl><dt>Responsable</dt><dd>{typeof row.business_owner_subject_id==="string" ? <BusinessEntityLabel api={api} entity="subject" value={row.business_owner_subject_id}/> : "No informado"}</dd><dt>Vigente desde</dt><dd>{typeof current?.effective_from==="string" ? <TenantInstantPreview value={current.effective_from}/> : "No informado"}</dd><dt>Vigente hasta</dt><dd>{typeof current?.effective_to==="string" ? <TenantInstantPreview value={current.effective_to}/> : "Sin fecha de término"}</dd></dl></section>}
  </>;
}

export function DetailDrawer({ api, definition, row: summary, allowAction, close, completed }: {
  api: ApiClient; definition: ModuleDefinition; row: Row;
  allowAction: (action: WorkflowAction) => boolean; close(): void; completed(): void;
}) {
  const [busy,setBusy]=useState(false);
  const [confirming,setConfirming]=useState<string>();
  const [fieldErrors,setFieldErrors]=useState<FormErrors>({});
  const [refresh,setRefresh]=useState(0);
  const dialogRef=useBusinessDialog(close,busy);
  const intent=useRef<{fingerprint:string;key:string}|undefined>(undefined);
  const timezone = React.useContext(TenantTimezoneContext);
  const [detail, setDetail] = useState<{ loading: boolean; row: Row; error?: string }>({ loading: true, row: summary });
  const [form, setFormState] = useState<Record<string, string>>({});
  const setForm:React.Dispatch<React.SetStateAction<Record<string,string>>>=(update)=>{setFieldErrors({});setFeedback(undefined);setFormState(update);};
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; message: string }>();
  const id = String(summary[definition.idField]);
  useEffect(() => {
    const controller = new AbortController();
    api.request<Row>(`/api/v1${definition.path}/${id}`, { signal: controller.signal }).then((row) => { setDetail({ loading: false, row }); if (definition.id === "aplicabilidad-retencion") setForm(current=>({...current,...Object.fromEntries(["effective_from","effective_to"].filter(field=>typeof row[field]==="string").map(field=>[field,String(row[field])]))})); }).catch((error: unknown) => {
      if (!controller.signal.aborted) setDetail({ loading: false, row: summary, error: uiText.forms.detailUnavailable });
    });
    return () => controller.abort();
  }, [api, definition, id, summary,refresh]);
  const row = detail.row;
  const vocabularyProvenance=Array.isArray(row.contract_provenance)?row.contract_provenance:[];
  const historicalReference=(field:string,value:unknown)=> {
    if(typeof value!=="string") return displayValue(value);
    if (/^\d{4}-\d{2}-\d{2}T.*Z$/.test(value)) return <TenantInstantPreview value={value}/>;
    if(field==="framework_version_id" && definition.id==="soa") return <HistoricalReferenceLabel api={api} kind="framework" purpose="history" parent={{statement_of_applicability_id:id}} filter={{framework_version_id:value}}/>;
    if(["assigned_membership_id","requested_by_membership_id","executor_membership_id","reviewer_membership_id"].includes(field)) {
      const types:Record<string,[string,string]>={acciones:["action-history","action_id"],"solicitudes-evidencia":["evidence-request-history","evidence_request_id"],pruebas:["assurance-test-history","assurance_test_id"]};
      const type=types[definition.id];if(type)return <HistoricalReferenceLabel api={api} kind="membership" purpose={type[0]} parent={{[type[1]]:id}} filter={{tenant_membership_id:value}}/>;
    }
    if(field==="retention_policy_id" && definition.id==="evidencias") return <HistoricalReferenceLabel api={api} kind="retention" purpose="history" parent={{evidence_id:id}} filter={{retention_policy_id:value}}/>;
    if (definition.id === "retencion" && field === "retention_policy_id") return retentionPolicyDisplayLabel(row);
    if (definition.id === "aplicabilidad-retencion" && field === "retention_policy_id") return <AuthorizedRetentionReference api={api} entity="retentionPolicy" value={value}/>;
    if (definition.id === "aplicabilidad-retencion" && field === "retention_policy_applicability_id") return `${displayValue(row.classification)} · v${String(row.version_number)}`;
    if (definition.id === "aplicabilidad-retencion" && field === "supersedes_applicability_id") return <AuthorizedRetentionReference api={api} entity="retentionPolicyApplicability" value={value}/>;
    if(field===definition.idField)return businessLabel(row,timezone)||definition.label;
    if(field==='control_version_id'&&typeof row.control_id==='string')return <BusinessEntityLabel api={api} entity="controlVersion" value={value} parentId={row.control_id}/>;
    const entities:Record<string,import("./reference-read.js").ReferenceEntity>={requirement_id:"requirement",scope_subject_id:"subject",business_owner_subject_id:"subject",control_id:"control",requirement_applicability_id:"applicability",requirement_assessment_id:"requirementAssessment",control_assessment_id:"controlAssessment",assurance_test_id:"assuranceTest",issue_id:"issue",retention_policy_id:"retentionPolicy"};
    if(entities[field])return <BusinessEntityLabel api={api} entity={entities[field]!} value={value} {...(typeof row.framework_version_id==="string"?{parentId:row.framework_version_id}:{})}/>;
    if(field==="methodology_version_ref")return <BusinessEntityLabel api={api} entity={definition.id==="requisitos"?"complianceMethodology":"controlsMethodology"} value={value}/>;
    if(field.endsWith("_id")||field.endsWith("_ref"))return "Procedencia registrada; detalle no disponible en tu alcance";
    return displayValue(value);
  };
  const actions = detail.error ? [] : availableWorkflowActions(definition, row).filter(allowAction);
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
  const workflowVocabulary=(action:WorkflowAction,field:string):FormVocabularyKey|undefined=> {
    const schemas:Record<string,string>={requisitos:"RequirementAssessmentSubmitRequest","evaluaciones-control":"ControlAssessmentSubmitRequest",pruebas:"AssuranceTestExecuteRequest",evidencias:action.suffix==="reject"?"EvidenceRejectRequest":"EvidenceApproveRequest",issues:"IssueTriageRequest",acciones:action.suffix==="complete"?"ActionCompleteRequest":"ActionVerifyRequest"};
    const key=`${schemas[definition.id]}.${field}`;return Object.hasOwn(FORM_VOCABULARIES,key)?key as FormVocabularyKey:undefined;
  };
  const actionForm=(action:WorkflowAction)=>formForPath(`${action.versionResource?"/evidence-versions":definition.path}/{id}:${action.suffix}`);
  const submit = async (action: WorkflowAction) => {
    if(busy)return;
    const published=actionForm(action);
    setFieldErrors({});
    if(!(action.fields?.length)&&confirming!==action.suffix){setConfirming(action.suffix);return;}
    const missing = (action.fields ?? []).find((field) => !action.optionalFields?.includes(field) && !form[field]);
    if (missing && !published) { setFeedback({ kind: "error", message: `${uiText.forms.requiredField} ${fieldLabel(missing)}` }); return; }
    if (definition.id === "retencion" && action.suffix === "update" && retentionMandatorySelection(form.is_mandatory) === undefined) {
      setFeedback({ kind: "error", message: "Selecciona Sí o No en Obligatoria." }); return;
    }
    const targetId = action.versionResource ? String(version?.evidence_version_id ?? "") : id;
    const targetPath = action.versionResource ? "/evidence-versions" : definition.path;
    let body: Row = { expected_version: Number(version?.row_version ?? row.row_version), ...Object.fromEntries((action.fields ?? []).filter((field) => form[field] !== undefined && form[field] !== "").map((field) => [field, form[field]])) };
    for (const field of ["coverage_percent", "design_effectiveness", "operating_effectiveness"]) if (body[field] !== undefined) body[field] = Number(body[field]);
    if (typeof body.samples === "string") {
      try { body.samples = normalizeSamplePeriods(JSON.parse(body.samples), timezone); }
      catch { setFeedback({ kind: "error", message: uiText.temporal.invalidInstant }); return; }
    }
    if (definition.id === "aplicabilidad-retencion") {
      for (const field of ["effective_from","effective_to"]) if (body[field]) {
        const utc=String(body[field]).endsWith("Z")?tenantInstantToUtc(String(body[field]),timezone):null;
        if (!utc) {setFeedback({kind:"error",message:`Revisa ${fieldLabel(field)} y selecciona una hora local válida y sin ambigüedad en la zona de la empresa.`});return;}
        body[field]=utc;
      }
      if (body.effective_from && body.effective_to && !isUtcEndAfterStart(String(body.effective_from),String(body.effective_to))) {setFeedback({kind:"error",message:"Vigente hasta debe ser posterior a Vigente desde."});return;}
    }
    if(published){
      if(definition.id==="retencion"){
        delete body.expected_version;
        if(action.suffix==="update"){
          body={...(row.policy_kind==="legal_hold"?{}:{retention_seconds:form.retention_seconds}),is_mandatory:form.is_mandatory==="true"};
          if(row.policy_kind!=="legal_hold"&&!form.retention_seconds){setFieldErrors({retention_seconds:"Indica la duración de retención."});return;}
        }
      }
      const normalized=normalizeForm(published.schema,body,timezone);body=normalized.body;
      const errors={...validateForm(published.schema,body),...normalized.errors};
      if(Object.keys(errors).length){setFieldErrors(errors);setFeedback({kind:"error",message:"Revisa los campos indicados antes de continuar."});return;}
    }
    const fingerprint=JSON.stringify([api.currentTenantId(),targetPath,targetId,action.suffix,row.row_version,body]);
    if(intent.current?.fingerprint!==fingerprint)intent.current={fingerprint,key:crypto.randomUUID()};
    setBusy(true);
    try {
      if (definition.id === "retencion" || definition.id === "aplicabilidad-retencion") {
        const payload = definition.id === "retencion" && action.suffix === "update"
          ? { ...(row.policy_kind === "legal_hold" ? {} : { retention_seconds: Number(form.retention_seconds) }), is_mandatory: form.is_mandatory === "true" }
          : Object.fromEntries(Object.entries(body).filter(([key]) => key !== "expected_version"));
        await api.request(`/api/v1${targetPath}/${targetId}:${action.suffix}`, { method: "POST", headers: { "Idempotency-Key": intent.current!.key, "If-Match": `"${Number(row.row_version)}"` }, body: JSON.stringify(payload) });
      } else await api.post(`/api/v1${targetPath}/${targetId}:${action.suffix}`, body,intent.current!.key);
      setFeedback({ kind: "success", message: uiText.forms.operationSuccess }); completed();
    } catch (error) {
      setFieldErrors(problemErrors(error));
      setFeedback({ kind: "error", message: formFailure(error) });
    } finally { setBusy(false);
    }
  };
  return <div className="drawer-backdrop" role="presentation" onMouseDown={()=>{if(!busy)close();}}><aside ref={dialogRef} className="drawer" role="dialog" aria-modal="true" aria-labelledby="detail-title" onMouseDown={(event) => event.stopPropagation()}>
    <header className="drawer-header"><div><p className="eyebrow">{uiText.forms.detailEyebrow}</p><h2 id="detail-title">{definition.id==="retencion"?retentionPolicyDisplayLabel(row):displayValue(row[definition.titleField] ?? definition.label)}</h2></div><button className="icon-button" onClick={close} disabled={busy} aria-label={uiText.forms.closeDetail}>×</button></header>
    <div className="drawer-body">{definition.id === "aplicabilidad-retencion" && row.lifecycle_state === "draft" && !row.source_evidence_version_id && <p className="form-guidance" role="status">La fuente inicial formal requiere revisión independiente y vinculación antes de publicar. La configuración ordinaria elegible puede continuar sin esa acreditación; la autoría y los controles operacionales se conservan.</p>}<p className="form-guidance">{vocabularyProvenance.length?"Procedencia del vocabulario contractual registrada":"Procedencia del vocabulario contractual no registrada"}</p>{detail.loading ? <LoadingState/> : <>{definition.id === "controles" ? <ControlDetailContent api={api} row={row}/> : <><StatusBadge value={state}/><dl>{Object.entries(row).filter(([, value]) => !Array.isArray(value) && typeof value !== "object").map(([key, value]) => <React.Fragment key={key}><dt>{fieldLabel(key)}</dt><dd>{historicalReference(key,value)}</dd></React.Fragment>)}</dl></>}{detail.error && <p className="inline-feedback error" role="alert">{detail.error}</p>}{typeof version?.file_object_id === "string" && <button className="button secondary" onClick={() => void download()}>{uiText.forms.downloadFile}</button>}{actions.map((action) => <section className="workflow-action" key={action.suffix}><h3>{actionForm(action)?.title??action.label}</h3><BusinessFields schema={actionForm(action)?.schema??"RetentionPolicyTransitionRequest"} fields={(action.fields??[]).filter(field=>!(definition.id==="retencion"&&row.policy_kind==="legal_hold"&&field==="retention_seconds"))} values={{...form,policy_kind:row.policy_kind}} errors={fieldErrors} render={(field) => definition.id === "aplicabilidad-retencion" && ["effective_from","effective_to"].includes(field) ? <TenantLocalDateTimeField key={field} label={fieldLabel(field)} required={!action.optionalFields?.includes(field)} value={form[field]??""} onChange={value=>setForm(current=>({...current,[field]:value}))}/> : definition.id === "retencion" && field === "is_mandatory" ? <RetentionMandatoryField key={field} value={form[field] ?? ""} onChange={value => setForm(current => ({ ...current, [field]: value }))}/> : field === "source_evidence_version_id" && action.suffix === "bind-initial-source" ? <label key={field}><span>Fuente inicial aprobada</span><select aria-label="Fuente inicial aprobada" value={form[field]??""} onChange={event=>setForm(current=>({...current,[field]:event.target.value}))}><option value="">Selecciona la fuente aprobada</option>{(Array.isArray(row.initial_source_candidates)?row.initial_source_candidates as Row[]:[]).map(source=><option key={String(source.evidence_version_id)} value={String(source.evidence_version_id)}>{String(source.evidence_code)} · v{String(source.version_number)}</option>)}</select>{(!Array.isArray(row.initial_source_candidates)||row.initial_source_candidates.length===0)&&<span className="form-guidance">No hay fuente vigente aprobada por una persona distinta de su autor.</span>}</label> : field === "samples" ? <StructuredCollectionEditor key={field} api={api} errors={fieldErrors} kind="samples" value={form[field]??""} onChange={value=>setForm(current=>({...current,[field]:value}))}/> : field === "evidence_version_id" ? <ApprovedEvidenceReferenceField key={field} api={api} {...(definition.id==="solicitudes-evidencia"?{requestId:id}:{})} value={form[field]??""} onChange={value=>setForm(current=>({...current,[field]:value}))}/> : field === "business_owner_subject_id" ? <SubjectSelect key={field} api={api} value={form[field]??""} onChange={value=>setForm(current=>({...current,[field]:value}))}/> : workflowVocabulary(action,field) ? <ContractVocabularySelect key={field} schemaField={workflowVocabulary(action,field)!} label={fieldLabel(field)} value={form[field]??""} onChange={value=>setForm(current=>({...current,[field]:value}))}/> : <BusinessScalarField schema={actionForm(action)?.schema??"RetentionPolicyTransitionRequest"} field={field} value={form[field]??""} onChange={value=>setForm(current=>({...current,[field]:value}))}/>} />{confirming===action.suffix&&<p className="form-guidance" role="status">{actionForm(action)?.title??action.label}: confirma la operación sobre {displayValue(row[definition.titleField]??definition.label)} · {displayValue(state)}. {actionForm(action)?.resultState&&<>Estado resultante: {displayValue(actionForm(action)!.resultState)}. </>}Se aplican los permisos y la separación de funciones.</p>}<button className="button primary" disabled={busy||detail.loading} onClick={() => void submit(action)}>{busy?"Procesando…":confirming===action.suffix?`Confirmar ${action.label.toLowerCase()}`:action.label}</button></section>)}{actions.length === 0 && <p className="read-only-note">{uiText.forms.noActions}</p>}<FormErrorSummary errors={fieldErrors}/>{feedback?.kind==="error"&&<button className="button secondary" disabled={busy} onClick={()=>{setRefresh(value=>value+1);setConfirming(undefined);}}>Actualizar detalle y revisar</button>}{feedback && <p className={`inline-feedback ${feedback.kind}`}  role={feedback.kind === "error" ? "alert" : "status"}>{feedback.message}</p>}</>}</div>
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
  let offset = 0;
  const ring = distribution.map(item => {
    const start = offset; offset += item.percentage;
    const color = ({success:'var(--success)',warning:'var(--warning)',danger:'var(--danger)',info:'var(--info)',neutral:'var(--muted)'} as Record<string,string>)[item.tone] ?? 'var(--muted)';
    return `${color} ${start}% ${offset}%`;
  }).join(', ');
  return <ResponsiveChartFrame label={`${uiText.dashboard.distributionAria}: ${total} ${uiText.common.visibleCount}`}>
    <p className="dataset-label">{uiText.common.visibleDataset} · {total}</p>
    <div className="distribution-layout"><div className="distribution-ring" style={{background:`conic-gradient(${ring})`}} aria-hidden="true"><div><strong>{total}</strong><span>Registros visibles</span></div></div>
    <div className="distribution-legend">{distribution.map((item) => <div key={item.value} title={`${item.label}: ${item.count} ${uiText.dashboard.distributionTooltip}`}><span><i className={`legend-marker ${item.tone}`} aria-hidden="true"/>{item.label}</span><strong>{item.count}<small>{Math.round(item.percentage)}%</small></strong></div>)}</div>
    </div>
  </ResponsiveChartFrame>;
}

function EntityDistribution({ label, rows, field = "lifecycle_state" }: { label: string; rows: Row[]; field?: string }) {
  const distribution = distributionFromRows(rows, field);
  if (distribution.length === 0) return null;
  return <section className="entity-distribution"><div className="entity-distribution-heading"><strong>{label}</strong><span>{rows.length}</span></div>{distribution.map((item) => <div className="compact-bar" key={item.value} title={`${item.label}: ${item.count} ${uiText.dashboard.distributionTooltip}`}><span><i className={`legend-marker ${item.tone}`} aria-hidden="true"/>{item.label}</span><b>{item.count}</b><div><i className={item.tone} style={{ width: `${item.percentage}%` }}/></div></div>)}</section>;
}

function Dashboard({ api, authorization }: { api: ApiClient; authorization: CurrentPrincipalAuthorization | null }) {
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
    <MatrixWorkspace api={api} authorization={authorization} mini/>
    <section className="operational-grid">
      <DataCard title={uiText.dashboard.controlsDistribution} subtitle={uiText.dashboard.controlsDistributionDetail} className="compact-visual" action={<button className="link-button" onClick={() => navigate("controles")}>{uiText.dashboard.seeControls} →</button>}>{controlAssessments!.length === 0 ? <StatePanel kind="insufficient-data" detail={uiText.dashboard.noControlAssessments}/> : <ResponsiveChartFrame label={uiText.dashboard.controlsDistribution}><p className="dataset-label">{uiText.common.visibleDataset} · {controlAssessments!.length}</p><EntityDistribution label={uiText.dashboard.controlAssessmentItems} rows={controlAssessments!}/></ResponsiveChartFrame>}</DataCard>
      <DataCard title={uiText.dashboard.remediationDistribution} subtitle={uiText.dashboard.remediationDistributionDetail} className="compact-visual" action={<button className="link-button" onClick={() => navigate("acciones")}>{uiText.dashboard.seeActions} →</button>}>{issues!.length + actions!.length === 0 ? <StatePanel kind="insufficient-data" detail={uiText.dashboard.noRemediation}/> : <ResponsiveChartFrame label={uiText.dashboard.remediationDistribution}><p className="dataset-label">{uiText.common.visibleDataset} · {issues!.length + actions!.length}</p><div className="entity-pair"><EntityDistribution label={uiText.dashboard.issueItems} rows={issues!}/><EntityDistribution label={uiText.dashboard.actionItems} rows={actions!}/></div></ResponsiveChartFrame>}</DataCard>
      <DataCard title={uiText.dashboard.evidenceDistribution} subtitle={uiText.dashboard.evidenceDistributionDetail} className="compact-visual" action={<button className="link-button" onClick={() => navigate("evidencias")}>{uiText.dashboard.seeEvidence} →</button>}>{evidenceRequests!.length + evidence!.length === 0 ? <StatePanel kind="insufficient-data" detail={uiText.dashboard.noEvidence}/> : <ResponsiveChartFrame label={uiText.dashboard.evidenceDistribution}><p className="dataset-label">{uiText.common.visibleDataset} · {evidenceRequests!.length + evidence!.length}</p><div className="entity-pair"><EntityDistribution label={uiText.dashboard.evidenceRequestItems} rows={evidenceRequests!}/><EntityDistribution label={uiText.dashboard.evidenceItems} rows={evidence!}/></div></ResponsiveChartFrame>}</DataCard>
    </section>
  </>;
}

function Sidebar({ active, open, close, platformAdmin, tenantAdmin, hasTenant, managedIdentity, normsAvailable, libraryPlatform }: { active: string; open: boolean; close(): void; platformAdmin: boolean; tenantAdmin: boolean; hasTenant: boolean; managedIdentity: boolean; normsAvailable: boolean; libraryPlatform:boolean }) {
  return <aside className={`sidebar ${open ? "open" : ""}`}><div className="brand"><BrandLogo/><span>GRC</span></div><nav aria-label={uiText.navigation.mainAria}>
    {hasTenant && nav.filter(([id]) => id !== "normas" || normsAvailable).map(([id, label, icon]) => <button key={id} className={active === id ? "active" : ""} onClick={() => { navigate(id); close(); }}><Icon name={icon}/><span>{label}</span></button>)}
    {libraryPlatform && <button className={active === "biblioteca-plataforma" ? "active" : ""} onClick={()=>{navigate("biblioteca-plataforma");close();}}><Icon name="list"/><span>Biblioteca de plataforma</span></button>}
    {(platformAdmin || tenantAdmin || managedIdentity) && <p className="sidebar-section-label">{uiText.navigation.settings}</p>}
    {(platformAdmin || tenantAdmin) && <><button className={active === settingsRoutes.companies ? "active" : ""} onClick={() => { navigate(settingsRoutes.companies); close(); }}><Icon name="building"/><span>{uiText.navigation.companies}</span></button><button className={active === settingsRoutes.users ? "active" : ""} onClick={() => { navigate(settingsRoutes.users); close(); }}><Icon name="users"/><span>{uiText.navigation.users}</span></button></>}
    {managedIdentity && <button className={active === settingsRoutes.managedIdentities ? "active" : ""} onClick={() => { navigate(settingsRoutes.managedIdentities); close(); }}><Icon name="shield"/><span>Identidades gestionadas</span></button>}
  </nav><div className="sidebar-footer"><strong>{brandNames.product}</strong><span>{uiText.shell.productContext}</span></div></aside>;
}

const workspaceGroups: Readonly<Record<string, readonly string[]>> = {
  cumplimiento: ["cumplimiento", "soa"], requisitos: ["requisitos"], controles: ["controles", "evaluaciones-control", "pruebas"],
  evidencias: ["solicitudes-evidencia", "evidencias", "retencion", "aplicabilidad-retencion"], acciones: ["issues", "acciones"]
};

function NormativeContent({ api, frameworkId, kind, title, knowledgeAllowed=false }: { api: ApiClient; frameworkId: string; kind: "normative-units" | "requirements"; title: string; knowledgeAllowed?:boolean }) {
  const [state, setState] = useState<"loading" | "ready" | "denied" | "error">("loading");
  const [items, setItems] = useState<Row[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [search,setSearch]=useState(''),[parent,setParent]=useState('');
  const [draftSearch,setDraftSearch]=useState('');
  const [expanded,setExpanded]=useState<string[]>([]);
  const path = `/api/v1/framework-versions/${encodeURIComponent(frameworkId)}/${kind}`;
  const context=JSON.stringify([search,parent]);
  const load = async (next?: string, signal?: AbortSignal) => {
    const query = new URLSearchParams({ "page[size]": "100" });
    if (next) query.set("page[cursor]", next);
    if(search)query.set("filter[query]",search);
    if(parent)query.set(kind==="normative-units"?"filter[parent_normative_unit_id]":"filter[normative_unit_id]",parent);
    const page = await api.request<Page>(`${path}?${query}`, signal ? { signal } : {});
    setItems((current) => next ? [...current, ...page.items] : page.items);
    setCursor(page.page.next_cursor);
    setState("ready");
  };
  useEffect(() => {
    const controller = new AbortController();
    setState("loading"); setItems([]); setCursor(null);
    void load(undefined, controller.signal).catch((error: unknown) => {
      if (!controller.signal.aborted) setState(error instanceof ApiProblem && [401, 403].includes(error.status) ? "denied" : "error");
    });
    return () => controller.abort();
  }, [api, path, context]);
  return <DataCard title={title} className="admin-section">
    <form className="admin-form" onSubmit={e=>{e.preventDefault();setSearch(draftSearch.trim());setParent('');}}><label>Buscar en {title.toLowerCase()}<input type="search" minLength={2} maxLength={160} value={draftSearch} onChange={e=>setDraftSearch(e.target.value)}/></label><button className="button secondary">Buscar</button></form>
    {parent&&<button className="link-button" onClick={()=>setParent('')}>Volver a la estructura completa</button>}
    {state === "loading" ? <LoadingState/> : state === "denied" ? <StatePanel kind="permission-denied"/> :
      state === "error" ? <StatePanel kind="error" detail={`No fue posible consultar ${title.toLowerCase()}.`} retry={() => { setState("loading"); void load().catch(() => setState("error")); }}/> :
      items.length === 0 ? <StatePanel kind="empty" detail="No hay contenido normativo publicado y habilitado para esta versión. Comprueba la publicación y contratación del marco."/> :
      <><div className="table-scroll"><table><thead><tr><th>Código</th><th>Contenido</th><th><span className="sr-only">Detalle</span></th></tr></thead><tbody>{items.map((item) => {
        const id = String(item[kind === "requirements" ? "requirement_id" : "normative_unit_id"]);
        const code = String(item[kind === "requirements" ? "requirement_code" : "unit_code"] ?? "");
        const name = String(item[kind === "requirements" ? "editorial_summary" : "title"] ?? "");
        return <tr key={id}><td>{code}</td><td>{name}</td><td><details onToggle={event=>{const open=event.currentTarget.open;setExpanded(current=>open?[...new Set([...current,id])]:current.filter(key=>key!==id));}}><summary>Ver detalle</summary><dl>{Object.entries(item).filter(([field, value]) => value != null && !field.endsWith("_id") && !["unit_code", "requirement_code", "title", "editorial_summary"].includes(field)).map(([field, value]) => <React.Fragment key={field}><dt>{fieldLabel(field)}</dt><dd>{displayValue(value)}</dd></React.Fragment>)}</dl>{knowledgeAllowed&&expanded.includes(id)&&<TargetKnowledgePanel key={id} api={api} target={{[kind==='requirements'?'requirement_id':'normative_unit_id']:id}}/>}</details>{kind==='normative-units'&&<button className="link-button" onClick={()=>{setParent(id);setSearch('');setDraftSearch('');}}>Ver unidades hijas de {code}</button>}</td></tr>;
      })}</tbody></table></div>{cursor && <button className="button secondary" disabled={busy} onClick={() => { setBusy(true); void load(cursor).catch(() => setState("error")).finally(() => setBusy(false)); }}>{busy ? uiText.actions.loadingMore : uiText.actions.loadMore}</button>}</>}
  </DataCard>;
}

function NormsWorkspace({ api, authorization }: { api: ApiClient; authorization: CurrentPrincipalAuthorization|null }) {
  const [frameworkId, setFrameworkId] = useState("");
  const permitted=(permission:string)=>tenantPresentationPermission(authorization,api.currentTenantId()??undefined,permission);
  const tabs=[['estructura','Fuentes y ediciones',permitted('compliance.framework.read')],['mis-marcos','Mis marcos',permitted('platform.subscription_regulatory_pack.read')],['accesos-qa','Accesos QA',permitted('platform.regulatory_pack_validation_access.read')],['contenido','Contenido editorial y contexto',permitted('knowledge.knowledge_item.read')||permitted('knowledge.knowledge_source.read')],['ajustes','Personalización y aprobación',permitted('configuration.configuration_override.read')||permitted('configuration.configuration_override.create')],['matrices','Matrices y homologación',permitted('reporting.matrix.read')]].filter(([, ,allowed])=>allowed);
  const [requestedTab,setTab]=useState(()=>new URLSearchParams(window.location.search).get('tab')??'estructura');
  const tab=tabs.some(([id])=>id===requestedTab)?requestedTab:tabs[0]?.[0];
  return <><PageHeader title="Biblioteca Normativa"/><nav className="module-tabs" aria-label="Biblioteca Normativa">{tabs.map(([id,label])=><button key={String(id)} className={tab===id?'active':''} onClick={()=>setTab(String(id))}>{String(label)}</button>)}</nav>{tab==='mis-marcos'?<ContractedPacks api={api} platform={false}/>:tab==='accesos-qa'?<ValidationPacks api={api} platform={false}/>:tab==='contenido'?<KnowledgeWorkspace key={JSON.stringify(authorization)} api={api} authorization={authorization}/>:tab==='ajustes'?<ControlAdjustments api={api} authorization={authorization}/>:tab==='matrices'?<MatrixWorkspace api={api} authorization={authorization}/>:<NormativeStructure api={api} frameworkId={frameworkId} setFrameworkId={setFrameworkId} authorization={authorization}/>}</>;
}
function NormativeStructure({api,frameworkId,setFrameworkId,authorization}:{api:ApiClient;frameworkId:string;setFrameworkId(id:string):void;authorization:CurrentPrincipalAuthorization|null}) {
  return <><DataCard title="Marcos normativos habilitados" className="admin-section">
    <BusinessReferenceSelect api={api} label="Norma o marco publicado" context={{ kind: "framework", purpose: "select" }} value={frameworkId} onChange={setFrameworkId}/>
    <p className="form-guidance">Se muestran únicamente versiones publicadas y disponibles para la empresa seleccionada.</p>
  </DataCard>{frameworkId ? <><NormativeContent key={`${frameworkId}:units`} api={api} frameworkId={frameworkId} kind="normative-units" title="Unidades normativas" knowledgeAllowed={tenantPresentationPermission(authorization,api.currentTenantId()??undefined,"knowledge.knowledge_item.read")}/><NormativeContent key={`${frameworkId}:requirements`} api={api} frameworkId={frameworkId} kind="requirements" title="Requisitos de la norma" knowledgeAllowed={tenantPresentationPermission(authorization,api.currentTenantId()??undefined,"knowledge.knowledge_item.read")}/></> : null}</>;
}

function ModuleWorkspace({ api, active, authorization, tenantId }: {
  api: ApiClient; active: string; authorization: CurrentPrincipalAuthorization | null; tenantId: string;
}) {
  const mayReadRetention = tenantPresentationPermission(authorization, tenantId, "privacy.retention_policy.read");
  const choices = (workspaceGroups[active] ?? [active])
    .map((id) => modules.find((module) => module.id === id))
    .filter((definition): definition is ModuleDefinition => Boolean(definition))
    .filter((definition) => !["retencion", "aplicabilidad-retencion"].includes(definition.id) || mayReadRetention);
  const requestedTabId = choices.find((choice) => choice.id === new URLSearchParams(window.location.search).get("tab"))?.id ?? choices[0]?.id ?? "";
  const [selectedId, setSelectedId] = useState(requestedTabId);
  useEffect(() => setSelectedId(requestedTabId), [active, requestedTabId]);
  const selected = choices.find((choice) => choice.id === selectedId) ?? choices[0];
  if (!selected) return <ErrorState unauthorized retry={() => undefined}/>;
  const retention = ["retencion", "aplicabilidad-retencion"].includes(selected.id);
  const mayCreateEvidence = tenantPresentationPermission(authorization,tenantId,"evidence.evidence.create");
  return <><div className="module-tabs" role="tablist" aria-label={uiText.navigation.submodulesAria}>{choices.map((choice) => <button role="tab" aria-selected={selected.id === choice.id} className={selected.id === choice.id ? "active" : ""} key={choice.id} onClick={() => setSelectedId(choice.id)}>{choice.label}</button>)}</div>{selected.id==="evidencias"&&!mayCreateEvidence&&<p className="form-guidance" role="status">La creación de evidencias requiere el permiso del rol Responsable de evidencias (EVIDENCE_OWNER) en esta empresa. Tu acceso actual permite consultar los registros autorizados.</p>}<ModuleTable api={api} definition={selected} allowKnowledgeContext={tenantPresentationPermission(authorization,tenantId,"knowledge.knowledge_item.read")}
    allowCreate={(()=>{const form=formForPath(createContracts[selected.id]?.path??"");return form?tenantPresentationPermission(authorization,tenantId,form.permission):selected.id==="evidencias"?mayCreateEvidence:!retention||tenantPresentationPermission(authorization,tenantId,"privacy.retention_policy.create");})()}
    allowAction={(action)=>{const form=formForPath(`${action.versionResource?"/evidence-versions":selected.path}/{id}:${action.suffix}`);const permission=form?.permission??(retention?retentionActionPermission(action.suffix):null);return !!permission&&tenantPresentationPermission(authorization,tenantId,permission);}}/></>;
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

function adminDate(value: unknown): React.ReactNode {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) return uiText.common.noData;
  return <TenantInstantPreview value={value}/>;
}

function readableRole(code: unknown, name?: unknown): string {
  const localized = roleLabel(typeof code === "string" ? code : undefined);
  return localized === "Rol personalizado" && typeof name === "string" && name.trim() ? name : localized;
}

function ContractedPacks({ api, subscriptionId, platform, canActivate = false, canRevoke = false }: { api: ApiClient; subscriptionId?: string; platform: boolean; canActivate?: boolean; canRevoke?: boolean }) {
  const [items, setItems] = useState<Row[]>([]);
  const [page, setPage] = useState<PageMeta>({ has_more: false, next_cursor: null });
  const [versions, setVersions] = useState<Row[]>([]);
  const [catalogState, setCatalogState] = useState<"loading" | "ready" | "denied" | "error">("loading");
  const [versionId, setVersionId] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [feedback, setFeedback] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const activationLock = useRef(false);
  const activationIntent = useRef<{ fingerprint: string; key: string } | undefined>(undefined);
  const [nonce, setNonce] = useState(0);
  const path = platform && subscriptionId ? `/api/v1/subscriptions/${encodeURIComponent(subscriptionId)}/regulatory-packs`
    : "/api/v1/subscriptions/current/regulatory-packs";
  useEffect(() => {
    if (platform && !subscriptionId) return;
    const controller = new AbortController();
    void (platform ? api.platformGet<Page>(path, { signal: controller.signal }) : api.request<Page>(path, { signal: controller.signal }))
      .then((result) => { setItems(result.items); setPage(result.page); }).catch(() => { if (!controller.signal.aborted) setFeedback("No fue posible cargar los marcos contratados."); });
    if (platform && canActivate) void api.platformGet<Page>("/api/v1/platform/regulatory-pack-versions", { signal: controller.signal })
      .then((page) => { setVersions(page.items); setCatalogState("ready"); }).catch((error: unknown) => { if (!controller.signal.aborted) setCatalogState(error instanceof ApiProblem && [401, 403].includes(error.status) ? "denied" : "error"); });
    return () => controller.abort();
  }, [api, path, platform, subscriptionId, canActivate, nonce]);
  const activate = async () => {
    if (activationLock.current || !confirming) return;
    if (!versionId || !effectiveFrom || !subscriptionId) { setFeedback("Selecciona una versión y fecha de inicio."); return; }
    const instant = explicitUtcInstant(effectiveFrom);
    if (!instant) { setFeedback(uiText.temporal.invalidInstant); return; }
    const fingerprint = JSON.stringify([subscriptionId, versionId, instant]);
    if (activationIntent.current?.fingerprint !== fingerprint) activationIntent.current = { fingerprint, key: crypto.randomUUID() };
    activationLock.current = true; setBusy(true); setFeedback("");
    try {
      const response = await api.platformPost<{ operation_id: string; status: string; result: Row }>(path,
        { regulatory_pack_version_id: versionId, effective_from: instant }, activationIntent.current.key);
      if (response.operation_id !== "subscriptionRegulatoryPackActivate" || response.status !== "completed"
        || response.result?.subscription_id !== subscriptionId || response.result.regulatory_pack_version_id !== versionId
        || typeof response.result.subscription_regulatory_pack_id !== "string") throw new Error("INVALID_PACK_ACTIVATION_RESPONSE");
      setFeedback("Marco contratado y auditado."); setConfirming(false); setVersionId(""); setEffectiveFrom("");
      activationIntent.current = undefined; setNonce((value) => value + 1);
    } catch (error) {
      const status = error instanceof ApiProblem ? error.status : 0;
      setFeedback(status === 403 ? "No tienes autorización para contratar este marco." : status === 404 ? "La suscripción o versión del marco ya no está disponible. Actualiza el catálogo." : status === 409 ? "El marco ya está contratado o la vigencia entra en conflicto. Consulta los marcos contratados." : status === 422 ? "La versión no cumple las condiciones de contratación de la suscripción." : "No fue posible confirmar la contratación. Puedes reintentar la misma solicitud sin duplicarla.");
    } finally { activationLock.current = false; setBusy(false); }
  };
  const selectedVersion = versions.find(version => version.regulatory_pack_version_id === versionId);
  const alreadyContracted = items.some(item => item.regulatory_pack_version_id === versionId && item.lifecycle_state === "active" && ["effective", "future"].includes(String(item.effective_state)));
  const changeIntent = () => { setConfirming(false); setFeedback(""); activationIntent.current = undefined; };
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
  return <DataCard title="Marcos contratados" className="admin-section contracted-packs">
    {feedback && <p className="inline-feedback" role="status">{feedback}</p>}
    {items.length === 0 ? <p>Sin marcos contratados.</p> : <div className="table-scroll"><table><thead><tr><th>Pack</th><th>Edición</th><th>Versión</th><th>Licencia</th><th>Contrato</th><th>Vigencia</th><th>Desde</th><th>Hasta</th>{platform && <th>Acción</th>}</tr></thead><tbody>{items.map((item) => <tr key={String(item.subscription_regulatory_pack_id)}><td><strong>{String(item.name)}</strong><small className="admin-secondary">{String(item.pack_code)}</small></td><td>{String(item.edition)}</td><td>{displayValue(item.version_number)}</td><td>{displayValue(item.license_classification)}</td><td><StatusBadge value={item.lifecycle_state}/></td><td><StatusBadge value={item.effective_state}/></td><td>{adminDate(item.effective_from)}</td><td>{item.effective_to ? adminDate(item.effective_to) : "—"}</td>{platform && <td>{canRevoke && item.effective_state === "effective" && <button className="link-button" onClick={() => void revoke(item)}>Revocar</button>}</td>}</tr>)}</tbody></table></div>}
    {page.has_more && <button className="button secondary" onClick={() => void loadMore()}>{uiText.actions.loadMore}</button>}
    {platform && subscriptionId && canActivate && <section aria-labelledby="pack-catalog-title">
      <h3 id="pack-catalog-title">Catálogo de marcos</h3><ContractingDocuments/>
      {catalogState === "loading" ? <LoadingState/> : catalogState === "denied" ? <StatePanel kind="permission-denied" detail="No tienes acceso al catálogo de marcos publicables."/> : catalogState === "error" ? <StatePanel kind="error" detail="No fue posible consultar los marcos publicables." retry={() => setNonce(value => value + 1)}/> : versions.length === 0 ? <StatePanel kind="empty" detail="Aún no hay versiones disponibles para contratar. Operaciones podrá activar cada marco cuando finalice su publicación."/> : <form className="admin-form" onSubmit={event => {
        event.preventDefault();
        if (busy || alreadyContracted) return;
        if (!explicitUtcInstant(effectiveFrom)) { setFeedback(uiText.temporal.invalidInstant); return; }
        setConfirming(true); setFeedback("");
      }}>
        <label><span>Versión del marco</span><select required disabled={busy} value={versionId} onChange={event => { setVersionId(event.target.value); changeIntent(); }}><option value="">Selecciona una versión publicada</option>{versions.map(version => <option key={String(version.regulatory_pack_version_id)} value={String(version.regulatory_pack_version_id)}>{String(version.name)} · {String(version.edition)} · v{displayValue(version.version_number)}</option>)}</select></label>
        {selectedVersion && <section aria-label="Detalle del marco">
          <h4>{String(selectedVersion.name)}</h4>
          <dl><dt>Edición</dt><dd>{String(selectedVersion.edition)}</dd><dt>Versión</dt><dd>{displayValue(selectedVersion.version_number)}</dd><dt>Licencia</dt><dd>{displayValue(selectedVersion.license_classification)}</dd><dt>Vigencia de la versión desde</dt><dd>{selectedVersion.effective_from ? adminDate(selectedVersion.effective_from) : "Sin límite de inicio"}</dd><dt>Vigencia de la versión hasta</dt><dd>{selectedVersion.effective_to ? adminDate(selectedVersion.effective_to) : "Sin fecha de término"}</dd></dl>
          <p>La contratación activa esta edición y versión en la suscripción vigente de la empresa seleccionada, bajo sus condiciones contractuales.</p>
          {alreadyContracted && <p role="status">Esta versión ya está contratada para esta suscripción.</p>}
        </section>}
        <label><span>Vigente desde</span><input required disabled={busy} type="text" placeholder="AAAA-MM-DDTHH:mm:ssZ" value={effectiveFrom} onChange={event => { setEffectiveFrom(event.target.value); changeIntent(); }}/></label>
        {confirming ? <section aria-label="Confirmación de contratación">
          <p>Confirma la contratación de {String(selectedVersion?.name)} · {String(selectedVersion?.edition)} · v{displayValue(selectedVersion?.version_number)} desde {adminDate(explicitUtcInstant(effectiveFrom))}.</p>
          <button className="button primary" type="button" disabled={busy || alreadyContracted} onClick={() => void activate()}>{busy ? "Contratando…" : "Confirmar contratación"}</button>
          <button className="button secondary" type="button" disabled={busy} onClick={() => setConfirming(false)}>Volver al detalle</button>
        </section> : <button className="button primary" type="submit" disabled={busy || !versionId || !effectiveFrom || alreadyContracted}>Contratar marco</button>}
      </form>}
    </section>}
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
  return explicitUtcInstant(value);
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
      <label><span>{uiText.validation.requestedFrom}</span><input type="text" placeholder="AAAA-MM-DDTHH:mm:ssZ" required value={accessFrom}
        onChange={(event) => setAccessFrom(event.target.value)}/></label>
      <label><span>{uiText.validation.requestedTo}</span><input type="text" placeholder="AAAA-MM-DDTHH:mm:ssZ" value={accessTo}
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

function TenantCompany({ api, context, authorization }: {
  api: ApiClient; context: TenantContext; authorization: CurrentPrincipalAuthorization | null;
}) {
  const mayReadRetention = tenantPresentationPermission(authorization, context.tenant_id, "privacy.retention_policy.read");
  const mayCreateRetention = tenantPresentationPermission(authorization, context.tenant_id, "privacy.retention_policy.create");
  const allowRetentionAction = (action: WorkflowAction) => {
    const permission = retentionActionPermission(action.suffix);
    return !!permission && tenantPresentationPermission(authorization, context.tenant_id, permission);
  };
  return <>
    <PageHeader title={uiText.navigation.companies}/>
    <DataCard title={context.tenant_display_name}>
      <ContractedPacks api={api} platform={false}/><ValidationPacks api={api} platform={false}/><SubjectsAdmin api={api}/>
    </DataCard>
    <section aria-label="Retención documental de la empresa">
      <p className="form-guidance">La empresa configura la retención operativa. Las obligaciones jurídicas o contractuales requieren su fundamento y revisión correspondientes.</p>
      {mayReadRetention ? <>
        <ModuleTable api={api} definition={modules.find((item) => item.id === "retencion")!}
          allowCreate={mayCreateRetention} allowAction={allowRetentionAction}/>
        <ModuleTable api={api} definition={modules.find((item) => item.id === "aplicabilidad-retencion")!}
          allowCreate={mayCreateRetention} allowAction={allowRetentionAction}/>
      </> : <StatePanel kind="permission-denied"/>}
    </section>
  </>;
}

type PublishedPlanVersion = { plan_version_id: string; plan_code: string; plan_name: string; version_number: number; display_name: string };

function PlanAssignment({ api, tenantId, subscriptionId, authorizeFresh, created }: { api: ApiClient; tenantId: string; subscriptionId?: string; authorizeFresh(code: string): Promise<boolean>; created(): void }) {
  const [catalog, setCatalog] = useState<PublishedPlanVersion[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "denied" | "error">("loading");
  const [planVersionId, setPlanVersionId] = useState("");
  const [subscriptionCode, setSubscriptionCode] = useState("");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<Row>();
  const etag = useRef<string | undefined>(undefined);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const key = useRef(crypto.randomUUID());
  const sending = useRef(false);
  const mounted = useRef(true);
  const changePlan = Boolean(subscriptionId);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const load = async (next?: string, signal?: AbortSignal) => {
    const query = new URLSearchParams({ "page[size]": "100" });
    if (next) query.set("page[cursor]", next);
    const result = await api.platformGet<{ items: PublishedPlanVersion[]; page: PageMeta }>(`/api/v1/platform/plan-versions?${query}`, signal ? { signal } : {});
    if (signal?.aborted || !mounted.current) return;
    if (subscriptionId && !next) {
      const detail = await api.platformRepresentation<Row>(`/api/v1/platform/subscriptions/${encodeURIComponent(subscriptionId)}`, signal ? { signal, cache: "no-store" } : { cache: "no-store" });
      if (signal?.aborted || !mounted.current) return;
      const freshEtag = detail.headers.get("etag");
      if (detail.body.tenant_id !== tenantId || detail.body.subscription_id !== subscriptionId || !freshEtag || !/^"[1-9][0-9]*"$/.test(freshEtag)) throw new Error("INVALID_SUBSCRIPTION_DETAIL");
      etag.current = freshEtag; setCurrentPlan(detail.body);
    }
    setCatalog((current) => next ? [...current, ...result.items] : result.items);
    setCursor(result.page.next_cursor);
    setState("ready");
  };
  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    void load(undefined, controller.signal).catch((error: unknown) => {
      if (!controller.signal.aborted) setState(error instanceof ApiProblem && [401, 403].includes(error.status) ? "denied" : "error");
    });
    return () => controller.abort();
  }, [api, tenantId, subscriptionId]);
  const submit = async () => {
    if (sending.current || !planVersionId || !subscriptionCode.trim() || (changePlan && (!reason.trim() || !confirmed || !etag.current))) return;
    sending.current = true;
    setBusy(true); setFeedback("");
    try {
      if (!await authorizeFresh(changePlan ? "platform.subscription.update" : "platform.subscription.create")) { if (mounted.current) setFeedback("Tu sesión no tiene permiso vigente para operar planes."); return; }
      if (!mounted.current) return;
      if (subscriptionId) {
        const result = await api.platformPost<{ operation_id: string; status: string; result: { current_subscription: Row } }>(`/api/v1/platform/subscriptions/${encodeURIComponent(subscriptionId)}:change-plan`, {
          plan_version_id: planVersionId, subscription_code: subscriptionCode.trim(), reason: reason.trim()
        }, key.current, etag.current);
        if (result.operation_id !== "subscriptionChangePlan" || result.status !== "completed" || result.result.current_subscription.tenant_id !== tenantId || result.result.current_subscription.plan_version_id !== planVersionId) throw new Error("INVALID_CHANGE_PLAN_RESPONSE");
      } else {
        await api.platformPost("/api/v1/platform/subscriptions", {
          tenant_id: tenantId, plan_version_id: planVersionId, subscription_code: subscriptionCode.trim()
        }, key.current);
      }
      if (!mounted.current) return;
      key.current = crypto.randomUUID();
      created();
    } catch (error) {
      if (!mounted.current) return;
      const status = error instanceof ApiProblem ? error.status : 0;
      if (changePlan && error instanceof ApiProblem) {
        setFeedback(`${error.problem.message} (${error.problem.code})`);
        if (error.problem.code === "TCDX.CONFLICT.CONCURRENCY") {
          key.current = crypto.randomUUID(); setConfirmed(false);
          await load().catch(() => { if (mounted.current) setState("error"); });
        }
        if (status === 409 && error.problem.code !== "TCDX.CONFLICT.IDEMPOTENCY") created();
        return;
      }
      setFeedback(({ 400: "Revisa el código y la versión de plan seleccionada.", 401: "La sesión expiró; vuelve a iniciar sesión.",
        403: "No tienes autorización para asignar planes.", 404: "La empresa o versión de plan ya no está disponible.",
        409: uiText.administration.subscriptionConflict, 422: "La versión del plan ya no está publicada." } as Record<number, string>)[status]
        ?? "No se pudo confirmar la suscripción. Reintenta sin cambiar la selección para conservar la misma solicitud.");
      if (status === 409) created();
    } finally { sending.current = false; if (mounted.current) setBusy(false); }
  };
  const resetIntent = () => { key.current = crypto.randomUUID(); setConfirmed(false); };
  return <DataCard title={changePlan ? "Cambiar plan" : "Asignar plan"} className="admin-section">
    {currentPlan && <p>Plan actual: {String(currentPlan.plan_name)} · v{String(currentPlan.plan_version_number)}</p>}
    {state === "loading" ? <LoadingState/> : state === "denied" ? <StatePanel kind="permission-denied" detail="No tienes acceso al catálogo de planes publicados."/> :
      state === "error" ? <StatePanel kind="error" detail="No fue posible cargar el catálogo de planes." retry={() => { setState("loading"); void load().catch(() => setState("error")); }}/> :
      catalog.length === 0 ? <StatePanel kind="empty" detail="No hay versiones de plan publicadas y vigentes. Solicita su publicación al administrador de plataforma."/> :
      <form className="admin-form" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        <label><span>Versión de plan publicada</span><select required disabled={busy} value={planVersionId} onChange={(event) => { setPlanVersionId(event.target.value); resetIntent(); }}><option value="">Selecciona un plan</option>{catalog.filter(v => v.plan_version_id !== currentPlan?.plan_version_id).map((version) => <option key={version.plan_version_id} value={version.plan_version_id}>{version.plan_name} · v{version.version_number} · {version.display_name}</option>)}</select></label>
        {cursor && <button type="button" disabled={busy} className="button secondary" onClick={() => { void load(cursor).catch(() => setFeedback("No fue posible continuar el catálogo de planes.")); }}>Cargar más planes</button>}
        <label><span>Código de suscripción</span><input required disabled={busy} maxLength={96} value={subscriptionCode} onChange={(event) => { setSubscriptionCode(event.target.value); resetIntent(); }}/></label>
        {changePlan && <><label><span>Motivo del cambio</span><textarea required disabled={busy} maxLength={2000} value={reason} onChange={event => { setReason(event.target.value); resetIntent(); }}/></label><label className="admin-confirmation"><input type="checkbox" disabled={busy} checked={confirmed} onChange={event => setConfirmed(event.target.checked)}/><span>Confirmo el cambio de plan de esta empresa.</span></label></>}
        {feedback && <p className="inline-feedback error" role="alert">{feedback}</p>}
        <button className="button primary" type="submit" disabled={busy || !planVersionId || !subscriptionCode.trim() || (changePlan && (!reason.trim() || !confirmed || !etag.current))}>{busy ? changePlan ? "Cambiando…" : "Asignando…" : changePlan ? "Cambiar plan" : "Asignar plan"}</button>
      </form>}
  </DataCard>;
}

function CompaniesAdmin({ api, authorization, authorizeFresh }: { api: ApiClient; authorization: CurrentPrincipalAuthorization | null; authorizeFresh(code: string): Promise<boolean> }) {
  const [state, retry, loadMore] = useAdminPage(api, "/api/v1/platform/tenants", true);
  const [selectedId, setSelectedId] = useState<string>();
  const [detail, setDetail] = useState<Row>();
  const [detailError, setDetailError] = useState(false);
  const detailRequest = useRef(0);
  useEffect(() => {
    const generation = ++detailRequest.current;
    if (!selectedId) { setDetail(undefined); return; }
    const controller = new AbortController();
    setDetail(undefined); setDetailError(false);
    void api.platformGet<Row>(`/api/v1/platform/tenants/${encodeURIComponent(selectedId)}`, { signal: controller.signal })
      .then((next) => { if (!controller.signal.aborted && generation === detailRequest.current) setDetail(next); })
      .catch(() => { if (!controller.signal.aborted && generation === detailRequest.current) setDetailError(true); });
    return () => { controller.abort(); detailRequest.current += 1; };
  }, [api, selectedId]);
  const refetch = async () => { await api.platformGet("/api/v1/platform/tenants"); retry(); };
  const refreshDetail = () => {
    if (!selectedId) return;
    const generation = ++detailRequest.current;
    void api.platformGet<Row>(`/api/v1/platform/tenants/${encodeURIComponent(selectedId)}`)
      .then((next) => { if (generation === detailRequest.current) { setDetail(next); retry(); } })
      .catch(() => { if (generation === detailRequest.current) setDetailError(true); });
  };
  const visibleDetail = detail?.tenant_id === selectedId ? detail : undefined;
  return <>
    <div className="page-heading"><div><p className="eyebrow">{uiText.navigation.settings}</p><h1>{uiText.navigation.companies}</h1><p>{uiText.administration.companiesDetail}</p></div></div><ContractingDocuments/>
    <InitialCompanyWizard api={api} permissions={new Set(authorization?.platform_permissions ?? [])} authorizeFresh={authorizeFresh} refetch={refetch}/>
    <AdminPageBody state={state} retry={retry} loadMore={loadMore}>{(items) => <TableShell label={uiText.navigation.companies}>{items.length === 0 ? <EmptyState/> : <div className="table-scroll"><table><thead><tr><th>{uiText.navigation.companies}</th><th>{uiText.common.status}</th><th>{uiText.administration.plan}</th><th><span className="sr-only">{uiText.common.actions}</span></th></tr></thead><tbody>{items.map((item) => {
      const subscription = item.current_subscription as Row | null;
      return <tr key={String(item.tenant_id)}><td><strong>{String(item.display_name)}</strong><small className="admin-secondary">{String(item.legal_name)}</small></td><td><StatusBadge value={item.lifecycle_state}/></td><td>{subscription ? `${String(subscription.plan_name)} · v${String(subscription.plan_version_number)}` : uiText.administration.noPlan}</td><td><button className="link-button" onClick={() => setSelectedId(String(item.tenant_id))}>{uiText.actions.viewDetail}</button></td></tr>;
    })}</tbody></table></div>}</TableShell>}</AdminPageBody>
    {selectedId && <div className="drawer-backdrop" role="presentation" onMouseDown={() => setSelectedId(undefined)}><aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="company-detail-title" onMouseDown={(event) => event.stopPropagation()}><header className="drawer-header"><div><p className="eyebrow">{uiText.navigation.settings}</p><h2 id="company-detail-title">{visibleDetail ? String(visibleDetail.display_name) : uiText.navigation.companies}</h2></div><button className="icon-button" onClick={() => setSelectedId(undefined)} aria-label={uiText.forms.closeDetail}>×</button></header><div className="drawer-body">{detailError ? <StatePanel kind="error" detail={uiText.administration.loadError} retry={refreshDetail}/> : !visibleDetail ? <LoadingState/> : <><p>{String(visibleDetail.legal_name)}</p><p><StatusBadge value={visibleDetail.lifecycle_state}/></p><p>{uiText.administration.companyCode}: {String(visibleDetail.tenant_code)}</p><p>{uiText.administration.timezone}: {String(visibleDetail.default_timezone)}</p><p>{uiText.administration.plan}: {visibleDetail.current_subscription ? `${String((visibleDetail.current_subscription as Row).plan_name)} · v${String((visibleDetail.current_subscription as Row).plan_version_number)}` : uiText.administration.noPlan}</p>{visibleDetail.current_subscription && <><p>{uiText.administration.subscriptionCode}: {String((visibleDetail.current_subscription as Row).subscription_code)}</p><p>{uiText.administration.subscriptionStatus}: <StatusBadge value={(visibleDetail.current_subscription as Row).lifecycle_state}/></p></>}{visibleDetail.current_subscription ? <> {authorization?.platform_permissions.includes("platform.subscription.update") && authorization.platform_permissions.includes("platform.subscription.read") && <PlanAssignment key={`change-plan-${selectedId}-${String((visibleDetail.current_subscription as Row).subscription_id)}`} api={api} tenantId={selectedId} subscriptionId={String((visibleDetail.current_subscription as Row).subscription_id)} authorizeFresh={authorizeFresh} created={refreshDetail}/>}<ContractedPacks key={`contracted-${String((visibleDetail.current_subscription as Row).subscription_id)}`} api={api} platform subscriptionId={String((visibleDetail.current_subscription as Row).subscription_id)} canActivate={Boolean(authorization?.platform_permissions.includes("platform.subscription_regulatory_pack.create"))} canRevoke={Boolean(authorization?.platform_permissions.includes("platform.subscription_regulatory_pack.archive"))}/></> : authorization?.platform_permissions.includes("platform.subscription.create") ? <PlanAssignment key={`plan-${selectedId}`} api={api} tenantId={selectedId} authorizeFresh={authorizeFresh} created={refreshDetail}/> : <StatePanel kind="permission-denied" detail="Se requiere autorización de plataforma para asignar un plan."/>}<ValidationPacks key={`validation-${selectedId}`} api={api} platform tenantId={selectedId}/>{api.currentTenantId() === visibleDetail.tenant_id && tenantPresentationPermission(authorization, String(visibleDetail.tenant_id), "privacy.retention_policy.read") ? <button className="button secondary" onClick={() => { navigate("evidencias?tab=aplicabilidad-retencion"); setSelectedId(undefined); }}>Abrir aplicabilidad de retención</button> : <p className="form-guidance">La retención se administra en Evidencias con una membresía Tenant autorizada de esta empresa activa.</p>}<button className="button secondary" onClick={() => { navigate(`${settingsRoutes.users}?tenant_id=${encodeURIComponent(selectedId)}`); setSelectedId(undefined); }}>{uiText.administration.viewUsers}</button></>}</div></aside></div>}
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
  const normsAvailable = ["compliance.framework.read","knowledge.knowledge_source.read","knowledge.knowledge_item.read","reporting.matrix.read","configuration.configuration_override.read","configuration.configuration_override.create"].some(permission=>tenantPresentationPermission(authorization,context?.tenant_id,permission));
  const libraryPlatform=!!authorization?.platform_permissions.some(p=>["knowledge.knowledge_source.read","knowledge.knowledge_item.read"].includes(p));
  const navigationDestinations = [
    ...(context ? nav.filter(([id]) => id !== "normas" || normsAvailable).map(([route, label]) => ({ route, label })) : []),
    ...(libraryPlatform ? [{ route: "biblioteca-plataforma", label: "Biblioteca de plataforma" }] : []),
    ...(platformAdmin || tenantAdmin ? [{ route: settingsRoutes.companies, label: uiText.navigation.companies }, { route: settingsRoutes.users, label: uiText.navigation.users }] : []),
    ...(managedIdentity ? [{ route: settingsRoutes.managedIdentities, label: "Identidades gestionadas" }] : [])
  ];
  const currentModule = navigationDestinations.find(item => item.route === active)?.label ?? modules.find(item => item.id === active)?.label ?? "Espacio de trabajo";
  return <div className="app-shell"><Sidebar active={active} open={menu} close={() => setMenu(false)} platformAdmin={platformAdmin} tenantAdmin={tenantAdmin} hasTenant={Boolean(context)} managedIdentity={managedIdentity} normsAvailable={normsAvailable} libraryPlatform={libraryPlatform}/><div className="app-column"><header className="topbar"><button className="menu-button" aria-label={uiText.navigation.open} onClick={() => setMenu(!menu)}>☰</button><WorkspaceSearch destinations={navigationDestinations} navigate={navigate}/>{context ? <label className="tenant-context"><span>{uiText.shell.tenant}</span><select aria-label={uiText.tenant.selectorLabel} value={context.tenant_id} onChange={(event) => { session.selectTenant(event.target.value); setContextVersion((value) => value + 1); }}>{contexts.map((item) => <option value={item.tenant_id} key={item.tenant_id}>{item.tenant_display_name}</option>)}</select></label> : <span className="context-pill">{uiText.administration.platformContext}</span>}<div className="user-context"><span className="avatar">U</span><div><strong>{uiText.shell.authorizedUser}</strong><span className="user-role-summary" title={roleSummary}>{platformAdmin ? `${uiText.administration.platformContext} · ` : ""}{context ? `${context.tenant_display_name} · ` : ""}{roleSummary}</span></div><button className="link-button" onClick={() => void logout()}>{uiText.auth.logout}</button></div></header><main className="workspace" key={`${context?.tenant_id ?? "platform"}:${contextVersion}`}><nav className="workspace-breadcrumb" aria-label="Ruta de navegación"><span>{administrativePage ? "Administración" : "GRC"}</span><span aria-hidden="true">/</span><strong aria-current="page">{currentModule}</strong></nav>
    {active === "biblioteca-plataforma" ? libraryPlatform ? <KnowledgeWorkspace key={JSON.stringify(authorization)} api={api} authorization={authorization} platform/> : <StatePanel kind="permission-denied"/> : active === settingsRoutes.managedIdentities ? managedIdentity ? <ManagedIdentityWorkspace api={api} permissions={new Set(authorization?.platform_permissions ?? [])} authorizeFresh={refreshAuthorization}/> : <StatePanel kind="permission-denied"/> :
    active === settingsRoutes.companies ? platformAdmin ? <CompaniesAdmin api={api} authorization={authorization} authorizeFresh={refreshAuthorization}/> : tenantAdmin && context ? <TenantCompany api={api} context={context} authorization={authorization}/> : <StatePanel kind="permission-denied"/> :
      active === settingsRoutes.users ? platformAdmin || tenantAdmin ? <UsersAdmin api={api} platformAdmin={platformAdmin} authorization={authorization} authorizeTenantFresh={authorizeTenantFresh} authorizePlatformFresh={refreshAuthorization} {...(context ? { context } : {})}/> : <StatePanel kind="permission-denied"/> :
      context ? <TenantTimezoneContext.Provider value={selectedTenantTimezone(authorization, selectedId ?? null)}>{active === "dashboard" ? <Dashboard api={api} authorization={authorization}/> : active === "normas" ? normsAvailable ? <NormsWorkspace api={api} authorization={authorization}/> : <StatePanel kind="permission-denied"/> : <ModuleWorkspace api={api} active={active} authorization={authorization} tenantId={context.tenant_id}/>}</TenantTimezoneContext.Provider> :
      <StatePanel kind={administrativePage ? "permission-denied" : "not-available"} detail={uiText.tenant.selectDetail}/>}
  </main></div>{menu && <button className="sidebar-scrim" aria-label={uiText.navigation.close} onClick={() => setMenu(false)}/>}</div>;
}
