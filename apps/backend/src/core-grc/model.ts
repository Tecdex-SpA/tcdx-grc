import type { ScopeKind } from "@tcdx-grc/shared-types";
import type { Kysely } from "kysely";
import type { FoundationDatabase } from "../database.js";
import type { IdentityVerifier } from "../security/authentication.js";
import type { FileStoragePort } from "../ports/file-storage.js";

export type CoreGrcDependencies = {
  database: Kysely<FoundationDatabase>;
  identityVerifier: IdentityVerifier;
  fileStorage: FileStoragePort;
};

export type CoreActor = {
  tenantId: string;
  membershipId: string;
  userIdentityId: string;
  permissions: ReadonlySet<string>;
  scopes: ReadonlySet<ScopeKind>;
  permissionScopes: ReadonlyMap<string, ReadonlySet<ScopeKind>>;
  capabilityGroups: ReadonlySet<string>;
  roles: readonly string[];
};

export type ResourceDefinition = {
  name: string;
  table: string;
  idColumn: string;
  permission: string;
  capability: string;
  scopes: readonly ScopeKind[];
  projection: readonly string[];
  assignedMembershipColumn?: string;
  filters?: Readonly<Record<string, { expression: string; type: "uuid" | "text" | "date" | "timestamp" }>>;
};

