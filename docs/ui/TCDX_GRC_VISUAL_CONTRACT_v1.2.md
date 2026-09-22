# TCDX GRC — Visual Contract v1.2

Status: `PENDING_HUMAN_APPROVAL`

`VISUAL_BASELINE_ID=TCDX_GRC_VISUAL_BASELINE_v1.2`

`PREVIOUS=TCDX_GRC_VISUAL_BASELINE_v1.1`

`UI_LANGUAGE=es`

`VISUAL_MATURITY=COMMERCIAL_ENTERPRISE`

`DESIGN_SYSTEM_REUSE=REQUIRED`

`USER_VISIBLE_INTERNAL_CODES=0`

`USER_VISIBLE_TEXT_HARDCODED=0`

`FUTURE_UI_PHASES_MUST_CONFORM=TRUE`

`HUMAN_UI_REVIEW=PENDING`

## 1. Authority and boundary

This contract is the presentation-only evolution of visual baseline v1.1. It does not alter product scope, domain semantics, API, RBAC, lifecycle, database, executable contracts, infrastructure or deployment. Tecdex brand assets and tokens remain governed by the active visual authority and the local versioned logo.

## 2. Commercial UI rule

Commercial surfaces must not expose phase names, implementation status, development gates, pending review notices or messages intended for the delivery team. These concepts may exist in governance evidence, never in customer-facing application copy.

All visible application text remains Spanish through the centralized presentation layer. Backend codes remain unchanged and lifecycle/result values are translated at render time. Color supplements a visible label and never carries meaning alone.

## 3. Executive dashboard

The dashboard is graph-forward and uses compact executive hierarchy:

1. Four supported visible-record KPIs.
2. A dominant requirement-result distribution.
3. An operational attention list in source order, without synthetic scoring.
4. Compact control-assessment, remediation and evidence distributions.

Every chart is derived only from existing authorized F5 collection responses already consumed by the frontend:

- requirement assessments: exact `result_status` distribution;
- control assessments: exact `lifecycle_state` distribution;
- issues and actions: separate exact `lifecycle_state` distributions;
- evidence requests and evidence: separate exact `lifecycle_state` distributions.

Percentages are allowed only as a part-to-whole calculation over the records currently rendered by that chart. The UI must state `Sobre registros visibles` and disclose when a collection has additional pages. No visible page may be extrapolated to the tenant universe.

## 4. Data integrity

- No fake metrics, demo values, inferred benchmarks, targets or synthetic trends.
- No absence represented as zero when the collection is unavailable or lacks usable chart fields.
- Insufficient information uses the shared `Datos insuficientes` state.
- Lifecycle states are not silently grouped into invented compliance categories.
- Charts expose Spanish titles, labels, accessible names and tooltips.
- Desired framework-level comparisons and temporal trends remain `DATA_NOT_AVAILABLE_FOR_VISUALIZATION` until authoritative data already exists in the presentation response.

## 5. Enterprise density and responsive behavior

Desktop and laptop first viewports must show the executive summary, dominant compliance visual, operational attention and a relevant portion of the control/remediation/evidence line without sacrificing legibility. Tablet and narrow layouts stack predictably, keep charts within the viewport and preserve controlled table scrolling and drawer access.

The existing `PageHeader`, `KpiCard`, `DataCard`, `StatusBadge`, `TableShell`, universal `StatePanel` and `ResponsiveChartFrame` remain the reusable visual system. Distribution primitives extend that system without a second component architecture or chart dependency.

## 6. Versioned evidence

Evidence directory: `docs/ui/baselines/phase5-v1.2/`.

The baseline retains v1.1 and adds 44 deterministic screenshots: Dashboard plus ten authorized module surfaces across desktop 1536×1024, laptop 1280×800, tablet 1024×768 and narrow 390×844.

Automated visual, responsive, Spanish presentation and internal-code checks may pass. Only the human project authority can set `HUMAN_UI_REVIEW=PASS`; this baseline remains pending that review.
