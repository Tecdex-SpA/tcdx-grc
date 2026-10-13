# JSON and vocabulary audit

Audit date: 2026-10-08. Baseline: main at 6af66387aa03fa185ef139584de07700f247b903.
Master: TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23. Mode: READ_ONLY_AUDIT.
Recommendations are audit proposals for the authorized later stages; no application contract or runtime change is approved by this artifact.

## All business JSON editors

Three field occurrences: `soaCreate.items` (textarea), `evidenceCreate.links` (textarea), `assuranceTestExecute.samples` (single-line input). Source `apps/frontend/src/core-grc.tsx:96`, `apps/frontend/src/core-grc.tsx:449`, `apps/frontend/src/i18n/display-text.ts:166`. UI asks for contractual JSON and only parses syntax; backend validates closed member schemas, tenant references and invariants. JSON is an API transport contract, never a separate persistence model.

- SoA: required nonempty array of SoaItemCreateInput. Each row requires an authorized reference ControlVersion, applicability decision, justification, implementation state. Optional tenant Control/version must be supplied together and match. Recommend a structured repeated row UI under a labelled FrameworkVersion; select references, enter justification, show implementation context. Serialize unchanged `items` array; no RequirementApplicability substitution. Exact item decision/state vocabulary remains U-VOC until source closure.
- Evidence links: required nonempty array. Every row has exactly one of six typed targets; optional claim and effective dates. Recommend an explicit target-family choice backed by the existing six allowed FK members, authorized picker/context, claim and dates. Serialize existing member names; never generic target_type/target_id persistence. ControlVersion-only is not proof of tenant implementation.
- Assurance samples: optional array; UI currently requires it because optionalFields is missing. Recommend repeated sample rows for business code, counts, selection method, period and ResultStatus. Validate nonnegative integer counts, sample_count <= population_count, increasing optional period; serialize existing `samples`. Do not invent sample generation or selection-method enum.

### SoaItemCreateInput

| Member | Type | Required / conditional | Canonical source and user interaction |
| --- | --- | --- | --- |
| reference_control_version_id | UuidV7 | required | ControlVersion authorized selector/context |
| applicability_decision | "string" | required | Business input; unresolved vocabulary |
| justification | "string" | required | Business input |
| implementation_state | "string" | required | Business input; unresolved vocabulary |
| tenant_control_id | UuidV7 | optional; typed-target/pair rule applies | Control authorized selector/context |
| tenant_control_version_id | UuidV7 | optional; typed-target/pair rule applies | ControlVersion authorized selector/context |
### EvidenceLinkCreateInput

| Member | Type | Required / conditional | Canonical source and user interaction |
| --- | --- | --- | --- |
| requirement_id | UuidV7 | optional; typed-target/pair rule applies | Requirement authorized selector/context |
| control_id | UuidV7 | optional; typed-target/pair rule applies | Control authorized selector/context |
| control_version_id | UuidV7 | optional; typed-target/pair rule applies | ControlVersion authorized selector/context |
| requirement_assessment_id | UuidV7 | optional; typed-target/pair rule applies | RequirementAssessment authorized selector/context |
| control_assessment_id | UuidV7 | optional; typed-target/pair rule applies | ControlAssessment authorized selector/context |
| assurance_test_id | UuidV7 | optional; typed-target/pair rule applies | AssuranceTest authorized selector/context |
| claim | "string" | optional; typed-target/pair rule applies | Business input |
| effective_from | UtcTimestamp | optional; typed-target/pair rule applies | Business input |
| effective_to | UtcTimestamp | optional; typed-target/pair rule applies | Business input |
### AssuranceSampleExecuteInput

| Member | Type | Required / conditional | Canonical source and user interaction |
| --- | --- | --- | --- |
| sample_code | "string" | required | Business input |
| population_count | "integer" int64 | optional; typed-target/pair rule applies | Business input |
| sample_count | "integer" int64 | required | Business input |
| selection_method | "string" | required | Business input; unresolved vocabulary |
| sample_period_start | UtcTimestamp | optional; typed-target/pair rule applies | Business input |
| sample_period_end | UtcTimestamp | optional; typed-target/pair rule applies | Business input |
| result_status | ResultStatus | required | Business input / published ResultStatus |

Common validation: additionalProperties=false, required members, UUID shape, exactly-one target or compatible pair, authorized same-tenant references, UTC timestamp and interval checks, numeric ranges and schema enums. Unknown vocabulary must be resolved before replacing a bounded string with a closed choice. Frontend serialization must preserve omitted optional values rather than sending empty strings/null where schema forbids them. No raw JSON editor is acceptable for normal business operation.

## Reviewed vocabulary and ownership

