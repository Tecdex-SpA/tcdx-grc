import {ControlAdjustmentCreate} from './control-adjustment-create.js';
import React, {useState} from 'react';
import type {CurrentPrincipalAuthorization} from '@tcdx-grc/contracts';
import {NORMATIVE_LIBRARY, type MatrixType, type KnowledgeWrite, type KnowledgeLink, type Citation} from '@tcdx-grc/contracts/normative-library';
import {ApiClient, ApiProblem} from './api-client.js';
import {tenantPresentationPermission} from './tenant-onboarding.js';
import {useLibraryRead, ConnectedKnowledgeContent} from './normative-library-hooks.js';
import {callLibrary, type LibraryCall} from './normative-library-client.js';
import {LibraryMatrixView} from './normative-library.js';
import {BusinessReferenceSelect, ControlVersionSelect, EntityReferenceSelect} from './reference-selectors.js';
import {RequirementReferenceField} from './structured-reference-fields.js';
import {TenantLocalDateTimeField} from './tenant-timezone.js';
import {statusLabel} from './i18n/status-labels.js';

type Row=Record<string,unknown>;
function locationParams(){return new URLSearchParams(typeof window==='undefined'?'':window.location.search);}
type Access={api:ApiClient;authorization:CurrentPrincipalAuthorization|null;platform?:boolean};
const matrixTitles:Record<MatrixType,string>={requirements_controls:'Requisitos × Controles',controls_evidence:'Controles × Evidencias',requirements_assessments:'Requisitos × Evaluaciones',frameworks_frameworks:'Normas × Normas',obligations_applicability:'Obligaciones × Aplicabilidad',issues_actions:'Hallazgos × Acciones'};
export function libraryPermission(access:Access,permission:string){
 return access.platform?!!access.authorization?.platform_permissions.includes(permission):tenantPresentationPermission(access.authorization,access.api.currentTenantId()??undefined,permission);
}
export function libraryOperationAllowed(access:Access,operationId:string){
 const operation=[...NORMATIVE_LIBRARY.registry.new_operations,...NORMATIVE_LIBRARY.existingOperations].find(op=>op.operation_id===operationId);
 return !!operation&&(operation.context==='PLATFORM')===!!access.platform&&libraryPermission(access,operation.permission);
}
function operation(platform:boolean|undefined,kind:'Source'|'Item'|'Version',action:string){return (platform?'platformKnowledge':'knowledge')+kind+action;}
const denied=<p role="alert">Consulta no disponible con el acceso actual.</p>;
function failure(error:unknown){
 return error instanceof ApiProblem&&[400,422].includes(error.status)?'Revisa los datos y las referencias seleccionadas.':error instanceof ApiProblem&&error.status===409?'La versión cambió o existe un conflicto. Vuelve a consultar antes de continuar.':error instanceof ApiProblem&&[401,403,404].includes(error.status)?'Operación no disponible con el acceso actual.':'No se pudo confirmar la operación. Consulta el estado antes de reintentar.';
}
/** One authorized page at a time; cursor and selection are ephemeral and reset by context. */
function LibraryRows(props:Parameters<typeof AuthorizedLibraryRows>[0]){
 if(!libraryOperationAllowed(props.access,props.call.operationId))return denied;
 return <AuthorizedLibraryRows {...props}/>;
}
function AuthorizedLibraryRows({access,call,idField,label,onSelect}:{access:Access;call:Pick<LibraryCall,'operationId'|'params'|'query'>;idField:string;label:string;onSelect(row:Row):void}){
 const [cursor,setCursor]=useState('');
 const state=useLibraryRead(access.api,{...call,query:{...call.query,...(cursor?{cursor}:{})}});
 if(!libraryOperationAllowed(access,call.operationId))return denied;
 if(state.status==='loading')return <p role="status">Cargando registros autorizados…</p>;
 if(state.status==='error')return denied;
 const page=state.body as {items:Row[];next_cursor:string|null};
 return <section aria-label={label}><h3>{label}</h3>{page.items.length?<ul>{page.items.map(row=><li key={String(row[idField])}><button className="link-button" onClick={()=>onSelect(row)}>{String(row.name??row.title??(row.version_number?'Versión '+String(row.version_number):row.configuration_code))} · {statusLabel(String(row.lifecycle_state))}</button></li>)}</ul>:<p role="status">Sin registros autorizados para esta selección.</p>}{page.next_cursor&&<button className="button secondary" onClick={()=>setCursor(page.next_cursor!)}>Página siguiente</button>}{cursor&&<button className="link-button" onClick={()=>setCursor('')}>Volver al inicio</button>}</section>;
}
function Text({label,value,onChange,required=true}:{label:string;value:string;onChange(value:string):void;required?:boolean}){
 return <label>{label}<textarea required={required} value={value} onChange={e=>onChange(e.target.value)} maxLength={65536}/></label>;
}
/** Reuses the exact approved operation, server ETag and idempotency key. Fresh read after success/replay. */
function Command({access,call,children,onDone}:{access:Access;call:LibraryCall;children:React.ReactNode;onDone():void}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [retry,setRetry]=useState<{fingerprint:string;key:string}|null>(null);
 if(!libraryOperationAllowed(access,call.operationId))return null;
 return <form className="admin-form business-form-controls" onSubmit={e=>{e.preventDefault();if(busy)return;setBusy(true);setMessage('');const fingerprint=JSON.stringify(call);const key=retry?.fingerprint===fingerprint?retry.key:crypto.randomUUID();setRetry({fingerprint,key});void callLibrary(access.api,{...call,idempotencyKey:key}).then(()=>{setRetry(null);onDone();}).catch(error=>setMessage(failure(error))).finally(()=>setBusy(false));}}><fieldset className="business-form-controls admin-form" disabled={busy}>{children}<button className="button primary" type="submit">{busy?'Procesando…':'Confirmar operación'}</button></fieldset>{message&&<p role="alert">{message}</p>}</form>;
}
function CatalogCreate({access,kind,sourceId,onDone}:{access:Access;kind:'Source'|'Item';sourceId?:string;onDone():void}){
 const [values,setValues]=useState<Record<string,string>>({});
 const fields=kind==='Source'?['source_code','name','source_kind','official_uri','license_classification','rationale']:['knowledge_code','title','rationale'];
 const labels:Record<string,string>={source_code:'Código de procedencia',name:'Nombre de procedencia',source_kind:'Tipo de procedencia declarado',official_uri:'URI oficial (opcional)',license_classification:'Clasificación de licencia declarada',knowledge_code:'Código editorial',title:'Título',rationale:'Fundamento'};
 const body={...Object.fromEntries(Object.entries(values).filter(([,v])=>v.trim())),...(kind==='Item'?{knowledge_source_id:sourceId}:{})};
 const op=operation(access.platform,kind,'Create');
 if(!libraryOperationAllowed(access,op))return null;
 return <details><summary>{kind==='Source'?'Registrar procedencia':'Crear contenido editorial o contextual'}</summary><p>Los metadatos declarados no conceden derechos de uso ni publican una norma.</p><Command access={access} call={{operationId:op,body}} onDone={onDone}>{fields.map(field=><label key={field}>{labels[field]}<input required={field!=='official_uri'} type={field==='official_uri'?'url':'text'} value={values[field]??''} onChange={e=>setValues(v=>({...v,[field]:e.target.value}))}/></label>)}</Command></details>;
}
function VersionEditor({access,itemId,version,etag,onDone}:{access:Access;itemId:string;version?:Row;etag?:string;onDone():void}){
 const [context,setContext]=useState(version?.publication_authority==='tenant_context');
 const content=(version?.content??{}) as Record<string,unknown>;
 const [texts,setTexts]=useState<Record<string,string>>(()=>Object.fromEntries(Object.entries(content).map(([k,v])=>[k,typeof v==='string'?v:String((v as {text?:string}).text??'')])));
 const [language,setLanguage]=useState(String(version?.content_language??'es')),[from,setFrom]=useState(String(version?.effective_from??'')),[to,setTo]=useState(String(version?.effective_to??'')),[reason,setReason]=useState('');
 const [linkRole,setLinkRole]=useState('comprender');
 const [citations,setCitations]=useState<Record<string,Citation[]>>(()=>Object.fromEntries(['comprender','implementar','demostrar'].map(k=>[k,(content[k] as {citations?:Citation[]}|undefined)?.citations??[]])));
 const [links,setLinks]=useState<KnowledgeLink[]>((version?.links??[]) as KnowledgeLink[]);
 const [targetKind,setTargetKind]=useState('requirement_id'),[targetId,setTargetId]=useState(''),[locator,setLocator]=useState(''),[provenance,setProvenance]=useState('');
 const op=operation(access.platform,'Version',version?'Update':'Create');
 if(!libraryOperationAllowed(access,op))return null;
 const sections=context?['descripcion','alcance','actividades','supuestos','preguntas_pendientes']:['comprender','implementar','demostrar'];
 const role=context?'contexto_empresarial':null;
 const body={content_language:language,content:Object.fromEntries(sections.map(k=>[k,context?(texts[k]??''):{text:texts[k]??'',citations:citations[k]??[]}])),links,effective_from:from,...(to?{effective_to:to}:{}),rationale:reason} as KnowledgeWrite;
 const field=context?'subject_id':targetKind;
 return <details><summary>{version?'Editar borrador':'Crear versión'}</summary><Command access={access} call={{operationId:op,params:{id:String(version?.knowledge_version_id??itemId)},body,...(etag?{etag}:{})}} onDone={onDone}>
  {!version&&!access.platform&&<label>Tipo de contenido<select value={context?'context':'editorial'} onChange={e=>{setContext(e.target.value==='context');setTexts({});setLinks([]);setCitations({});setTargetId('');}}><option value="editorial">Guía editorial</option><option value="context">Contexto empresarial</option></select></label>}
  <label>Idioma<input required value={language} maxLength={35} onChange={e=>setLanguage(e.target.value)}/></label>
  {sections.map(k=><Text key={k} label={({descripcion:'Descripción',alcance:'Alcance',actividades:'Actividades',supuestos:'Supuestos',preguntas_pendientes:'Preguntas pendientes'} as Record<string,string>)[k]??k.toUpperCase()} value={texts[k]??''} onChange={v=>setTexts(t=>({...t,[k]:v}))}/>)}
  {access.platform?<><label>Vigente desde (UTC, ISO 8601)<input required placeholder="AAAA-MM-DDTHH:mm:ssZ" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>Vigente hasta (UTC, opcional)<input value={to} onChange={e=>setTo(e.target.value)}/></label></>:<><TenantLocalDateTimeField label="Vigente desde" value={from} onChange={setFrom}/><TenantLocalDateTimeField label="Vigente hasta (opcional)" value={to} onChange={setTo}/></>}
  <fieldset><legend>Vínculos y citas</legend>{!context&&<label>Tipo de referencia<select value={targetKind} onChange={e=>{setTargetKind(e.target.value);setTargetId('');}}><option value="requirement_id">Requisito</option><option value="normative_unit_id">Unidad normativa</option><option value="control_version_id">Versión de control</option></select></label>}
  {field==='normative_unit_id'?<NormativeUnitSelect api={access.api} value={targetId} onChange={setTargetId}/>:field==='subject_id'?<EntityReferenceSelect api={access.api} entity="subject" label="Contexto empresarial" value={targetId} onChange={setTargetId}/>:field==='control_version_id'?<ControlVersionSelect api={access.api} value={targetId} onChange={setTargetId}/>:<RequirementReferenceField api={access.api} value={targetId} onChange={setTargetId}/>}
  {!context&&<label>Sección de la cita<select value={linkRole} onChange={e=>setLinkRole(e.target.value)}>{['comprender','implementar','demostrar'].map(k=><option key={k} value={k}>{k.toUpperCase()}</option>)}</select></label>}
  <Text label="Localizador de fuente" value={locator} onChange={setLocator} required={false}/><Text label="Procedencia del vínculo" value={provenance} onChange={setProvenance} required={false}/>
  <button type="button" className="button secondary" disabled={!targetId||!locator.trim()||!provenance.trim()} onClick={()=>{setLinks(ls=>[...ls,{target:{[field]:targetId} as KnowledgeLink['target'],context_role:(role??linkRole) as KnowledgeLink['context_role'],source_locator:locator,provenance_ref:provenance}]);if(!context)setCitations(cs=>({...cs,[linkRole]:[...(cs[linkRole]??[]),{link_ordinal:links.length,locator}]}));setTargetId('');setLocator('');setProvenance('');}}>Agregar vínculo y cita</button>
  <ul>{links.map((l,i)=><li key={i}>{l.context_role.toUpperCase()} · {l.source_locator}<button type="button" className="link-button" onClick={()=>{setLinks(ls=>ls.filter((_,n)=>n!==i));setCitations(cs=>Object.fromEntries(Object.entries(cs).map(([k,vs])=>[k,vs.filter(c=>c.link_ordinal!==i).map(c=>({...c,link_ordinal:c.link_ordinal>i?c.link_ordinal-1:c.link_ordinal}))])));}}>Quitar vínculo {i+1}</button></li>)}</ul></fieldset>
  <Text label="Fundamento del cambio" value={reason} onChange={setReason}/>
 </Command></details>;
}
function Decision({access,id,kind,action,etag,onDone}:{access:Access;id:string;kind:'knowledge'|'override';action:'Review'|'Publish'|'Decide';etag:string|undefined;onDone():void}){
 const [rationale,setRationale]=useState(''),[decision,setDecision]=useState(action==='Decide'?'approved':'reviewed');
 const op=kind==='knowledge'?operation(access.platform,'Version',action):'configurationOverride'+action;
 if(!libraryOperationAllowed(access,op))return null;
 return <details><summary>{action==='Publish'?'Publicar contenido':action==='Decide'?'Decisión gerencial':'Revisar propuesta'}</summary><p>El servidor verifica el autor, la segregación de funciones y la versión exacta.</p><Command access={access} call={{operationId:op,params:{id},...(etag?{etag}:{}),body:{rationale,...(action==='Publish'?{}:{decision})}}} onDone={onDone}>{action!=='Publish'&&<label>Decisión<select value={decision} onChange={e=>setDecision(e.target.value)}><option value={action==='Decide'?'approved':'reviewed'}>{action==='Decide'?'Aprobar':'Revisado'}</option><option value="rejected">Rechazar</option></select></label>}<Text label="Fundamento de la decisión" value={rationale} onChange={setRationale}/></Command></details>;
}
function VersionDetail({access,id,onDone}:{access:Access;id:string;onDone():void}){
 const state=useLibraryRead(access.api,{operationId:operation(access.platform,'Version','Get'),params:{id}});
 if(state.status!=='ready')return state.status==='error'?denied:<p role="status">Cargando versión…</p>;
 const version=(state.body as {result:Row}).result;
 return <><ConnectedKnowledgeContent api={access.api} versionId={id} platform={!!access.platform}/>{version.lifecycle_state==='draft'&&version.content_access==='body_available'&&<VersionEditor access={access} itemId={String(version.knowledge_item_id)} version={version} {...(state.etag?{etag:state.etag}:{})} onDone={onDone}/>}{version.lifecycle_state==='draft'&&<Decision access={access} id={id} kind="knowledge" action="Review" etag={state.etag??undefined} onDone={onDone}/ >}{version.lifecycle_state==='reviewed'&&<Decision access={access} id={id} kind="knowledge" action="Publish" etag={state.etag??undefined} onDone={onDone}/>}</>;
}
function CatalogDetail({access,kind,id}:{access:Access;kind:'Source'|'Item';id:string}){
 const state=useLibraryRead(access.api,{operationId:operation(access.platform,kind,'Get'),params:{id}});
 if(state.status!=='ready')return state.status==='error'?denied:<p role="status">Cargando metadatos…</p>;
 const row=(state.body as {result:Row}).result;
 return <section aria-label="Metadatos seleccionados"><h3>{String(row.name??row.title)}</h3><p>{String(row.source_code??row.knowledge_code)} · {statusLabel(String(row.lifecycle_state))}</p>{kind==='Source'&&<p>{String(row.source_kind)} · {String(row.license_classification)}</p>}</section>;
}
export function KnowledgeWorkspace(access:Access){
 const [source,setSource]=useState<Row|null>(null),[item,setItem]=useState<Row|null>(null),[version,setVersion]=useState(''),[search,setSearch]=useState(''),[revision,setRevision]=useState(0);
 const refresh=()=>{setVersion('');setRevision(r=>r+1);};
 const sourceId=String(source?.knowledge_source_id??''),itemId=String(item?.knowledge_item_id??'');
 if(!libraryOperationAllowed(access,operation(access.platform,'Source','List'))&&!libraryOperationAllowed(access,operation(access.platform,'Version','List')))return denied;
 return <section className="data-card" aria-label="Biblioteca normativa"><h2>{access.platform?'Biblioteca editorial de plataforma':'Biblioteca normativa y contexto empresarial'}</h2><div className="admin-form"><label>Buscar metadatos<input type="search" value={search} maxLength={256} onChange={e=>{setSearch(e.target.value);setSource(null);setItem(null);setVersion('');}}/></label></div>
 <CatalogCreate access={access} kind="Source" onDone={refresh}/>
 {libraryOperationAllowed(access,operation(access.platform,'Source','List'))&&<LibraryRows key={'source:'+search+revision} access={access} call={{operationId:operation(access.platform,'Source','List'),query:search.trim()?{query:search}:{}}} idField="knowledge_source_id" label="Fuentes de procedencia" onSelect={row=>{setSource(row);setItem(null);setVersion('');}}/>}
 {source&&<><CatalogDetail access={access} kind="Source" id={sourceId}/><CatalogCreate access={access} kind="Item" sourceId={sourceId} onDone={refresh}/></>}
 {libraryOperationAllowed(access,operation(access.platform,'Item','List'))&&<LibraryRows key={'items:'+sourceId+search+revision} access={access} call={{operationId:operation(access.platform,'Item','List'),query:{...(sourceId?{knowledge_source_id:sourceId}:{}),...(search.trim()?{query:search}:{})}}} idField="knowledge_item_id" label="Contenido editorial y contextual" onSelect={row=>{setItem(row);setVersion('');}}/>}
 {item&&<><CatalogDetail access={access} kind="Item" id={itemId}/><VersionEditor key={itemId+revision} access={access} itemId={itemId} onDone={refresh}/></>}
 {libraryOperationAllowed(access,operation(access.platform,'Version','List'))&&<LibraryRows key={'versions:'+itemId+search+revision} access={access} call={{operationId:operation(access.platform,'Version','List'),query:{...(itemId?{knowledge_item_id:itemId}:{}),...(search.trim()?{query:search}:{})}}} idField="knowledge_version_id" label="Ediciones de contenido" onSelect={row=>setVersion(String(row.knowledge_version_id))}/>}
 {version&&<VersionDetail key={version+revision} access={access} id={version} onDone={refresh}/>}</section>;
}
export function MatrixWorkspace({mini=false,...access}:Access&{mini?:boolean}){
 const allowed=NORMATIVE_LIBRARY.matrices.types.filter(d=>[d.additional_entry_permission,...d.required_source_permissions].every(p=>libraryPermission(access,p)));
 const [type,setType]=useState<MatrixType>(()=>(locationParams().get('matrix')??'requirements_controls') as MatrixType),[from,setFrom]=useState(()=>locationParams().get('source_framework_version_id')??''),[to,setTo]=useState(()=>locationParams().get('target_framework_version_id')??''),[query,setQuery]=useState(()=>locationParams().get('query')??'');
 const [asOf,setAsOf]=useState(()=>locationParams().get('as_of')??new Date().toISOString());
 const descriptor=allowed.find(d=>d.matrix_type===type)??allowed[0];
 if(!descriptor)return mini?null:denied;
 const chosen=descriptor.matrix_type as MatrixType;
 const filters={as_of:asOf,...(descriptor.supported_filters.includes('source_framework_version_id')&&from?{source_framework_version_id:from}:{}),...(descriptor.supported_filters.includes('target_framework_version_id')&&to?{target_framework_version_id:to}:{}),...(query.trim()?{query}:{}),...(mini?{row_limit:'3',column_limit:'3',cell_limit:'9'}:{})};
 const ready=descriptor.required_filters.every(k=>!!(filters as Record<string,string>)[k]);
 return <section className="data-card" aria-label={mini?'Matrices del dashboard':'Matrices normativas'}><h2>{mini?'Relaciones normativas':'Matrices y homologación'}</h2><p>Las correspondencias conservan su tipo, procedencia y estado. Una relación no acredita cumplimiento.</p><div className="admin-form"><label>Matriz<select value={chosen} onChange={e=>{setType(e.target.value as MatrixType);setFrom('');setTo('');setQuery('');}}>{allowed.map(d=><option key={d.matrix_type} value={d.matrix_type}>{matrixTitles[d.matrix_type as MatrixType]}</option>)}</select></label>
 {descriptor.supported_filters.includes('source_framework_version_id')&&<BusinessReferenceSelect api={access.api} label="Edición de origen" context={{kind:'framework',purpose:'select'}} value={from} onChange={setFrom}/>}{descriptor.supported_filters.includes('target_framework_version_id')&&<BusinessReferenceSelect api={access.api} label="Edición de destino" context={{kind:'framework',purpose:'select'}} value={to} onChange={setTo}/>}
 <TenantLocalDateTimeField label="Relaciones a la fecha" value={asOf} onChange={setAsOf}/><label>Buscar relaciones<input type="search" value={query} maxLength={256} onChange={e=>setQuery(e.target.value)}/></label></div>
 {ready?<LibraryMatrixView key={chosen+JSON.stringify(filters)} api={access.api} type={chosen} filters={filters}/>:<p role="status">Selecciona las ediciones y la fecha para consultar.</p>}
 {mini&&<a className="link-button" href={'/normas?tab=matrices&'+new URLSearchParams({matrix:chosen,...filters})}>Abrir matriz completa</a>}</section>;
}
export function ControlAdjustments(access:Access){
 const [control,setControl]=useState(''),[selected,setSelected]=useState(''),[revision,setRevision]=useState(0),[notice,setNotice]=useState(''),[creating,setCreating]=useState(false);
 const mayRead=libraryOperationAllowed(access,'controlConfigurationOverrideList'),mayCreate=libraryOperationAllowed(access,'configurationOverrideCreate');
 if(!mayRead&&!mayCreate)return denied;
 return <section className="data-card" aria-label="Personalización y aprobación gerencial"><h2>Personalización y aprobación gerencial</h2><p>Actividades operativas, evidencias recomendadas, periodicidad y confirmación operativa. Una aprobación no sustituye el cumplimiento normativo.</p><div className="admin-form"><fieldset className="business-form-controls" disabled={creating}><ControlVersionSelect api={access.api} ownership="tenant" value={control} onChange={id=>{setControl(id);setSelected('');setNotice('');}}/></fieldset></div>{notice&&<p role="status">{notice}</p>}{control&&mayCreate&&<ControlAdjustmentCreate key={JSON.stringify([access.api.currentTenantId(),control,revision,access.authorization])} api={access.api} controlVersionId={control} onBusyChange={setCreating} onCreated={()=>{setRevision(r=>r+1);setNotice('Propuesta guardada como borrador. La revisión y aprobación gerencial son pasos independientes.');}}/>}{control&&mayRead&&<LibraryRows key={control+revision} access={access} call={{operationId:'controlConfigurationOverrideList',params:{id:control}}} idField="configuration_override_id" label="Ajustes del control" onSelect={row=>setSelected(String(row.configuration_override_id))}/>}{selected&&mayRead&&<OverrideDetail key={selected+revision} access={access} id={selected} onDone={()=>setRevision(r=>r+1)}/>}</section>;
}
function OverrideDetail({access,id,onDone}:{access:Access;id:string;onDone():void}){
 const state=useLibraryRead(access.api,{operationId:'configurationOverrideGet',params:{id}});
 if(state.status!=='ready')return state.status==='error'?denied:<p role="status">Cargando ajuste…</p>;
 const row=(state.body as {result:Row}).result;
 return <><h3>{String(row.configuration_code)} · {statusLabel(String(row.lifecycle_state))}</h3><p>{String(row.text_value)}</p><p>{String(row.rationale)}</p>{row.lifecycle_state==='draft'&&<><OverrideEditor access={access} row={row} etag={state.etag??undefined} onDone={onDone}/><Decision access={access} id={id} kind="override" action="Review" etag={state.etag??undefined} onDone={onDone}/></>}{row.lifecycle_state==='reviewed'&&<Decision access={access} id={id} kind="override" action="Decide" etag={state.etag??undefined} onDone={onDone}/>}</>;
}
function OverrideEditor({access,row,etag,onDone}:{access:Access;row:Row;etag:string|undefined;onDone():void}){
 const [value,setValue]=useState(String(row.text_value)),[from,setFrom]=useState(String(row.effective_from)),[to,setTo]=useState(String(row.effective_to)),[rationale,setRationale]=useState('');
 return <details><summary>Editar propuesta</summary><Command access={access} call={{operationId:'configurationOverrideUpdate',params:{id:String(row.configuration_override_id)},...(etag?{etag}:{}),body:{text_value:value,effective_from:from,effective_to:to,rationale}}} onDone={onDone}><Text label="Valor propuesto" value={value} onChange={setValue}/><TenantLocalDateTimeField label="Vigente desde" value={from} onChange={setFrom}/><TenantLocalDateTimeField label="Vigente hasta" value={to} onChange={setTo}/><Text label="Fundamento del cambio" value={rationale} onChange={setRationale}/></Command></details>;
}
/** B07 selector consumes typed, authorized Knowledge versions, never narrative IDs. */
export function ApplicabilityKnowledgeSelect({api,value,onChange,subjectId}:{api:ApiClient;value:string;onChange(value:string):void;subjectId:string}){
 const [cursor,setCursor]=useState('');
 const next=useLibraryRead(api,{operationId:'knowledgeVersionList',query:{context_role:'contexto_empresarial',...(subjectId?{subject_id:subjectId}:{}),...(cursor?{cursor}:{})}});
 const page=next;
 if(page.status!=='ready')return page.status==='error'?denied:<p role="status">Cargando contexto empresarial…</p>;
 const result=page.body as {items:Row[];next_cursor:string|null};
 return <><label>Versión de contexto empresarial (opcional)<select value={value} onChange={e=>onChange(e.target.value)}><option value="">Sin contexto vinculado</option>{result.items.filter(row=>row.publication_authority==='tenant_context'&&row.lifecycle_state==='published').map(row=><option key={String(row.knowledge_version_id)} value={String(row.knowledge_version_id)}>Versión {String(row.version_number)} · {String(row.effective_from)}</option>)}</select></label>{result.next_cursor&&<button type="button" className="link-button" onClick={()=>{onChange('');setCursor(result.next_cursor!);}}>Más contextos</button>}{value&&<ConnectedKnowledgeContent api={api} versionId={value}/>}</>;
}

