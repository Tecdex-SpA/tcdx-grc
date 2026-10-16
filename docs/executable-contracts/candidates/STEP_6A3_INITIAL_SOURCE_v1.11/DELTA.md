# Enmienda ejecutable candidata — incorporación inicial de fuente

STATUS=DRAFT_NOT_EFFECTIVE
PUBLICATION=HUMAN_EXACT_BYTES_APPROVAL_REQUIRED

Diseño PO aprobado SHA `1a133d60e576208eefc90d68ff39df903df829f3c9ab1b3c51fa06d8c826913b`. La aprobación del diseño no activa esta enmienda.

## 21 — regla derivada

Se propone un único comando retention_policy_applicability.bind_initial_source, actualización draft→draft con CAS, idempotencia y AuditEvent. No publica una nueva arista de transición de estado ni cambia las cinco aristas C-04W ya auditadas. Una draft que custodia fuente pendiente no pasa a revisión, aprobación o publicación antes de bind; published continúa inmutable. Las dos filas QA under_review preexistentes no se regresan ni se modifican.

## 22 — regla derivada

Se mantienen todos los Permission/RolePermission/MembershipRole existentes. Tenant Admin humano es custodio y autor del draft; el autor documental puede ser ese custodio o Evidence Owner humano del mismo tenant con scope tenant y permisos efectivos de cada operación. Upload/finalize/create/submit sólo admiten su cadena documental exacta; finalize/submit permanecen del autor documental. Bind es del Tenant Admin custodio autor con privacy.retention_policy.update y PRIVACY. EvidenceReview debe ser de identidad distinta del autor documental; la aprobación de aplicabilidad debe ser de identidad distinta del autor del draft. Ser autor del draft no impide revisar Evidence ajena si el permiso existe. Ninguna acumulación editorial conforme49 sustituye estas separaciones. M2M/Platform, identidad ajena, falta de permiso/entitlement/scope y objeto de otro tenant: DENY. No se conceden grants ni lectura documental general.

## 23 — regla derivada

La custodia de la primera fuente mediante FK a aplicabilidad draft no cambia duración ni precedencia de la policy ordinaria tenant-owned publicada/vigente. Source pendiente se deriva de FK/estado existentes; no es un enum persistido, legal hold, obligación acreditada ni permiso de borrado. Ninguna cadena pendiente habilita consumo de negocio, evaluación oficial, purge o release; todas las obligaciones concurrentes y la historia se conservan. Source e intervalo se revalidan al bind y antes de aprobar/publicar. Los plazos comerciales futuros de12/18/24/36/48/60meses no se implementan por esta sucesora.

## 24 — regla derivada

Excepción exclusiva al requisito de primaria publicada para el primer documento fuente: si no existe primaria ordinaria elegible para el contexto exacto, request-upload, finalize y EvidenceCreate pueden usar una nueva aplicabilidad draft de un Tenant Admin custodio, sin source, vinculada a policy ordinaria tenant-owned publicada/vigente. Cada comando revalida bajo locks el mismo tenant, clasificación, propósito evidence_document, contexto, FK y ausencia de primaria/conflicto. Intent/file/EvidenceVersion conservan la misma FK y el mismo autor documental real, Tenant Admin custodio o Evidence Owner con permisos/scope vigentes. En esta ruta acotada links=[] no crea evidencia de negocio. Scan/hash/MIME/storage, expiración, cleanup y revisión independiente se mantienen. El documento auténtico es externo aportado por persona competente: su carga no acredita legalidad. El draft permanece draft durante carga/revisión. Sólo tras aprobación independiente, vigencia/scan-PASS y cláusula auténtica el custodio ejecuta bind; después siguen submit/review/approve/publish ordinarios. No se admite source inexistente, histórica sin vigencia, cambio de autoría, datos falsos o publicación previa para desbloquear upload. El contrato ejecutable sucesor detalla el comando y consumo.

## 25 — regla derivada

