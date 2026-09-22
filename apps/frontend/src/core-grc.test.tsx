import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { availableWorkflowActions, canCreate, modules, StatusBadge, type Access } from "./core-grc.js";

describe("Core GRC UI contract", () => {
  it("publishes only the authorized Phase 5 resource modules", () => {
    expect(modules.map(({ path }) => path)).toEqual([
      "/requirement-applicabilities", "/requirement-assessments", "/statements-of-applicability", "/controls",
      "/control-assessments", "/assurance-tests", "/evidence-requests", "/evidence", "/issues", "/actions"
    ]);
    expect(JSON.stringify(modules)).not.toMatch(/risk|incident|supplier|third.part/i);
  });

  it("does not encode lifecycle state by color alone", () => {
    const markup = renderToStaticMarkup(<StatusBadge value="under_review"/>);
    expect(markup).toContain("under review");
    expect(markup).toContain("class=\"status warning\"");
  });

  it("shows lifecycle actions only with the exact permission and state", () => {
    const definition = modules.find(({ id }) => id === "acciones")!;
    const base: Access = { tenant_id: "tenant", membership_id: "membership", permissions: [], scopes: ["tenant"], capability_groups: ["ISSUES_ACTIONS"], roles: [] };
    const row = { lifecycle_state: "in_progress", row_version: 2 };
    expect(availableWorkflowActions(definition, row, base)).toHaveLength(0);
    const permitted = { ...base, permissions: ["remediation.action.transition"], scopes: ["assigned_object"] };
    expect(availableWorkflowActions(definition, row, permitted).map(({ suffix }) => suffix)).toEqual(["submit-for-review"]);
    expect(availableWorkflowActions(definition, row, { ...permitted, scopes: ["tenant"] })).toHaveLength(0);
    expect(availableWorkflowActions(definition, { ...row, lifecycle_state: "verified" }, permitted)).toHaveLength(0);
  });

  it("never exposes the contract-blocked evidence-request fulfillment action", () => {
    const definition = modules.find(({ id }) => id === "solicitudes-evidencia")!;
    const access: Access = { tenant_id: "tenant", membership_id: "membership", permissions: ["evidence.evidence_request.submit"], scopes: ["tenant"], capability_groups: ["EVIDENCE_DOCUMENTS"], roles: [] };
    expect(availableWorkflowActions(definition, { lifecycle_state: "open", row_version: 1 }, access)).toHaveLength(0);
  });

  it("gates create surfaces by capability and exact permission", () => {
    const definition = modules.find(({ id }) => id === "cumplimiento")!;
    const access: Access = { tenant_id: "tenant", membership_id: "membership", permissions: ["compliance.applicability.create"], scopes: ["tenant"], capability_groups: ["ISO_COMPLIANCE"], roles: [] };
    expect(canCreate(definition, access)).toBe(true);
    expect(canCreate(definition, { ...access, permissions: [] })).toBe(false);
    expect(canCreate(definition, { ...access, capability_groups: [] })).toBe(false);
  });
});
