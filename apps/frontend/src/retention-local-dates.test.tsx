import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import {tenantLocalCandidates,tenantInstantToLocal,TenantLocalDateTimeField,TenantTimezoneContext,TenantInstantPreview,isUtcEndAfterStart} from './tenant-timezone.js';

describe('STEP6A3 retention local dates',()=>{
  it('converts Santiago local dates using summer and winter IANA offsets',()=>{
    expect(tenantLocalCandidates('2026-10-16T12:30','America/Santiago')).toEqual(['2026-10-16T15:30:00Z']);
    expect(tenantLocalCandidates('2026-07-16T12:30','America/Santiago')).toEqual(['2026-07-16T16:30:00Z']);
  });
  it('preserves seconds and fractions through local editing',()=>{
    const utc='2026-10-16T15:30:42.123456Z';
    expect(tenantInstantToLocal(utc,'America/Santiago')).toBe('2026-10-16T12:30:42.123456');
    expect(tenantLocalCandidates('2026-10-16T12:30:42.123456','America/Santiago')).toEqual([utc]);
  });
  it('keeps an optional end empty and requires configured tenant context',()=>{
    expect(tenantLocalCandidates('','America/Santiago')).toEqual([]);
    expect(tenantLocalCandidates('2026-10-16T12:30',null)).toEqual([]);
    const markup=renderToStaticMarkup(<TenantTimezoneContext.Provider value="America/Santiago"><TenantLocalDateTimeField label="Vigente hasta" value="" onChange={()=>{}}/></TenantTimezoneContext.Provider>);
    expect(markup).toContain('datetime-local');expect(markup).not.toContain('required=""');expect(markup).toContain('America/Santiago');
  });
  it('renders existing UTC as a tenant local edit value and localized read value',()=>{
    const markup=renderToStaticMarkup(<TenantTimezoneContext.Provider value="America/Santiago"><TenantLocalDateTimeField label="Vigente desde" value="2026-10-16T15:30:00Z" onChange={()=>{}}/><TenantInstantPreview value="2026-10-16T15:30:00Z"/></TenantTimezoneContext.Provider>);
    expect(markup).toContain('2026-10-16T12:30:00');expect(markup).toContain('12:30:00');expect(markup).toContain('America/Santiago');
  });
  it('rejects the Santiago DST gap and invalid calendar dates',()=>{
    expect(tenantLocalCandidates('2026-09-06T00:30','America/Santiago')).toEqual([]);
    expect(tenantLocalCandidates('2026-02-30T12:30','America/Santiago')).toEqual([]);
  });
  it('requires explicit selection for both occurrences of the Santiago DST overlap',()=>{
    expect(tenantLocalCandidates('2026-04-04T23:30','America/Santiago')).toEqual(['2026-04-05T02:30:00Z','2026-04-05T03:30:00Z']);
    const markup=renderToStaticMarkup(<TenantTimezoneContext.Provider value="America/Santiago"><TenantLocalDateTimeField label="Vigente desde" value="2026-04-04T23:30" onChange={()=>{}}/></TenantTimezoneContext.Provider>);
    expect(markup).toContain('Primera ocurrencia');expect(markup).toContain('Segunda ocurrencia');expect(markup).toContain('aria-invalid="true"');
  });
  it('preserves chronology including submillisecond differences',()=>{
    expect(isUtcEndAfterStart('2026-10-16T15:30:00Z','2026-10-16T15:30:00.000001Z')).toBe(true);
    expect(isUtcEndAfterStart('2026-10-16T15:30:00.1Z','2026-10-16T15:30:00.100000Z')).toBe(false);
    expect(isUtcEndAfterStart('2026-10-16T15:30:00Z','2026-10-16T15:29:00Z')).toBe(false);
  });
});
