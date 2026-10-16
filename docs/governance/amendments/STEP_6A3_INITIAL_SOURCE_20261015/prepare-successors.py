"""Prepare hash-bound DRAFT successors only; never publish, implement or deploy."""
from pathlib import Path
import datetime
import difflib
import hashlib
import json
import re

ROOT=Path(__file__).resolve().parents[4]
PKG=Path(__file__).resolve().parent
NEW='TCDX_GRC_MASTER_REGENT_BASELINE_v1.11_2026-10-15'
OLD='TCDX_GRC_MASTER_REGENT_BASELINE_v1.10_2026-10-15'
RECTOR=ROOT/'docs/rector/candidates'/NEW
EXEC=ROOT/'docs/executable-contracts/candidates/STEP_6A3_INITIAL_SOURCE_v1.11'
PROPOSAL='docs/phase6a/STEP_6A3/INITIAL_RETENTION_SOURCE_BOOTSTRAP_DELTA_DRAFT_20261015.md'
ORIGINAL='docs/phase6a/STEP_6A3/evidence/final-blockers-execution-20261015/DECISION_MANIFEST.json'
EXPECTED='1a133d60e576208eefc90d68ff39df903df829f3c9ab1b3c51fa06d8c826913b'
NOW=datetime.datetime.now(datetime.timezone.utc).isoformat()
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def put(p,text):
    assert not p.exists(), 'EXISTING_FILE_PRESERVED: '+str(p)
    p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(text)
def js(p,v): put(p,json.dumps(v,indent=2,ensure_ascii=False)+'\n')
assert (ROOT/'docs/rector/BASELINE_ID').read_text().strip()==OLD
assert sha(ROOT/PROPOSAL)==EXPECTED
assert sha(ROOT/ORIGINAL)=='f3f49ec297e069abb28989f5c039bbe1e654f507d6bf62c8d7cede12300d5582'
assert json.loads((ROOT/ORIGINAL).read_text())['single_proposal']['sha256']==EXPECTED
assert sha(ROOT/'docs/rector/baseline/SHA256SUMS.txt')=='b9b6bf6930931af5eb32ca1b4027212ad3a82f247fef677b919af24d30ac9060'
receipt=PKG/'PO_DESIGN_APPROVAL_RECEIPT_20261015.json'
js(receipt,{'status':'PO_DESIGN_APPROVED_SUCCESSOR_PREPARATION_AUTHORIZED',
 'provenance':'Current user instruction reporting the explicit Product Owner decision; not a cryptographic signature',
 'literal_decision':'Sí, apruebo, pero necesito avancemos hasta el despliegue y poder iniciar etapa 6A.4',
 'actor':{'explicit_role':'Product Owner','identity_reference':'docs/governance/amendments/STEP_6A3_C04W_CFGD_20261014/PO_A01_A13_DECISION_RECEIPT_20261015.md',
          'identity_reference_sha256':sha(ROOT/'docs/governance/amendments/STEP_6A3_C04W_CFGD_20261014/PO_A01_A13_DECISION_RECEIPT_20261015.md'),
          'identity_assurance':'Declared session continuity; no fresh independent identity verification',
          'additional_roles_exercised_in_this_act':[]},
 'recorded_at_utc':NOW,'observed_receipt_date_utc':NOW[:10],'original_act_time_utc':None,
 'approved_proposal':{'path':PROPOSAL,'sha256':EXPECTED},'original_decision_manifest':{'path':ORIGINAL,'sha256':sha(ROOT/ORIGINAL)},
 'effective_scope':'Design and preparation of exact successors; advance toward QA/deployment/6A4 only after every applicable gate',
 'not_granted':['Approval of future successor bytes','Architecture/Data/Security role assumption','Privacy/Legal operational consent',
                'QA/Release deployment authority','Human UI acceptance','STEP6A3 closure','Immediate STEP6A4 entry'],
 'previous_A01_A13_four_and_six_approvals':'PRESERVED_NOT_RESUBMITTED'})

