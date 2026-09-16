# TCDX GRC — Visual Contract v1.0

Status: HUMAN_APPROVED_BASELINE
Approved visual direction: dashboard baseline v1.0
Purpose: make TCDX GRC visual implementation verifiable and stable without altering the canonical domain, database, RBAC, lifecycle, or regulatory contracts.

## 1. Authority and precedence

1. Functional/domain authority remains the active TCDX GRC rector baseline.
2. Brand authority is Tecdex visual identity. The read-only reference repository is `Tecdex-SpA/tecdex-design-system`.
3. Official logo authority is `https://tecdex.net/wp-content/uploads/2019/08/logo-luz.svg`.
4. Runtime UI MUST use a local, versioned copy of the approved logo asset. Runtime dependency on tecdex.net is forbidden.
5. This visual contract may constrain presentation but MUST NOT redefine canonical domain semantics.

## 2. Approved visual direction

The approved dashboard baseline is:

`docs/ui/baselines/dashboard/TCDX_GRC_DASHBOARD_BASELINE_v1.0.png`

The implementation shall preserve the following visual characteristics:

- dark navy left navigation;
- light neutral workspace;
- compact enterprise SaaS information density;
- white card surfaces with subtle borders/shadows;
- Tecdex orange as primary action/accent color;
- teal/green for secondary/progress/success signals;
- neutral gray for secondary information;
- clear KPI hierarchy;
- dashboard charts integrated into card layout;
- consistent spacing, radii, typography and state treatment;
- desktop-first layout with responsive degradation;
- Spanish UI copy unless product localization rules explicitly select another language.

## 3. Non-negotiable brand rules

- Do not recreate or redraw the Tecdex logo.
- Do not recolor the logo outside approved source variants.
- Do not use an AI-generated approximation of the logo.
- Primary brand color: `#F0721D`.
- Secondary brand color: `#51ABA8`.
- Dark navigation foundation: `#2B3944` / `#00133B` family.
- Main background: `#FFFFFF`.
- Surface: `#F2F2F2` / `#EDEFEF` family.
- Main text: `#444444` / dark navy where hierarchy requires it.

## 4. Product shell

### Left navigation

- fixed/collapsible vertical navigation on desktop;
- dark background;
- official Tecdex logo at top;
- active item uses orange emphasis;
- primary navigation separated from configuration/admin items;
- icons must use one consistent icon family;
- no decorative icon mixing.

### Top bar

- global search;
- tenant/company selector;
- notifications;
- user identity and role;
- clear border/separation from content workspace.

### Workspace

- maximum useful horizontal density without creating visually crowded forms;
- card grid with coherent alignment;
- page title and supporting description before KPI/data surfaces;
- filters/date range aligned to page context.

## 5. Dashboard baseline content model

The approved baseline establishes visual patterns, not hardcoded business values. Dashboard data must come from backend/runtime contracts.

Approved component families include:

- KPI summary cards;
- donut/progress charts;
- horizontal progress by framework;
- line trends;
- categorical bar charts;
- state distributions;
- recent activity feed;
- contextual phase/implementation callout when relevant to non-production environments.

## 6. Interaction states

Every reusable surface must support, where applicable:

- loading;
- empty;
- insufficient data;
- unauthorized;
- validation error;
- conflict/concurrency;
- success;
- archived/closed/read-only;
- disabled due to entitlement or lifecycle state.

Security and authorization MUST remain backend-authoritative.

## 7. Responsive behavior

Desktop baseline is authoritative for layout direction.

Responsive implementation must:

- collapse navigation safely;
- preserve content hierarchy;
- avoid horizontal overflow for principal workflows;
- stack KPI/cards predictably;
- keep tables usable via responsive columns or controlled horizontal scrolling;
- preserve readable touch targets.

## 8. Accessibility

Required:

- WCAG-conscious contrast;
- keyboard navigation;
- visible focus;
- semantic labels;
- charts not dependent on color alone;
- form errors linked to controls;
- accessible names for icon-only buttons.

## 9. Implementation rule

No screen may establish a competing visual language. New screens must compose approved tokens and shared components.

No substantial visual redesign is allowed without a new human-approved baseline version.