| Field/family | Authority / exact values | Ownership / retrieval strategy | Verification limitation |
| --- | --- | --- | --- |
| RequirementApplicability.applicability_decision | ApplicabilityCreateRequest: applicable, not_applicable; rector 19/44 | Contract enum; reuse generated/shared authoritative schema with Spanish labels | Do not reuse as SoA item enum without its own contract |
| control_type | ControlInstantiateRequest: preventive, detective, corrective, directive | Contract enum + CONTROL_TYPES in shared-types | Existing select suitable; no duplicate frontend constants |
| nature | ControlInstantiateRequest: manual, automated, hybrid | Contract enum + CONTROL_NATURES in shared-types | Existing select suitable |
| result_status | ResultStatus schema / rector 38; exact 12 values in 02 CSV schema references | Published closed contract; generated/shared asset; no new DB catalog inferred | Do not substitute conclusion/severity or zero |
| domain_conclusion | RequirementAssessmentSubmitRequest versus ControlAssessmentSubmitRequest/AssuranceTestExecuteRequest; rector 19 | Domain-specific closed enum from named schema | Backend generic union is broader than operation enum; UI must use operation contract |
| issue_kind | IssueCreateRequest: finding, non_conformity, gap, exception, audit_observation; rector 21/31 | Closed operation enum; shared/generated contract asset | Current plain text input |
| classification | UploadIntentCreateRequest is bounded string; observed backend/UI values public/internal/confidential/restricted | UNKNOWN_REQUIRES_VERIFICATION of governing upload vocabulary publication; reuse authorized classification source once confirmed | OpenAPI upload schema has no enum. Rector39 fixes Tenant.data_classification, which does not by itself establish the upload vocabulary. No cross-domain equivalence is inferred |
| verification_decision | IssueVerifyCloseRequest/ActionVerifyRequest: accepted only | Workflow-derived decision presentation backed by exact enum | Do not add reject/reopen via arbitrary field values |
| policy_kind | RetentionPolicyCreateRequest: legal_hold, mandatory_regulatory_policy, contractual_policy, tenant_policy, product_baseline | Closed contract; same canonical policies | No universal legal duration inference |
| trigger_event_code | RetentionPolicyCreateRequest: expiry_or_closure only | Fixed contract value with business explanation | No caller-entered event name required |
| precedence_rank | RetentionPolicyCreateRequest: 500/400/300/200/100; exact kind mapping in service | Derived from selected policy_kind using existing canonical mapping | No arbitrary rank |
| is_mandatory | Boolean | User policy choice constrained by existing command | Checkbox; do not send strings |
| lifecycle_state | Rector21/retention amendment + published registry; immutable command transitions | Workflow-derived, read-only; enum/registry labels consumed as contract data | Local UI lifecycleStates is a presentation/filter list, not state authority |
| Control ownership_class/control_origin | ControlProjection + import canonical_vocabularies.json | Contract projection; read-only labels | Tenant control != global reference |
| Controls applicability/implementation filters | UI/branch vocabularies: applicable/not_applicable; implemented/unimplemented | Existing projection/filter branches; no database vocabulary entity | OpenAPI does not declare these two parameters and handler allowlist rejects them: UX-18 |
| SoaItem.applicability_decision / implementation_state | SoaItemCreateInput: bounded nonempty string; no closed values found | UNKNOWN_REQUIRES_VERIFICATION | Verify exact business vocabulary and owner before structured dropdown; not RequirementApplicability decision |
| severity / priority | Issue/Action requests: bounded nonempty strings; varchar persistence | UNKNOWN_REQUIRES_VERIFICATION; no tenant/platform catalog found | Verify scope/versioning and allowed scale; neither hardcode high/medium/low nor reuse Risk scale |
| evidence_type / source_kind | EvidenceCreateRequest: bounded nonempty strings | UNKNOWN_REQUIRES_VERIFICATION; no vocabulary read established | Verify whether genuinely free text or governed vocabulary; examples/display labels are not authority |
| sufficiency / relevance | EvidenceApprove/RejectRequest: optional bounded strings; rector24 says when applicable | UNKNOWN_REQUIRES_VERIFICATION | Verify decision rubric and allowed values; do not require universally |
| origin_role / link_role | IssueCreateRequest / ActionCompleteRequest: bounded strings | UNKNOWN_REQUIRES_VERIFICATION; do not equate to IAM Role | Verify relation role semantics/codes and ownership |
| frequency_code / selection_method | ControlInstantiateRequest / AssuranceSampleExecuteInput: bounded strings | UNKNOWN_REQUIRES_VERIFICATION | Verify controlled versus business free text; no authorized registry found |
| suggested_owner_role_code | ControlInstantiateRequest: optional bounded string | UNKNOWN_REQUIRES_VERIFICATION; role administration is not automatically a suggestion catalog | Verify canonical role link/allowed tenant/global suggestion semantics; do not grant role |
| Business codes | control_code/test_code/request_code/evidence_code/issue_code/action_code/policy_code and sample_code are caller supplied | USER_INPUT in existing operation; canonical UUIDs generated separately | No business-code generation operation found; retain business guidance or seek explicit future generation decision |
| title/description/rationale/objective/method descriptions/claim/provenance/retest_reference | String business content; retest_reference not a UUID FK in current contract | USER_INPUT; use meaningful business labels | Do not turn into invented catalogs or internal ID inputs |

Evidence: named schemas in `docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml:5986`, `apps/backend/src/core-grc/service.ts:116`, rector 19/21/24/29/31/38/39/44, frozen physical model and migrations, `packages/shared-types/src/index.ts`, import `canonical_vocabularies.json`. Catalog import vocabularies cover normative units, requirement kinds, mappings, crosswalks and control origin; they do not establish severity, priority, evidence type or review scales. Display-text.ts examples and test fixtures are observations, not production vocabulary authority.

## Precise unknown verification register

U-VOC covers the bounded-string semantic families listed above. Product/Domain Owner + Architecture Owner must establish, for each, whether it is genuinely free text or a controlled vocabulary; if controlled, identify its canonical entity or approved executable enum, owner (tenant/platform), version/effective rules, permission, read mechanism and labels. Security reviews retrieval scope. No new catalog entity, enum value or API name is selected in this audit. This register is an explicit later-stage prerequisite, not permission to defer implementation with fallback values.