common=f'''\n\n## STEP_6A3 — candidata de incorporación inicial de fuente v1.11\n\n`STATUS=DRAFT_NOT_EFFECTIVE; HUMAN_EXACT_BYTES_REVIEW=PENDING`. Baseline candidata {NEW}, predecesora {OLD}. Diseño PO aprobado por SHA `{EXPECTED}`; constancia `{receipt.relative_to(ROOT)}`. Esta sección sólo tendrá efecto después de publicación conforme47/49 y gates físico/ejecutable; no autoriza operación QA ni deploy por sí sola.\n\n'''
rules={
 '21_LIFECYCLE_TRANSITION_MATRIX.md': 'Se propone un único comando retention_policy_applicability.bind_initial_source, actualización draft→draft con CAS, idempotencia y AuditEvent. No publica una nueva arista de transición de estado ni cambia las cinco aristas C-04W ya auditadas. Una draft que custodia fuente pendiente no pasa a revisión, aprobación o publicación antes de bind; published continúa inmutable. Las dos filas QA under_review preexistentes no se regresan ni se modifican.',
 '22_RBAC_PERMISSION_SCOPE_MATRIX.md': 'Se mantienen todos los Permission/RolePermission/MembershipRole existentes. Tenant Admin humano es custodio y autor del draft; el autor documental puede ser ese custodio o Evidence Owner humano del mismo tenant con scope tenant y permisos efectivos de cada operación. Upload/finalize/create/submit sólo admiten su cadena documental exacta; finalize/submit permanecen del autor documental. Bind es del Tenant Admin custodio autor con privacy.retention_policy.update y PRIVACY. EvidenceReview debe ser de identidad distinta del autor documental; la aprobación de aplicabilidad debe ser de identidad distinta del autor del draft. Ser autor del draft no impide revisar Evidence ajena si el permiso existe. Ninguna acumulación editorial conforme49 sustituye estas separaciones. M2M/Platform, identidad ajena, falta de permiso/entitlement/scope y objeto de otro tenant: DENY. No se conceden grants ni lectura documental general.',
 '23_CONTRATO_TEMPORAL_VERSIONADO_RETENCION_RECALCULO.md': 'La custodia de la primera fuente mediante FK a aplicabilidad draft no cambia duración ni precedencia de la policy ordinaria tenant-owned publicada/vigente. Source pendiente se deriva de FK/estado existentes; no es un enum persistido, legal hold, obligación acreditada ni permiso de borrado. Ninguna cadena pendiente habilita consumo de negocio, evaluación oficial, purge o release; todas las obligaciones concurrentes y la historia se conservan. Source e intervalo se revalidan al bind y antes de aprobar/publicar. Los plazos comerciales futuros de12/18/24/36/48/60meses no se implementan por esta sucesora.',
 '24_CONTRATO_EVIDENCIA_DOCUMENTOS_ARCHIVOS.md': 'Excepción exclusiva al requisito de primaria publicada para el primer documento fuente: si no existe primaria ordinaria elegible para el contexto exacto, request-upload, finalize y EvidenceCreate pueden usar una nueva aplicabilidad draft de un Tenant Admin custodio, sin source, vinculada a policy ordinaria tenant-owned publicada/vigente. Cada comando revalida bajo locks el mismo tenant, clasificación, propósito evidence_document, contexto, FK y ausencia de primaria/conflicto. Intent/file/EvidenceVersion conservan la misma FK y el mismo autor documental real, Tenant Admin custodio o Evidence Owner con permisos/scope vigentes. En esta ruta acotada links=[] no crea evidencia de negocio. Scan/hash/MIME/storage, expiración, cleanup y revisión independiente se mantienen. El documento auténtico es externo aportado por persona competente: su carga no acredita legalidad. El draft permanece draft durante carga/revisión. Sólo tras aprobación independiente, vigencia/scan-PASS y cláusula auténtica el custodio ejecuta bind; después siguen submit/review/approve/publish ordinarios. No se admite source inexistente, histórica sin vigencia, cambio de autoría, datos falsos o publicación previa para desbloquear upload. El contrato ejecutable sucesor detalla el comando y consumo.',
 '25_API_EVENTOS_IDEMPOTENCIA_AUDITORIA.md': 'Se propone retentionApplicabilityBindInitialSource en POST /api/v1/retention-policy-applicabilities/{id}:bind-initial-source. Body cerrado: source_evidence_version_id, source_clause_ref no vacío, effective_from real; effective_to opcional posterior a from. X-TCDX-Tenant-Id, bearer humano, Idempotency-Key e If-Match fuerte obligatorios; expected_version no se acepta en body HTTP. COMMIT devuelve200. Source approved/vigente/scan-PASS y EvidenceReview independiente, cadena idéntica y draft del custodio se revalidan transaccionalmente. Se actualizan sólo source/cláusula/intervalo/row_version; AuditEvent único audit.privacy.retention_policy_applicability.bind_initial_source.v1, before/after mínimos, tenant/actor/correlation sin blob/secreto. Sin domain event/outbox nuevo; replay reautoriza sin versión/audit nuevos; payload distinto, estado/CAS conflictivo:409; falta de autoridad:403; cadena/source/intervalo inválidos:422. Falla de auditoría revierte el cambio.',
 '38_RESULT_STATUS_AND_DATA_SUFFICIENCY_CONTRACT.md': 'EvidenceVersion ligada a aplicabilidad no publicada y usada como fuente pendiente no puede consumirse como evidencia ordinaria en resultados, controles/requisitos ni evaluaciones. Su aprobación documental permite únicamente la vinculación de fuente por el custodio; no es valid oficial ni publica metodología. Publicar posteriormente la aplicabilidad no crea EvidenceLinks de negocio ni elimina las comprobaciones ordinarias. Se preservan las metodologíasv1, CFG-D conservador, EC opcional sin none y todos los resultados históricos.',
 '46_REGENTE_MAESTRO_DEL_DESARROLLO.md': 'Esta sucesora candidata incorpora exclusivamente el diseño de fuente inicial aprobado por el PO. El acto PO no declara otras funciones ejercidas ni aprueba bytes futuros; no se atribuyen aprobaciones Architecture/Data/Security/Release o Privacy/Legal inexistentes. Antes de activar se requiere decisión exacta sobre el manifest candidato con funciones competentes expresas, dictamen físico y contratos derivados. Implementación, pruebas de código dependiente, build y promoción esperan sus gates; QA auténtica/UI/cierre siguen separados.6A4 sólo tras cierre de6A3 y acto formal autorizado.',
 '47_APROBACION_Y_ACTIVACION_BASELINE.md': f'La candidata {NEW} entrega51 archivos completos y SHA256SUMS, delta exacto y manifest de revisión contra v1.10. La aprobación PO registrada cubre el diseño de SHA {EXPECTED} y su preparación, no estos bytes nuevos. Activación requiere decisión humana por manifest/ID/hashes y funciones Architecture/Data/Security competentes realmente ejercidas, constancia de dictamen físico y aprobación ejecutable exacta; ceremony de ID/status/manifests/verificador concordantes y CI/revisión antes de main. El PO puede acumular funciones sólo si las declara conforme49, sin inventarlas. QA deployment exige autoridad Release de esa versión; fuentes, SoD y aceptación humana permanecen. Sin cierre efectivo6A3 no hay READY_TO_START ni inicio6A4.'}
