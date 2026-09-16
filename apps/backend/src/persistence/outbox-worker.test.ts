import { describe, expect, it } from "vitest";
import { completeOutboxEvent } from "./outbox-worker.js";

describe("outbox worker foundation", () => {
  it("rejects an invalid retry policy value before executing SQL", async () => {
    const transaction = {} as Parameters<typeof completeOutboxEvent>[0];
    await expect(completeOutboxEvent(
      transaction,
      { outboxEventId: "00000000-0000-7000-8000-000000000001", attemptCount: 1 },
      { outcome: "retry", availableAt: new Date("2026-09-16T12:00:00Z"), errorCode: "unsafe error text" }
    )).rejects.toMatchObject({ code: "TCDX.VALIDATION.INVALID" });
  });

  it("rejects an invalid retry timestamp before executing SQL", async () => {
    const transaction = {} as Parameters<typeof completeOutboxEvent>[0];
    await expect(completeOutboxEvent(
      transaction,
      { outboxEventId: "00000000-0000-7000-8000-000000000001", attemptCount: 1 },
      { outcome: "retry", availableAt: new Date("invalid"), errorCode: "TCDX.PROVIDER.FAILURE" }
    )).rejects.toMatchObject({ code: "TCDX.VALIDATION.INVALID" });
  });
});
