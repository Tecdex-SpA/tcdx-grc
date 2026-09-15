# Domain and integration event catalog

| Campo | Valor |
|---|---|
| Contract owner | Backend Owner |
| Approving human roles | Architecture Owner, Backend Owner, Security & Privacy Reviewer, domain owner |
| Status | `BLOCKED` |

## Distinción obligatoria

Domain/integration events comunican hechos confirmados y side effects entre bounded contexts. `AuditEvent` registra accountability y outcome; no es un domain event. `OutboxEvent` es la persistencia de entrega de un event, no un tercer hecho de negocio.

## Envelope normativo

Todo evento aprobado contiene:

| Field | Contract |
|---|---|
| `event_id` | UUIDv7 estable del hecho lógico; dedup key primaria |
| `event_type`, `event_version` | código publicado + entero positivo; breaking payload change incrementa version |
| `ownership_class` | uno de los cuatro valores físicos aprobados |
| `tenant_id` | obligatorio para TENANT_OWNED/TENANT_DERIVED; NULL para GLOBAL_REFERENCE/PLATFORM_CONTROL |
| `aggregate_type`, `aggregate_id` | subject canónico del hecho |
| `occurred_at` | UTC; tiempo del hecho confirmado, no delivery time |
| `actor_user_identity_id` / `actor_service_principal_id` | actor tipado y mutuamente exclusivo cuando aplica |
| `correlation_id`, `causation_id` | propagación end-to-end; causation nullable sólo en root command |
| `payload` | schema versionado, minimizado y sin secretos/blobs/URLs firmadas |
| `classification` | clasificación de seguridad/PII que gobierna acceso y logs |

La transacción del aggregate inserta el OutboxEvent. Entrega at-least-once; consumidores deduplican por `event_id` y sus propias business keys. Orden total no se promete; el orden sólo puede exigirse por aggregate cuando el event catalog aprobado lo declare. Retención se resuelve por policy; no se inventa TTL común.

## Familias requeridas, aún no publicadas

Los siguientes nombres son identificadores de blocker y no `event_type` ejecutables.

| blocker | owner/producer | aggregate/subject | known consumers by contract | outbox | ordering expectation derivable | source | decision required |
|---|---|---|---|---|---|---|---|
| EVT-B01 lifecycle transition confirmed | owning domain/application command | entity under a published transition | notification, recalculation or domain consumers only when transition registry lists them | required for inter-domain effects | aggregate-local causal order may be required | 21 §15–16, 25 | exact event codes, payloads, versions and transition mappings |
| EVT-B02 evidence eligibility/review/expiry | Evidence & Documents | Evidence/EvidenceVersion | calculations, issues/notifications only by approved policy | required | preserve supersession causality | 21, 24 | exact events and consumers |
| EVT-B03 issue/action workflow | Issues & Remediation | Issue/Action/Verification | notifications, metrics, source domain | required | aggregate causal order | 21 | exact transition side effects |
| EVT-B04 regulatory pack publication/change | Regulatory & Compliance / Knowledge | pack/framework/change | entitlement-aware compliance/reporting consumers; no future consumers invented | required | version/edition order | 37, 41, 44 | codes, approvals, payload minimization |
| EVT-B05 observation/measurement/calculation | Integration/Data & Metrics | RawRecord/Observation/CalculationRun/Measurement | Rules/Data Quality/Snapshot as contractually mapped | required across contexts | source/checkpoint and calculation causality | 14, 17, 23, 35 | exact event boundaries and codes |
| EVT-B06 rule/impact/proposal | Rules & Impact | RuleEvaluation/GRCImpact | mapped domain owner; notification | required | generation-limited; no self-loop | 18, 36 | exact event/output mappings |
| EVT-B07 connector sync/health | Integrations | Integration/SyncRun | operational observability; data pipeline | required for domain consumers | checkpoint order per integration | 20, 26 | provider contract and event schemas |
| EVT-B08 report/job completion | Reporting/Async Plane | ReportRun/JobExecution | authorized notification/requester | required | job attempt causality, not global order | 25–27, 34 | event codes and retention |
| EVT-B09 AI recommendation lifecycle | AI Assistance | AIJob/AIRecommendation | human reviewer; accepted domain command only after explicit action | required | job/recommendation causal chain | 36 | purpose and command mappings |

## Publication gate per event

No event may be added until one catalog row freezes: event name/version, owner, producer, known consumers, aggregate, ownership/tenant rule, JSON schema, occurred time, actor/provenance, dedup key, outbox requirement, ordering, retention, classification and rector source. Unknown future consumers remain absent.

`PUBLISHED_EVENT_TYPES=0`; therefore `EVENT_CATALOG=BLOCKED`.
