# QA_NORMATIVE_CATALOG_CONTRACTING_E2E — entrega consolidada

Resultado PARTIAL. RECTOR_GATE=BLOCKED para cierre integral; comprobaciones rectoras y operaciones técnicas autorizadas PASS. Baseline TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16; POST_STEP6A4_PRE_STEP6A5. No producción ni STEP6A5/6A6.

PR #23 integrado mediante merge normal en 9ca9d1a7e8620da3ca2b9fb9a5f139e494e75572, preservando sus 12 commits, incluidos los diez del release anterior. Head inspeccionado 5ed5982c578f4cc5039c5ff89aeeb27d2bc17743, destino main, CI rector SUCCESS, sin conflictos ni secretos; reglas con required status check y cero bypass, sin revisión independiente obligatoria. Draft convertido a Ready antes de merge. El despliegue anterior se verificó por imagen/revisión y sus 40 recibos; no se confundió el sellado documental con la fuente desplegada.

La nueva entrega parte de ese main integrado y usa el mismo PR sucesor no Draft [#24](https://github.com/Tecdex-SpA/tcdx-grc/pull/24). Commits funcionales f8174a7efb652195fd48785987d38e0603c9e5af y 9b9df95c6a2e542abed46e1d170b80b06837d549; el tercero sella estos cuatro archivos y el estado maestro. El recibo definitivo de integración y el SHA de main son merge_commit_sha del PR24; consultar ese recibo GitHub, vinculado desde RESULT.json. No se codifica como SHA desplegado el commit de sellado ni se atribuye un resultado de merge futuro al momento de redactar el archivo.

Se corrigió la omisión de regulatory_pack_id que impedía persistir una contratación sobre el modelo físico vigente. La raíz se deriva de RegulatoryPackVersion y el solapamiento se verifica por raíz. Se mantienen serialización de la suscripción, idempotencia y auditoría. La UI añade versión/vigencia, detalle, confirmación y reintento con la misma clave después de una respuesta perdida. Las matrices identifican ControlVersion/EvidenceVersion por código de su padre canónico y versión, con la misma autorización de fuentes/objetos. No hay tablas, estados, roles, permisos, precios, planes o pasarelas nuevos.

Ambas imágenes finales linux/amd64 proceden de 9b9df95c6a2e542abed46e1d170b80b06837d549, fuente archivada SHA256 f7217d02b1121f960bedbfda4dcea7e064bd361668d2cde123e99a50ef25b986, Dockerfiles con base fija y lockfile congelado:

- Backend: sha256:5b16432a917bd3716d1eb8d1f22ceb6860b77d28a0b72c336aabe5ebdb7a7060.
- Frontend: sha256:4db0a4a57326dcca56c7bd3d23ef4562811852103470f349991354873c679e49.

Son IDs Docker verificados tras save/load; no existe publicación de registro acreditada y los RepoDigests en QA están vacíos. Promoción por scripts/phase6a3/qa-promote-session-duration.py, misma topología y configuración QA. Salud y HTML público comparados con la imagen desplegada: PASS. Rollbacks exactos en RESULT.json; los rollbacks del release previo también se conservan. Los cuatro operadores mantienen sus módulos requeridos byte idénticos y autenticación M2M fresca; no se redesplegaron módulos sin cambios.

Activaciones reales: dos procedencias NON_AUTHORITATIVE_TEST_PACK y dos accesos QA de 24 horas a ISO27001:2022 e ISO42001:2023, sólo TECDEX. Se conserva el acceso previo ISO9001:2026. Cuatro auditorías y cuatro idempotency records exactos; replay de las cuatro operaciones sin duplicación. La solicitud interrumpida durante el reinicio se reconcilió con su misma clave; no se contabilizó como PASS una respuesta perdida. No hubo publicación oficial, contratación comercial ni facturación. No se alteraron planes ni asignaciones humanas.

PostgreSQL16.15, verify-full, 36 migraciones exactas, 244 tablas/3.630 columnas; sin DDL. Cinco tablas con delta: procedencias+2, accesos+2, idempotencia+4, auditoría canónica y timestamps de login de identidades existentes. Las otras239 tablas conservan fingerprint. No se modificó ninguna migración histórica.

Inventario íntegro aprobado: cuatro ISO y dos leyes; los cinco packs físicos no agotan el alcance aprobado. READINESS oficial READY=0, REQUIRES_APPROVED_COMPLETION=0 y BLOCKED_BY_SOURCE_OR_RIGHTS=6. La disponibilidad QA provisional se registra por separado.

| Marco | Edición | Unidades / requisitos | Controles de referencia | Cobertura técnica registrada % | Acceso QA | Publicación oficial |
|---|---|---|---|---|---|---|
| CL_LEY_21719 | vigencia_2026-12-01 | 30 / 30 | 0 | 100.00 | Sin acceso QA vigente | BLOCKED_BY_SOURCE_OR_RIGHTS |
| ISO_9001_2015 | 2015 | 35 / 35 | 0 | 0.00 | Sin acceso QA vigente | BLOCKED_BY_SOURCE_OR_RIGHTS |
| ISO_9001_2026 | 2026 | 35 / 39 | 0 | 0.00 | QA provisional activo | BLOCKED_BY_SOURCE_OR_RIGHTS |
| ISO_IEC_27001_2022 | 2022 | 105 / 7 | 93 | 0.00 | QA provisional activo | BLOCKED_BY_SOURCE_OR_RIGHTS |
| ISO_IEC_42001_2023 | 2023 | 55 / 7 | 38 | 0.00 | QA provisional activo | BLOCKED_BY_SOURCE_OR_RIGHTS |
| CL_LEY_21663 | Sin versión canónica | 0 / 0 | 0 | — | Sin acceso QA vigente | BLOCKED_BY_SOURCE_OR_RIGHTS |

Las coberturas registradas no sustituyen homologación: la cobertura100 de Ley21719 no tiene aprobador/fecha, sus91 mappings no están aprobados y la versión QA comienza2026-12-01. Ley21663 está aprobada en el contrato ampliado, con diez candidatos recibidos, pero no fuente/edición/estructura canónica homologada. Las ISO no tienen cobertura/revisión/derechos oficiales suficientes; ISO2015 conserva su intervalo histórico expirado. No se reconstruyó texto protegido ni se convirtió una propuesta en obligación jurídica.

El E2E anterior permanece BLOCKED: Mario Cáceres está identificado y pertenece a TECDEX, pero el PO confirmó que no está disponible. No existe GRC_MANAGER activo independiente ni un ajuste B04 ajeno que el PO pueda revisar. El PO conserva sus permisos; no se eludió la SoD mediante otra cuenta suya, un M2M o un usuario ficticio. Este bloqueo no impidió el trabajo independiente. El cierre integral no se declara PASS.
