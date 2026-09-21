# TCDX GRC — PRE-F5 CONTRACT MATERIALIZATION
## Materializar decisión humana aprobada antes de reanudar Fase 5

### Modelo recomendado
- GPT-5.6 Sol
- Reasoning: High
- Fast: OFF

# Mandato

Materializar exclusivamente las decisiones humanas PRE-F5 ya aprobadas y presentes en `main`.

NO implementar todavía el Core GRC Slice.
NO iniciar funcionalmente Fase 5.
NO iniciar Fase 6.
NO cambiar el modelo físico PostgreSQL.
NO ampliar alcance.
NO introducir deuda, legacy, modelos paralelos ni hardcodes.

El objetivo es que las decisiones humanas aprobadas de Fase 5 queden reflejadas coherentemente en los contratos ejecutables antes de reanudar el prompt Fase 5 v2.

# Prerequisitos

Desde `main` actualizado y worktree limpio, verificar que existen y están aprobados:

- `docs/governance/PHASE_5_HUMAN_GATE_APPROVAL.md`
- `docs/governance/PHASE_5_API_READ_CONTRACT_DECISION.md`
- `docs/governance/PHASE_5_RELEASE_DEPENDENCY_MANIFEST.md`

Y que `docs/governance/MASTER_EXECUTION_STATUS.md` contiene:

```text
PHASE_5=AUTHORIZED
PHASE_5_API_READ_CONTRACT=APPROVED
PHASE_5_RELEASE_DEPENDENCIES=APPROVED
PHASE_5_STARTED=0
PHASE_6_STARTED=0
```

Si no están materializados en `main`, detenerse.

# Autoridad

Leer:
- `AGENTS.md`
- baseline rector activo
- contratos ejecutables vigentes
- los tres Decision Records PRE-F5
- visual baseline activo

Las decisiones humanas PRE-F5 autorizan explícitamente la modificación controlada de contratos ejecutables para las lecturas F5.

# Cambios permitidos

Materializar la decisión aprobada en:

1. `docs/executable-contracts/03_API_RESOURCE_OPERATION_MATRIX.md`
2. `docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml`
3. `docs/executable-contracts/05_PERMISSION_CATALOG.md`
4. tests/fixtures contractuales estrictamente necesarios para validar consistencia
5. documentación de evidencia PRE-F5 si el repositorio exige registrar el gate

No cambiar:
- `database/`
- modelo físico
- entidades canónicas
- lifecycle semantics
- capabilities/planes comerciales
- baseline rector
- backend funcional
- frontend funcional

Objetivo:
`DATABASE_CONTRACT_CHANGED=0`

# Read surface aprobada

Materializar exactamente la superficie aprobada por `PHASE_5_API_READ_CONTRACT_DECISION.md`.

No agregar endpoints adicionales por conveniencia.

Debe incluir list/detail para:
- RequirementApplicability
- RequirementAssessment
- StatementOfApplicability
- Control
- ControlAssessment
- AssuranceTest
- EvidenceRequest
- Evidence
- EvidenceVersion detail
- Issue
- Action

Las proyecciones hijas aprobadas deben resolverse según el Decision Record sin crear identidades nuevas ni endpoints adicionales innecesarios.

No crear un reporting engine ni un `/dashboard` genérico en este paso.

# RBAC

No reutilizar permisos write como autoridad read.

Publicar en `05_PERMISSION_CATALOG.md` los permisos read mínimos correspondientes, preservando:
- default DENY
- tenant isolation
- scope
- entitlement
- SoD
- roles read-only
- roles de dominio
- ninguna expansión de visibilidad

No alterar semántica de roles fuera de lo estrictamente necesario para las lecturas aprobadas.

# OpenAPI

Actualizar OpenAPI 3.1 de forma consistente con la matriz:
- operationId exacto
- paths/methods
- parámetros tenant/context existentes
- filtros/cursor sólo contractuales
- response schemas existentes o proyecciones tipadas mínimas
- COMMON errors
- seguridad existente
- NAT para reads
- sin eventos de dominio para reads

No inventar campos que no estén soportados por entidades/contratos canónicos.

Si falta un schema material que requiera una decisión semántica nueva, detenerse y reportar blocker; no inferir.

# Gate de consistencia

Verificar:
- Matrix ↔ OpenAPI
- OpenAPI ↔ Permission Catalog
- Permission Catalog ↔ RBAC rector
- no DB diff
- no baseline rector diff
- no lifecycle diff
- no Phase 6 work

Ejecutar:
- typecheck
- build
- full tests
- contract tests
- rector governance
- rector status
- git diff --check

# Git

Usar la rama ya existente:
`governance/materialize-phase-5-read-contracts`

No crear otra rama si ésta ya existe y parte del `main` aprobado por PR #11.

Máximo 2 commits.
NO push.
NO PR.
NO merge.
NO deploy.

# Estado

Este paso NO cambia:
`PHASE_5_STARTED=0`

No declarar F5 implementada.

Al finalizar satisfactoriamente:

```text
RECTOR_GATE=PASS
PHASE_5=AUTHORIZED
PHASE_5_API_READ_CONTRACT=APPROVED
PHASE_5_READ_CONTRACT_MATERIALIZED=PASS
PHASE_5_RELEASE_DEPENDENCIES=APPROVED
PHASE_5_STARTED=0
DATABASE_CONTRACT_CHANGED=0
EXECUTABLE_CONTRACTS_CHANGED=1
TYPECHECK=PASS
BUILD=PASS
TESTS=PASS
RECTOR_REGRESSION=PASS
PHASE_6_STARTED=0
```

# Salida requerida

Reportar:
- branch
- HEAD
- archivos cambiados
- operations añadidas
- permissions añadidos
- schemas/projections añadidos
- tests ejecutados
- DB diff
- rector diff
- blockers
- commits
- worktree status
- `PHASE_5_READ_CONTRACT_MATERIALIZED`
- `HUMAN_GATE_REQUIRED`

Si todo lo modificado corresponde exactamente a las decisiones humanas ya aprobadas, `HUMAN_GATE_REQUIRED=NO_NEW_DECISION`; la revisión humana del diff antes de merge sigue siendo obligatoria.
