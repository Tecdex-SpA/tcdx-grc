Tecdex GRC — Managed Identity tenant onboarding E2E

PASS_DEPLOYED_AWAITING_HUMAN_FUNCTIONAL_UI

La identidad global se provisiona una sola vez. La operación Platform específica agrega/reconcilia la membresía y roles de una empresa explícita; el catálogo runtime, la lectura por UserIdentity y los roles Platform quedan separados. La recuperación conserva la identidad y cada transacción confirmada; no hay redisclosure de credencial ni autoridad tenant otorgada al actor.

```text
STEP_23L_MANAGED_IDENTITY_TENANT_ONBOARDING_E2E=PASS_DEPLOYED_AWAITING_HUMAN_FUNCTIONAL_UI
EXECUTION_MODE=ACCELERATED_SAFE_PROGRESS
MAXIMIZE_SAFE_PROGRESS=YES
MINIMIZE_NON_MATERIAL_BLOCKERS=YES
RECOVERABLE_GATES_RESOLVED_INLINE=YES
MATERIAL_BLOCKERS_ENCOUNTERED=0
RECTOR_GATE=PASS
MASTER_REGENT=TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23
UNRESOLVED_RECTOR_CONFLICTS=NONE
MANAGED_IDENTITY_GLOBAL_MODEL_PRESERVED=YES
TENANT_ID_STORED_IN_MANAGED_IDENTITY=NO
MULTI_TENANT_MEMBERSHIP_MODEL_PRESERVED=YES
TENANT_USER_ONBOARDING_OPERATION_ID=tenantUserOnboardingCreate
TENANT_USER_ONBOARDING_API=POST /api/v1/platform/tenants/{tenant_id}/users:onboard
TENANT_USER_ONBOARDING_PERMISSION=platform.tenant_user.onboard
NEW_PERMISSION_REQUIRED=YES
PERMISSION_CODE=platform.tenant_user.onboard
PERMISSION_INITIAL_GRANT=PLATFORM_ADMIN_ONLY
DATA_ONLY_MIGRATION_REQUIRED=YES
DATA_ONLY_MIGRATION_ID=20261007000100
DATA_ONLY_MIGRATION_SHA256=4f91369da1908264eba937e5c9d760a34bcefe3d7de1d726ac558c3f9b138673
MIGRATIONS_BEFORE=28
MIGRATIONS_AFTER=29
PHYSICAL_TABLES_BEFORE=235
PHYSICAL_TABLES_AFTER=235
PUBLISHED_PERMISSIONS_BEFORE=169
PUBLISHED_PERMISSIONS_AFTER=170
DB_SCHEMA_UNCHANGED=YES
SCHEMA_CHANGE_REQUIRED=NO
PLATFORM_ADMIN_CENTRAL_TENANT_ONBOARDING=IMPLEMENTED
PLATFORM_ACTOR_TENANT_MEMBERSHIP_SIDE_EFFECT=0
PLATFORM_ACTOR_TENANT_ROLE_SIDE_EFFECT=0
CROSS_TENANT_DENY=PASS
DEFAULT_DENY=PASS
TENANT_USER_ONBOARDING_OPERATION=PASS
MANAGED_IDENTITY_TENANT_ACCESS_UI=PASS
EXISTING_MANAGED_IDENTITY_TENANT_ACCESS_UI=PASS
TENANT_SELECTION_OPTIONAL=YES
TENANT_ROLE_CATALOG_FROM_RUNTIME=YES
PLATFORM_TENANT_ROLE_UI_SEPARATION=PASS
TENANT_ADMIN_EXISTING_FLOW_REGRESSION=PASS
TENANT_ADMIN_MANAGED_IDENTITY_PROVISION=NO
LEGACY_ZOHO_INVITATION_UX_RECONCILED=YES
TEMP_CREDENTIAL_REDISCLOSURE=NO
PARTIAL_FAILURE_RECOVERY=PASS
FRONTEND_SECURITY_BOUNDARY=PASS
UNIT_TESTS=PASS
UNIT_TEST_COUNT=485
POSTGRES_ISOLATED_TESTS=PASS
POSTGRES_ISOLATED_TEST_COUNT=79
FRONTEND_TESTS=PASS
FRONTEND_TEST_COUNT=81
GRC_E2E=PASS
GRC_E2E_COUNT=400
IAM_THEME_E2E=PASS
IAM_THEME_E2E_COUNT=21
RELEASE_BACKEND_POSTGRES_TESTS=PASS
RELEASE_BACKEND_POSTGRES_TEST_COUNT=79
RELEASE_FRONTEND_E2E=PASS
RELEASE_FRONTEND_E2E_COUNT=400
TYPECHECK=PASS
LINT_STATIC=PASS
OPENAPI_GATE=PASS
OPERATION_MATRIX_GATE=PASS
PERMISSION_CATALOG_GATE=PASS
RBAC_GATE=PASS
SCOPE_CONSISTENCY=PASS
CONTRACT_VERIFY=PASS
GIT_DIFF_CHECK=PASS
SECRET_SCAN=PASS
DOMAIN_SCAN=PASS
ACTIVE_BAD_DOMAIN_REFERENCES=0
RELEASE_SOURCE_FINGERPRINT=a910c94aa24e291af9de66d90e8fa8a57bbe2d1d11e4216b76632782b3485c4b
RELEASE_FREEZE_SHA256=57b3ba5b92de492387afec0f7ef3f92a319c72e9a090b3d918b5dc5d5cff6286
RELEASE_MANIFEST_SHA256=8e3d19917b15fdaaba780b901c96a23b557955a136fc576b8673f421bdfe8bdb
ALL_CHANGED_COMPONENTS_FROM_SAME_FREEZE=YES
RELEASE_FREEZE=PASS
FREEZE_EXPORTS_IDENTICAL=YES
RELEASE_FREEZE_CONTAMINATION=0
RELEASE_FREEZE_MISSING_PATHS=0
RELEASE_FREEZE_EXTRA_PATHS=0
RELEASE_FREEZE_CONTENT_MISMATCHES=0
BACKEND_CHANGED=YES
BACKEND_RELEASE_IMAGE=sha256:394ad8fadf279dfd9ada3ebeeb2161c3890ee8ca0458db1aa6194952f0a1ee59
BACKEND_BUILD=PASS
BACKEND_TRANSPORT_SHA256=267d2d733defdfb4b82d91a6ef3056b8340c20fa4bb8b066e8319ce3fc352f80
FRONTEND_CHANGED=YES
FRONTEND_RELEASE_IMAGE=sha256:1d34a78b51eeed798620adc4375a39242d6d7009f4155e126de9850cf4de3973
FRONTEND_BUILD=PASS
FRONTEND_TRANSPORT_SHA256=1c3ebe7c7e7297acaac9f3170efcb21702bc0cba0303f63abda797b86509e8a5
IAM_CHANGED=NO
IAM_IMAGE=sha256:4ef4f816c60d05c3867c1fce9092a3b0d1539bf22683d3e2742c6c1d7ce25ea4
RELEASE_IMAGE_TESTS=PASS
TRANSPORT_INTEGRITY=PASS
ROLLBACK_READY=YES
ROLLBACK_TRIGGERED=NO
QA_DEPLOY=PASS
BACKEND_HEALTH=PASS
FRONTEND_HEALTH=PASS
IAM_HEALTH=PASS
GRC_PUBLIC_HTTPS=PASS
OIDC_DISCOVERY=PASS
JWKS=PASS
RUNTIME_HTTP_5XX_UNEXPECTED=0
RUNTIME_SQL_ERRORS_UNEXPECTED=0
BACKEND_FATAL_ERRORS=0
FRONTEND_FATAL_ERRORS=0
KEYCLOAK_FATAL_ERRORS=0
KEYCLOAK_DB_ERRORS=0
CONTAINER_RESTARTS_UNEXPECTED=0
SECRET_LOGGING=0
QA_FUNCTIONAL_USER_MUTATIONS=0
ACME_STATE_PRESERVED=YES
ANDRES_GRC_STATE_PRESERVED=YES
HUMAN_FUNCTIONAL_UI_TEST=PENDING_HUMAN
STEP_23L_MI10_P1_R3=BLOCKED_HUMAN_MANAGED_IDENTITY_ACTIVATION
STEP_23L=BLOCKED
PHASE_6=BLOCKED
PHASE_6_STARTED=0
NEW_COMMITS=0
GIT_PUSH_PERFORMED=NO
MERGE_PERFORMED=NO
NEXT_REQUIRED_ACTION=HUMAN_FUNCTIONAL_UI_TEST_OF_MANAGED_IDENTITY_TENANT_ONBOARDING
DATABASE_CHANGED=DATA_ONLY_PERMISSION_GRANT_LEDGER
EXECUTABLE_CONTRACTS_CHANGED=YES
BACKEND_SOURCE_CHANGED=YES
FRONTEND_SOURCE_CHANGED=YES
INFRASTRUCTURE_CONTRACTS_CHANGED=NO
DEPLOYMENT_CONTRACTS_CHANGED=NO
FUNCTIONAL_RUNTIME_CONFIG_CHANGED=NO
SCHEMA_FINGERPRINT=b4030b993d44c5481c273e843e7717d7d53cd94dec9a22a425cea553e257e57b
```

