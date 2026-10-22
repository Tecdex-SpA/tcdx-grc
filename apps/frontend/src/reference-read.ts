import { formatTenantInstant } from "./tenant-timezone.js";
import { uiText } from "./i18n/es.js";
import { ApiClient } from "./api-client.js";
import { displayValue, publishedOptionLabel, subjectTypeLabel } from "./i18n/display-text.js";

type Row = Record<string, unknown>;
export type ReferenceOption = { value: string; label: string; row: Row };
export type ReferencePage = { options: ReferenceOption[]; nextCursor: string | null };
export type ReferenceContext = { tenantOwnedControl?: boolean | undefined; parentId?: string | undefined; query?: string | undefined; cursor?: string | undefined; subjectType?: string | undefined; initialSource?: boolean | undefined; publishedOnly?: boolean | undefined; classification?: string | undefined; ownerSubjectId?: string | undefined; timezone?: string | null | undefined };
export const referenceReads = {
  requirement: { operation: "requirementList", path: "/framework-versions/{framework_version_id}/requirements", id: "requirement_id", permission: "compliance.requirement.read", search: true, pathParent: true },
  retentionPolicy: { operation: "retentionPolicyList", path: "/retention-policies", id: "retention_policy_id", permission: "privacy.retention_policy.read" },
  retentionPolicyApplicability: { operation: "retentionApplicabilityList", path: "/retention-policy-applicabilities", id: "retention_policy_applicability_id", permission: "privacy.retention_policy.read", parent: "retention_policy_id" },
  administrativeMembership: { operation: "membershipList", path: "/memberships", id: "tenant_membership_id", permission: "platform.membership.read" },
  subject: { operation: "subjectList", path: "/subjects", id: "subject_id", permission: "organization.subject.read", search: true },
  control: { operation: "controlList", path: "/controls", id: "control_id", permission: "controls.control.read", search: true },
  applicability: { operation: "applicabilityList", path: "/requirement-applicabilities", id: "requirement_applicability_id", permission: "compliance.applicability.read", parent: "requirement_id" },
  requirementAssessment: { operation: "requirementAssessmentList", path: "/requirement-assessments", id: "requirement_assessment_id", permission: "compliance.requirement_assessment.read", parent: "requirement_id" },
  soa: { operation: "soaList", path: "/statements-of-applicability", id: "statement_of_applicability_id", permission: "compliance.soa.read", parent: "framework_version_id" },
  controlAssessment: { operation: "controlAssessmentList", path: "/control-assessments", id: "control_assessment_id", permission: "controls.control_assessment.read", parent: "control_id" },
  assuranceTest: { operation: "assuranceTestList", path: "/assurance-tests", id: "assurance_test_id", permission: "controls.assurance_test.read", parent: "control_id" },
  evidenceRequest: { operation: "evidenceRequestList", path: "/evidence-requests", id: "evidence_request_id", permission: "evidence.evidence_request.read" },
  evidence: { operation: "evidenceList", path: "/evidence", id: "evidence_id", permission: "evidence.evidence.read" },
  issue: { operation: "issueList", path: "/issues", id: "issue_id", permission: "remediation.issue.read" },
  action: { operation: "actionList", path: "/actions", id: "action_id", permission: "remediation.action.read", parent: "issue_id" },
  complianceMethodology: { operation: "complianceMethodologyList", path: "/compliance-methodologies", id: "methodology_version_ref", permission: "compliance.methodology.read" },
  controlsMethodology: { operation: "controlsMethodologyList", path: "/controls-methodologies", id: "methodology_version_ref", permission: "controls.methodology.read" }
} as const;
export type ReferenceEntity = keyof typeof referenceReads;
const uuid = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
/** RetentionPolicy has no canonical name attribute: kind, caller-defined code and version identify it. */
export function retentionPolicyDisplayLabel(row: Row): string {
  return [typeof row.policy_kind === "string" ? displayValue(row.policy_kind) : "",
    typeof row.policy_code === "string" ? row.policy_code.replace(uuid, "").trim() : "",
    row.version_number != null ? `v${String(row.version_number)}` : ""].filter(Boolean).join(" · ");
}
export function businessLabel(row: Row, timezone: string | null = null): string {
  const fields = ["display_name", "control_code", "requirement_code", "test_code", "request_code", "policy_code", "classification", "evidence_code", "issue_code", "action_code", "name", "title", "framework_code", "framework_name", "edition"];
  const policy = typeof row.policy_code === "string";
  const parts = policy ? [retentionPolicyDisplayLabel(row)] : fields.flatMap(field => typeof row[field] === "string" ? [(field === "classification" ? displayValue(row[field]) : String(row[field])).replace(uuid, "").trim()] : []).filter(Boolean);
  if (typeof row.subject_type === "string") {
    const label = subjectTypeLabel(row.subject_type);
    if (!label) throw new Error("REFERENCE_LOCALIZATION_UNAVAILABLE");
    parts.push(label);
  }
  if (!policy && row.version_number != null) parts.push(`v${String(row.version_number)}`);
  if (row.applicability_version != null) parts.push(`v${String(row.applicability_version)}`);
  if (row.soa_version != null) parts.push(`v${String(row.soa_version)}`);
  if (typeof row.lifecycle_state === "string") {
    const label = publishedOptionLabel(row.lifecycle_state, "lifecycle");
    if (!label) throw new Error("REFERENCE_LOCALIZATION_UNAVAILABLE");
    parts.push(label);
  }
  if (typeof row.assessed_at === "string") parts.push(formatTenantInstant(row.assessed_at, timezone) ?? uiText.temporal.contextPending);
  if (Array.isArray(row.normative_frameworks)) for (const framework of row.normative_frameworks as Row[]) if (typeof framework.framework_name === "string") parts.push(framework.framework_name.replace(uuid, "").trim());
  return parts.join(" · ");
}
function ensureTenant(api: ApiClient, initial: string | null, row?: Row): void {
  if (!initial || api.currentTenantId() !== initial || (row?.tenant_id != null && row.tenant_id !== initial)) throw new Error("REFERENCE_CONTEXT_CHANGED");
}
export async function readReferences(api: ApiClient, entity: ReferenceEntity, context: ReferenceContext, signal?: AbortSignal): Promise<ReferencePage> {
  const tenant = api.currentTenantId(); ensureTenant(api, tenant);
  const def = referenceReads[entity];
  const params = new URLSearchParams({ "page[size]": "25" });
  if (context.cursor) params.set("page[cursor]", context.cursor);
  if (context.query) {
    if (!("search" in def) || context.query.trim().length < 2 || context.query.length > 160) throw new Error("INVALID_REFERENCE_SEARCH");
    params.set("filter[query]", context.query.trim());
  }
  if (context.parentId && !("pathParent" in def)) {
    if (!("parent" in def)) throw new Error("UNSUPPORTED_REFERENCE_RELATION");
    params.set(`filter[${def.parent}]`, context.parentId);
  }
  if ((entity === "retentionPolicyApplicability" && !context.initialSource) || (entity === "retentionPolicy" && context.publishedOnly)) params.set("filter[lifecycle_state]", "published");
  if (context.subjectType) {
    if (entity !== "subject") throw new Error("UNSUPPORTED_REFERENCE_FILTER");
    params.set("filter[subject_type]", context.subjectType);
  }
  if ("pathParent" in def && !context.parentId) throw new Error("MISSING_FRAMEWORK_CONTEXT");
  const path = "pathParent" in def ? def.path.replace("{framework_version_id}", encodeURIComponent(context.parentId!)) : def.path;
  const result = await api.request<{ items: Row[]; page: { has_more: boolean; next_cursor: string | null } }>(`/api/v1${path}?${params}`, signal ? { signal } : {});
  ensureTenant(api, tenant);
  const options = result.items.map(row => {
    ensureTenant(api, tenant, row);
    if (typeof row[def.id] !== "string") throw new Error("INVALID_REFERENCE_PROJECTION");
    if (entity === "administrativeMembership") {
      const identity = row.user_identity && typeof row.user_identity === "object" ? row.user_identity as Row : {};
      const minimal = { tenant_membership_id: row.tenant_membership_id, display_name: identity.display_name };
      if (typeof minimal.display_name !== "string" || !minimal.display_name.trim()) throw new Error("MEMBERSHIP_DISPLAY_LABEL_UNAVAILABLE");
      return { value: row[def.id] as string, label: businessLabel(minimal, context.timezone), row: minimal };
    }
    return { value: row[def.id] as string, label: `${businessLabel(row, context.timezone)}${entity === "retentionPolicyApplicability" && context.initialSource && row.lifecycle_state === "draft" ? " · Fuente pendiente, sin acreditar" : ""}`, row };
  }).filter(option => {
    const row: Row = option.row;
    if (entity === "control" && context.tenantOwnedControl) return row.ownership_class === "TENANT_OWNED";
    if (entity !== "retentionPolicyApplicability" || !context.publishedOnly) return true;
    const now = Date.now();
    const from = typeof row.effective_from === "string" ? Date.parse(row.effective_from) : NaN;
    const to = typeof row.effective_to === "string" ? Date.parse(row.effective_to) : Infinity;
    return row.lifecycle_state === "published" && row.purpose === "evidence_document"
      && row.classification === context.classification && Number.isFinite(from) && from <= now && to > now
      && (row.scope_subject_id == null || row.scope_subject_id === context.ownerSubjectId);
  });
  if (result.page.has_more && (!result.page.next_cursor || result.page.next_cursor === context.cursor)) throw new Error("INVALID_REFERENCE_PAGE");
  return { options, nextCursor: result.page.has_more ? result.page.next_cursor : null };
}
export async function readControlVersions(api: ApiClient, parentId: string, ownership: "reference" | "tenant", signal?: AbortSignal): Promise<ReferencePage> {
  const tenant = api.currentTenantId(); ensureTenant(api, tenant);
  const row = await api.request<Row>(`/api/v1/controls/${encodeURIComponent(parentId)}`, signal ? { signal } : {});
  ensureTenant(api, tenant, row);
  if (row.control_id !== parentId || (ownership === "tenant" ? row.ownership_class !== "TENANT_OWNED" : !["GLOBAL_REFERENCE", "PLATFORM_CONTROL"].includes(String(row.ownership_class)))) throw new Error("INELIGIBLE_CONTROL_PARENT");
  const versions = Array.isArray(row.versions) ? row.versions as Row[] : [];
  return { options: versions.map(version => {
    ensureTenant(api, tenant, version);
    if (version.control_id != null && version.control_id !== parentId) throw new Error("INCOMPATIBLE_CONTROL_VERSION");
    if (typeof version.control_version_id !== "string") throw new Error("INVALID_REFERENCE_PROJECTION");
    return { value: version.control_version_id, label: `${businessLabel(row)} · v${String(version.version_number)}`, row: version };
  }), nextCursor: null };
}

