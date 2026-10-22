import { describe, it, expect, vi } from "vitest";
import { ApiClient, ApiProblem } from "./api-client.js";
import { readBusinessReferences, readReferences, readControlVersions, readEvidenceVersions, businessLabel } from "./reference-read.js";
const tenant = "018f47f2-6170-7bd0-9d43-12f644a2b111";
function fixture() {
  let active = tenant;
  const api = new ApiClient("http://127.0.0.1", {} as never, () => ({ tenantId: active }) as never);
  const request = vi.spyOn(api, "request");
  return { api, request, changeTenant: () => { active = "018f47f2-6170-7bd0-9d43-12f644a2b112"; } };
}
const page = (items: Record<string, unknown>[], next: string | null = null) => ({ items, page: { has_more: !!next, next_cursor: next } });
describe("canonical reference read adapters", () => {
  it("STEP6A3 evidence control target excludes global controls without changing general catalog reads", async () => {
    const {api,request}=fixture();
    request.mockResolvedValue(page([
      {control_id:"global",tenant_id:null,ownership_class:"PLATFORM_CONTROL",name:"Protección de evidencias",lifecycle_state:"draft"},
      {control_id:"tenant",tenant_id:tenant,ownership_class:"TENANT_OWNED",name:"Control propio",lifecycle_state:"active"}
    ],"next-page"));
    const scoped=await readReferences(api,"control",{tenantOwnedControl:true});
    expect(scoped.options.map(x=>x.value)).toEqual(["tenant"]);
    expect(scoped.nextCursor).toBe("next-page");
    expect((await readReferences(api,"control",{})).options.map(x=>x.value)).toEqual(["global","tenant"]);
    request.mockResolvedValue(page([{control_id:"global",ownership_class:"PLATFORM_CONTROL",name:"Global",lifecycle_state:"draft"}],"more"));
    const empty=await readReferences(api,"control",{tenantOwnedControl:true,cursor:"next-page"});
    expect(empty.options).toEqual([]);expect(empty.nextCursor).toBe("more");
  });
  it("keeps only published, effective applicability for the chosen policy and file classification", async () => {
    const { api, request } = fixture();
    const base = { tenant_id: tenant, retention_policy_id: tenant, purpose: "evidence_document", lifecycle_state: "published", effective_from: "2020-01-01T00:00:00Z", effective_to: "2100-01-01T00:00:00Z", version_number: 1 };
    request.mockResolvedValue(page([
      { ...base, retention_policy_applicability_id: "eligible", classification: "internal", scope_subject_id: null },
      { ...base, retention_policy_applicability_id: "other-class", classification: "confidential" },
      { ...base, retention_policy_applicability_id: "expired", classification: "internal", effective_to: "2020-01-02T00:00:00Z" },
      { ...base, retention_policy_applicability_id: "scoped", classification: "internal", scope_subject_id: "owner" }
    ]));
    const result = await readReferences(api, "retentionPolicyApplicability", { parentId: tenant, publishedOnly: true, classification: "internal" });
    expect(request.mock.calls[0]![0]).toContain(`filter%5Bretention_policy_id%5D=${tenant}`);
    expect(request.mock.calls[0]![0]).toContain("filter%5Blifecycle_state%5D=published");
    expect(result.options.map(option => option.value)).toEqual(["eligible"]);
  });
  it("searches and pages Subject using only published parameters", async () => {
    const { api, request } = fixture(); request.mockResolvedValue(page([{ subject_id: tenant, display_name: "Responsable" }], "opaque"));
    const result = await readReferences(api, "subject", { query: "responsable", subjectType: "person", cursor: "prev" });
    expect(request.mock.calls[0]![0]).toContain("filter%5Bquery%5D=responsable");
    expect(request.mock.calls[0]![0]).toContain("page%5Bcursor%5D=prev"); expect(result.nextCursor).toBe("opaque"); expect(result.options[0]!.label).toBe("Responsable");
  });
  it("rejects cross-tenant response rows", async () => {
    const { api, request } = fixture(); request.mockResolvedValue(page([{ subject_id: tenant, tenant_id: "other", display_name: "private" }]));
    await expect(readReferences(api, "subject", {})).rejects.toThrow("REFERENCE_CONTEXT_CHANGED");
  });
  it("rejects a late response after tenant change", async () => {
    const { api, request, changeTenant } = fixture(); request.mockImplementation(async () => { changeTenant(); return page([]); });
    await expect(readReferences(api, "subject", {})).rejects.toThrow("REFERENCE_CONTEXT_CHANGED");
  });
  it("never changes a denied read into an empty result", async () => {
    const { api, request } = fixture(); request.mockRejectedValue(new ApiProblem({ code: "denied", message: "private SQL", correlation_id: "test", retryable: false }, 403));
    await expect(readReferences(api, "subject", {})).rejects.toMatchObject({ status: 403 });
  });
  it("does not create invented search or parent filters", async () => {
    const { api, request } = fixture(); await expect(readReferences(api, "issue", { query: "ab" })).rejects.toThrow("INVALID_REFERENCE_SEARCH");
    await expect(readReferences(api, "assuranceTest", { subjectType: "person" })).rejects.toThrow("UNSUPPORTED_REFERENCE_FILTER");
    await expect(readReferences(api, "evidence", { parentId: tenant })).rejects.toThrow("UNSUPPORTED_REFERENCE_RELATION"); expect(request).not.toHaveBeenCalled();
  });
  it("uses only the supported Control parent, never ControlAssessment as test parent", async () => {
    const { api, request } = fixture(); request.mockResolvedValue(page([])); await readReferences(api, "assuranceTest", { parentId: tenant });
    expect(request.mock.calls[0]![0]).toContain("filter%5Bcontrol_id%5D="); expect(request.mock.calls[0]![0]).not.toContain("control_assessment_id");
  });
  it("rejects malformed pagination instead of silently truncating choices", async () => {
    const { api, request } = fixture(); request.mockResolvedValue({ items: [], page: { has_more: true, next_cursor: null } });
    await expect(readReferences(api, "subject", {})).rejects.toThrow("INVALID_REFERENCE_PAGE");
  });
  it("strips UUIDs from all business labels", () => { expect(businessLabel({ name: `Control ${tenant}`, control_code: "CTL-01" })).toBe("CTL-01 · Control"); });
  it("rejects malformed identity projections", async () => {
    const { api, request } = fixture(); request.mockResolvedValue(page([{ display_name: "missing ID" }]));
    await expect(readReferences(api, "subject", {})).rejects.toThrow("INVALID_REFERENCE_PROJECTION");
  });
  it("preserves exact versions and rejects a global Control as tenant implementation", async () => {
    const { api, request } = fixture(); request.mockResolvedValue({ control_id: tenant, ownership_class: "GLOBAL_REFERENCE", name: "Base", versions: [{ control_version_id: tenant, version_number: 2 }] });
    await expect(readControlVersions(api, tenant, "tenant")).rejects.toThrow("INELIGIBLE_CONTROL_PARENT");
    expect((await readControlVersions(api, tenant, "reference")).options[0]!.value).toBe(tenant);
  });
  it("rejects a mismatched child version", async () => {
    const { api, request } = fixture(); request.mockResolvedValue({ control_id: tenant, ownership_class: "TENANT_OWNED", versions: [{ control_version_id: tenant, control_id: "other", version_number: 1 }] });
    await expect(readControlVersions(api, tenant, "tenant")).rejects.toThrow("INCOMPATIBLE_CONTROL_VERSION");
  });
});

