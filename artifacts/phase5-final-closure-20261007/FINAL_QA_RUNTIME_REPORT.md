# QA final — PASS

Snapshot DB READ ONLY 2026-10-08T10:18:29.957Z; autoridad 2026-10-08T11:10:35.921Z; registros 2026-10-08T11:09:50.311Z. PostgreSQL16 tcdx-grc, 30 migraciones, latest 20261007000200, 237 tablas físicas de producto (ledger técnico separado), 172 permisos publicados. Ledger coincide byte a byte con manifiesto y todos applied, pending 0. Schema SHA256 `741f79e8aaefa0b8b0bb9080d6ddff2ace49ead11b00619f2008e8db53935080` estable después de migración/deploy/ciclos. Runner canónico y verificadores schema/seeds exit0. Es el cambio mínimo humano aprobado 29/235/170 → 30/237/172; no drift ni migración arbitraria. Las 29 migraciones anteriores conservan hashes.

Backup previo protegido verificado por catálogo pg_restore; contenido no se exporta a evidencia. Runtime sólo backend+frontend cambiaron, linux/amd64, no root; IAM no se reconstruyó. Dos exports independientes idénticos, 785 paths; freeze `6902129d3860cdaff29d9550fc3a734781b37a85d94f8d259e62b99e2cbcf8e3`; contamination/missing/extra/content mismatch todos 0. Freeze source `ee6e4c359d701d2929aec649468b46e940451a8314ea06fb89574b49738faee7`. Transport backend SHA256 2ee637af0382d16bd1cac2c73e7a52ac91533717c62afb4ace389ff060a34a07; frontend b05bcb783ec71e018404443269812d6dce5ef0392aaa0d2807e8d0af6feb793c.

- Backend `sha256:ab9902e4215289307992b9aa98421d5882a18b4236752948356b4fbe25829195`.
- Frontend `sha256:f31fd8a5b63003ba0973822854a94dc03b0b9753ec9dc165253418608c0f73ce`.
- IAM `sha256:4ef4f816c60d05c3867c1fce9092a3b0d1539bf22683d3e2742c6c1d7ce25ea4` (sin cambio).

QA deploy PASS, rollback saludable previo retenido en ambos hosts, no usado. Env/mounts/red/config de runtime conservados; fingerprints verificados sin valores secretos. Backend compiled parity 13 módulos exactos; public bundle exacto `0cc529bf3dc084b508f8f5e862a31bb319f9280965eecf03b00d2ada2515b00f`, logo bytes idénticos al asset humano aprobado. Native UI QA muestra dos catálogos publicados, selección vacía inicial y sin UUID libre. No nueva autoridad global/tenant por UI.

Health backend/frontend/IAM healthy, restarts 0; GRC HTTPS/discovery/JWKS 200, issuer exacto y JWKS dos keys; seis rutas públicas admin/master 404. Provider projection Zoho y Tecdex Managed Identity disponibles, Entra/Google no disponibles, no-store. AMR password+OTP maxAge 600, REQUIRED ambos, Cookie DISABLED. Dominios activos incorrectos 0 en source/config y bundle; sin fallback/alias.

Logs disponibles desde 2026-10-07T21:00:00Z: backend 0 líneas, frontend 1, IAM 3. No observados 5xx inesperados, SQL/fatal, restart ni secret logging. Cobertura se limita a streams retenidos; no se afirma una traza completa de ingress. Health, responses y audit dan evidencia independiente. Rechazos auth por expiración/revocación y pruebas SoD son esperados, no errores 5xx.

Autoridad final andres: enabled sí, OTP1, active identity1, issuer/subject exacto, PLATFORM_ADMIN1, Membership1 autorizado y roles tenant0. Baruj conserva siete roles originales. No se usó Mario. Registros QA retenidos sin borrado/cleanup SQL. FINAL_QA_SAFE_PROOF.json y QA_RECORDS_AND_AUDIT.json contienen límites, fechas y recibos exactos.