base=ROOT/'docs/rector/baseline'
for p in sorted(base.glob('*.md')):
 text=p.read_text()
 if p.name=='00_README_KNOWLEDGE_BASE.md':
  text=text.replace('Baseline de esta versión propuesta: `'+OLD+'`.', 'Baseline de esta versión propuesta: `'+NEW+'`.')
  text=text.replace('la v1.8 es la predecesora íntegra.', 'la v1.10 es la predecesora íntegra.',1)
  text+=common+'Copia completa candidata de51archivos. Sólo los deltas INITIAL_SOURCE indicados modifican la predecesora; ningún archivo de baseline activa o historia se modifica.\n'
 elif p.name=='PRE_IMPLEMENTATION_GATE_REPORT.md':
  text=f'''# PRE_IMPLEMENTATION_GATE_REPORT — candidata v1.11 de fuente inicial\n\nSTATUS=BLOCKED_PENDING_EXACT_BYTES_HUMAN_APPROVAL\nACTIVE_PREDECESSOR={OLD}\nCANDIDATE={NEW}\nPO_DESIGN_APPROVAL=RECORDED\nSOURCE_PROPOSAL_SHA256={EXPECTED}\nARCHITECTURE_DATA_SECURITY_FUNCTIONS_APPROVAL=PENDING_EXPLICIT_ACT\nPHYSICAL_COMPATIBILITY=TECHNICAL_REVIEW_ONLY_HUMAN_DICTAMEN_PENDING\nEXECUTABLE_PUBLICATION=NOT_EFFECTIVE\nRELEASE_QA_AUTHORITY=NOT_GRANTED_FOR_NEW_BYTES\nSTEP_6A3=PARTIAL_BLOCKED\nSTEP_6A4=NOT_STARTED\n\nNo cambia modelo físico, grants ni metodologíasv1. Ninguna migración prevista es dictamen final; requiere revisión Data Model Owner y PostgreSQL16 aislado. No implementar ni desplegar antes de gates.\n'''
 elif p.name in rules:
  if p.name.startswith('46_'):text=text.replace('`MASTER_REGENT='+OLD+'`','`MASTER_REGENT='+NEW+'`',1)
  text+=common+rules[p.name]+'\n'
 put(RECTOR/p.name,text)
