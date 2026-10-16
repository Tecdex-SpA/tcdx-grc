# 29 - Configuración, parametrización y extensibilidad

## 1. Regla

No hardcodear tenant IDs, fechas, normas, thresholds, roles de negocio, connector IDs ni reglas particulares de clientes.

## 2. Modelo canónico de configuración

La configuración metodológica/funcional se representa mediante:

- `ConfigurationDefinition`: contrato versionado del parámetro, tipo, validación, default, scopes permitidos, `tenant_overridable`, `object_overridable`, owner y effective interval;
- `ConfigurationOverride`: valor versionado/effective aplicado en Tenant o Scoped Object y referencia a la definición;
- `EffectiveConfiguration`: resultado derivado reproducible de resolver las capas para un scope/fecha concreta.

No almacenar parámetros críticos exclusivamente en JSONB si participan en constraints, joins, authorization, calculation, filtering o reproducibilidad.

## 3. Precedencia de configuración

De menor a mayor precedencia:

`Platform Default → Methodology/Regulatory Pack Definition → Tenant Policy/Override → Scoped Object Override`.

Un nivel sólo sobrescribe campos autorizados por el superior. Dos overrides incompatibles de igual especificidad producen `configuration_conflict`; nunca depende de orden de lectura.

Para todo cálculo/snapshot oficial se debe poder reconstruir la `EffectiveConfiguration` usada mediante IDs/versiones de capas y values efectivos. La resolución puede calcularse on-demand/cachearse, pero cuando afecta un resultado publicado debe quedar persistida o referenciada de forma inmutable en su lineage.

## 4. Global vs tenant

Global versionada: permission catalog, observation types, metric types, base methodologies, connector definitions, regulatory packs y ConfigurationDefinitions globales.

Tenant: applicability, mappings, thresholds permitidos, schedules, owners, appetite/tolerance y enabled capabilities dentro de contratos autorizados.

Tenant override sólo existe si la definición superior marca el campo `tenant_overridable`.

## 5. Extensión

Nueva norma: Regulatory Pack + mappings; no nuevas tablas por norma.

Nuevo conector: Adapter + external schema mapping + observation catalog extension; no nuevas semánticas GRC.

Nueva métrica: MetricDefinition versionada; no columna nueva en dashboard.

Nueva regla: RuleDefinition + mapping; no if/else tenant-specific en código.

## 6. Feature flags, entitlements y RBAC

FeatureFlag controla rollout técnico. Entitlement controla derecho comercial/capacidad. RBAC controla autorización. Ninguno reemplaza ConfigurationDefinition/Override y no se mezclan en `EffectiveConfiguration` metodológica.

## 7. Metadata

JSONB se reserva para atributos abiertos/no index-critical. Campos de dominio necesarios para constraints, joins, filtering, authorization, calculation, policy resolution o lineage deben ser columnas/entidades canónicas.
