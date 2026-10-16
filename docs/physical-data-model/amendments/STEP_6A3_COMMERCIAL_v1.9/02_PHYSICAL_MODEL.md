# Modelo físico candidato — PostgreSQL16

STATUS=APPROVED_ACTIVE_CONTRACT. Invariantes rector07/08/21/22/23/29/30/33/42/46; naming físico11. DDL exacto en 20261013000100_commercial_contract_reconciliation.sql; fuera del manifest/runner activo; ensayo PostgreSQL aislado PASS; QA compartido no ejecutado.

| Objeto | Perfil/ownership | Columnas y restricciones propias |
| --- | --- | --- |
| platform.commercial_families | I / PLATFORM_CONTROL | commercial_family_id UUID PK; family_code varchar(96) UQ trim/no vacío; name text trim/no vacío; source_type varchar(32) trim/no vacío; published_at timestamptz NOT NULL; publication_manifest_sha256 char(64) hex; UQ(id,source_type); actores FK RESTRICT; UPDATE/DELETE prohibidos. |
| platform.regulatory_pack_commercial_family_links | I / PLATFORM_CONTROL | regulatory_pack_commercial_family_link_id UUID PK; regulatory_pack_id UUID NOT NULL UQ; commercial_family_id UUID NOT NULL; source_type varchar(32); FKs compuestas raíz/tipo y familia/tipo; UPDATE/DELETE prohibidos. |
| platform.plan_version_commercial_family_links | I / PLATFORM_CONTROL | plan_version_commercial_family_link_id UUID PK; plan_version_id UUID NOT NULL; commercial_family_id UUID NOT NULL; UQ par; FKs RESTRICT. INSERT sólo padre no publicado; UPDATE/DELETE prohibidos. |
| platform.usage_limits | I / PLATFORM_CONTROL existente | commercial_family_id UUID nullable; FK familia + FK par PlanVersion/familia; reemplazar UNIQUE(limit_code) por UQ NULLS NOT DISTINCT(PV,code,family,from); finite>=0; pack entero/unidad; intervalos válidos; GiST total/familiar; INSERT sólo padre no publicado; UPDATE/DELETE prohibidos. |
| platform.subscriptions | TM / TENANT_OWNED existente | previous_subscription_id nullable; FK tenant+previous; UQ sucesor noNULL; no self; EXCLUDE tenant/rango para active y cancelled_atNULL; lineage diferido padreended/corte exacto; cierre anterior conserva campos contractuales y audit before. |
| platform.subscription_regulatory_packs | TM / TENANT_OWNED existente | regulatory_pack_id NOT NULL por FK compuesta versión/raíz; previous_subscription_regulatory_pack_id nullable; FK tenant+previous; UQ sucesor; triggers root prospectivo y lineage diferido; exclusión por versión intacta. |

Nombres >63 bytes se derivan mediante prefijo54 + '_' + primeros8hex SHA256; evitar truncamiento PostgreSQL ambiguo. Todas las FKs ON DELETE RESTRICT. Nuevas tablas usan perfil I existente, timestamps técnicos y CHECK actor <=1; ceremonia exige exactamente un actor real y audit completo. No defaults comerciales.

## Publicación y cuota

Las nuevas PlanVersion deben tener effective_from explícito y al menos una familia. Cada dimensión regulatory_pack_count cubre exactamente el rango del padre mediante range_agg; sin gaps/solapamientos ni cobertura fuera del padre. Un solo valor comercial constante por dimensión, aunque exista más de un intervalo contiguo. Valores no finitos, negativos, fraccionarios o unidades distintas bloquean publicación. Total y cuotas familiares se verifican independientemente. No se impone suma(familias)=total.
La inmutabilidad bloquea INSERT tardío de familias/UsageLimit/Entitlement sobre PV publicada, además de UPDATE/DELETE. Se conserva el contrato publicado previo; no se retrocompleta v1. Actualización material de cuota o elegibilidad crea nueva PV draft, artefacto exacto y publicación posterior.

## Lineage/temporalidad

Subscription hija inicia en corte t y conserva ends_at original del origen (NULL sólo si antes NULL). Antigua ends_at=t y lifecycleended; cancelled_at original NULL se conserva. Padre starts_at<hija.starts_at y parent.ends_at=hija.starts_at; tenant/plan/código original no se cambian. Nueva assignment misma versión/raíz, starts=t y expires=antigua expiry original; vieja revoked/end=t. Audits hijos almacenan expiración previa y corte. Los triggers comprueban también hijos ya enlazados al modificar un padre.
El contrato exige antes del COMMIT que expiry transferida coincida con audit before verificable; no basta comprobar la FK. Servicio, audit y tests deberán probar esa igualdad; no se reconstruye la expiración original después del corte por inferencia.

R-P conserva historia por versión y usa trigger root para nuevos/expandidos intervalos. Migración no realiza clasificación, cuotas, sucesiones inferidas ni grants. Datos incompatibles con restricciones generales de intervalos, subs activas o UsageLimit bloquean antes de DDL. Coexistencias históricas por raíz se inventarían y preservan; conflictos efectivos bloquean adopción.
