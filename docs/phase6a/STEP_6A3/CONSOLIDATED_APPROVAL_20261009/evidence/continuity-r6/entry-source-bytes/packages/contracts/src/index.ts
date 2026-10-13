export type FieldError = { field: string; code: string; message: string };

export type {
  AuthenticationProvider,
  AuthenticationProviderAvailability,
  CurrentPrincipalAuthorization,
  TenantPermissionScope
} from "./frontend-auth-projections.js";

export type ProblemEnvelope = {
  code: string;
  message: string;
  correlation_id: string;
  retryable: boolean;
  field_errors?: FieldError[];
  details?: Record<string, unknown>;
};

export type HealthState = "up" | "down";
export type ReadinessResult = {
  state: HealthState;
  dependencies: Record<string, HealthState>;
};

export { RBAC_RESOLUTION_R3, VOCABULARY_FAMILY_CODES, VOCABULARY_PROVENANCE_BINDINGS, VOCABULARY_MANIFEST_SHA256, ROLE_PERMISSION_PUBLICATION, REQUEST_VOCABULARIES, PUBLISHED_VOCABULARY_LABELS, VOCABULARY_FIELD_SCHEMAS, PUBLISHED_VOCABULARY_VERSION, FORM_VOCABULARIES, CANONICAL_OWNERSHIP_CLASSES, PUBLISHED_LIFECYCLE_STATES, type FormVocabularyKey } from "./phase6a-vocabularies.js";
