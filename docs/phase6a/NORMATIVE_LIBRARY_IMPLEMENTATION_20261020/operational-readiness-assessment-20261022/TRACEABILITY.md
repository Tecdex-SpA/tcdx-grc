# Matriz contrato → código → runtime → prueba

| Binding | Entidad/contrato | Backend y persistencia | Policy/API | Frontend | Prueba/evidencia | Estado real | Brecha principal |
| --- | --- | --- | --- | --- | --- | --- | --- |
| B01 | `REGULATORY_SCOPE`, import contract; Framework/Pack genéricos | Allowlist de seis códigos y validación específica `CL_LEY_21663`; esquema existente | Reutiliza import/pack gates; sin endpoint por ley | `NormsWorkspace` puede seleccionar marcos publicados | `library-law.test.ts`; assets PASS | IMPLEMENTED_VALIDATION_ONLY | Sin import, homologación, pack oficial ni 10 candidatos materializados |
| B02 | KnowledgeSource/Item/Version + `knowledge_version_context_links` XOR | DDL adoptado; custody, readers, writers y typed links preparados | 20 operaciones Knowledge, policies global/tenant y H04 | `ConnectedKnowledgeContent` y cliente preparados | library/custody/rights/composition tests | WIRED_CODE_ONLY | Bootstrap, IAM, registry, rights reales y UI de autoría ausentes |
| B03 | Knowledge tenant-owned + Subject | Context body y target Subject mismo tenant/versionado | SoD Knowledge tenant, ownership y target checks | Vista de contenido acepta contexto empresarial | library/composition tests | WIRED_CODE_ONLY | Sin pantalla de contexto, grants, datos o E2E multi-tenant |
| B04 | ConfigurationDefinition/Override/EffectiveConfiguration + ControlVersion | 3 columnas target y código de policy/resolver adoptados; lector efectivo preparado | Get/list/update/review/decide y create existente | Sin pantalla de cuatro ajustes | control-adjustment/resolver tests | WIRED_CODE_ONLY | Cuatro Definitions/reglas no materializadas; bootstrap/UI ausentes |
| B05 | Grant limitado approve + ObjectPolicy/SoD | `assertOverrideSoD`, actor y target bajo lock | GRC Manager + permiso/scope; autor no revisa/decide | Sin flujo gerencial | autoaprobación negativa aislada | CODE_PREPARED_DEFAULT_DENY | Grant real NONE; actores/roles reales y matriz ALLOW/DENY no probados |
| B06 | 13 lifecycle bindings, audit/outbox/idempotency/CAS | `executeLibraryMutation`, dispatch H01, atomicidad canónica | Rutas publicadas y verificación exacta del registry | Cliente transporta ETag/idempotency | mutations/registry/composition tests | WIRED_CODE_ONLY | Bindings/versiones no activados en registry QA; no runtime |
| B07 | RequirementApplicability.context_knowledge_version_id | Columna/FK/triggers adoptados; hooks y perfil audit preparados | Rutas existentes incluyen hook/proyección sólo con composition | Sin selector de KnowledgeVersion en aplicabilidad | applicability-hooks/library tests | WIRED_CODE_ONLY | Bootstrap no conecta hook; sin UI, historia real o E2E |
| B08 | Seis MatrixTypes como proyecciones | Seis SQL shapes, auth por eje/celda, cursores y lectura RR | `matrixRead` y permiso de intersección | Tabla/loader genérico aislado; no mini/full montado | library/component + 2 browser aislados históricos | COMPONENT_VISUALIZABLE_ONLY | No bundle/shell/dashboard/vista completa/filtros; IAM/runtime ausentes |
| B09 | Preferencias efímeras; export posterior | Sin persistencia paralela | Cliente/hook consume contratos; sin export no autorizado | Estado de cursor/filtros local al componente | client/component tests | PREPARED_EPHEMERAL_ONLY | Sin consumidores/montaje; Report Studio/export deliberadamente diferido |
| H04/PV01 | `knowledge_source_usage_rights`, evidencia exacta y función corregida | Tabla/función/triggers adoptados; adapter DB + Minio exacto | Fail-closed por source/hash/edition/pack/act/env/audience | Mensaje metadata-only/restricción | rights tests; 149 físicos históricos; QA post-gates | PHYSICAL_AND_CODE_VERIFIED_NO_RIGHTS | Cero registros/licencias/evidencias reales; no procedimiento operacional ejecutado |

## Requisitos funcionales agregados

| Capacidad | Evidencia actual | Estado |
| --- | --- | --- |
| Registro/versionamiento de fuentes | API/código/DDL presentes; sin runtime/datos | PARCIAL |
| Unidades/requisitos | Lectura existente plana por FrameworkVersion | PARCIAL |
| Homologación controles/obligaciones | Mappings y proyecciones; no homologación real | PENDIENTE_DATOS_Y_REVIEW |
| Crosswalks | Tabla/proyección existente; seis preliminares no importados ni homologados | PENDIENTE |
| Knowledge editorial COMPRENDER/IMPLEMENTAR/DEMOSTRAR | Esquema, custody y componente aislado | DESCONECTADO |
| Personalización tenant | Código B04 y esquema físico | BLOQUEADO_DEFINITIONS_GRANTS_RUNTIME |
| Aprobación gerencial | Policy/SoD/ciclo en código | BLOQUEADO_IAM_REGISTRY_REAL_ACTORS |
| Seis matrices | Backend/UI genéricos aislados | DESCONECTADO_DEL_PRODUCTO |
| Derechos por fuente/acto | Esquema/función/policy | BLOQUEADO_SIN_EVIDENCIA_REAL |
| Separación normativa/editorial/cumplimiento | Contratos y proyecciones respetan la separación | PASS_CODE_CONTRACT_ONLY |

