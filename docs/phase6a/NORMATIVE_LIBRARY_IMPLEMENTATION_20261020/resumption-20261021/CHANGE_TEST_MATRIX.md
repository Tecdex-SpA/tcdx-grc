# Cambio → contrato → riesgo → prueba → gate

| Cambio | Contrato | Riesgo | Prueba focalizada | Gate |
|---|---|---|---|---|
| Relación y adapter H04 | H04 CONTRACT/DDL/receipt | uso sin prueba, alcance/edición/entorno incorrectos | rights.test + bytes/custodia | contrato local; no integridad física |
| Policy Knowledge | B02/B03 ObjectPolicies + H04 | tenant cruzado, Support/body, targets/pack | composition/rights/library tests | código aislado |
| Lecturas sin locks de escritura | Readers B02/B08 | FOR SHARE dentro READ ONLY | queries/read mocks + typecheck | código, no PG |
| Rule adapter de cuatro Definitions | B04 + CONTROL_VALIDATION successor | omitir reglas superiores/desconocidas | control policy tests + resolución/SoD existentes | contrato/código |
| Composition/rutas 30+create existente | OpenAPI/operations/B06/Item | actor/header equivocado, falta handler, activación accidental | Fastify inject y construcción real de composición | HTTP aislado; sin QA |
| Hook de aplicabilidad | APPLICABILITY_CONTEXT_V1 | doble auditoría, contexto ajeno, retroactividad | orchestration + applicability tests | transacción simulada; no atomicidad PG |
| Cliente/hooks UI | OpenAPI/custodia/ETag + baseline UI | reintento/CAS inválido, ruta/tenant incorrectos | client tests, SSR existente, harness visual | transporte/componentes aislados |

Reutilizar 550/110/two-browser anteriores como historia. Esta reanudación modifica servicio/rutas y transporte central: una batería final de unitarios no-PostgreSQL y builds está justificada tras estabilización, además de rectores obligatorios. Nunca lanzar tests PostgreSQL, integración, importador o comandos de DDL. La composición no se proporciona en server.ts; no se monta navegación ni módulos nuevos.