describe("eligible EvidenceVersion references", () => {
  it("requires authorized approved versions and the exact fulfillment target", async () => {
    const { api, request } = fixture();
    request.mockImplementation(async path => {
      if (path.includes("evidence-requests")) return { evidence_request_id: tenant, lifecycle_state: "open", control_id: tenant };
      if (path.includes("evidence-versions")) return { evidence_version_id: tenant, evidence_id: tenant, lifecycle_state: "approved", version_number: 2, links: [{ control_id: tenant }] };
      return { evidence_id: tenant, evidence_code: "EV-01", versions: [{ evidence_version_id: tenant, lifecycle_state: "approved" }, { evidence_version_id: "draft", lifecycle_state: "draft" }] };
    });
    const result = await readEvidenceVersions(api, tenant, tenant); expect(result.options).toHaveLength(1); expect(result.options[0]!.label).toContain("EV-01 · v2"); expect(request).toHaveBeenCalledTimes(3);
  });
  it("never offers an approved version linked to a different target", async () => {
    const { api, request } = fixture();
    request.mockResolvedValueOnce({ evidence_id: tenant, evidence_code: "EV", versions: [{ evidence_version_id: tenant, lifecycle_state: "approved" }] }).mockResolvedValueOnce({ evidence_request_id: tenant, lifecycle_state: "open", control_id: tenant }).mockResolvedValueOnce({ evidence_version_id: tenant, evidence_id: tenant, lifecycle_state: "approved", links: [{ control_id: "other" }] });
    expect((await readEvidenceVersions(api, tenant, tenant)).options).toHaveLength(0);
  });
});

