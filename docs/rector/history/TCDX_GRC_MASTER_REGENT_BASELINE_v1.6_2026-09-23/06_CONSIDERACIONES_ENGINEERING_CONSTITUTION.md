# TCDX GRC — Consideraciones y Constitución de Ingeniería

## Aprendizajes del proyecto anterior

Los errores que no deben repetirse incluyen:

- expandir alcance antes de estabilizar contratos centrales;
- tratar tests verdes como equivalente de runtime correcto;
- prompts/tareas demasiado amplias;
- no congelar suficientemente temprano el modelo canónico;
- corregir síntomas sucesivos sin resolver la autoridad contractual;
- proliferar representaciones equivalentes del mismo concepto;
- mantener OLD + NEW + fallback;
- agregar estructura porque un consumer la espera;
- fabricar semántica ausente;
- inferir escalas por valor;
- divergencia entre estados de aplicación y constraints SQL;
- INSERT ciego y retries no idempotentes;
- dedupe/query sin tenant explícito;
- refactors oportunistas;
- declarar PASS cuando runtime está DEFERRED;
- usar `created_at` como semántica temporal universal.

## Reglas obligatorias

### Contract first
Ninguna implementación redefine silenciosamente el contrato.

### Canonical data first
Existe una autoridad lógica por concepto.

### No legacy
No se introduce compatibilidad regresiva salvo decisión arquitectónica explícita y temporal, con plan de eliminación. El objetivo del nuevo proyecto es no necesitarla.

### Multi-tenant by construction
El tenant scope forma parte del contrato de datos y autorización.

### Backend authoritative
La UI nunca constituye el mecanismo de seguridad.

### Idempotencia
Toda operación repetible define retry/conflict behavior.

### Data sufficiency
Si faltan inputs requeridos, el resultado es `insufficient_data` o equivalente contractual; nunca se inventa el dato.

### Escalas y unidades
Toda conversión es explícita mediante source scale/unit y target scale/unit.

### Runtime evidence
Estados de evidencia:
NOT_STARTED → IMPLEMENTED_UNVERIFIED → LOCAL_PASS → INTEGRATION_PASS → E2E_PASS → RUNTIME_PASS → RELEASE_READY.

`DEFERRED != PASS`.

## Regla de bugfix

Antes de modificar:
1. identificar contrato correcto;
2. autoridad;
3. estructura canónica;
4. consumer que viola el contrato;
5. consumidores equivalentes;
6. corrección sistémica;
7. regression test.

## Regla de reemplazo

```text
OLD
→ migration
→ migrate consumers
→ tests
→ runtime
→ delete OLD
```

No se acepta fallback indefinido.

## Gates

No commit/push/merge/deploy hasta superar los gates correspondientes y obtener autorización cuando el flujo de trabajo la requiera.

## Addendum constitucional - Compatibilidad semantica de datos

Queda prohibido implementar nuevas funcionalidades mediante modelos paralelos, campos de conveniencia, reinterpretaciones silenciosas o acceso directo a fuentes externas que eludan el contrato canonico. Extender funcionalidad exige reutilizar el contrato o aprobar previamente una extension versionada con analisis de impacto. Esta regla es un gate de arquitectura y anti-regresion. Ver documentos 14 y 15.
## Gate fundacional adicional

Toda implementación debe demostrar cumplimiento de `28_PREIMPLEMENTATION_CONTRACT_GATE.md`. Los documentos 16-31 son parte de esta Engineering Constitution por referencia.
