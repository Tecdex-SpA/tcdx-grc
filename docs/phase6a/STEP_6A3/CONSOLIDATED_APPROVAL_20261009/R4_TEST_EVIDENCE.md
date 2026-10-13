# Verificaciones ejecutadas R4

Cambio R4: documentación y propuesta DRAFT; cero cambios runtime/contratos efectivos/SQL. Node v22.23.2 para generadores; Python3 del entorno local para verificadores. Logs, comandos, UTC, duración y exit code: evidence/continuity-r4/checks.json. SHA-256 de logs en manifest R4. Sin credenciales, sockets de BD ni conexiones QA/IAM.

| Check | Comando real | Resultado | Duración segundos | Log |
|---|---|---|---|---|
| rector | `bash scripts/verify-rector-governance.sh` | PASS (exit 0) | 0.414 | evidence/continuity-r4/rector.log |
| status | `bash scripts/test-rector-governance-status.sh` | PASS (exit 0) | 1.559 | evidence/continuity-r4/status.log |
| contracts | `node scripts/foundations/generate-contract-assets.mjs --check` | PASS (exit 0) | 0.064 | evidence/continuity-r4/contracts.log |
| vocabulary | `node scripts/foundations/generate-phase6a-vocabularies.mjs --check` | PASS (exit 0) | 0.178 | evidence/continuity-r4/vocabulary.log |
| governance-negatives | `python3 scripts/verify-internal-governance.py --negative-tests` | PASS (exit 0) | 0.073 | evidence/continuity-r4/governance-negatives.log |
| residuals | `python3 scripts/foundations/verify-phase6a3-residuals.py` | PASS (exit 0) | 0.144 | evidence/continuity-r4/residuals.log |
| whitespace | `git diff --check` | PASS (exit 0) | 0.122 | evidence/continuity-r4/whitespace.log |

## Evidencia R3 comprobada sin repetir

850 assertions passed en85archivos,737unit+113PG en18archivos,0failed/0pending/0todo. Los82PG antes omitidos figuran efectivamente passed en15archivos; otros16EC+12referencias+3R3=113. El handoff dice17archivos para los82: discrepancia de conteo documental; el JSON definitivo acredita15 para esos82 y18PG totales. No se renombra ni excluye una suite. El contenido fuente/DDL/tests relevante coincide con el snapshot del runner. Esto verifica evidencia guardada; no es reejecución en R4.

460browser simulados (API/IAM),38UQ/default,8RBAC R2 y12RBAC R3 son suites separadas verificadas por reportes/hash. Los16EC y3testsPG R3 ya están dentro de850; no se suman de nuevo. Los38 no están dentro de850: harness nativo independiente, no assertions Vitest. El script12RBAC también es separado de los3testsPG de850. Evidencia de cleanup acredita retiro propio enR3; R4 no consultó ni tocó contenedores ajenos ni creó instancia.

Typecheck/lint/build/schema/seeds/migration/security del código intacto se conservan como evidencia R3, no se reclasifican como R4. No se ejecutó regresión integral de producto ni PostgreSQL/browser R4 porque no cambió implementación. Pruebas de propuesta IANA, autosuficiencia none y guard CT04 NOT_RUN por contrato/input pendiente; QA/IAM/E2E externo/human UI NOT_RUN. No hay tests de producto silenciados o excluidos en esta revisión documental.

## Verificación final después de append

rector/status/whitespace PASS después de escribir; comandos, duración y exit codes en evidence/continuity-r4/post-checks.json. Preservación final:1520/1522 archivos heredados idénticos; sólo matriz y ledger cambiados append-only;0perdidos, índice lógico íntegro y staging vacío. La regresión completa850 R3 se conserva, sin atribuir ejecución a R4.

Manifest R4 verificado; dominio canónico comprobado en documentos R4. ZIP rector histórico v1.1 disponible en Downloads:22/43/44 inspeccionados y cotejados con v1.8 sin reactivación. ZIP normativo reservado no abierto.