Se propone retentionApplicabilityBindInitialSource en POST /api/v1/retention-policy-applicabilities/{id}:bind-initial-source. Body cerrado: source_evidence_version_id, source_clause_ref no vacío, effective_from real; effective_to opcional posterior a from. X-TCDX-Tenant-Id, bearer humano, Idempotency-Key e If-Match fuerte obligatorios; expected_version no se acepta en body HTTP. COMMIT devuelve200. Source approved/vigente/scan-PASS y EvidenceReview independiente, cadena idéntica y draft del custodio se revalidan transaccionalmente. Se actualizan sólo source/cláusula/intervalo/row_version; AuditEvent único audit.privacy.retention_policy_applicability.bind_initial_source.v1, before/after mínimos, tenant/actor/correlation sin blob/secreto. Sin domain event/outbox nuevo; replay reautoriza sin versión/audit nuevos; payload distinto, estado/CAS conflictivo:409; falta de autoridad:403; cadena/source/intervalo inválidos:422. Falla de auditoría revierte el cambio.

## 38 — regla derivada

EvidenceVersion ligada a aplicabilidad no publicada y usada como fuente pendiente no puede consumirse como evidencia ordinaria en resultados, controles/requisitos ni evaluaciones. Su aprobación documental permite únicamente la vinculación de fuente por el custodio; no es valid oficial ni publica metodología. Publicar posteriormente la aplicabilidad no crea EvidenceLinks de negocio ni elimina las comprobaciones ordinarias. Se preservan las metodologíasv1, CFG-D conservador, EC opcional sin none y todos los resultados históricos.

## Fuente, consumo y selección

La vista de upload puede seleccionar el draft sólo para incorporar su fuente, separada inequívocamente de primarias ordinarias. La selección debe verificarse en backend, con permisos/capabilities propios de la operación; no se transforma una lectura en derecho de comando. Los selectores de evidencia ordinaria excluyen versiones ligadas a aplicabilidad no publicada. El selector de bind permite únicamente EvidenceVersion de la misma cadena draft aprobada independientemente/vigente/scan-PASS, accesible al custodio o revisor según ObjectPolicy existente acotado. History sigue mostrando su estado original sin crear elegibilidad. La consulta fuente pendiente no expone documentos de otro actor por mera pertenencia al tenant. No se añade Permission/RolePermission ni propósito persistido.

## Revalidaciones y concurrencia

Cada comando de cadena debe bloquear/revalidar draft, policy y contexto exactos usando el mecanismo de serialización de contexto de R2; no basta FOR SHARE sobre una fila si otra transacción puede publicar una primaria de ese contexto. Finalize/EvidenceCreate reevalúan ausencia de primaria elegible y estado draft antes de promoción/persistencia. Si hay primaria nueva, conflicto, expiry o submit concurrente, fallar cerrado y conservar compensación de storage y rollback. La fuente pendiente no se promueve por la expiración de un plazo ni por la falta de un hold.

Bind actualiza exclusivamente source/cláusula/intervalo con CAS; sin source previa, draft del custodio y cadena inicial exacta. Source EvidenceReview approved de actor distinto del autor documental es obligatoria; aprobador de la aplicabilidad distinto de autor del draft. Los períodos deben ser los declarados auténticamente, ser consistentes con source/policy y tener to>from cuando haya to. No inferir from de created_at, published_at o selección comercial. Revalidar source en approve y publish; ninguna aplicabilidad nueva puede publicarse sin fuente válida. Los dos casos QA under_review existentes y filas históricas no se alteran ni se backfillean.

## UI candidata

Conservar tokens, navegación y branding aprobados bajo docs/ui. En las pantallas existentes de empresa/Evidencias distinguir custodia de fuente pendiente de aplicabilidad publicada; publicar sólo después de revisión independiente. Mostrar autor documental/custodio y la causa de bloqueo sin afirmar suficiencia jurídica. Acción propuesta del draft: «Vincular fuente inicial» con campos fuente elegible, cláusula y vigencia reales; visibilidad consume proyección de autorización backend, no calcula permisos. Labels en español, loading/error/422/conflict/empty accesibles, teclado/foco y escritorio/estrecho. No agregar pantallas ni rutas de navegación ajenas al flujo aprobado; la ruta HTTP bind no existe hasta publicación. Human UI review no se autoaprueba.

## Modelo y gates

R2 y expected-schema siguen byte-idénticos; ninguna migración prevista, sujeto a dictamen humano y pruebas aisladas antes de afirmarlo definitivo. Bind draft→draft no añade arista ni grant;09 conserva el registry5. Seguridad/Architecture/Data/Backend y aprobación ejecutable por nuevos bytes pendientes; no atribuir funciones a la decisión PO recibida. Las pruebas positivas/negativas de implementación y QA son NOT_RUN antes de estos gates. No liberar12meses como configuración runtime.
