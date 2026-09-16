import type { PrincipalClass } from "@tcdx-grc/shared-types";

export type SafeLogRecord = {
  timestamp: string;
  severity: "debug" | "info" | "warn" | "error";
  service: "tcdx-grc-backend";
  component: string;
  environment: "development" | "test" | "qa" | "production";
  operationCode: string;
  outcome: string;
  correlationId: string;
  requestId?: string;
  eventId?: string;
  causationId?: string;
  tenantPseudonym?: string;
  actorType: PrincipalClass | "SYSTEM";
  durationMs: number;
  errorCode?: string;
  traceId?: string;
  spanId?: string;
};

export type SafeMetricLabels = Readonly<Partial<{
  routeTemplate: string;
  outcome: string;
  dependency: string;
  eventCategory: string;
  status: string;
  component: string;
}>>;

export interface ObservabilityPort {
  log(record: SafeLogRecord): void;
  increment(metric: string, labels: SafeMetricLabels): void;
  observe(metric: string, value: number, labels: SafeMetricLabels): void;
}
