import React, { createContext, useContext } from "react";
import { isIanaTimezone, type CurrentPrincipalAuthorization } from "@tcdx-grc/contracts";
import { uiText } from "./i18n/es.js";

export const TenantTimezoneContext = createContext<string | null>(null);

export function selectedTenantTimezone(projection: CurrentPrincipalAuthorization | null, tenantId: string | null): string | null {
  const own = projection?.tenant_permissions;
  return tenantId && own?.tenant_id === tenantId && isIanaTimezone(own.default_timezone) ? own.default_timezone : null;
}

/** Require an explicit instant; never pick an offset for a local wall clock.
 * A supplied local offset must round-trip in the tenant zone, including DST.
 * Fractions are retained lexically instead of silently rounding to milliseconds.
 */
export function tenantInstantToUtc(value: string, zone: string | null): string | null {
  if (!isIanaTimezone(zone)) return null;
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!m || m[6] === "-00:00") return null;
  const wall = `${m[1]}T${m[2]}:${m[3]}:${m[4]}`;
  const naive = new Date(`${wall}Z`);
  if (!Number.isFinite(naive.getTime()) || naive.toISOString().slice(0, 19) !== wall) return null;
  const offset = m[6]!;
  const hours = offset === "Z" ? 0 : Number(offset.slice(1, 3));
  const minutes = offset === "Z" ? 0 : Number(offset.slice(4, 6));
  if (hours > 23 || minutes > 59) return null;
  const delta = (offset.startsWith("-") ? -1 : 1) * (hours * 60 + minutes);
  const instant = new Date(naive.getTime() - delta * 60_000);
  if (!Number.isFinite(instant.getTime())) return null;
  if (offset !== "Z") {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: zone, calendar: "iso8601", numberingSystem: "latn",
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
      .formatToParts(instant);
    const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
    if (`${p.year!.padStart(4, "0")}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}` !== wall) return null;
  }
  return `${instant.toISOString().slice(0, 19)}${m[5] ?? ""}Z`;
}

export function formatTenantInstant(value: string, zone: string | null): string | null {
  const utc = tenantInstantToUtc(value, zone);
  if (!utc || !zone) return null;
  return new Intl.DateTimeFormat("es", { timeZone: zone, dateStyle: "medium", timeStyle: "long" }).format(new Date(utc));
}

export function normalizeSamplePeriods(samples: unknown, zone: string | null): unknown {
  if (!Array.isArray(samples)) throw new Error("INVALID_SAMPLE_PERIOD");
  return samples.map(row => {
    if (!row || typeof row !== "object" || Array.isArray(row)) throw new Error("INVALID_SAMPLE_PERIOD");
    const next = { ...row } as Record<string, unknown>;
    for (const field of ["sample_period_start", "sample_period_end"]) {
      if (next[field] === undefined) continue;
      const utc = typeof next[field] === "string" ? tenantInstantToUtc(next[field], zone) : null;
      if (!utc) throw new Error("INVALID_SAMPLE_PERIOD");
      next[field] = utc;
    }
    return next;
  });
}

export function TenantInstantPreview({ value }: { value: string }) {
  const zone = useContext(TenantTimezoneContext);
  const display = formatTenantInstant(value, zone);
  return display ? <span>{display} · {zone}</span> : value ? <span>{value.endsWith("Z") ? `${value} · ` : ""}{uiText.temporal.contextPending}</span> : null;
}

/** Platform inputs without a selected tenant must name their UTC instant explicitly.
 * This validates a supplied Z value; it never chooses a default timezone. */
export function explicitUtcInstant(value: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value)) return undefined;
  const instant = new Date(value);
  return Number.isFinite(instant.getTime()) && instant.toISOString().slice(0, 19) === value.slice(0, 19) ? value : undefined;
}
