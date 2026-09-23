# 48 — Contrato de auditoría integrada multi-norma / ISO 19011

| Campo | Valor |
|---|---|
| Baseline | `TCDX_GRC_MASTER_REGENT_BASELINE_v1.6_2026-09-23` |
| Contract owner | Architecture Owner |
| Domain owner | Auditor Lead / GRC Manager |
| Human approvers | Product Owner/CPO, Architecture Owner, Data Model Owner, Security & Privacy Reviewer, Backend Owner, QA/Release Owner |
| Status | `ACTIVE` |

## 1. Propósito y límite

Este contrato completa la semántica necesaria para que Fase 7 implemente Audit integrado sobre una a tres FrameworkVersion sin fusionar identidades normativas ni duplicar los dominios Regulatory, Controls, Evidence o Remediation. Se alinea metodológicamente con ISO 19011 sin reproducir contenido normativo protegido.

La aprobación humana PRE-F4 autoriza exclusivamente la materialización gobernada de este modelo y su migración incremental 214→229. No inicia Fase 4 ni Fase 7, no autoriza funcionalidad Audit y no autoriza despliegue funcional.

## 2. Aggregate y ownership

`Audit` sigue siendo aggregate root TENANT_OWNED. Sus hijos tipados heredan el tenant de Audit y usan FKs compuestas para impedir referencias cross-tenant. `FrameworkVersion`, `Requirement`, `RequirementCrosswalkMapping`, `Control`, `ControlAssessment`, `RequirementAssessment`, `EvidenceVersion`, `Subject` y `TenantMembership` conservan su identidad y write owner.

Audit no copia textos normativos, assessments, controls, memberships, subjects, evidence, findings ni actions. Findings continúan siendo `Issue` con `IssueOrigin.audit_test_id`; remediation continúa en `Action`.

## 3. Integrated-audit boundary

Una Audit selecciona mínimo una y máximo tres FrameworkVersion. Debe conservar:

- uno o más AuditObjective estructurados;
- criterios de FrameworkVersion y, cuando corresponda, Requirement;
- uno o más AuditScope tipados por FrameworkVersion + Subject;
- un AuditTeamAssignment lead activo exactamente y cero o más auditor/technical_expert;
- requisitos y validaciones de competencia;
- agenda temporal con links a scopes, tests y team assignments;
- AuditTest con lineage tipado hacia Requirements, controles/assessments y RequirementAssessments.

Ausencia de cualquiera de estos elementos cuando el contrato lo exige bloquea `audit.approve`.

## 4. Objectives, criteria y scope

`AuditObjective` posee código estable dentro de Audit, statement estructurado y ordinal. No se guarda como JSON ni como workpaper.

`AuditCriterion` referencia siempre exactamente una FrameworkVersion seleccionada. Puede referenciar opcionalmente un Requirement perteneciente a esa FrameworkVersion. El criterion de FrameworkVersion no significa que todas sus Requirements hayan sido evaluadas; la cobertura real proviene de los links de AuditTest.

`AuditScope` referencia exactamente Audit + FrameworkVersion seleccionada + Subject tenant. Tenant expresa ownership; Subject expresa alcance. `scope_text` no es autoridad y se elimina del modelo físico final enmendado.

## 5. Team y competencies

`AuditTeamAssignment.team_role` usa únicamente `lead_auditor | auditor | technical_expert`. La asignación referencia una TenantMembership activa del mismo tenant, tiene intervalo efectivo y queda auditada. Existe exactamente un lead activo por Audit. `lead_membership_id` se migra a esta relación y se elimina como autoridad duplicada.

`AuditCompetency` es registry PLATFORM_CONTROL versionado, publicado e inmutable. `AuditorCompetencyAssertion` es TENANT_OWNED, enlaza TenantMembership + versión de competencia + intervalo efectivo + EvidenceVersion opcional + verificación humana.

`AuditCompetencyRequirement` declara por Audit, FrameworkVersion y team_role una competencia requerida. La presencia de la fila significa obligatoriedad; no se infieren niveles numéricos. `AuditCompetencyValidation` registra resultado reproducible `covered | not_covered | expired | evidence_missing` contra un AuditTeamAssignment y una assertion compatible.

