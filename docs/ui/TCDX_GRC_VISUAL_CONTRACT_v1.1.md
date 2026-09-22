# TCDX GRC — Visual Contract v1.1

Status: `IMPLEMENTED_PENDING_HUMAN_REVIEW`

`VISUAL_BASELINE_ID=TCDX_GRC_VISUAL_BASELINE_v1.1`

`UI_LANGUAGE=es`

`VISUAL_MATURITY=COMMERCIAL_ENTERPRISE`

`DESIGN_SYSTEM_REUSE=REQUIRED`

`USER_VISIBLE_INTERNAL_CODES=0`

`USER_VISIBLE_TEXT_HARDCODED=0`

`FUTURE_UI_PHASES_MUST_CONFORM=TRUE`

`HUMAN_UI_REVIEW=PENDING`

## 1. Authority and functional boundary

This contract evolves visual baseline v1.0 for the authorized Phase 5 Core GRC surfaces. It is presentation authority only. It does not alter the rector baseline, canonical or physical data model, executable contracts, API, RBAC, lifecycle, domain behavior, infrastructure or deployment.

The Tecdex brand source remains `Tecdex-SpA/tecdex-design-system` in read-only mode. Runtime continues to use the local versioned asset `docs/ui/assets/brand/tecdex-logo-light.svg`.

## 2. Permanent presentation language

- All user-visible application copy is Spanish except Tecdex, GRC, ISO, standard acronyms, identifiers, proper names and normative content that must retain its source language.
- Backend, database and OpenAPI codes remain unchanged and are translated only at the presentation boundary.
- Navigation, modules, actions, state messages, form labels, placeholders, accessibility labels and lifecycle labels consume the centralized `apps/frontend/src/i18n/` layer.
- Unknown internal snake-case values are not exposed to users.

## 3. Commercial visual system

- Brand emphasis: Tecdex orange `#F0721D`.
- Secondary/product accent: teal `#51ABA8`.
- Navigation foundation: `#2B3944` to `#00133B`.
- Semantic success: green; warning: amber; danger: red; information: blue.
- Cards use approximately 8 px radii, subtle borders and low-elevation shadows.
- Titles, cards, tables and metadata use the typography hierarchy defined by the task-authorized v1.1 amendment.
- Color supports meaning but never replaces a visible text label.

## 4. Reusable presentation components

Phase 5 surfaces compose the same presentation language through `PageHeader`, `KpiCard`, `DataCard`, `StatusBadge`, `TableShell`, universal `StatePanel` variants and `ResponsiveChartFrame`. Drawers use stable headers, scrollable bodies and stable action footers.

Universal state vocabulary is:

- loading;
- empty;
- insufficient-data;
- not-available;
- permission-denied;
- error;
- partial-data;
- stale.

## 5. Dashboard information design

The dashboard is composed exclusively from existing authorized Phase 5 collection reads. Counts and distributions are labeled as visible or loaded records and are not presented as official organization-wide metrics. No `/dashboard` endpoint, invented aggregation, demo data, unsupported percentage or synthetic trend is permitted.

## 6. Responsive contract

The baseline covers:

- wide desktop: 1536 × 1024;
- standard laptop: 1280 × 800;
- horizontal tablet: 1024 × 768;
- narrow viewport: 390 × 844.

Navigation collapses below the approved breakpoint. KPI cards, chart frames, tables and drawers must remain usable without clipped controls or viewport overflow.

## 7. Versioned evidence

Evidence directory: `docs/ui/baselines/phase5-v1.1/`.

The baseline contains Dashboard plus the ten authorized Phase 5 module surfaces:

1. Aplicabilidad.
2. Evaluaciones de requisitos.
3. Declaración de aplicabilidad.
4. Controles.
5. Evaluaciones de control.
6. Pruebas de aseguramiento.
7. Solicitudes de evidencia.
8. Evidencias.
9. Hallazgos y brechas.
10. Acciones.

Each surface has one deterministic screenshot for every contracted viewport: 44 images total. Playwright validates Spanish lifecycle presentation, keyboard focus, responsive navigation, table visibility and representative drawers without bypassing authorization.

## 8. Acceptance gate

Automated visual and responsive evidence may be `PASS`, but only the human project authority can set `HUMAN_UI_REVIEW=PASS`. Until that separate review occurs, this baseline remains implemented with `HUMAN_UI_REVIEW=PENDING` and does not close Phase 5 runtime.