Prueba funcional humana pendiente:

1. Abre https://grc.tecdex.net/ con una sesión Platform Admin ya habilitada. Entra en Configuraciones → Identidades gestionadas. Mantén andres.grc sin activar y R3 pendiente.

2. Test 1: Provisionar identidad. Usa una persona y nombre de usuario nuevos autorizados; completa nombre visible y referencia de verificación, con correo opcional. Confirma la provisión, custodia la credencial temporal por el canal autorizado, pulsa «Ya custodié la credencial» y «Finalizar sólo con identidad». Comprueba que no tenga acceso a empresas y que la credencial no reaparezca al abrir el detalle.

3. Test 2: Provisiona otra identidad. Después de custodiar su credencial, usa Acceso a empresas (opcional) → Agregar acceso a empresa. Selecciona una empresa previamente inicializada con CORE_PLATFORM vigente, marca uno o varios roles del catálogo runtime, indica el motivo y pulsa Incorporar a empresa. Confirma la empresa, membresía activa, roles y resultado leído desde servidor. ACME-1 tiene cero roles/membresías/suscripciones: se preservó y no sirve como prueba positiva de este flujo sin una recuperación aprobada independiente.

4. Test 3: Abre una identidad existente → Acceso a empresas. Agrega acceso a una empresa elegible o administra sus roles. Si ya tiene membresía, confirma que se conserve y que sus roles anteriores permanezcan. Una incorporación a otra empresa debe mantener sus accesos independientes. Comprueba la recuperación de una asociación pendiente sin reprovisionar ni mostrar nuevamente la credencial.

