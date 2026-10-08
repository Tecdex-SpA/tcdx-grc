# Phase 5+ — contrato ejecutable Subject y validación no autoritativa

Autoridad: resolución humana de arquitectura de 2026-09-29; rector 16, 21, 22, 25, 30, 33, 39 y 46. Aplica después de la migración `20260929000300`. Default DENY.

| Operación | Método | Autoridad | Grant | Auditoría | Idempotency | Outbox |
|---|---|---|---|---|---|---|
| `subjectCreate` | POST `/subjects` | `org.subjects` tenant autenticado | `organization.subject.create`: TENANT_ADMIN tenant únicamente | `audit.organization.subject.create.v1` | requerida | ninguno |
| `tenantAccountClassificationGet` | GET `/platform/tenants/{id}/account-classification` | EffectiveConfiguration | `platform.tenant_account_classification.update`: PLATFORM_ADMIN platform | ninguna | natural | ninguno |
| `tenantAccountClassificationSet` | POST misma ruta | ConfigurationOverride versionado | mismo grant | `audit.platform.tenant_account_classification.set.v1` | requerida | ninguno |
| `validationProvenanceCreate` | POST `/platform/regulatory-pack-validation-provenances` | provenance exacta | `platform.regulatory_pack_validation_access.create`: PLATFORM_ADMIN platform | `audit.platform.regulatory_pack_validation_provenance.create.v1` | requerida | ninguno |
| `validationAccessPlatformList` | GET `/platform/tenants/{id}/regulatory-pack-validation-accesses` | acceso de un tenant | `platform.regulatory_pack_validation_access.read`: PLATFORM_ADMIN platform | ninguna | natural | ninguno |
| `validationAccessCandidateList` | GET `/platform/regulatory-pack-validation-candidates` | proyección derivada de metadatos draft version/provenance | `platform.regulatory_pack_validation_access.read`: PLATFORM_ADMIN platform | ninguna | natural | ninguno |
| `validationAccessTenantList` | GET `/regulatory-pack-validation-accesses/current` | tenant autenticado | mismo permiso: TENANT_ADMIN tenant únicamente | ninguna | natural | ninguno |
| `validationAccessCreate` | POST `/platform/regulatory-pack-validation-accesses` | acceso exacto | `platform.regulatory_pack_validation_access.create`: PLATFORM_ADMIN platform | `audit.platform.regulatory_pack_validation_access.create.v1` | requerida | ninguno |
| `validationAccessRevoke` | POST `/platform/regulatory-pack-validation-accesses/{id}:revoke` | acceso exacto | `platform.regulatory_pack_validation_access.archive`: PLATFORM_ADMIN platform | `audit.platform.regulatory_pack_validation_access.revoke.v1` | requerida + If-Match | ninguno |

`organization.subject.read` conserva sus grants. Ningún rol consumidor de Controls recibe create. Los cinco permisos nuevos son CORE_PLATFORM. No se publican Subject update/archive, ni lifecycle adicional de Subject.

## Policy central

`packVisibility()` une `effectivePacks()` oficial y `nonAuthoritativeValidationPacks()` para el tenant autenticado. Oficial requiere Subscription y asignación efectivos, Pack/PackVersion publicados y PackVersion vigente. Validación requiere `NODE_ENV=development|test|qa`, clasificación efectiva `demo|test`, acceso activo y vigente para versión exacta, provenance/ImportManifest/source verificables, Pack/PackVersion `draft`, licencia original `NOT_YET_LICENSED` o clasificación test expresamente aprobada y PackVersion vigente. Producción y comercial deniegan. No hay fallback. El resultado etiqueta `access_mode=official|non_authoritative_validation` y restringe FrameworkVersion, NormativeUnit, Requirement, Control global y relaciones al conjunto autorizado.

La UI separa marcos contratados de marcos de validación y muestra: «Contenido provisional/no autoritativo para validación. No corresponde al texto oficial/licenciado de la norma.» La vista comercial de versiones seleccionables sigue siendo sólo `published`. La revocación corta nuevas lecturas y operaciones referenciales; la historia tenant persiste.

## Decisión humana STEP 22J — lectura de candidatos

Se aprueba `validationAccessCandidateList` como GET de plataforma sobre una **proyección derivada y no persistida**. El selector comercial `/platform/regulatory-pack-versions` sólo expone versiones `published`; las listas de validation access exponen relaciones ya creadas. Los candidatos `draft` no autoritativos requieren su propia lectura de pareja version/provenance, sin alterar ninguno de esos contratos.

Sólo PLATFORM_ADMIN autenticado con `platform.regulatory_pack_validation_access.read` en scope platform puede consultar la ruta, sin `x-tcdx-tenant-id`. Producción deniega. Auditoría, idempotency record y domain events: ninguno; GET naturalmente idempotente, transacción RO. No enumera tenants ni afirma contratación, publicación o licencia oficial; no expone texto normativo. Consulta únicamente `regulatory.regulatory_packs`, `regulatory.regulatory_pack_versions`, `regulatory.regulatory_pack_validation_provenances`, `regulatory.regulatory_import_manifests` y `regulatory.regulatory_sources`. No hay permiso, grant, tabla, migración ni dato semilla nuevos. La creación de acceso sigue siendo la autoridad final de mutación.

## Fechas y materialización

ISO 9001:2015 termina 2026-09-16 y Ley 21.719 comienza 2026-12-01; ninguna es vigente el 2026-09-29. Las otras versiones ISO sólo son candidatas tras provenance aprobada, clasificación y acceso exacto. QA no se modifica en esta entrega. El plan de QA debe configurar TECDEX mediante la operación de plataforma, crear Subject con POST tenant y aprobar provenance/acceso por cada versión elegible; jamás publica ni licencia ISO.
