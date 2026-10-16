# Delta acotado C-03A / paginación CT03 — candidato R2

Estado: PROPOSED_NOT_PUBLISHED. No modifica los bytes aprobados de MACRO R1 ni cambia contratos actuales antes de una aprobación exacta.

Texto literal adoptable:
«Para membershipReferenceList, purpose de selección, sustituyo exclusivamente el orden display_name ASC, joined_at ASC, id ASC por joined_at ASC, tenant_membership_id ASC. display_name permanece como etiqueta empresarial y filtro autorizado, con su tipo text canónico y sin límite inventado. La paginación keyset transporta únicamente joined_at UTC e ID, más contexto temporal/actor/tenant/propósito/parents/filtros autenticado. Se conserva maxLength=2048, size predeterminado25/máximo100 y los checks de vigencia, revocación, scope, entitlement, ObjectPolicy y duplicados. El payload de cursor CT03 cambia a versión2 y autentica el nuevo orden; se rechaza400 un cursor CT03 v1, con reinicio de lista en UI. Los cursores F y R conservan v1 y sus órdenes publicados. No se altera la proyección, los permisos, grants, historia exacta, nombres persistidos ni el modelo físico. El nuevo orden será efectivo sólo desde la publicación UTC registrada tras esta aprobación.»

Antes: el cursor completo debe incluir un nombre text sin límite físico. Después: tupla acotada por campos persistidos; los nombres siguen íntegros en DTO. La prueba PostgreSQL de nombre10000 caracteres confirma503 sanitizado en el contrato anterior; no demuestra paginación R2 aún.

Fuentes: 27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:23,38,42,87; publicación29; físico iam.user_identities.display_name text, iam.tenant_memberships.joined_at. Alternativas rechazadas: truncar nombre/cursor; añadir varchar arbitrario; cache global de cursores; cursor sin firma; cambiar límite2048 silenciosamente.

Criterios: dos páginas nativas con nombre10000 caracteres sin pérdida/duplicación; timestamps empatados; size1/100; filtros/actor/tenant cambiados400; v1 CT03 y JWT Bearer400; revocación fresca403; historia máximo1; F/R sin regresión; todos los cursores <=2048. NOT_RUN_R2_UNPUBLISHED. No DDL requerido.
