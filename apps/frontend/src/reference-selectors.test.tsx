import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { ContractVocabularySelect, ReferenceState } from "./reference-selectors.js";
import { FORM_VOCABULARIES, PUBLISHED_VOCABULARY_LABELS, VOCABULARY_FIELD_SCHEMAS, PUBLISHED_LIFECYCLE_STATES } from "@tcdx-grc/contracts";
import { publishedOptionLabel } from "./i18n/display-text.js";
describe("reference presentation contracts", () => {
  it("presents a denied state without leaking objects or technical failure", () => {
    const html = renderToStaticMarkup(<ReferenceState state="NO_PERMISSION"/>); expect(html).toContain("role=\"alert\""); expect(html).not.toMatch(/UUID|SQL|stack|tenant_id/); expect(html).toContain("No tienes acceso");
  });
  it("distinguishes temporary failures, empty and configuration states", () => {
    for (const state of ["NO_RECORDS", "NO_ELIGIBLE_RECORDS", "MISSING_CONFIGURATION", "CATALOG_NOT_PUBLISHED", "TEMPORARY_READ_FAILURE"] as const) expect(renderToStaticMarkup(<ReferenceState state={state}/>)).toContain("<p");
    expect(renderToStaticMarkup(<ReferenceState state="TEMPORARY_READ_FAILURE"/>)).not.toContain("No hay registros");
  });
  it("consumes the operation-specific contract enum and accessible label", () => {
    const html = renderToStaticMarkup(<ContractVocabularySelect schemaField="RequirementAssessmentSubmitRequest.domain_conclusion" label="Conclusión" value="" onChange={() => {}}/>);
    expect(html).toContain("Conclusión"); expect(html).toContain("value=\"compliant\""); expect(html).not.toContain("value=\"effective\"");
  });
  it("uses the exact published severity and SoA vocabularies after macro approval", () => {
    expect(FORM_VOCABULARIES["IssueCreateRequest.severity"]).toEqual(["critical","major","moderate","minor"]); expect(FORM_VOCABULARIES["SoaItemCreateInput.applicability_decision"]).toEqual(["applicable","not_applicable"]);
  });
});

describe("published Spanish selector labels", () => {
  it("has a Spanish presentation for every published request option without changing canonical values", () => {
    for (const [key, options] of Object.entries(FORM_VOCABULARIES)) {
      const html = renderToStaticMarkup(<ContractVocabularySelect schemaField={key as keyof typeof FORM_VOCABULARIES} label="Opciones" value="" onChange={() => {}}/>);
      for (const value of options) {
        const schema=(VOCABULARY_FIELD_SCHEMAS as Record<string,string>)[key];
        const label = schema ? (PUBLISHED_VOCABULARY_LABELS as Record<string,Record<string,string>>)[schema]?.[String(value)] : publishedOptionLabel(value);
        expect(label, `${key}:${value}`).toBeDefined();
        if (typeof value === "string") expect(label).not.toBe(value);
        expect(html).toContain(`value="${value}"`);
        expect(html).toContain(`>${label}</option>`);
      }
    }
    expect(publishedOptionLabel("effective")).toBe("Efectivo");
    expect(publishedOptionLabel("effective", "lifecycle")).toBe("Vigente");
  });
  it("translates published lifecycle options and treats unknown translations as unavailable", () => {
    for (const states of Object.values(PUBLISHED_LIFECYCLE_STATES)) for (const state of states) expect(publishedOptionLabel(state, "lifecycle")).toBeDefined();
    expect(publishedOptionLabel("future_unpublished_option")).toBeUndefined();
    const html = renderToStaticMarkup(<ReferenceState state="LOCALIZATION_UNAVAILABLE"/>);
    expect(html).toContain("No hay una traducción disponible");
    expect(html).not.toContain("future_unpublished_option");
  });
});
