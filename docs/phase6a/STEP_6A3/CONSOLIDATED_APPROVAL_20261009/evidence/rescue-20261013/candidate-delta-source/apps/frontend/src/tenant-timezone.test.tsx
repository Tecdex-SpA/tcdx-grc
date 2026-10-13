import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { parseCurrentAuthorization } from "./frontend-auth-projections.js";
import { TenantTimezoneContext, TenantInstantPreview, selectedTenantTimezone, tenantInstantToUtc, normalizeSamplePeriods, explicitUtcInstant } from "./tenant-timezone.js";

const tenant = "01900000-0000-7000-8000-000000000001";
const projection = (zone: unknown) => ({ evaluated_at: "2026-10-13T12:00:00Z", platform_permissions: [],
  tenant_permissions: { tenant_id: tenant, default_timezone: zone, permissions: {} } });

describe("STEP6A3 D3 tenant temporal context", () => {
  it("accepts a persisted zone with zero grants without inventing Tenant.read", () => {
    const own = parseCurrentAuthorization(projection("Pacific/Auckland"), tenant);
    expect(own?.tenant_permissions?.permissions).toEqual({});
    expect(selectedTenantTimezone(own, tenant)).toBe("Pacific/Auckland");
    expect(selectedTenantTimezone(own, "01900000-0000-7000-8000-000000000002")).toBeNull();
    expect(selectedTenantTimezone(own, null)).toBeNull();
    expect(selectedTenantTimezone(null, tenant)).toBeNull();
  });
  it.each([undefined, null, "", "+02:00", "invalid/zone", "x".repeat(65)])("rejects malformed or missing zone %s", zone => {
    expect(parseCurrentAuthorization(projection(zone), tenant)).toBeNull();
  });
  it("rejects ambiguous and nonexistent local clocks without an explicit instant", () => {
    expect(tenantInstantToUtc("2026-03-29T02:30:00", "Europe/Berlin")).toBeNull();
    expect(tenantInstantToUtc("2026-03-29T02:30:00+01:00", "Europe/Berlin")).toBeNull();
    expect(tenantInstantToUtc("2026-03-29T02:30:00+02:00", "Europe/Berlin")).toBeNull();
    expect(tenantInstantToUtc("2026-10-25T02:30:00", "Europe/Berlin")).toBeNull();
    expect(tenantInstantToUtc("2026-10-25T02:30:00+02:00", "Europe/Berlin")).toBe("2026-10-25T00:30:00Z");
    expect(tenantInstantToUtc("2026-10-25T02:30:00+01:00", "Europe/Berlin")).toBe("2026-10-25T01:30:00Z");
  });
  it("preserves fractional precision and validates nonhour offsets/calendar/unknown offset", () => {
    expect(tenantInstantToUtc("2026-10-13T12:00:00.123456+05:45", "Asia/Kathmandu")).toBe("2026-10-13T06:15:00.123456Z");
    expect(tenantInstantToUtc("2026-02-30T12:00:00Z", "UTC")).toBeNull();
    expect(tenantInstantToUtc("2026-10-13T12:00:00-00:00", "UTC")).toBeNull();
    expect(tenantInstantToUtc("2026-10-13T12:00:00+24:00", "UTC")).toBeNull();
    expect(tenantInstantToUtc("2026-10-13T12:00:00Z", null)).toBeNull();
  });
  it("shows the tenant zone and cannot serialize periods after context loss", () => {
    const samples = [{ sample_code: "shape-only", sample_period_start: "2026-10-25T02:30:00+02:00" }];
    expect(normalizeSamplePeriods(samples, "Europe/Berlin")).toEqual([{ sample_code: "shape-only", sample_period_start: "2026-10-25T00:30:00Z" }]);
    expect(() => normalizeSamplePeriods(samples, null)).toThrow("INVALID_SAMPLE_PERIOD");
    expect(normalizeSamplePeriods([{ sample_code: "shape-only" }], null)).toEqual([{ sample_code: "shape-only" }]);
    const markup = renderToStaticMarkup(<TenantTimezoneContext.Provider value="Europe/Berlin"><TenantInstantPreview value="2026-10-25T00:30:00Z"/></TenantTimezoneContext.Provider>);
    expect(markup).toContain("Europe/Berlin");
    const lost = renderToStaticMarkup(<TenantTimezoneContext.Provider value={null}><TenantInstantPreview value="2026-10-25T00:30:00Z"/></TenantTimezoneContext.Provider>);
    expect(lost).not.toContain("Europe/Berlin");
    expect(lost).toContain("pendiente");
  });
});

// The same explicit instant must survive host/browser timezone differences unchanged.
describe("platform instant input without inferred timezone", () => {
  it.each(["2026-10-25T00:30:00Z", "2026-10-13T12:00:00.123456Z"])("preserves supplied UTC precision %s", value => {
    expect(explicitUtcInstant(value)).toBe(value);
  });
  it.each(["2026-10-25T02:30", "2026-10-25T02:30:00", "2026-03-29T02:30:00+01:00", "2026-02-30T12:00:00Z", ""])("rejects unsupplied/invalid UTC identity %s", value => {
    expect(explicitUtcInstant(value)).toBeUndefined();
  });
});
