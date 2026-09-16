# TCDX GRC — Dashboard Contract v1.0

Baseline image:

`docs/ui/baselines/dashboard/TCDX_GRC_DASHBOARD_BASELINE_v1.0.png`

## Visual objective

The dashboard is an executive-operational GRC overview. It must communicate status quickly while preserving drill-down into source records.

## Approved layout families

Top section:
- greeting/page context;
- global date/filter context;
- four high-value KPI/status cards.

Middle section:
- compliance by framework;
- trend/evolution visualization;
- requirement status distribution.

Lower section:
- risk category distribution;
- action status;
- recent activity.

## Data rules

- No hardcoded production values.
- Every metric must have a documented backend source/calculation.
- Percentages must disclose denominator/context via label, tooltip or drill-down.
- Empty/insufficient data must not be rendered as zero unless zero is semantically correct.
- Cross-framework totals must respect applicability and result-status contracts.

## Drill-down

Dashboard elements that imply counts/status must link to the corresponding filtered workspace when the target feature exists.
