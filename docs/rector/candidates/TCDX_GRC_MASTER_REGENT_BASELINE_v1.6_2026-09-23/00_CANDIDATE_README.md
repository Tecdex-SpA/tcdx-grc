# TCDX GRC master regent v1.6 — PRE-F5E candidate overlay

`BASELINE_ID=TCDX_GRC_MASTER_REGENT_BASELINE_v1.6_2026-09-23`

`BASELINE_STATUS=PENDING_HUMAN_APPROVAL`

## Authority

This directory is a reviewable, content-addressed candidate overlay on active immutable baseline `TCDX_GRC_MASTER_REGENT_BASELINE_v1.5_2026-09-16` at base commit `04a2d3b29ed7853d88d28cc64e6d1eb7647ea895`. It does not modify, supersede or activate itself over `docs/rector/baseline/`.

The human project authority approved the PRE-F5E product/architecture decisions F5D-001, F5D-002 and F5D-003, and the F5D-007 one-time First Platform Admin Bootstrap decision, on 2026-09-23. Formal activation still requires independent human review of this exact checksummed candidate and the repository's normal baseline activation process.

## Closed scope

The candidate changes only the affected IAM/RBAC, lifecycle, logical-relational, canonical-catalog and final-semantic contracts:

- `09_TCDX_GRC_RBAC_MODEL.md`;
- `21_LIFECYCLE_TRANSITION_MATRIX.md`;
- `22_RBAC_PERMISSION_SCOPE_MATRIX.md`;
- `30_MODELO_LOGICO_RELACIONAL_CANONICO.md`;
- `33_CATALOGO_ENTIDADES_CANONICAS.md`;
- `39_DECISIONES_SEMANTICAS_FINALES_PRE_MODELO_FISICO.md`.

Every other v1.5 rector document is inherited unchanged. F5D-007 adds no entity or public API: it closes only the fail-closed internal bootstrap ceremony over the already-candidate `PlatformRoleAssignment`. This overlay adds no capability group, plan, provider-specific semantic, credential store, fake/platform tenant or parallel IAM.

## Human gate

`HUMAN_GATE_REQUIRED=PRE_F5E_RECTOR_AMENDMENT_REVIEW`

Required approver roles: Product Owner/CPO, Architecture Owner, Data Model Owner, Security & Privacy Reviewer, Backend Owner and QA/Release Owner.