export const resources = {
  applicability: {
    name: "RequirementApplicability", table: "regulatory.requirement_applicabilities", idColumn: "requirement_applicability_id",
    permission: "compliance.applicability.read", capability: "ISO_COMPLIANCE",
    scopes: ["tenant", "organizational_unit", "process", "service", "assigned_object", "owned_object"],
    projection: ["requirement_applicability_id", "row_version", "requirement_id", "scope_subject_id", "applicability_version", "applicability_decision", "rationale", "lifecycle_state", "effective_from", "effective_to", "approved_at"],
    filters: { "filter[requirement_id]": { expression: "t.requirement_id", type: "uuid" }, "filter[scope_subject_id]": { expression: "t.scope_subject_id", type: "uuid" } }
  },
  requirementAssessment: {
    name: "RequirementAssessment", table: "regulatory.requirement_assessments", idColumn: "requirement_assessment_id",
    permission: "compliance.requirement_assessment.read", capability: "ISO_COMPLIANCE",
    scopes: ["tenant", "organizational_unit", "process", "service", "assigned_object", "owned_object"],
    projection: ["requirement_assessment_id", "row_version", "requirement_applicability_id", "methodology_version_ref", "lifecycle_state", "result_status", "domain_conclusion", "coverage_percent", "assessed_at", "approved_at", "effective_configuration_id", "superseded_by_id"],
    filters: {
      "filter[requirement_id]": { expression: "(SELECT a.requirement_id FROM regulatory.requirement_applicabilities a WHERE a.tenant_id=t.tenant_id AND a.requirement_applicability_id=t.requirement_applicability_id)", type: "uuid" },
      "filter[scope_subject_id]": { expression: "(SELECT a.scope_subject_id FROM regulatory.requirement_applicabilities a WHERE a.tenant_id=t.tenant_id AND a.requirement_applicability_id=t.requirement_applicability_id)", type: "uuid" }
    }
  },
  soa: {
    name: "StatementOfApplicability", table: "regulatory.statements_of_applicability", idColumn: "statement_of_applicability_id",
    permission: "compliance.soa.read", capability: "ISO_COMPLIANCE",
    scopes: ["tenant"],
    projection: ["statement_of_applicability_id", "row_version", "framework_version_id", "soa_version", "title", "lifecycle_state", "effective_from", "effective_to", "approved_at", "published_at", "superseded_by_id"],
    filters: { "filter[framework_version_id]": { expression: "t.framework_version_id", type: "uuid" } }
  },
  control: {
    name: "Control", table: "controls.controls", idColumn: "control_id", permission: "controls.control.read", capability: "CONTROLS_ASSURANCE",
    scopes: ["tenant", "organizational_unit", "process", "service", "assigned_object", "owned_object", "audit_engagement"],
    projection: ["control_id", "row_version", "ownership_class", "control_code", "name", "control_origin", "based_on_control_version_id", "business_owner_subject_id", "lifecycle_state"],
    filters: { "filter[business_owner_subject_id]": { expression: "t.business_owner_subject_id", type: "uuid" }, "filter[scope_subject_id]": { expression: "EXISTS (SELECT 1 FROM controls.control_scopes cs WHERE cs.tenant_id=$1::uuid AND cs.control_id=t.control_id AND cs.subject_id={value})", type: "uuid" } }
  },
  controlAssessment: {
    name: "ControlAssessment", table: "controls.control_assessments", idColumn: "control_assessment_id",
    permission: "controls.control_assessment.read", capability: "CONTROLS_ASSURANCE",
    scopes: ["tenant", "organizational_unit", "process", "service", "assigned_object", "owned_object", "audit_engagement"],
    projection: ["control_assessment_id", "row_version", "control_id", "control_version_id", "methodology_version_ref", "lifecycle_state", "result_status", "domain_conclusion", "design_effectiveness", "operating_effectiveness", "overall_effectiveness", "coverage_percent", "effective_configuration_id", "assessed_at", "superseded_by_id"],
    filters: { "filter[control_id]": { expression: "t.control_id", type: "uuid" } }
  },
  assuranceTest: {
    name: "AssuranceTest", table: "controls.assurance_tests", idColumn: "assurance_test_id",
    permission: "controls.assurance_test.read", capability: "CONTROLS_ASSURANCE", assignedMembershipColumn: "executor_membership_id",
    scopes: ["tenant", "assigned_object", "owned_object", "audit_engagement"],
    projection: ["assurance_test_id", "row_version", "control_id", "control_version_id", "test_code", "lifecycle_state", "result_status", "domain_conclusion", "planned_at", "executed_at", "reviewed_at", "approved_at", "executor_membership_id", "reviewer_membership_id", "superseded_by_id"],
    filters: { "filter[control_id]": { expression: "t.control_id", type: "uuid" }, "filter[assigned_membership_id]": { expression: "t.executor_membership_id", type: "uuid" } }
  },
  evidenceRequest: {
    name: "EvidenceRequest", table: "evidence.evidence_requests", idColumn: "evidence_request_id",
    permission: "evidence.evidence_request.read", capability: "EVIDENCE_DOCUMENTS", assignedMembershipColumn: "assigned_membership_id",
    scopes: ["tenant", "assigned_object", "owned_object", "audit_engagement"],
    projection: ["evidence_request_id", "row_version", "request_code", "requirement_id", "control_id", "requirement_assessment_id", "control_assessment_id", "assurance_test_id", "lifecycle_state", "requested_by_membership_id", "assigned_membership_id", "due_at", "fulfilled_at"],
    filters: { "filter[requirement_id]": { expression: "t.requirement_id", type: "uuid" }, "filter[control_id]": { expression: "t.control_id", type: "uuid" }, "filter[assigned_membership_id]": { expression: "t.assigned_membership_id", type: "uuid" }, "filter[due_from]": { expression: "t.due_at", type: "date" }, "filter[due_to]": { expression: "t.due_at", type: "date" } }
  },
  evidence: {
    name: "Evidence", table: "evidence.evidences", idColumn: "evidence_id", permission: "evidence.evidence.read", capability: "EVIDENCE_DOCUMENTS",
    scopes: ["tenant", "assigned_object", "owned_object", "audit_engagement"],
    projection: ["evidence_id", "row_version", "evidence_code", "evidence_type", "business_owner_subject_id", "lifecycle_state", "valid_from", "valid_to", "retention_policy_id", "source_kind"],
    filters: { "filter[business_owner_subject_id]": { expression: "t.business_owner_subject_id", type: "uuid" }, "filter[expires_from]": { expression: "(SELECT MAX(ev.expires_at) FROM evidence.evidence_versions ev WHERE ev.tenant_id=t.tenant_id AND ev.evidence_id=t.evidence_id)", type: "timestamp" }, "filter[expires_to]": { expression: "(SELECT MAX(ev.expires_at) FROM evidence.evidence_versions ev WHERE ev.tenant_id=t.tenant_id AND ev.evidence_id=t.evidence_id)", type: "timestamp" } }
  },
  evidenceVersion: {
    name: "EvidenceVersion", table: "evidence.evidence_versions", idColumn: "evidence_version_id", permission: "evidence.evidence.read", capability: "EVIDENCE_DOCUMENTS",
    scopes: ["tenant", "assigned_object", "owned_object", "audit_engagement"],
    projection: ["evidence_version_id", "row_version", "evidence_id", "document_version_id", "file_object_id", "version_number", "effective_from", "effective_to", "published_at", "period_start", "period_end", "lifecycle_state", "submitted_at", "approved_at", "expires_at", "superseded_by_id", "provenance_ref"]
  },
  issue: {
    name: "Issue", table: "remediation.issues", idColumn: "issue_id", permission: "remediation.issue.read", capability: "ISSUES_ACTIONS",
    scopes: ["tenant", "assigned_object", "owned_object", "audit_engagement"],
    projection: ["issue_id", "row_version", "issue_code", "issue_kind", "title", "description", "lifecycle_state", "severity", "priority", "business_owner_subject_id", "due_date", "dismissal_reason", "closed_at"],
    filters: { "filter[business_owner_subject_id]": { expression: "t.business_owner_subject_id", type: "uuid" }, "filter[due_from]": { expression: "t.due_date", type: "date" }, "filter[due_to]": { expression: "t.due_date", type: "date" } }
  },
  action: {
    name: "Action", table: "remediation.actions", idColumn: "action_id", permission: "remediation.action.read", capability: "ISSUES_ACTIONS", assignedMembershipColumn: "assigned_membership_id",
    scopes: ["tenant", "assigned_object", "owned_object", "audit_engagement"],
    projection: ["action_id", "row_version", "issue_id", "action_code", "title", "description", "lifecycle_state", "priority", "assigned_membership_id", "due_date", "completed_at", "verified_at", "cancel_reason"],
    filters: { "filter[issue_id]": { expression: "t.issue_id", type: "uuid" }, "filter[assigned_membership_id]": { expression: "t.assigned_membership_id", type: "uuid" }, "filter[due_from]": { expression: "t.due_date", type: "date" }, "filter[due_to]": { expression: "t.due_date", type: "date" } }
  }
} as const satisfies Record<string, ResourceDefinition>;

export type ResourceKey = keyof typeof resources;
