# Consumidores y compatibilidad del candidato IANA R6 next

Revisión focalizada, no inventario comercial remoto. Sources: evidence/continuity-r6-next/consumer-locators.txt, OpenAPI02/CurrentPrincipalTenantPermissions, executable23 §3 y draftappend, executable33; rector25 §1,23 temporal y49 §3. No se demuestra exigencia de convivencia API v1/v2 en estas fuentes. Tampoco existe aprobación de retiro coordinado: la única autorizaciónA es de preparación. Una decisión explícita debe aceptar el retiro o mantener bloqueado el candidato; no crear fallback/coexistencia inferida.

| Consumidor | Cambio candidato | Compatibilidad |
|---|---|---|
|Backend registerFrontendProjections y app headers|selfGETv2, lectura propia read-only repeatable-read yno-store/Vary|v1self no registrado en candidato; contrato efectivo no sustituido aún|
|OpenAPI02 y contratoDTO|operation-level /api/v2; tuple requerido de3campos|DTO anterior rechaza campo adicional; nuevo rechaza ausencia|
|Frontend ApiClient/CoreShell/parser|selfGETv2 y zona del contexto seleccionado|requiere pareja publicada, no fallback/autoridad cliente|
|TenantTimezoneContext/sample period/historial|persistedIANA/DST y payloadUTCZ|contexto previo invalidado; Zone no concede permiso|
|Tenant onboarding validation|rechaza numeric offset queIntlNode22aceptaba|hardening según IANA ya requerido, sin nuevoDTO/grant|
|Seis suites Playwright|5interceptores v1-only corregidos;6destinos de evidencia separados; smoke tenant-switch|fixtures locales explícitos, no IAM/E2E real|
|Otros endpoints/GETEC/RBAC/grants/migraciones|sin cambio de transporte o bytes de producción|v1restante conservado, nada físico añadido|

Rector23 protege historia/versiones/temporalidad; no se interpreta como mandato de publicar ambos endpoints. El retiro propuesto afecta únicamente la proyección propia y clientes con el DTO anterior. Plan de futura promoción debe comprobar todos los clientes efectivos del entorno antes de retirar ruta, con identidad/buildparity y autorización; ese inventario externo esNOT_RUN. Rollout parcialmente pareadoNO_GO. Una pareja anterior exacta y su recuperación aprobada son prerequisitos operacionales, no compatibilidad ficticia.

Propuesta binaria final se presentará conR6_V2_APPROVAL_MANIFEST.json: aprobar bytes y retiro v1-self404 sin redirección/convivencia, o mantenerDRAFT_NOT_EFFECTIVE. No reabrirD1–D5 ni imponer una enmienda v1.8.