assert len(list(RECTOR.glob('*.md')))==51
put(RECTOR/'SHA256SUMS.txt',''.join(f'{sha(p)}  ./{p.name}\n' for p in sorted(RECTOR.glob('*.md'))))

norm='''# Enmienda ejecutable candidata — incorporación inicial de fuente\n\nSTATUS=DRAFT_NOT_EFFECTIVE\nPUBLICATION=HUMAN_EXACT_BYTES_APPROVAL_REQUIRED\n\n'''
norm+=f'Diseño PO aprobado SHA `{EXPECTED}`. La aprobación del diseño no activa esta enmienda.\n\n'
for name in rules:
 if name[:2] in ['21','22','23','24','25','38']:norm+='## '+name[:2]+' — regla derivada\n\n'+rules[name]+'\n\n'
norm+='''## Fuente, consumo y selección\n\nLa vista de upload puede seleccionar el draft sólo para incorporar su fuente, separada inequívocamente de primarias ordinarias. La selección debe verificarse en backend, con permisos/capabilities propios de la operación; no se transforma una lectura en derecho de comando. Los selectores de evidencia ordinaria excluyen versiones ligadas a aplicabilidad no publicada. El selector de bind permite únicamente EvidenceVersion de la misma cadena draft aprobada independientemente/vigente/scan-PASS, accesible al custodio o revisor según ObjectPolicy existente acotado. History sigue mostrando su estado original sin crear elegibilidad. La consulta fuente pendiente no expone documentos de otro actor por mera pertenencia al tenant. No se añade Permission/RolePermission ni propósito persistido.\n\n## Revalidaciones y concurrencia\n\nCada comando de cadena debe bloquear/revalidar draft, policy y contexto exactos usando el mecanismo de serialización de contexto de R2; no basta FOR SHARE sobre una fila si otra transacción puede publicar una primaria de ese contexto. Finalize/EvidenceCreate reevalúan ausencia de primaria elegible y estado draft antes de promoción/persistencia. Si hay primaria nueva, conflicto, expiry o submit concurrente, fallar cerrado y conservar compensación de storage y rollback. La fuente pendiente no se promueve por la expiración de un plazo ni por la falta de un hold.\n\nBind actualiza exclusivamente source/cláusula/intervalo con CAS; sin source previa, draft del custodio y cadena inicial exacta. Source EvidenceReview approved de actor distinto del autor documental es obligatoria; aprobador de la aplicabilidad distinto de autor del draft. Los períodos deben ser los declarados auténticamente, ser consistentes con source/policy y tener to>from cuando haya to. No inferir from de created_at, published_at o selección comercial. Revalidar source en approve y publish; ninguna aplicabilidad nueva puede publicarse sin fuente válida. Los dos casos QA under_review existentes y filas históricas no se alteran ni se backfillean.\n\n## UI candidata\n\nConservar tokens, navegación y branding aprobados bajo docs/ui. En las pantallas existentes de empresa/Evidencias distinguir custodia de fuente pendiente de aplicabilidad publicada; publicar sólo después de revisión independiente. Mostrar autor documental/custodio y la causa de bloqueo sin afirmar suficiencia jurídica. Acción propuesta del draft: «Vincular fuente inicial» con campos fuente elegible, cláusula y vigencia reales; visibilidad consume proyección de autorización backend, no calcula permisos. Labels en español, loading/error/422/conflict/empty accesibles, teclado/foco y escritorio/estrecho. No agregar pantallas ni rutas de navegación ajenas al flujo aprobado; la ruta HTTP bind no existe hasta publicación. Human UI review no se autoaprueba.\n\n## Modelo y gates\n\nR2 y expected-schema siguen byte-idénticos; ninguna migración prevista, sujeto a dictamen humano y pruebas aisladas antes de afirmarlo definitivo. Bind draft→draft no añade arista ni grant;09 conserva el registry5. Seguridad/Architecture/Data/Backend y aprobación ejecutable por nuevos bytes pendientes; no atribuir funciones a la decisión PO recibida. Las pruebas positivas/negativas de implementación y QA son NOT_RUN antes de estos gates. No liberar12meses como configuración runtime.\n'''
put(EXEC/'DELTA.md',norm)
put(EXEC/'UI_DELTA.md',norm[norm.index('## UI candidata'):norm.index('## Modelo y gates')]+ '\nSTATUS=DRAFT_NOT_EFFECTIVE; VISUAL_BASELINE=v1.0; HUMAN_UI_REVIEW=PENDING\n')
snap=EXEC/'snapshots'
row='| retentionApplicabilityBindInitialSource | POST `/retention-policy-applicabilities/{id}:bind-initial-source` | privacy; PRIVACY | Tenant Admin custodio humano, autor draft | `privacy.retention_policy.update`; tenant | draft propio; source aprobada independiente/vigente/scan-PASS, misma cadena y contexto; If-Match fuerte | RetentionApplicabilityBindInitialSourceRequest →200 OperationSuccess | COMMON; KEY | `audit.privacy.retention_policy_applicability.bind_initial_source.v1`; NONE | TX; aplicabilidad/audit/idempotency; sin arista/grant | rector23/24/25 v1.11 candidato; INITIAL_SOURCE DELTA |'
appendices={
 '03_API_RESOURCE_OPERATION_MATRIX.md':row+'\n\nDelta:una operación POST adicional;175 operaciones contractuales totales (62GET/112POST/1PUT), sin ampliar permisos. Precondiciones de uploadIntentCreate/uploadFinalize/evidenceCreate y source-select/consume se suceden exclusivamente por DELTA.md. Los contadores históricos anteriores describen el snapshot predecesor.',
 '05_PERMISSION_CATALOG.md':rules['22_RBAC_PERMISSION_SCOPE_MATRIX.md']+'\n\nNuevo bind usa exclusivamente privacy.retention_policy.update tenant. EVIDENCE_DOCUMENTS permanece requisito de comandos documentales; PRIVACY del custodio/binder no se concede por arrastre al autor documental. Ninguna Permission nueva.',
 '08_AUDIT_EVENT_CATALOG.md':rules['25_API_EVENTOS_IDEMPOTENCIA_AUDITORIA.md']+'\n\nLos AuditEvent existentes de upload/finalize/Evidence permanecen únicos por comando. El nuevo código de bind describe actualización draft y no publicación jurídica; no existe segundo evento lifecycle para la misma escritura.',
 '09_SEED_MANIFESTS.md':'No agrega seeds, permisos, pares de grants o aristas. Las cinco aristas C-04W publicadas/auditadas siguen idénticas. Bind es comando draft→draft y emite su único AuditEvent; no volver a publicar registryM2M.',
 '14_FILE_EVIDENCE_STORAGE_CONTRACT.md':rules['24_CONTRATO_EVIDENCIA_DOCUMENTOS_ARCHIVOS.md']+'\n\n'+rules['23_CONTRATO_TEMPORAL_VERSIONADO_RETENCION_RECALCULO.md'],
 '29_PHASE6A3_REFERENCE_READS.md':norm[norm.index('## Fuente, consumo y selección'):norm.index('## Revalidaciones y concurrencia')]}
