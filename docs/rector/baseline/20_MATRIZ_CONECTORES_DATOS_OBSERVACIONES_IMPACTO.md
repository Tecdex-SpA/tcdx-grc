# 20 - Matriz de conectores, datos, observaciones e impacto

## 1. Principio

El modelo canónico se diseña antes que cada adapter. APIs externas pueden cambiar sin alterar los contratos internos.

Todos los conectores implementan:

`Authenticate -> Discover -> Extract -> Checkpoint -> RawRecord -> Validate -> Normalize -> Subject Binding -> Observation -> Metric -> Rule -> Impact`

## 2. Contrato técnico común

Todo conector define:

- provider/version;
- auth method y scopes mínimos;
- supported objects;
- polling/webhook strategy;
- cursor/checkpoint;
- rate limits;
- raw payload retention;
- schema version;
- dedup key;
- timezone;
- retries/backoff;
- DLQ;
- credential rotation;
- health;
- permissions missing behavior;
- deletion/tombstone behavior.

## 3. Catálogo inicial de señales

### Jira
Objetos: project, issue, incident/change/action según mapping.
Señales: ticket crítico vencido, SLA breach, backlog growth, repeated incident, overdue action.
Subjects: project/process/service/ticket.

### Confluence
Objetos: page/document/space.
Señales: policy overdue, missing owner, review overdue, deleted page, stale evidence.
Subjects: document/process/control/evidence candidate.

### GitHub
Objetos: organization, repository, branch, pull request, workflow, security alert.
Señales: unprotected branch, secret scanning disabled, dependency scanning disabled, PR without required approval, failed workflow, repository without owner, critical vulnerability open.
Subjects: repository/system/application/pipeline.

### GitLab
Objetos: group, project, branch, merge request, pipeline, vulnerability, runner.
Señales equivalentes definidas por observation codes, no por nombres del provider.

### Jenkins
Objetos: job, build, deployment.
Señales: failed build/deployment, high failure rate, disabled job, low coverage, excessive duration.

### Microsoft 365 / Entra
Objetos: tenant, user, group, application/service principal, sign-in.
Señales: MFA disabled, risky user/sign-in, external access, elevated app permission, inactive enabled account.

### Google Workspace
Objetos: user, group, file, OAuth app, login event.
Señales: 2SV disabled, sensitive external sharing, inactive user, risky OAuth app, open group, anomalous login.

### AWS
Objetos: account, IAM principal, bucket, resource, logging/security finding, backup.
Señales: public bucket, audit logging disabled, MFA absent, excessive IAM, critical security finding, failed backup, unencrypted resource.

### Azure
Objetos: tenant/subscription, identity, storage, Key Vault, policy result, security alert, backup.
Señales: critical alert, policy noncompliance, public storage, MFA missing, exposed vault, failed backup, anomalous activity.

### Google Cloud
Objetos: organization/project, identity, bucket, key, logging, SCC finding, backup.
Señales: public bucket, excessive IAM, incomplete logging, critical finding, missing backup, overdue key rotation, project without owner.

## 4. Matriz mínima por señal

Cada señal publicada debe completar:

| Campo | Obligatorio |
|---|---|
| provider object | sí |
| external stable id | sí |
| raw schema version | sí |
| canonical subject type | sí |
| observation_code | sí |
| value type/unit | sí |
| freshness | sí |
| metric_code(s) | cuando aplica |
| rule_code(s) | cuando aplica |
| mapping target | cuando aplica |
| evidence semantics | sí/no explícito |
| consumer modules | sí |
| automation policy | sí |
| lineage | sí |

## 5. No inferencia destructiva

Una page de Confluence no se convierte automáticamente en Evidence aprobada. Un GitHub repository no se convierte automáticamente en Asset de negocio. Un user externo no se convierte automáticamente en UserIdentity interno. Primero se crea Resource/ExternalIdentityBinding y luego mapping gobernado.

## 6. Proof contractual obligatorio antes de implementar un adapter

El documento no autoriza un conector sólo por nombrar objetos o señales. Para cada provider que entre a implementación debe existir una `ConnectorVersion` publicada que materializa el contrato versionado del conector, con como mínimo una fila por señal que incluya:

`provider_object | endpoint/event | source_field_path | source_type | external_id_path | source_timestamp_path | tombstone/deletion_semantics | normalization | canonical_subject_type | observation_code@version | canonical_value_type/unit | freshness | dedup_key | metric_code@version | rule_code@version | grc_target_type | consumer | automation_policy | permission/scope | evidence_semantics | error_behavior`.

No se autoriza mapping implícito por nombre de campo. Cambios incompatibles del API externo generan nueva versión del contrato del conector.

## 7. Proof inicial de representabilidad

Los siguientes providers quedan **representables por el core**, pero NO implementables hasta completar su `ConnectorVersion` contractual a nivel de campos: Jira, Confluence, GitHub, Microsoft 365/Entra y AWS. GitLab, Jenkins, Google Workspace, Azure y Google Cloud siguen la misma regla.

Por tanto, `representable` no equivale a `implementation_ready`.

## 8. Política de precedencia

Cuando dos providers produzcan el mismo hecho semántico, el adapter conserva ambos. La elección de dato autoritativo, merge o conflicto pertenece a `SourcePrecedencePolicy`; ningún conector puede sobrescribir otra fuente por prioridad codificada localmente.
