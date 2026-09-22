import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { availableWorkflowActions, canCreate, DataCard, KpiCard, modules, StatePanel, StatusBadge, TableShell, type Access } from "./core-grc.js";
import { displayValue, fieldLabel, roleLabel } from "./i18n/display-text.js";
import { moduleLabels, uiText } from "./i18n/es.js";
import { STATUS_LABELS, statusLabel } from "./i18n/status-labels.js";

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
    expect(markup).toContain("En revisión");
    expect(markup).toContain("class=\"status info\"");
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

  it("UI_SPANISH_CONSISTENCY centralizes Spanish navigation, modules, states and roles", () => {
    expect(uiText.navigation.dashboard).toBe("Panel principal");
    expect(Object.values(moduleLabels)).toContain("Evaluaciones de control");
    expect(Object.values(STATUS_LABELS)).toEqual(expect.arrayContaining(["Pendiente", "En progreso", "En revisión", "Aprobada", "Cierre verificado"]));
    expect(roleLabel("GRC Manager")).toBe("Responsable GRC");
    expect(fieldLabel("business_owner_subject_id")).toBe("ID del responsable de negocio");
  });

  it("USER_VISIBLE_INTERNAL_CODES never renders known lifecycle or snake-case values", () => {
    for (const code of ["pending", "in_progress", "in_review", "under_review", "remediation_in_progress", "pending_verification", "verified_closed"]) {
      const markup = renderToStaticMarkup(<StatusBadge value={code}/>);
      expect(markup).toContain(statusLabel(code));
      expect(markup).not.toContain(code);
      expect(markup).not.toContain("_");
    }
    expect(displayValue("insufficient_evidence")).toBe("Evidencia insuficiente");
    expect(displayValue("unpublished_internal_code")).toBe("Valor contractual");
  });

  it("VISUAL_COMPONENT_CONSISTENCY reuses the approved component language", () => {
    const markup = renderToStaticMarkup(<>
      <KpiCard label="Registros visibles" value="4" detail="Elementos cargados" tone="teal" icon="check"/>
      <DataCard title="Distribución"><span>Contenido</span></DataCard>
      <TableShell label="Registros"><table><tbody><tr><td>Dato</td></tr></tbody></table></TableShell>
      <StatePanel kind="empty"/>
    </>);
    expect(markup).toContain("kpi-card teal");
    expect(markup).toContain("data-card");
    expect(markup).toContain("table-card");
    expect(markup).toContain("Sin registros visibles");
  });
});
