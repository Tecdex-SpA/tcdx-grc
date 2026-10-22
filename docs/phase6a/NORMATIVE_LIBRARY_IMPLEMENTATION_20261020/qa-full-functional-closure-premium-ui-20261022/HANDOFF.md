# Continuidad inmediata para otra cuenta Codex

**Pausa expresa del PO para cambio de cuenta, 2026-10-22. No reiniciar el trabajo.**
Una sola entrega integrada QA, POST_STEP6A4_PRE_STEP6A5. Producción excluida.
Baseline activa TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16.

## Recuperación sin chat

1. Abrir /Users/andresbarouh/repos/tcdx-grc; leer AGENTS, rector46, enforcement,
   manifiesto visual y contratos activos, incluidos los dos amendments de esta
   rama. Verificar git status/HEAD/diff y actividad concurrente antes de editar.
2. Continuar rama feat/qa-full-functional-premium-20261022 y PR25 abierto no Draft:
   https://github.com/Tecdex-SpA/tcdx-grc/pull/25. Todos los cambios están committeados
   y publicados. Obtener HEAD exacto con git rev-parse HEAD; el último commit
   sólo sella este expediente. No reset, clean, stash, force-push ni reconstruir QA.
3. Backend/frontend QA ya ejecutan f060cb17d15fe59ebae51c302cdb2e9f27f6976c;
   imágenes y recibos resumidos en RESULT. El código está en PR, todavía no main.
   Main verificado: 68825addb219db3ea395cf9e6e2bbd2e83267912.
4. Primero comprobar el detalle B04 corregido por https://grc.tecdex.net/normas?tab=ajustes.
   Seleccionar control QA_STEP6A3_TRAZABILIDAD_DOCUMENTAL_001, versión activa v1,
   actividad en borrador. Antes fallaba por ETag -zstd. Se desplegó no-transform,
   pero el PO pidió la pausa antes de abrir nuevamente el detalle.
5. Probar denegación de autorrevisión con PO real; luego Mario revisa y decide
   personalmente. No sustituirlo ni usar tokens PO como socio. Continuar después
   P1/P2/P3 según mandato original; no publicar ni contratar material no elegible.
6. Completar validación QA desplegada, actualizar estos mismos cuatro archivos,
   ejecutar sólo checks afectados y finalizar PR/merge conforme al ruleset
   (PR obligatorio, rector-governance requerido, sin force). No nuevo expediente.

## Actores y artefacto de revisión

PO: Zoho andres.barouh@tecdex.net, identidad 01a0cfae-d860-730d-88b8-d8b1b3f5d7dc.
Mario Cáceres: IAM Managed mario.tecdex, identidad nueva
01a16559-dee5-754d-a746-aa5b961e22e2, membership
01a1656f-c602-73b0-a658-fef85f26ed72, sólo GRC_MANAGER en TECDEX.
No conceder Platform ni confundir identidad histórica Mario 01a0e832-ccb7-7574-8316-0781503d47de.
Ambos autenticaron realmente; la revisión dual completa aún no está probada.

Tenant TECDEX 01a0cfc7-0c97-75a3-890f-d6ca9db8bbe9. Nunca ACME-1.
ControlVersion 01a15910-4a71-71ea-ad1d-c1b7e37d9a50.
Propuesta PO 01a16575-da86-743c-a680-40563e61a7a4 (actividad), borrador,
vigencia solicitada 2026-10-22T21:20Z a 2026-10-23T21:20Z. Si se reanuda después
no asumir vigencia ni modificar fechas a ciegas; usar sucesión/operación canónica.
Texto: validar trazabilidad de origen, evidencia vinculada y revisión independiente,
sin declaración de cumplimiento normativo. Auditoría de creación en VALIDATION.
Conservar propuesta de frecuencia de Mario 01a16571-2563-715c-ab43-299281d97d00.

## Decisiones y límites conservados

El PO pospuso entregar copias ISO finales licenciadas hasta salida comercial;
permite validación QA provisional, no licencia ficticia. Cinco packs en borrador,
Ley21.663 ausente, cero oficiales publicados/contratables/contratados. Preservar
los tres accesos QA. No importar resúmenes ni candidatos como texto oficial.

Ambos PDFs se diseñaron aquí porque el PO confirmó que no existían. Ticket único
para alta, Gerencia autoriza/emite, Operaciones verifica/ejecuta/entrega; QA sin
cobros. El documento de términos no exige segunda firma ni formulario. No hay
ticket emitido ni aprobación real registrada. No simular adopción de PlanVersion
GRC V2 ni crear ticket shadow en audit/localStorage/JSON. Falta flujo electrónico
persistido conforme a contratos canónicos; documentos vacíos no lo completan.

Referencia visual PO: https://tcdx-iso.tecdex.net/, sólo calidad gráfica. No copiar
contratos ni datos de ese producto. No guardar sus credenciales. Branding local
versionado. Diseño implementado, revisión humana pendiente.

## Operación y evidencia

Infra existente: DB .2.40, backend .2.45, frontend .2.46; dominio grc.tecdex.net.
Promotor existente scripts/phase6a3/qa-promote-session-duration.py.
Wrappers de esta entrega en custodia privada build.py/deploy.py/runtime.py/run.py;
no incluyen secretos. Mismo checkout permite continuar sin reconstruir ni
repetir suites ya satisfactorias. Si cambian bytes de runtime, reconstruir desde
Git limpio y preservar trazabilidad de ambos componentes. Handoff documental
posterior no requiere reconstruir las imágenes ya verificadas.

No se cerró PR25 ni gate integrado. Mantener estados honestos. No STEP6A5/6A6.
