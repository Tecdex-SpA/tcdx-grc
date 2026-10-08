# Regresión final — PASS

Ejecución actual sobre el source definitivo y sus imágenes, Node 22.23.2; QA credentials excluidas de procesos locales. No se sustituyen resultados por históricos. Freeze `ee6e4c359d701d2929aec649468b46e940451a8314ea06fb89574b49738faee7`.

| Suite | Resultado actual | Alcance |
|---|---:|---|
| Unit/contract | 485 PASS, 55 archivos | Los 82 casos PostgreSQL aparecen skipped aquí y se ejecutan separados abajo |
| Frontend | 81 PASS, 8 archivos | Incluidos en los 485; no doble suma |
| PostgreSQL aislado | 82 PASS, 15 archivos | PostgreSQL16 localhost:55432; metodología, lifecycles, SoD, tenants, RBAC, MI, audit/idempotency |
| GRC E2E source | 428 PASS | Cuatro viewports, branding, accesibilidad, responsive, drawers/workflows/onboarding/roles/auth |
| Exact frontend image | 428 PASS | Repetición independiente del mismo conjunto sobre imagen desplegada |
| Exact backend image | 82 PASS | Pruebas compiladas PostgreSQL, health y anonymous default DENY |
| IAM E2E | 21 PASS | Tema real, password/TOTP, disabled, logout; tres viewports |
| Signed native callback | 3 perfiles + 6 negativos PASS | Imagen backend exacta; pwd+otp vigente acepta; AMR expirado/enrollment pwd-only deniega |

Typecheck, lint/static, contracts:verify, build, OpenAPI/matrix, catálogo/permisos/RBAC/scopes, rector integrity/status, diff, secret/domain scan PASS. OpenAPI tiene 161 operaciones, 56 lecturas; 172 permisos publicados. El validador histórico describe sus propios casos D1/D3 como contrato local; esa etiqueta no determina publicación QA, probada separadamente con migration/schema/seed/parity/runtime. El nuevo delta real es dos catálogos, tablas y permisos aprobados. 39 casos negativos schema/projection y pruebas PostgreSQL de unknown/wrong-domain/draft/future/expired/immutable/FK/derivación exacta de grants PASS.

Rebuild local 30/237/172, seed reapply, ledger/migrate idempotency y schema verification PASS. Fixtures predecesoras sólo operan en localhost y transacciones aisladas; ninguna altera QA. La carrera de foco real detectada por E2E se corrigió restaurando después del DOM commit; la suite final completa pasó en source e imagen. Los recibos preparatorios fallidos no se computan como final PASS.

Prueba: FINAL_REGRESSION_RECEIPTS.json; source hashes en RELEASE_SOURCE_MANIFEST.sha256; QA operacional en reportes de dominio. Tests locales cubren negativos de seguridad; sólo CANONICAL_API_RECEIPTS/QA_RECORDS acreditan operaciones reales QA.