5. Test 4: Comprueba que Acceso a empresas y Roles de plataforma sean secciones distintas. Asignar rol de plataforma debe mostrar sólo el catálogo Platform; el catálogo de la empresa debe contener sólo roles tenant.

6. Test 5: En una sesión Tenant Admin con su contexto de empresa, abre Usuarios → Agregar usuario. Busca exactamente una identidad existente y confirma que conserve el flujo Membership/roles. Tenant Admin no debe poder provisionar Managed Identity. La invitación Zoho debe figurar como Invitación con identidad corporativa Zoho, separada de Agregar usuario.

7. Registra el resultado funcional y visual humano sin enviar contraseñas temporales, tokens o capturas con secretos. Codex no ejecutó estas pruebas positivas en QA y no aprobó el gate humano.

Los 81 tests frontend son parte de los 485 unitarios. La suite unitaria omite 79 tests PostgreSQL condicionados al entorno; los 79 se ejecutaron y pasaron separadamente, también desde la imagen backend. GRC400 e IAM21 no omitieron casos. Las pruebas UI positivas son fixtures locales; QA verificó únicamente lectura, assets exactos, metadata y rechazos anónimos. Estas pruebas no sustituyen la revisión humana.

Traceability: baseline46 + rector09/22/25/26/42/43/45 → DR_2026_10_07_MANAGED_IDENTITY_TENANT_ONBOARDING → executable26 y catálogos afectados → migration20261007000100/manifest/runner → backend TenantUserOnboarding/read projection → frontend ManagedIdentityTenantAccess → unit/PG/E2E → dos exports773 rutas → imágenes/transportes verificados → runtime107 módulos/backend y assets/frontend → gate humano pendiente.

