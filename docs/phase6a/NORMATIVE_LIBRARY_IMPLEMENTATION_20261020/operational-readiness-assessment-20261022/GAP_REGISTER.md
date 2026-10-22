# Registro de brechas

| ID | Severidad | Hallazgo | Causa / impacto | Dependencia | Corrección propuesta |
| --- | --- | --- | --- | --- | --- |
| ORA-01 | BLOQUEANTE | El generador rector no reproduce manifest/expected-schema sucesores | `generate-contract-assets.mjs` termina en C04W/34; el gate status rechaza el manifest de 35 | Autorización de edición de código, sin QA | Extender el único generador canónico desde recibos/hashes publicados; prueba focalizada y gate rector PASS |
| ORA-02 | BLOQUEANTE | Backend no monta la composición | `server.ts` no crea ni pasa `normativeLibrary`; rutas devuelven 404 y hooks B07 no actúan | ORA-01; configuración Minio/cursor efectiva | Conectar `composeNormativeLibraryFromStorage` al bootstrap con fail-closed, sin flag alterno |
| ORA-03 | BLOQUEANTE | Ocho permisos/grants contractuales no activos | Autoridad efectiva ausente; toda operación debe permanecer DENY | Manifest exacto + autorización PO DML IAM | Publicación operacional separada y verificación ALLOW/DENY por rol/scope |
| ORA-04 | BLOQUEANTE | Trece bindings B06 no activos | Mutaciones con lifecycle fallan `Canonical lifecycle registry not adopted` | Manifest/versiones reales + autorización PO registry | Activar sólo bindings publicados, verificar scopes/efectos/hash y rollback |
| ORA-05 | BLOQUEANTE | Cuatro Definitions y reglas no materializadas | Configuración por ControlVersion no puede resolver/validar | Manifest de datos y actor real + autorización PO | Publicación atómica de Definitions/scopes/rules; verificar resolver único |
| ORA-06 | BLOQUEANTE | Frontend B02–B09 no montado | `main.tsx` sólo monta `CoreGrcApp`; bundle no contiene library/matrix | Código UI aprobado y backend listo | Integrar navegación/pantallas con RBAC; build y visual gates |
| ORA-07 | ALTA | UI funcional N01–N17 incompleta | Pantalla actual lista unidades/requisitos; faltan árbol, búsqueda, capas, ajustes, aprobación y seis matrices | Contratos activos; no requiere nuevas entidades | Completar superficies usando shell/tokens canónicos; no iniciar Riesgos |
| ORA-08 | ALTA | Sin derechos H04 reales | Cero filas/evidencia; cuerpos/actos quedan metadata-only/DENY | Evidencia jurídica/propia exacta + autorización de registro | Registrar sólo fuente/edición/hash/acto/entorno acreditados; negativos sin evidencia |
| ORA-09 | ALTA | Sin contenido/homologación real | No se importaron 211/104/seis cruces ni Ley 21.663 | Autorizaciones de import y revisión separadas | Importar por paquetes independientes y conservar estado preliminar; no equivalencias automáticas |
| ORA-10 | ALTA | No existe E2E operacional | Sólo unit/contract/route inject y browser mock | ORA-01..09 + deploy autorizado | E2E QA con dos tenants, roles Platform/Tenant, SoD, H04, audit/outbox y UI |
| ORA-11 | ALTA | Aceptación visual pendiente | Capturas sólo de fixture aislado; AC19 no demostrado | UI montada y deploy QA | Desktop/narrow, accesibilidad y revisión humana; Codex no declara PASS humano |
| ORA-12 | MEDIA | Verificador de continuación antiguo ya no describe el árbol | Inventario congelado antes de la adopción física y cambios foundations | Ninguna pérdida de integridad; verificador físico actual pasa | Mantenerlo histórico y producir verificador sucesor integrado con ORA-01 |
| ORA-13 | MEDIA | Procedimiento operacional de derechos no ejecutado | H04 no expone un bypass ni concede licencias por etiqueta | ORA-08 | Definir ejecución custodiada con AuditEvent y evidencia Minio versionada, sin endpoint genérico |

## Preguntas de desbloqueo

1. **Inmediata, código solamente:** ¿autoriza reconciliar `scripts/foundations/generate-contract-assets.mjs` para que el único generador canónico reproduzca exactamente la migración 35 y `expected-schema` publicados, con tests y sin tocar QA?
2. **Después de ORA-01 PASS, código solamente:** ¿autoriza montar la composición backend y las superficies frontend aprobadas B01–B09, manteniéndolas sin deploy y sin activar IAM/registry/datos?
3. **Después de builds/gates PASS:** ¿autoriza una publicación DML QA concreta, con manifiestos separados, para los ocho permisos/grants, trece bindings B06 y cuatro Definitions/reglas? Esta pregunta no incluye importación ni deploy.
4. **Por cada fuente:** ¿qué evidencia y actos exactos deben registrarse para H04 en QA, y autoriza su materialización auditada? La respuesta debe identificar fuente, edición/hash, acto, entorno y custodia; no se acepta autorización global.
5. **Después de datos operacionales PASS:** ¿autoriza desplegar los bytes backend/frontend identificados y ejecutar E2E QA con tenants/usuarios reales de prueba? No incluye producción ni importación normativa.
6. **Contenido:** ¿autoriza paquetes de importación concretos y su revisión humana separada? La homologación/publicación oficial debe decidirse por paquete y no se deriva del deploy.