export type DetailReferenceEntity = Exclude<ReferenceEntity, "subject" | "requirement" | "complianceMethodology" | "controlsMethodology" | "administrativeMembership">;
export async function readReferenceDetail(api: ApiClient, entity: DetailReferenceEntity, value: string, signal?: AbortSignal): Promise<ReferenceOption> {
  const tenant = api.currentTenantId(); ensureTenant(api, tenant);
  const definition = referenceReads[entity];
  const row = await api.request<Row>(`/api/v1${definition.path}/${encodeURIComponent(value)}`, signal ? { signal } : {});
  ensureTenant(api, tenant, row);
  if (row[definition.id] !== value) throw new Error("INVALID_REFERENCE_PROJECTION");
  return { value, label: businessLabel(row), row };
}

export async function readEvidenceVersions(api: ApiClient, evidenceId: string, requestId?: string, signal?: AbortSignal): Promise<ReferencePage> {
  const tenant = api.currentTenantId(); ensureTenant(api, tenant);
  const evidence = await readReferenceDetail(api, "evidence", evidenceId, signal);
  const request = requestId ? await readReferenceDetail(api, "evidenceRequest", requestId, signal) : null;
  const targetFields = ["requirement_id", "control_id", "requirement_assessment_id", "control_assessment_id", "assurance_test_id"] as const;
  if (request && (request.row.lifecycle_state !== "open" || targetFields.filter(field => request.row[field] != null).length !== 1)) throw new Error("INELIGIBLE_EVIDENCE_REQUEST");
  const versions = Array.isArray(evidence.row.versions) ? evidence.row.versions as Row[] : [];
  const options: ReferenceOption[] = [];
  for (const version of versions) {
    ensureTenant(api, tenant, version);
    if (version.lifecycle_state !== "approved") continue;
    if (typeof version.evidence_version_id !== "string") throw new Error("INVALID_REFERENCE_PROJECTION");
    const detail = await api.request<Row>(`/api/v1/evidence-versions/${encodeURIComponent(version.evidence_version_id)}`, signal ? { signal } : {});
    ensureTenant(api, tenant, detail);
    if (detail.evidence_id !== evidenceId || detail.evidence_version_id !== version.evidence_version_id) throw new Error("INCOMPATIBLE_EVIDENCE_VERSION");
    if (detail.lifecycle_state !== "approved" || detail.ordinary_consumption_allowed === false) continue;
    if (request) {
      const target = targetFields.find(field => request.row[field] != null)!;
      const links = Array.isArray(detail.links) ? detail.links as Row[] : [];
      if (!links.some(link => link[target] === request.row[target])) continue;
    }
    options.push({ value: version.evidence_version_id, label: `${evidence.label} · v${String(detail.version_number)}`, row: detail });
  }
  return { options, nextCursor: null };
}