for name,append in appendices.items():
 p=ROOT/'docs/executable-contracts'/name
 put(snap/name,'> CANDIDATE_NOT_EFFECTIVE: snapshot sucesor INITIAL_SOURCE; texto histórico preservado, requiere publicación competente.\n\n'+p.read_text()+'\n\n## INITIAL_SOURCE v1.11 — delta candidato\n\n'+append+'\n')
yaml=(ROOT/'docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml').read_text()
path='''  "/retention-policy-applicabilities/{id}:bind-initial-source":
    post:
      operationId: retentionApplicabilityBindInitialSource
      tags: ["privacy"]
      summary: "PRIVACY: vincular fuente inicial a un borrador propio"
      security: [{ bearerAuth: [] }]
      x-tcdx-capability: "PRIVACY"
      x-tcdx-permission: "`privacy.retention_policy.update`"
      x-tcdx-scope: "tenant"
      x-tcdx-audit-event: "`audit.privacy.retention_policy_applicability.bind_initial_source.v1`"
      x-tcdx-domain-events: "NONE"
      x-tcdx-idempotency-class: "IDEMPOTENCY_KEY_REQUIRED"
      x-tcdx-transaction-boundary: "TX"
      x-tcdx-physical-entities: "`privacy.retention_policy_applicabilities`, audit/idempotency"
      x-tcdx-rector-source: "INITIAL_SOURCE v1.11 candidate; DELTA.md"
      description: "Custodian author; draft without source; exact source chain approved independently, current and scan-PASS. Bind updates source/clause/real interval only; no publication. Replay reauthorizes; CAS and transactional audit required."
      parameters: [{ $ref: '#/components/parameters/CorrelationId' }, { $ref: '#/components/parameters/TenantContext' }, { $ref: '#/components/parameters/IdempotencyKey' }, { $ref: '#/components/parameters/IfMatch' }, { name: id, in: path, required: true, schema: { $ref: '#/components/schemas/UuidV7' } }]
      requestBody:
        required: true
        content: { application/json: { schema: { $ref: '#/components/schemas/RetentionApplicabilityBindInitialSourceRequest' } } }
      responses:
        '200': { $ref: '#/components/responses/OperationSuccess' }
        '400': { $ref: '#/components/responses/ValidationError' }
        '401': { $ref: '#/components/responses/AuthenticationError' }
        '403': { $ref: '#/components/responses/AuthorizationError' }
        '404': { $ref: '#/components/responses/NotFoundError' }
        '409': { $ref: '#/components/responses/ConflictError' }
        '422': { $ref: '#/components/responses/ValidationError' }
'''
anchor='\ntags:' if '\ntags:' in yaml else '\ncomponents:'
assert anchor in yaml
yaml=yaml.replace(anchor,'\n'+path+anchor.lstrip('\n'),1)
schema='''    RetentionApplicabilityBindInitialSourceRequest:
      type: object
      additionalProperties: false
      required: [source_evidence_version_id, source_clause_ref, effective_from]
      properties:
        source_evidence_version_id: { $ref: '#/components/schemas/UuidV7' }
        source_clause_ref: { type: string, minLength: 1, pattern: '\\S' }
        effective_from: { $ref: '#/components/schemas/UtcTimestamp' }
        effective_to: { $ref: '#/components/schemas/UtcTimestamp' }
      description: "Strong If-Match header supplies CAS; expected_version in HTTP body is forbidden. Real intervals require to>from and compatibility with approved source and policy."
'''
yaml=yaml.replace('    UploadIntentCreateRequest:\n',schema+'    UploadIntentCreateRequest:\n',1)
for op in ['uploadIntentCreate','uploadFinalize','evidenceCreate','evidenceSubmit','retentionApplicabilitySubmitForReview','retentionApplicabilityReview','retentionApplicabilityApprove','retentionApplicabilityPublish']:
 needle='      operationId: '+op+'\n';assert yaml.count(needle)==1
 yaml=yaml.replace(needle,needle+'      x-tcdx-initial-source-contract: "INITIAL_SOURCE DELTA.md; draft custody/source-only exception; independent review and no ordinary consumption; no effective change before candidate publication"\n',1)
