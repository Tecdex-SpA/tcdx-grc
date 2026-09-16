import type { ProblemEnvelope } from "@tcdx-grc/contracts";

export class FoundationError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly statusCode: number,
    readonly retryable = false,
    readonly details?: Record<string, unknown>
  ) {
    super(message);
  }
}

export function problemFromError(error: unknown, correlationId: string): { statusCode: number; body: ProblemEnvelope } {
  if (error instanceof FoundationError) {
    return {
      statusCode: error.statusCode,
      body: {
        code: error.code,
        message: error.message,
        correlation_id: correlationId,
        retryable: error.retryable,
        ...(error.details ? { details: error.details } : {})
      }
    };
  }
  return {
    statusCode: 500,
    body: { code: "TCDX.INTERNAL.FAILURE", message: "Internal failure", correlation_id: correlationId, retryable: false }
  };
}