/** Controls-only partial reuse; does NOT confer independent Compliance discovery. */
export async function readExistingFrameworkFilters(api: ApiClient, signal?: AbortSignal): Promise<ReferenceOption[]> {
  const tenant = api.currentTenantId(); ensureTenant(api, tenant);
  const page = await api.request<{ framework_filters: Row[] }>("/api/v1/controls?page%5Bsize%5D=25", signal ? { signal } : {});
  ensureTenant(api, tenant);
  if (!Array.isArray(page.framework_filters)) throw new Error("INVALID_REFERENCE_PROJECTION");
  return page.framework_filters.map(row => {
    if (typeof row.framework_version_id !== "string" || typeof row.framework_name !== "string") throw new Error("INVALID_REFERENCE_PROJECTION");
    return { value: row.framework_version_id, label: businessLabel({ name: row.framework_name, title: row.edition }), row };
  });
}

export type BusinessReferenceContext = { kind: "framework" | "membership" | "retention"; purpose: string; parents?: Record<string,string>; filters?: Record<string,string>; cursor?: string | undefined };
export async function readBusinessReferences(api:ApiClient,context:BusinessReferenceContext,signal?:AbortSignal):Promise<ReferencePage> {
 const tenant=api.currentTenantId();ensureTenant(api,tenant);
 const paths={framework:"framework-version-references",membership:"membership-references",retention:"retention-policy-references"};
 const ids={framework:"framework_version_id",membership:"tenant_membership_id",retention:"retention_policy_id"};
 const query=new URLSearchParams({purpose:context.purpose,"page[size]":"25"});
 for(const [key,value] of Object.entries(context.parents??{})) if(value) query.set(key,value);
 for(const [key,value] of Object.entries(context.filters??{})) if(value) query.set(`filter[${key}]`,value);
 if(context.cursor) query.set("page[cursor]",context.cursor);
 const page=await api.request<{items:Row[];page:{has_more:boolean;next_cursor:string|null}}>(`/api/v1${"/"+paths[context.kind]}?${query}`,{cache:"no-store",...(signal?{signal}:{})});
 ensureTenant(api,tenant);
 const options=page.items.map(row=> {
  ensureTenant(api,tenant,row);const value=row[ids[context.kind]];
  if(typeof value!=="string" || typeof row.selectable!=="boolean") throw new Error("INVALID_REFERENCE_PROJECTION");
  const label=businessLabel(row);if(!label) throw new Error("REFERENCE_LOCALIZATION_UNAVAILABLE");
  return {value,label,row};
 });
 if(page.page.has_more && (!page.page.next_cursor || page.page.next_cursor===context.cursor)) throw new Error("INVALID_REFERENCE_PAGE");
 return {options:context.kind==="retention"&&["evidence","upload"].includes(context.purpose)?options.filter(option=>option.row.selectable===true):options,nextCursor:page.page.has_more?page.page.next_cursor:null};
}
