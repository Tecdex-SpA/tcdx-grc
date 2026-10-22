# ACME-1 y siete roles

ACME-1, ID01a1137a-1351-76b8-ac8a-0bb109ca8e22, es un Tenant activo observado en PostgreSQL QA tcdx-grc/192.168.2.40. No se establece por su nombre que sea cliente real, cuenta sintética aprobada para esta tarea o destino contractual. Su finalidad comercial no fue necesaria para el diagnóstico.

La consulta focalizada actual confirma cero Role, cero TenantMembership y cero MembershipRole para ese tenant. Por tanto no se trata sólo de usuarios sin asignación: las instancias tenant de los roles tampoco existen. No se diagnosticó ni reparó por qué su creación histórica no las materializó; queda fuera del alcance.

Los siete códigos exigidos por las relaciones de grant de Biblioteca son TENANT_ADMIN, GRC_MANAGER, COMPLIANCE_MANAGER, CONTROL_OWNER, EVIDENCE_OWNER, ACTION_OWNER y VIEWER. Están en rector22/catálogos aprobados y físicamente como templates PLATFORM_CONTROL globales publicados, con tenant_id NULL. Los siete también existen como instancias TENANT_OWNED baseline/publicadas de TECDEX y ACME 2. El template global de un rol tenant no convierte a sus usuarios en autoridad Platform y no sustituye su instancia tenant.

El diagnóstico anterior de «faltan siete» significaba siete códigos requeridos por este publisher, no que ACME-1 tuviera el resto de roles: tiene cero. Los otros tenants observados tienen22roles cada uno; TECDEX tiene7membresías activas/40relaciones de rol, ACME2 tiene1membresía activa/1relación. Esos conteos no prueban permisos efectivos de cada usuario ni sustituyen futuros negativos SoD/tenant isolation.

El runbook §2 requiere input explícito `{tenantIds,effectiveFrom,effectiveTo}` y no preselecciona tenants. IAM_REGISTRY_PREPARATION.real_targets está vacío. QA02 no emitió input ni seleccionó ACME-1. No existe una decisión publicada que autorice incorporarlo automáticamente por estar activo.

El publisher itera templates globales y luego exactamente tenantIds. La lista vacía es técnicamente válida y publica únicamente la capa global, incluyendo B06 y Definitions; no habilita por sí sola grants de usuarios tenant ni satisface una aceptación funcional tenant. La elección entre global-only y destinos tenant es operacional y debe ser explícita. No se fija aquí un destino por conveniencia.

Si se incluyera ACME-1, la ausencia de sus roles provocaría conflicto y rollback atómico de toda la publicación. Si no se incluye, su ausencia no bloquea la publicación global ni la de tenants elegibles. Nunca se compensan roles ausentes con grants globales, nuevos usuarios o bypass.

USER_CREATION_REQUIRED=NO y ROLE_CREATION_REQUIRED=NO para recuperar el operador y preparar una reanudación con destinos elegibles. Si el PO exige expresamente incluir ACME-1, su materialización canónica de roles/onboarding requiere un alcance separado; no equivale a inventar siete nuevos roles de producto. QA02R no crea nada ni propone asignaciones.

Decisión pendiente concreta: fijar tenantIds autorizados e intervalo real [effectiveFrom,effectiveTo). TECDEX=01a0cfc7-0c97-75a3-890f-d6ca9db8bbe9 y ACME2=01a11820-ae9f-7485-93e5-942eaec71121 son candidatos con referencias de rol disponibles, no destinos aprobados por este informe. ACME-1 no debe incluirse implícitamente.
