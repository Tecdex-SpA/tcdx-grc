# TCDX GRC — Alineamiento para el nuevo desarrollo

## Secuencia de ingeniería

Producto completo no significa implementar todo simultáneamente.

El orden lógico es:

```text
Product Contract
→ Domain Contract
→ Canonical Data Model
→ Semantic/Methodology Contracts (14-34)
→ State Model
→ RBAC
→ Invariants
→ RECTOR_BASELINE
→ Physical PostgreSQL Model
→ PHYSICAL_DATA_MODEL_REVIEW
→ API/Event/Permission/Test Contracts
→ EXECUTABLE_CONTRACTS
→ Definitive Migrations and Seeds
→ Backend
→ Frontend
→ Integration
→ E2E
→ Runtime
→ Release
```

La secuencia detallada, única y vinculante es `43_PLAN_MAESTRO_RECTOR_DISENO_Y_DESARROLLO.md`. Esta versión sustituye cualquier secuencia previa que ubicara API o persistencia antes de la revisión del modelo físico.

El desarrollo puede dividirse en slices verticales, pero cada slice aceptado debe quedar completo end-to-end y no introducir deuda contractual deliberada.

## Definition of Done de una capacidad

Una capacidad está terminada cuando:
- contrato definido;
- dominio/owner definido;
- modelo canónico definido;
- estados definidos;
- tenant scope definido;
- RBAC definido;
- persistencia implementada;
- API implementada;
- UI implementada si corresponde;
- audit trail;
- manejo de errores;
- unit/integration tests;
- E2E;
- cross-tenant cuando aplique;
- runtime validado;
- trazabilidad actualizada.

## Prioridad arquitectónica

Primero foundations transversales correctas: identidad, tenant, organización, autorización, auditabilidad, contratos, persistencia y observabilidad.

Luego dominios GRC construidos como slices completos sobre esas foundations.

## Reutilización de v4

Se reutiliza conocimiento, no deuda técnica.

Se pueden estudiar decisiones, UX, tests, fórmulas, funcionalidades y fallas de `tcdx-iso-saas-v4`. Cualquier reutilización de código requiere demostrar que respeta los nuevos contratos. No se importa legacy para acelerar artificialmente.

## Cambios

Una nueva necesidad modifica primero la fuente contractual correspondiente y después la implementación. No se permite que el código se convierta accidentalmente en la única documentación del comportamiento.

## Addendum - Secuencia obligatoria para consumidores de informacion

Antes de desarrollar Integration Hub, Data & Metrics, Rules/GRC Impact, dashboards o cualquier consumidor nuevo, revisar y cumplir `14_CONTRATO_CANONICO_INGESTA_CALCULO_RESULTADOS.md` y `15_MODULOS_CONSUMIDORES_Y_MATRIZ_DE_INFORMACION.md`. No implementar primero y reconciliar datos despues.
