import type { PrincipalClass, ScopeKind } from "@tcdx-grc/shared-types";
import { FoundationError } from "../errors.js";

export type AIRequest = {
  tenantId: string;
  principalId: string;
  principalClass: PrincipalClass;
  purposeCode: string;
  permission: string;
  scope: ScopeKind;
  capabilityEnabled: true;
  objectPolicyAllowed: true;
  purposeApproved: true;
  contentAccessApproved: true;
  contextHash: string;
  classification: string;
  correlationId: string;
  minimizedContext: Record<string, unknown>;
  authorityCeiling: "A2_PROPOSE";
};

export interface AIServicePort {
  readonly origin: "https://ia2.tcdx.int";
  requestAssistance(request: AIRequest): Promise<{ providerReference: string; outputReference: string }>;
}

export class UnavailableAIServicePort implements AIServicePort {
  readonly origin = "https://ia2.tcdx.int" as const;

  async requestAssistance(_request: AIRequest): Promise<{ providerReference: string; outputReference: string }> {
    throw new FoundationError("TCDX.DEPENDENCY.UNAVAILABLE", "AI assistance runtime is not configured", 503, true);
  }
}
