# TCDX GRC — Design Tokens Contract v1.0

Reference authority: `Tecdex-SpA/tecdex-design-system` (READ ONLY).
Source token set reviewed: `tokens/tokens.json`.

## Brand colors

| Token | Value | Intended use |
|---|---:|---|
| primary | `#F0721D` | Primary CTA, active navigation, principal accent |
| primaryHover | `#D5630F` | Hover |
| primaryActive | `#B8540B` | Active/pressed |
| secondary | `#51ABA8` | Secondary actions, progress/accent |
| secondaryHover | `#438E8B` | Secondary hover |
| navy | `#2B3944` | Dark navigation/surfaces |
| navyDeep | `#00133B` | Deep navigation/overlay use |
| background | `#FFFFFF` | Main workspace |
| surface | `#F2F2F2` | Secondary surface |
| surfaceAlt | `#EDEFEF` | Alternate neutral surface |
| border | `#D8D8D8` | Borders/dividers |
| textPrimary | `#444444` | Main body text |
| textSecondary | `#777777` | Supporting text |
| textMuted | `#54595F` | Muted text |
| success | `#23A455` | Positive state |
| warning | `#FBC962` | Warning state |
| danger | `#C95B5B` | Error/danger |

## Typography

- Heading: Roboto/system fallback.
- Display: Lato/system fallback where appropriate.
- Body: system UI stack.
- Prefer 13–16 px for dense application UI body/labels and larger sizes only for page/KPI hierarchy.

## Spacing

Use the reference scale:

`4, 8, 12, 16, 24, 32, 48, 64, 96 px`

Application UI should primarily compose the 8–32 px range.

## Radius

- small: 8 px
- medium: 15 px
- large: 25 px

Application cards should default to small/medium rather than excessive pill styling.

## Shadows

Use subtle shadows only. Borders and surface contrast should carry most component separation.

## Token governance

- New raw colors in component code are forbidden unless documented and approved.
- Components should consume semantic tokens, not arbitrary literals.
- Brand-source repository is read-only and must never be modified by TCDX GRC development.