Audit no puede aprobarse mientras exista un requirement sin al menos una validación vigente `covered`. Un technical expert aporta sólo las competencias validadas de su assignment y no adquiere permiso de auditor o lead.

## 6. Agenda integrada

`AuditAgendaItem` pertenece a Audit, tiene código, título, inicio/fin UTC y ordinal. Se relaciona mediante tablas soporte con:

- uno o más AuditScope;
- cero o más AuditTest durante planificación y uno o más antes de ejecución;
- uno o más AuditTeamAssignment.

La clasificación tronco común versus bloque especializado se deriva de FrameworkVersion/Requirement cubiertos por sus scopes/tests; no se almacena como autoridad paralela. Agenda no concede permiso ni cambia scope.

## 7. AuditTest y Requirements

Cada AuditTest posee exactamente un Requirement link anchor cuando evalúa requisitos. Puede enlazar N Requirements:

- Requirements de la misma FrameworkVersion pueden compartir test si los criterios/objetivo del test lo justifican;
- todo Requirement adicional de otra FrameworkVersion requiere un `RequirementCrosswalkMapping` aprobado y efectivo que conecte el anchor con el Requirement;
- sólo relationship_type `equivalent | partially_equivalent | overlaps | supports` habilita agrupación;
- `supersedes`, `no_match`, draft, rejected, expired o numeración HLS coincidente no habilitan agrupación.

El mapping no transfiere cumplimiento ni conclusión. Cada Requirement mantiene RequirementApplicability y RequirementAssessment independientes.

## 8. Controls, assessments y lineage

`AuditTestControlLink` referencia exactamente uno de:

- Control tenant (`tenant_instantiated | tenant_defined`);
- ControlAssessment tenant.

Un Control global/reference no demuestra implementación y no puede ocupar el target tenant de este link. La referencia normativa permanece en los mappings Regulatory existentes.

`AuditTestRequirementAssessmentLink` enlaza el AuditTest con una RequirementAssessment del mismo tenant cuya Requirement coincide con uno de sus AuditTestRequirementLink. La conclusión del AuditTest no sobrescribe `result_status` ni `domain_conclusion` de RequirementAssessment.

Evidence continúa enlazada mediante `audit.audit_test_evidence_links`; la misma EvidenceVersion puede soportar múltiples tests/assessments sin duplicarse.

## 9. Concurrencia, lifecycle, audit y retention

Objetivos, criterios, scopes, assignments y agenda son mutables sólo antes de `audit.approve`, usan row_version y ETag y quedan inmutables para esa revisión al aprobarse. Cambios posteriores requieren transición/versión autorizada, nunca edición silenciosa.

Toda mutación escribe AuditEvent con tenant, actor, before/after minimizado, correlation y reason cuando aplique. Relaciones de lineage y validaciones son inmutables. Retención mínima hereda Audit/AuditTest: al menos siete años o la policy efectiva más restrictiva. No hay cascade delete sobre historia.

## 10. Tenant isolation y autorización

Todos los objetos TENANT_* de este contrato exigen tenant coincidente mediante FKs compuestas y autorización backend. Header, path ID, crosswalk global o role de agenda no concede acceso. Permission/scope/object policy/SoD siguen default DENY.

Auditor no administra el objeto auditado. Lead no puede usar team assignment para evadir SoD. Technical expert no emite por sí solo la conclusión final. Cross-tenant IDs se ocultan como not found según el error contract.

## 11. Prohibiciones

- no `scope_text` como scope autoritativo;
- no objectives/criteria/agenda/team/competencies en JSONB;
- no workpaper como sustituto estructural;
- no `(type,id)` libre;
- no RequirementAssessment duplicada dentro de AuditTest;
- no equivalencia inferida por HLS o número de cláusula;
- no segundo motor Audit por norma;
- no capability, plan o schema por tenant/norma.

## 12. Gate

`AUDIT_MODEL_AMENDMENT_REVIEW=PASS`

El gate fue aprobado por la autoridad humana sobre el candidato `6a31034ae1ecc1f9ee551431fb2a504a25fb52ce`. Su materialización exige migración incremental, tenant-isolation review, rebuild/upgrade/rollback/restore y evidencia de no duplicación de autoridad antes de autorizar Fase 4.
