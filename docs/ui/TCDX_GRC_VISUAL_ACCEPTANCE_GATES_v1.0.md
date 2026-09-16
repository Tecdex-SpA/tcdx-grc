# TCDX GRC — Visual Acceptance Gates v1.0

A frontend phase or slice that changes approved surfaces cannot be closed solely with functional tests.

## Required gates

`DESIGN_SYSTEM_REFERENCE=PASS`

Implementation uses approved Tecdex tokens/assets and does not modify the read-only design-system repository.

`VISUAL_BASELINE_CONFORMANCE=PASS`

Key surfaces preserve approved layout, hierarchy, brand identity and component language.

`VISUAL_REGRESSION_TESTS=PASS`

Playwright or equivalent captures deterministic baseline screenshots for stable states.

`RESPONSIVE_REVIEW=PASS`

Desktop plus relevant narrower viewport(s) remain usable.

`ACCESSIBILITY_UI_GATE=PASS`

Keyboard/focus/labels/contrast and non-color-only state representation checked.

`HUMAN_UI_REVIEW=PASS`

The human project authority visually reviews the QA implementation before the relevant frontend gate is closed.

## Screenshot baseline policy

- Baseline screenshots are versioned artifacts.
- Updating a baseline is an explicit review action, not an automatic test update.
- Intentional changes require human approval and a commit explaining the visual change.
- Pixel-perfect identity is not required where browser/platform rendering differs, but layout, hierarchy, brand, states and key component geometry must remain materially conformant.
