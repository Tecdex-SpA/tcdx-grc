# Evidencia local de activación rectora v1.9

`DECISION_ID=DR-STEP6A3-RECTOR-V19-ACTIVATION-20261014-01`  
`SIGNED_AT_UTC=2026-10-14T12:20:00Z`  
`EFFECTIVE_AT_UTC=2026-10-14T12:29:51Z`  
`HEAD=23c7b50468213b8c0769ca2607349e04f4c32eae`  
`ACTIVATION=PASS_LOCAL`  
`RECTOR_GATE=PASS`  
`STEP6A3_CURRENT_STATUS=PARTIAL_BLOCKED`  
`STEP6A4_CURRENT_STATUS=NOT_STARTED`  
`MAIN_INTEGRATION=NOT_PERFORMED`

## Hashes de custodia

| Artefacto | SHA-256 |
| --- | --- |
| Manifest staged, 116 destinos + cinco herramientas | `6f08a7522ef39760168380b823cedb75a088f1a17fa25c0c3161d96cc7f26cc8` |
| Receipt humano de activación | `2a29050b087ce50b037c4affe3e1ad1d7bdd29cbeaf72bb00b2637410a191a4b` |
| `docs/rector/ACTIVE_ACTIVATION.json` efectivo | `d4384445f363fced66e083b80be4316377443557d2c98e25b5a5ec2406882928` |
| Manifest activo de v1.9 y `baseline/SHA256SUMS.txt` | `8466d47faaf34a6be6884ca8edf264f772c98c3b80b73d7b7b999fc4cf4b37d5` |
| `history/v1.8/SHA256SUMS.txt` | `e51f6539df119775b2feb8839907c8cd690623b82707b399aa15a31d59196533` |
| Manifest de publicación candidata, 77 archivos | `5b3b791cc2b7c3446ff69b244edacdf3ab810b0c864c5428c795f52dc6b9fb06` |
| Paquete comercial v2 | `489e8cec4b72c2cf464d0315e5ba4f2f5664012b60df2327a07f82882943ba55` |

## Procedimiento ejecutado

1. Se verificaron nuevamente el manifest staged y sus 121 hashes; `prepare-activation-package.py --verify`, `verify-v19-governance.py --staging`, `verify-phase6a3-current-v19.py --staging`, la prueba negativa de alteración y el verificador activo v1.8 pasaron antes de escribir destinos.
2. Se registró la decisión humana en `HUMAN_ACTIVATION_DECISION_RECEIPT_20261014.md`. La conversación aclaró el ID staged con `RECTOR` y que las 09:20 de Santiago equivalían a `12:20:00Z`. No se creó firma criptográfica.
3. Se copiaron los 52 archivos v1.8 a `docs/rector/history/`, los 52 archivos sucesores a `docs/rector/baseline/` y los demás destinos aprobados. En `ACTIVE_ACTIVATION.json` sólo se sustituyeron los dos marcadores autorizados por la hora efectiva y el SHA del receipt. `BASELINE_ID` se escribió al final.
4. Después de la escritura pasaron `python3 scripts/verify-v19-governance.py`, `python3 scripts/verify-phase6a3-current.py`, `bash ./scripts/verify-rector-governance.sh` y `bash ./scripts/test-rector-governance-status.sh`. Los 116 destinos coincidieron con el staging, salvo los dos campos dinámicos autorizados. El verificador confirmó historia v1.8 y 77 candidatos aprobados.

## Verificaciones posteriores de contratos dependientes

- El manifest activo de migraciones contiene 32 entradas y el candidato 33; las 32 primeras son idénticas. La entrada nueva `20261013000100` coincide con el SHA del SQL candidato `ed6ca86b9234672fcb55293b5e2a69d09e999e84b3c7d75d56ccf0cd86479ae5`.
- Los ocho JSON candidatos físicos/ejecutables parsean. `materialize-openapi.mjs` pasó `node --check`; no se ejecutó el materializador porque escribe bytes candidatos. El OpenAPI fusionado candidato conserva `subscriptionCreate` con HTTP 202, expone `subscriptionChangePlan` con HTTP 200 y utiliza `https://grc.tecdex.net/api/v1`.
- `database/expected-schema.json` sigue con SHA `f920bf882a8b7ab0e91e2d43929bb161ca0ffeab100f0b640cf621a70ec2d7d3`; el delta es sólo candidato y no existe sucesor completo aprobado.
- `git diff --check` pasó. No se ejecutó PostgreSQL, DDL/DML en QA, IAM, grants, merge, deploy ni STEP 6A.4.

## Gates separados

La activación rectora no otorga `PHYSICAL_DATA_MODEL_REVIEW_COMMERCIAL=PASS` ni `EXECUTABLE_CONTRACTS_COMMERCIAL=PASS`. Siguen pendientes la revisión humana de esos bytes, el ensayo PostgreSQL 16 aislado autorizado, inventario/compatibilidad de datos reales, expected-schema completo aprobado, publicación ejecutable/RBAC y el task packet de implementación comercial. No se declara STEP 6A.3 PASS ni READY_FOR_RELEASE.
