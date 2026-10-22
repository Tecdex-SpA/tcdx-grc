# Entrega integral QA — checkpoint de transferencia 2026-10-22

Ejecución `QA_FULL_FUNCTIONAL_CLOSURE_NORMATIVE_CONTRACTING_PREMIUM_UI`.
Baseline activa `TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16`.
Fase POST_STEP6A4_PRE_STEP6A5. El PO pidió terminar esta cuenta y transferir el
trabajo a otra cuenta Codex. **Ejecución pausada por el PO; entrega completa no cerrada.**

## Entregado y desplegado

Código runtime `f060cb17d15fe59ebae51c302cdb2e9f27f6976c`, PR #25 abierto,
no Draft: https://github.com/Tecdex-SpA/tcdx-grc/pull/25.
CI rector-governance satisfactorio sobre ese commit. Main permanece en
`68825addb219db3ea395cf9e6e2bbd2e83267912`; no se ha realizado merge.

- Sistema visual compartido para shell, dashboard, tablas, matrices, formularios,
  detalles, identidad y administración; navegación a módulos autorizados,
  encabezados compactos, distribución visual de estados existentes y responsive.
- Separación de Mis marcos y Accesos QA; guía de contratación asistida y enlaces.
- Ticket PDF editable y términos operacionales GRC V2 conforme a la decisión PO.
  Se sirven como application/pdf, bytes cotejados por el dominio público.
- Corrección de biblioteca/B04: respuestas con ETag incluyen no-transform para
  preservar el digest ante compresión del proxy. Antes de corregir, QA devolvió
  GET 200 y DTO válido con ETag terminado en -zstd; el cliente lo rechazaba.
  La corrección conserva validación estricta y CAS. **Falta comprobar el GET
  autenticado corregido y el flujo revisión/decisión después de la promoción.**
- Mario Cáceres se autenticó personalmente por IAM Managed y fue incorporado
  a TECDEX exclusivamente como GRC_MANAGER. El PO creó una propuesta auditable.
  No se operó la identidad del socio para simular su revisión.

Backend y frontend fueron construidos Linux amd64 desde el mismo Git limpio,
trasladados por SSH/docker load y promovidos mediante el promotor existente.
Ambos saludables; readiness PostgreSQL up; dominio canónico y HTML coinciden.
Rollback conservado. No nueva infraestructura, pipeline, DDL o migración.

## Estado normativo y comercial real

| Marco aprobado | Unidades/requisitos materializados | Estado |
| --- | --- | --- |
| ISO 9001:2015 + Amd 1:2024 | 35 / 35 | Borrador; no publicación oficial |
| ISO 9001:2026, edición 6 | 35 / 39 | Borrador; no publicación oficial |
| ISO/IEC 27001:2022 | 105 / 7 | Borrador; 93 controles de referencia |
| ISO/IEC 42001:2023 | 55 / 7 | Borrador; 38 controles de referencia |
| Ley 21.719, versión aplicable 2026-12-01 | 30 / 30 | Borrador, vigencia futura conservada |
| Ley 21.663 | 0 / 0 | Sin pack materializado |

Estos conteos no acreditan completitud ni homologación. Cinco borradores,
cero versiones publicadas, cero contratables y cero contratos TECDEX oficiales.
Se preservan tres accesos provisionales QA. No se convierten en contratos.

El PO aplazó copias ISO licenciadas hasta salida comercial y autorizó validar el
material actual en QA como provisional. No se afirma una licencia inexistente ni
se transforma contenido de prueba en oficial. El importador canónico exige fuente
ISO licensed_file y cobertura completa; no se elude ese gate. Faltan fuente,
revisión editorial auténtica y homologaciones aprobadas. Los metadatos oficiales
no equivalen a acreditar procedencia/integridad del contenido recibido.

El PO confirmó que ticket y términos PDF no existían previamente. Se crearon los
dos documentos con la decisión operacional expresa, sin inventar un predecesor,
precios, facturación ni un segundo documento obligatorio para iniciar el alta.
Los PDFs están vacíos: no hay ticket emitido/aprobado ni activación acreditada.
La solicitud electrónica persistida no está implementada; no hay motor paralelo.
Se conserva la Subscription GRC v1 y sus contratos publicados.

Producción sin cambios. STEP6A5/STEP6A6 no iniciados. Aceptación visual humana
pendiente. Rector: el alcance implementado conserva la jerarquía; los gates
obligatorios de cierre global siguen bloqueados por lo señalado arriba.
