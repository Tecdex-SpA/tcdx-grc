# TCDX GRC — Component Contract v1.0

## Core reusable components

The frontend shall converge on shared components for:

- AppShell
- SidebarNavigation
- TopBar
- GlobalSearch
- TenantSelector
- UserMenu
- PageHeader
- FilterBar
- DateRangeSelector
- KpiCard
- DataCard
- StatusBadge
- ProgressBar
- DonutChart
- LineChart
- BarChart
- DataTable
- EmptyState
- LoadingState/Skeleton
- ErrorState
- UnauthorizedState
- Drawer/Modal
- FormField
- EvidenceStatus
- ActivityFeed

## Rules

- Domain screens compose shared components instead of inventing new visual primitives.
- Business state colors use semantic tokens.
- Iconography must remain consistent across the application.
- Cards, forms, tables and drawers must share spacing, borders, radii and interaction behavior.
- Buttons have a small controlled hierarchy: primary, secondary, tertiary/ghost, destructive.
- Tables must support loading, empty, error, pagination/filtering as required by functional contracts.