put(snap/'02_OPENAPI_BASE_CONTRACT.yaml','# CANDIDATE_NOT_EFFECTIVE INITIAL_SOURCE v1.11\n'+yaml)
js(EXEC/'CONTRACT_PUBLICATION_STATUS.json',{'status':'STAGED_NOT_EFFECTIVE','human_exact_bytes_approval':False,
 'design_approval_receipt':str(receipt.relative_to(ROOT)),'design_approval_receipt_sha256':sha(receipt),
 'architecture_data_security_approval':'NOT_RECORDED_FOR_NEW_BYTES','runtime_implementation':'NOT_STARTED_DEPENDENT_PUBLICATION',
 'qa_release_authority':'BLOCKED_DEPLOY_AUTHORITY','baseline_active':OLD,'candidate':NEW})
files=[p for directory in [RECTOR,EXEC] for p in sorted(directory.rglob('*')) if p.is_file()]
diffs=[]
for p in sorted(RECTOR.glob('*.md')):
 old=base/p.name
 if p.read_bytes()!=old.read_bytes():diffs.extend(difflib.unified_diff(old.read_text().splitlines(True),p.read_text().splitlines(True),fromfile=str(old.relative_to(ROOT)),tofile=str(p.relative_to(ROOT))))
for p in sorted(snap.glob('*')):
 old=ROOT/'docs/executable-contracts'/p.name
 diffs.extend(difflib.unified_diff(old.read_text().splitlines(True),p.read_text().splitlines(True),fromfile=str(old.relative_to(ROOT)),tofile=str(p.relative_to(ROOT))))
