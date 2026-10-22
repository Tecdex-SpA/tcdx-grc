# Validación y evidencia mínima

## Resultados técnicos

| Comprobación | Resultado y alcance |
| --- | --- |
| Integridad rectora | PASS, verify-rector-governance.sh |
| Unitarias generales | 1072 PASS; 227 PostgreSQL omitidas, no contadas como PASS |
| Corrección HTTP/ETag | 44 PASS, composición de 32 operaciones y pruebas CAS/replay |
| TypeScript backend/frontend | PASS |
| Navegador compilado | 255 identidad/formularios + 105 producto/catálogo PASS en tres tamaños |
| Últimos cambios de dashboard/tablas/detalles | 36 PASS en desktop/tablet/mobile |
| Nueva navegación/autorización/overflow | 3 PASS, uno por tamaño |
| PDFs | Dos documentos de una página revisados; ticket con 23 campos/controles vacíos |
| HTTP PDFs local y QA | 2/2, application/pdf, firma PDF y SHA-256 exacto |
| Secret scan | 0 hallazgos |
| CI PR25 | rector-governance PASS sobre f060cb1 |
| PostgreSQL QA READ ONLY | 16.15; 36 migraciones, 244 tablas, 3630 columnas |
| Integridad de migraciones | 36 IDs/nombres/hashes coinciden exactamente con manifest local |
| Promoción backend/frontend | PASS_QA, saludables, mismo commit f060cb1 |
| Runtime/dominio | readiness up; HTTPS 200; HTML SHA-256 coincide con contenedor |
| Operador publicación | PASS_FRESH_M2M; no grants u operadores nuevos |

Las pruebas de navegador compilado usan fixtures contractuales aislados. No
prueban publicaciones, licencias, contratación oficial ni revisión humana real.
La primera ejecución de navegador fue rechazada por sandbox; se ejecutó luego
con permisos. Dos errores de invocación de build y un selector de prueba fueron
corregidos; los resultados anteriores no se presentaron como PASS.
El transporte backend inicial excedió 240s; no se promovió ese intento. La
transferencia posterior verificó la imagen y permitió promoción con rollback.

## Recibos resumidos en RESULT.json

Runtime capturado 2026-10-22T21:32:15.688415Z. Código runtime f060cb17.
Backend imagen sha256:4062adbb09d4c7fa308f0d3a5cd1b730ab0b938bf5c46d57869ca56f5de1ed3d.
Frontend imagen sha256:8d347f9f831afc081e5ba69a96c6d5b10fe448bfdc932e6356c2a1caf441dcf4.

Creación PO del ajuste: audit_event_id 01a16575-da94-76ef-90f6-cefe61818866,
configurationOverrideCreate succeeded, agregado 01a16575-da86-743c-a680-40563e61a7a4.
Autor PO 01a0cfae-d860-730d-88b8-d8b1b3f5d7dc. Mario IAM real
01a16559-dee5-754d-a746-aa5b961e22e2, autenticado 21:06:39.221Z y GRC_MANAGER
TECDEX desde 21:06:26.495Z. No confundir con su identidad histórica distinta.
No hay revisión ni decisión acreditada de esta propuesta. No se probó todavía
la denegación de autorrevisión PO después del despliegue.

Custodia privada ignorada local: .release-custody/qa-full-functional-closure-premium-ui-20261022/.
Contiene recibos de build/transport/preflight/promote, runtime-after.json,
final-scope.json, release-check.json, resultados de pruebas y capturas.
No publicar sesiones, respaldos ni credenciales. Los datos necesarios para
continuidad están resumidos en los cuatro archivos versionados de este expediente.
Las capturas históricas STEP6A4 sobrescritas por el runner fueron restauradas
exactamente desde HEAD; las nuevas capturas se conservaron sólo en custodia.

## Comprobaciones todavía pendientes

GET B04 corregido autenticado por dominio; rechazo real de autorrevisión;
revisión y decisión personales Mario; persistencia/auditoría/CAS/replay;
recorrido responsive del frontend desplegado con datos reales, formularios y
matrices; aceptación visual humana; fuentes/derechos/revisión normativa;
Ley21.663; homologación/publicación/contratación oficial; ticket realmente emitido,
aprobación de Gerencia, entrega a Operaciones y uso de seis marcos contratados.
