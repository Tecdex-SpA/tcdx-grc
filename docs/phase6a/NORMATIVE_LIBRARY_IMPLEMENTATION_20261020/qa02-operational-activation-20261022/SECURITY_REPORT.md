# Seguridad QA-02

Resultado de habilitación: BLOCKED. Invariantes recibidas: PRESERVED_BY_ZERO_MUTATION. No se atribuye PASS de RBAC/SoD funcional QA a una lectura de catálogo.

Se conservaron permisos, RolePermission, memberships, assignments, usuarios, identidad externa, auditorías, outbox, entitlements y todas las tablas por fingerprints exactos. No hubo grants universales, permisos adicionales, ampliación Platform, nuevos roles ni excepciones de SoD/default DENY. IAM/registry/B06/Definitions/H04 siguen sin activar. Las siete ausencias de roles de ACME-1 no se repararon.

El perímetro de autenticación permanece cerrado: no se inyectó identidad, no se generó token humano o M2M, no se trató el service_principal_id como una credencial y no se llamó al writer canónico sin su autenticador. No se consultaron valores secretos, cuerpos normativos ni documentos personales. Los datos guardados son metadata contractual/operacional, catálogo y hashes agregados; auditoría previa de provisión contiene hashes y referencias, no credenciales.

La única conexión remota exitosa fue PostgreSQL QA 192.168.2.40 con hostname TLS db-tecdex y huella aprobada FB:68:09:DA:13:9E:E3:E5:2C:2F:1F:EA:D7:5B:11:92:7B:04:B8:96:7A:2B:5D:B8:46:9C:B6:70:E3:BB:A3:E6. Transacciones REPEATABLE READ READ ONLY y default_transaction_read_only=on, con límites por sesión. No DNS/certificados/infraestructura/producción/AWS MCP.

H04 conserva default DENY por fuente, acto, hash, edición, audiencia, entorno, intervalo y prueba privada. Fuentes/derechos están vacíos; ninguna autorización comercial ISO concreta existe en esta orden. La política PO no exige compra ni gate jurídico externo para activar capacidades técnicas y no concede derechos de terceros. No se fabricó una licencia ni se reinterpretó una autorización operacional como derecho externo.

Sin fixtures QA, pruebas negativas con DML, residuos, imports, despliegues o contactos HTTP a servicios existentes. Pruebas funcionales ALLOW/DENY/SoD/tenant isolation, replay y H04 quedan NOT_RUN_ACTIVATION_BLOCKED. Las 217 tablas tenant-scoped y 510 FK compuestas se verificaron físicamente; eso prueba estructura y preservación, no un nuevo E2E.