put(PKG/'SUCCESSORS.diff',''.join(diffs))
js(PKG/'NEW_BYTES_REVIEW_MANIFEST.json',{'status':'NEW_SUCCESSOR_BYTES_NOT_APPROVED_NOT_EFFECTIVE','recorded_at_utc':NOW,
 'active_baseline':OLD,'candidate_baseline':NEW,'candidate_rector_manifest_sha256':sha(RECTOR/'SHA256SUMS.txt'),
 'design_proposal_sha256':EXPECTED,'po_design_receipt':{'path':str(receipt.relative_to(ROOT)),'sha256':sha(receipt)},
 'files':[{'path':str(p.relative_to(ROOT)),'sha256':sha(p)} for p in files],
 'diff':{'path':str((PKG/'SUCCESSORS.diff').relative_to(ROOT)),'sha256':sha(PKG/'SUCCESSORS.diff')},
 'requires':['Exact successor manifest/bytes decision with actual competent functions','Data Model Owner dictamen and isolated PG16 evidence','Executable publication approval','Separate QA release authority before deployment'],
 'not_requested_again':'A01-A13, previous four candidates and previous six snapshots'})
print(json.dumps({'receipt_sha256':sha(receipt),'candidate_rector_manifest_sha256':sha(RECTOR/'SHA256SUMS.txt'),
 'new_bytes_manifest_sha256':sha(PKG/'NEW_BYTES_REVIEW_MANIFEST.json'),'files':len(files),'active_contracts_changed':False}))