describe("Spanish reference presentation", () => {
  it("translates canonical types and states while retaining authorized names and business codes", () => {
    expect(businessLabel({ display_name: "Operaciones", subject_type: "process", canonical_key: "process_key", lifecycle_state: "active" })).toBe("Operaciones · Proceso · Activo");
    expect(businessLabel({ name: "Base", control_code: "BASE-001", lifecycle_state: "published" })).toBe("BASE-001 · Base · Publicada");
  });
  it("does not display unknown operational English as a definitive business label", () => {
    expect(() => businessLabel({ display_name: "Operaciones", subject_type: "unknown_extension" })).toThrow("REFERENCE_LOCALIZATION_UNAVAILABLE");
    expect(() => businessLabel({ name: "Base", lifecycle_state: "unknown_state" })).toThrow("REFERENCE_LOCALIZATION_UNAVAILABLE");
  });
});

describe("STEP6A3 purpose-bound business reference adapters",()=> {
 it("uses the dedicated framework permission endpoint and business version labels",async()=>{const {api,request}=fixture();request.mockResolvedValue(page([{framework_version_id:tenant,framework_code:"ISO",framework_name:"Marco",edition:"2022",version_number:9223372036854775807n,selectable:true}]));const result=await readBusinessReferences(api,{kind:"framework",purpose:"select"});expect(request.mock.calls[0]![0]).toContain("/framework-version-references?");expect(result.options[0]!.label).toContain("9223372036854775807");expect(result.options[0]!.label).not.toContain(tenant);});
 it("passes exact parent/purpose for responsible selection and never uses membership administration",async()=>{const {api,request}=fixture();request.mockResolvedValue(page([{tenant_membership_id:tenant,display_name:"Responsable",joined_at:"2026-10-09T00:00:00Z",selectable:true}]));await readBusinessReferences(api,{kind:"membership",purpose:"action-assignment",parents:{issue_id:tenant}});const path=request.mock.calls[0]![0];expect(path).toContain("/membership-references?");expect(path).toContain("purpose=action-assignment");expect(path).toContain("issue_id=");expect(path).not.toContain("/memberships?");});
 it("clears access on tenant change and preserves denied/ineligible errors",async()=>{const {api,request,changeTenant}=fixture();request.mockImplementation(async()=>{changeTenant();return page([]);});await expect(readBusinessReferences(api,{kind:"framework",purpose:"select"})).rejects.toThrow("REFERENCE_CONTEXT_CHANGED");const f=fixture();f.request.mockRejectedValue(new ApiProblem({code:"TCDX.INVARIANT.VIOLATION",message:"Policy pending",correlation_id:tenant,retryable:false},422));await expect(readBusinessReferences(f.api,{kind:"retention",purpose:"upload"})).rejects.toMatchObject({status:422});});
 it("parses exact wire int64 without silently rounding",async()=>{const fetchMock=vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response('{"items":[{"version_number":9223372036854775807,"retention_seconds":0}],"page":{"has_more":false,"next_cursor":null}}',{status:200,headers:{"content-type":"application/json"}}));const api=new ApiClient("http://127.0.0.1",{getAccessToken:async()=>"synthetic-test-token"} as never,()=>({tenantId:tenant}) as never);try{const page=await api.request<{items:Array<{version_number:bigint;retention_seconds:number}>}>("/api/v1/framework-version-references");expect(page.items[0]!.version_number).toBe(9223372036854775807n);expect(page.items[0]!.retention_seconds).toBe(0);}finally{fetchMock.mockRestore();}});
});

describe("reference temporal labels consume persisted context", () => {
  it("keeps timestamps pending without a zone instead of using the host", () => {
    expect(businessLabel({ name: "Assessment", assessed_at: "2026-10-25T00:30:00Z" })).toContain("pendiente");
  });
  it("formats the same instant in the supplied tenant zone", () => {
    const row = { name: "Assessment", assessed_at: "2026-10-25T00:30:00Z" };
    expect(businessLabel(row, "Europe/Berlin")).not.toBe(businessLabel(row, "Asia/Tokyo"));
    expect(businessLabel(row, "Invalid/Zone")).toContain("pendiente");
  });
});