Cambios de esta tarea respecto de su inicio (44 archivos, incluye no rastreados):

- `apps/backend/src/app.ts`
- `apps/backend/src/security/administrative-read.ts`
- `apps/backend/src/security/permission-projection-catalog.generated.ts`
- `apps/backend/src/security/platform-role-service.postgres.test.ts`
- `apps/backend/src/security/tenant-onboarding-routes.ts`
- `apps/backend/src/security/tenant-onboarding.postgres.test.ts`
- `apps/backend/src/security/tenant-user-onboarding.postgres.test.ts`
- `apps/backend/src/security/tenant-user-onboarding.test.ts`
- `apps/backend/src/security/tenant-user-onboarding.ts`
- `apps/frontend/src/i18n/es.ts`
- `apps/frontend/src/managed-identity-tenant-access.test.tsx`
- `apps/frontend/src/managed-identity-tenant-access.tsx`
- `apps/frontend/src/managed-identity.tsx`
- `database/migrations/20261007000100_platform_tenant_user_onboarding_permission_publication.sql`
- `database/migrations/manifest.json`
- `database/seed-manifest.json`
- `docs/executable-contracts/00_README.md`
- `docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml`
- `docs/executable-contracts/03_API_RESOURCE_OPERATION_MATRIX.md`
- `docs/executable-contracts/05_PERMISSION_CATALOG.md`
- `docs/executable-contracts/07_IDEMPOTENCY_CONTRACT.md`
- `docs/executable-contracts/08_AUDIT_EVENT_CATALOG.md`
- `docs/executable-contracts/09_SEED_MANIFESTS.md`
- `docs/executable-contracts/11_MIGRATION_PLAN.md`
- `docs/executable-contracts/12_TRANSACTION_CONCURRENCY_CONTRACT.md`
- `docs/executable-contracts/13_AUTHENTICATION_AUTHORIZATION_CONTRACT.md`
- `docs/executable-contracts/18_EXECUTABLE_CONTRACT_TRACEABILITY.md`
- `docs/executable-contracts/23_FRONTEND_AUTHENTICATION_AUTHORIZATION_PROJECTIONS.md`
- `docs/executable-contracts/26_PLATFORM_TENANT_USER_ONBOARDING.md`
- `docs/governance/DR_2026_10_07_MANAGED_IDENTITY_TENANT_ONBOARDING.md`
- `docs/governance/MASTER_EXECUTION_STATUS.md`
- `e2e/core-grc-ui.spec.ts`
- `e2e/managed-identity-tenant-access.spec.ts`
- `packages/contracts/src/mi7a-frontend-projections.test.ts`
- `packages/contracts/src/phase5-executability-preflight.test.ts`
- `packages/contracts/src/phase5-read-contracts.test.ts`
- `packages/contracts/src/platform-tenant-user-onboarding.test.ts`
- `packages/contracts/src/pre-f5b-executable-contracts.test.ts`
- `packages/contracts/src/role-assign-projection-scope.test.ts`
- `packages/contracts/src/tenant-onboarding-d2.test.ts`
- `scripts/foundations/generate-contract-assets.mjs`
- `scripts/foundations/permission-projection-catalog.mjs`
- `scripts/foundations/secret-scan.mjs`
- `scripts/foundations/verify-seeds.ts`

La evidencia generada queda fuera del freeze; el MASTER final es un append externo posterior. Se preservó el trabajo acumulado previo, HEAD e índice. La única excepción de metadata OCI sigue siendo org.opencontainers.image.source. No se hicieron commits, push, merge ni Phase6.
