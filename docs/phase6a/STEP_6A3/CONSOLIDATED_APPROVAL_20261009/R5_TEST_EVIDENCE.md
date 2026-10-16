# Evidencia de verificaciones R5

Sólo documentación/propuestas y append de continuidad;0 cambios runtime, SQL, contratos efectivos, permisos o vocabulario.13ejecuciones PASS/0FAIL de checks, no13tests de producto.8dirigidas+1verificación inicial+4finales después de append/ajuste de formato. Los dos checks de evidencia son la misma comprobación en dos estados documentales; no se suman al850R3.

| Check | Comando real | Resultado | Duración segundos | Log/hash |
|---|---|---|---|---|
| rector | `bash scripts/verify-rector-governance.sh` | PASS exit0 | 0.572 | `docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/evidence/continuity-r5/rector.log` SHA256 be827f42eb6ea9aa9359e7f5e925cc56b81bf1dbc9f7f0b6337292b1c38192ff |
| status | `bash scripts/test-rector-governance-status.sh` | PASS exit0 | 1.615 | `docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/evidence/continuity-r5/status.log` SHA256 4a950b39b20f2de1440a2b45b243b63df607fa3ede7f7e32e9f7e9da71864597 |
| contracts | `node scripts/foundations/generate-contract-assets.mjs --check` | PASS exit0 | 0.061 | `docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/evidence/continuity-r5/contracts.log` SHA256 6b23028285d3508b88246bfaf068d1c124204ef566bf5065a39cdcf841fc8976 |
| vocabulary | `node scripts/foundations/generate-phase6a-vocabularies.mjs --check` | PASS exit0 | 0.333 | `docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/evidence/continuity-r5/vocabulary.log` SHA256 712684f1e3b9a46e0b8fb6e9333573ec75e4a38f571ca1a587fbba6126af6001 |
| governance-negatives | `python3 scripts/verify-internal-governance.py --negative-tests` | PASS exit0 | 0.077 | `docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/evidence/continuity-r5/governance-negatives.log` SHA256 53e0673bfb3b2dc039d560b97793deae140516e7566252b4000289630afa99b8 |
| residuals | `python3 scripts/foundations/verify-phase6a3-residuals.py` | PASS exit0 | 0.399 | `docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/evidence/continuity-r5/residuals.log` SHA256 1c44a230d4156a6dd48489c647d1d52376bd02b7ffcf92b4b64ffba4bd2c1e3d |
| secrets | `node scripts/foundations/secret-scan.mjs` | PASS exit0 | 3.884 | `docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/evidence/continuity-r5/secrets.log` SHA256 785afde26b815831ebbe2ea9b6a7125f5b49cdf400b3697f50d456a5337f0f2d |
| whitespace | `git diff --check` | PASS exit0 | 0.252 | `docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/evidence/continuity-r5/whitespace.log` SHA256 e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |
| inherited-and-exact-content | `/Users/andresbarouh/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/evidence/continuity-r5/verify-r5-evidence.py` | PASS exit0 | 0.185189458 | `docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/evidence/continuity-r5/evidence-verification.log` SHA256 47a5a851a4fcf0cfad6db6d2b248b795c88f256ed38c2d9470930ec9e6720826 |
| post-evidence | `/Users/andresbarouh/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/evidence/continuity-r5/verify-r5-evidence.py` | PASS exit0 | 2.449 | `docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/evidence/continuity-r5/post-evidence.log` SHA256 36b32cb8706a5297303f0cf4d89b59e07eebbbbd0bf1504f2b3f676b81084298 |
| post-rector | `bash scripts/verify-rector-governance.sh` | PASS exit0 | 0.885 | `docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/evidence/continuity-r5/post-rector.log` SHA256 be827f42eb6ea9aa9359e7f5e925cc56b81bf1dbc9f7f0b6337292b1c38192ff |
| post-status | `bash scripts/test-rector-governance-status.sh` | PASS exit0 | 3.591 | `docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/evidence/continuity-r5/post-status.log` SHA256 4a950b39b20f2de1440a2b45b243b63df607fa3ede7f7e32e9f7e9da71864597 |
| post-whitespace | `git diff --check` | PASS exit0 | 0.583 | `docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/evidence/continuity-r5/post-whitespace.log` SHA256 e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |

## Entorno y exactitud

Nodev22.23.2 dedicado para generadores y secret-scan; Python3.14.8 local para verificadores rector/residuales; Python3.12 y LibreOffice empaquetados para Word y comprobación OOXML. git2.50.1. environment.json,checks.json,evidence-check.json,post-checks.json conservan UTC,comando,exit yduración. Primer checkOOXML usa mtimeUTC de finalización y walltime real deexec; no se inventa un inicio. Logs sellados por SHA256. Reloj final2026-10-10UTC; carpeta nominal del paquete sigue20261009.

Word inicial se ajustó sólo en formato aLetter y eliminación de borde deTitle, sin cambiar texto. word-render-review.json documenta estado inicial y word-render-final-review.json el Word final:8páginas revisadas visualmente,hashesPNG/PDF temporales,hashDOCX final. post-evidence confirma los12textos literales,14fuentes/sha ypropuestaIANA exactaR4UTF8+newline. No se entrega PDF/PNG como otro documento de aprobación. No hay firma ni selección humana simulada.

## Evidencia heredada verificada

R4 34/34hashes sellados coinciden; R3 snapshot859/863 coincide,4diferencias de documentos de estado registradas; código/DDL/tests coinciden. JSONR3 acredita850passed en85archivos,737unit+113PG/18archivos,0failed/pending/todo.82antes omitidos passed en15archivos, no17; no se excluyen ni renombran. R4 comprobaciones7dirigidas+3finales conservadas, sin convertirlas en nuevas pruebasR5.

460browser simulated,38nativeUQ,8RBACR2,12RBACR3 se conservan como reportes separados.16EC+3PG R3 ya incluidos en850. QA14artifacts y454build hashes verificados por qa-artifacts-verification.json; no es buildR5 ni imagenremota. Detalles/nuevo actualSHA de las4diferencias en post-evidence.log; R4 yR3 nunca sobrescritos.

## No ejecutado y efecto sobre gates

ProductoVitest,PostgreSQL,DDL,38UQ/browser/typecheck/lint/build/schema/seeds/migrations no reejecutados R5 por ausencia de cambios de producto, contratos efectivos o SQL. No hay suitesR5 silenciadas: scope documental explícito,0testsproducto ejecutados. Nuevos testsIANA/none/CT04/RLS NOT_RUN porque sus deltas/inputs aún no son efectivos. No hay instanciaPG R5; instanciasR3 retiradas según evidencia histórica, sin tocar recursos ajenos. QA/IAMreal/E2Eexterno/backuprestore/manualUI NOT_RUN, gatesexternos BLOCKED. Las850 históricas no validan implementación futura.

Preservación1545/1547idénticos,2append,0perdidos,índiceidéntico/stagingEMPTY; evidence/continuity-r5/preservation-final.json. ManifestR5 y delta atribuyen hashes a documentos/planDRAFT, no acreditan cumplimiento ni aceptaciónSTEP6A3. RECTOR_GATE=BLOCKED, STEP6A3=PARTIAL_BLOCKED.
