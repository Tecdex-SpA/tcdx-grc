export type FieldError = { field: string; code: string; message: string };

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