export function TargetKnowledgePanel({api,target}:{api:ApiClient;target:Record<string,string>}){
 const [selected,setSelected]=useState(''),[cursor,setCursor]=useState('');
 const state=useLibraryRead(api,{operationId:'knowledgeVersionList',query:{...target,...(cursor?{cursor}:{})}});
 if(state.status!=='ready')return state.status==='error'?denied:<p role="status">Cargando guía vinculada…</p>;
 const page=state.body as {items:Row[];next_cursor:string|null};
 return <section aria-label="Guía vinculada"><h3>COMPRENDER / IMPLEMENTAR / DEMOSTRAR</h3>{page.items.length?<ul>{page.items.map(v=><li key={String(v.knowledge_version_id)}><button className="link-button" onClick={()=>setSelected(String(v.knowledge_version_id))}>Versión {String(v.version_number)} · {statusLabel(String(v.lifecycle_state))}</button></li>)}</ul>:<p role="status">Sin guía autorizada vinculada.</p>}{page.next_cursor&&<button className="link-button" onClick={()=>{setSelected('');setCursor(page.next_cursor!);}}>Más versiones</button>}{selected&&<ConnectedKnowledgeContent api={api} versionId={selected}/>}</section>;
}

function NormativeUnitSelect({api,value,onChange}:{api:ApiClient;value:string;onChange(value:string):void}){
 const [framework,setFramework]=useState('');
 return <><BusinessReferenceSelect api={api} label="Edición de la unidad normativa" context={{kind:'framework',purpose:'select'}} value={framework} onChange={id=>{setFramework(id);onChange('');}}/>{framework&&<UnitPage key={framework} api={api} framework={framework} value={value} onChange={onChange}/>}</>;
}
function UnitPage({api,framework,value,onChange}:{api:ApiClient;framework:string;value:string;onChange(value:string):void}){
 const [cursor,setCursor]=useState('');
 const [state,setState]=useState<{status:'loading'|'error'|'ready';items:Row[];cursor:string|null}>({status:'loading',items:[],cursor:null});
 React.useEffect(()=>{const controller=new AbortController();setState({status:'loading',items:[],cursor:null});const params=new URLSearchParams({'page[size]':'100',...(cursor?{'page[cursor]':cursor}:{})});void api.request<{items:Row[];page:{next_cursor:string|null}}>('/api/v1/framework-versions/'+encodeURIComponent(framework)+'/normative-units?'+params,{signal:controller.signal,cache:'no-store'}).then(page=>{if(!controller.signal.aborted)setState({status:'ready',items:page.items,cursor:page.page.next_cursor});}).catch(()=>{if(!controller.signal.aborted)setState({status:'error',items:[],cursor:null});});return()=>controller.abort();},[api,framework,cursor]);
 if(state.status!=='ready')return state.status==='error'?denied:<p role="status">Cargando unidades normativas…</p>;
 return <><label>Unidad normativa<select value={value} onChange={e=>onChange(e.target.value)}><option value="">Selecciona una unidad</option>{state.items.map(row=><option key={String(row.normative_unit_id)} value={String(row.normative_unit_id)}>{String(row.unit_code)} · {String(row.title)}</option>)}</select></label>{state.cursor&&<button type="button" className="link-button" onClick={()=>{onChange('');setCursor(state.cursor!);}}>Más unidades</button>}</>;
}
