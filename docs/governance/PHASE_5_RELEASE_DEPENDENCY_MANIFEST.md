# TCDX GRC — Phase 5 Release Dependency Manifest

## Decision record

- Decision ID: `DR-PHASE5-RELEASE-DEPS-2026-09-17-003`
- Date: `2026-09-17`
- Status: `APPROVED`
- Owner/approver: Andrés Barouh acting as Product Owner/CPO, Architecture Owner, Security & Privacy Reviewer and QA/Release Owner.
- Gate unlocked: `PHASE_5_RELEASE_DEPENDENCIES=APPROVED`

## Phase 5 capability scope

The Core GRC slice depends on the existing approved capabilities required for:

- ISO/compliance applicability and requirement assessment;
- Statement of Applicability;
- controls and assurance;
- evidence/documents;
- issues/actions/remediation;
- CORE_PLATFORM services required for tenant context, RBAC, audit, outbox and effective configuration.

This manifest does not add a commercial capability, plan or entitlement.

## Regulatory-pack dependencies

```text
GENERIC_PHASE_5_ENGINEERING_GATE_REQUIRES_COMMERCIAL_ISO_PACK=NO
GENERIC_PHASE_5_RUNTIME_GATE_REQUIRES_COMMERCIAL_ISO_PACK=NO
REGULATORY_PACK_GATES_REMAIN_INDEPENDENT=YES
```

A blocked or incomplete regulatory pack blocks official selection/use and any scenario that specifically depends on that pack. It does not block implementation of the generic Phase 5 engines and workflows when those are validated with governed non-normative test fixtures.

Current independent content gates remain authoritative as recorded by Phase 4. This manifest does not convert any `BLOCKED_LICENSE`, `NOT_READY`, `PENDING_STRUCTURED_IMPORT` or human-review state into PASS.

## Development/E2E content policy

Permitted:

- canonical, synthetic, non-normative test Requirements and reference Controls;
- fixtures clearly classified as test/demo data;
- governed non-authoritative test packs only where the Phase 4 execution guard permits them;
- deterministic test evidence/documents that contain no protected ISO normative reconstruction.

Prohibited:

- synthesized or reconstructed ISO normative text;
- representing test fixtures as official ISO or legal content;
- license bypass;
- production/commercial assertion from non-authoritative test packs;
- hardcoded tenant IDs or customer-specific fixtures in application logic;
- changing canonical semantics to accommodate test data.

## Ley 21.719

The official BCN/LeyChile source artifact may remain pending structured import. Phase 5 generic implementation must not depend on completion of that structured import unless a test explicitly targets the Chilean privacy pack. Such a targeted test remains blocked until its independent pack gate is satisfied.

## UI/product-market benchmark dependency

The active TCDX GRC visual baseline under `docs/ui/` is a Phase 5 UI dependency.

GlobalISO, ISOTools and comparable ISO/GRC products are permitted only as non-authoritative market UX/functionality benchmarks for commercial-grade usability: navigation, module discoverability, workflow ergonomics, matrices/tables, dashboard readability, traceability, drill-down and information density.

They are not dependencies for scope, data architecture, canonical semantics, branding, source content or acceptance of a rector gate. No competitor feature may be added merely to achieve parity unless that capability already exists in the TCDX GRC rector scope.

## Runtime/release evidence

Phase 5 can reach `CORE_GRC_SLICE=PASS` only after all F5 functional, RBAC, audit, API, UI, E2E, visual and QA runtime gates required by the rector and active visual contract pass.

Commercial publication of a particular regulatory pack remains separately conditioned by that pack's source/license/coverage/human-review gates.

## Approved state

```text
PHASE_5_RELEASE_DEPENDENCIES=APPROVED
REGULATORY_PACK_GATES_REMAIN_INDEPENDENT=YES
PHASE_5_STARTED=0
PHASE_6_STARTED=0
```
