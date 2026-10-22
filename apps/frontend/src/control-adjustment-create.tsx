import React,{useId,useState} from 'react';
import {NORMATIVE_LIBRARY,validateLibrarySchema,type ControlDefinitionReferencePage} from '@tcdx-grc/contracts/normative-library';
import {ApiClient,ApiProblem} from './api-client.js';
import {callLibrary} from './normative-library-client.js';
import {useLibraryRead} from './normative-library-hooks.js';
import {TenantLocalDateTimeField,explicitUtcInstant,isUtcEndAfterStart} from './tenant-timezone.js';
import {PUBLISHED_VOCABULARY_LABELS} from '@tcdx-grc/contracts';

const frequencyLabels:Readonly<Record<string,string>>=PUBLISHED_VOCABULARY_LABELS.ControlFrequency;

/** Ephemeral authorized references; the server revalidates them under the command locks. */
export function ControlAdjustmentCreate({api,controlVersionId,onCreated,onBusyChange}:{api:ApiClient;controlVersionId:string;onCreated():void;onBusyChange?(busy:boolean):void}){
 const [revision,setRevision]=useState(0),[selected,setSelected]=useState(''),[value,setValue]=useState(''),[from,setFrom]=useState(''),[to,setTo]=useState(''),[rationale,setRationale]=useState('');
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[retry,setRetry]=useState<{body:string;key:string}|null>(null);
 const errorId=useId();
 const state=useLibraryRead(api,{operationId:'controlConfigurationDefinitionReferenceList',params:{id:controlVersionId}},revision);
 const page=state.status==='ready'?state.body as ControlDefinitionReferencePage:null;
 const references=page?.control_version_id===controlVersionId?page.items:[];
 const reference=references.find(r=>r.configuration_definition_id===selected);
 const descriptor=reference?NORMATIVE_LIBRARY.definitions.definitions.find(d=>d.configuration_code===reference.configuration_code&&String(d.version_number)===reference.definition_version):undefined;
 const refresh=()=>{setSelected('');setValue('');setRetry(null);setRevision(r=>r+1);};
 if(state.status==='loading')return <>{message&&<p role="alert">{message}</p>}<p role="status">Cargando parámetros disponibles para este control…</p></>;
 if(state.status==='error')return <section><p role="alert">{state.httpStatus===403||state.httpStatus===401?'No tienes autorización para crear propuestas en este contexto.':state.httpStatus===404?'El control seleccionado no está disponible en esta empresa.':'No fue posible consultar los parámetros. Vuelve a intentarlo.'}</p><button className="button secondary" onClick={refresh}>Volver a consultar parámetros</button></section>;
 if(!references.length)return <>{message&&<p role="alert">{message}</p>}<p role="status">No hay parámetros publicados disponibles para este control.</p></>;
 if(references.some(r=>!NORMATIVE_LIBRARY.definitions.definitions.some(d=>d.configuration_code===r.configuration_code&&String(d.version_number)===r.definition_version)))return <p role="alert">No se pudieron verificar los parámetros recibidos. Actualiza la consulta.</p>;
 const enumValues=descriptor&&'enum' in descriptor.value_schema?descriptor.value_schema.enum:null;
 return <section aria-label="Crear propuesta de ajuste"><h3>Nueva propuesta de ajuste</h3><form className="admin-form" onSubmit={event=>{
  event.preventDefault();if(busy)return;
  const body={configuration_definition_id:reference?.configuration_definition_id,scope_level:'control_version',control_version_id:controlVersionId,text_value:value,effective_from:from,effective_to:to,rationale};
  if(!descriptor||!validateLibrarySchema('ControlOverrideCreateRequest',body).valid||!explicitUtcInstant(from)||!explicitUtcInstant(to)||!isUtcEndAfterStart(from,to)||!value.trim()||value.length>descriptor.value_schema.maxLength||enumValues&&!enumValues.includes(value as never)){
   setMessage('Selecciona un parámetro disponible, completa el valor y fundamento e indica una vigencia válida.');return;
  }
  const fingerprint=JSON.stringify(body),key=retry?.body===fingerprint?retry.key:crypto.randomUUID();setRetry({body:fingerprint,key});setBusy(true);onBusyChange?.(true);setMessage('');
  void callLibrary(api,{operationId:'configurationOverrideCreate',body,idempotencyKey:key}).then(()=>{setRetry(null);onCreated();}).catch(error=>{
   if(error instanceof ApiProblem&&error.status===409){refresh();setMessage('El parámetro seleccionado ya no está disponible o cambió. Actualiza tu selección y vuelve a intentar.');}
   else if(error instanceof ApiProblem&&[401,403,404].includes(error.status)){refresh();setMessage('La propuesta no está disponible con el acceso o control actual.');}
   else if(error instanceof ApiProblem&&[400,422].includes(error.status))setMessage('Revisa el valor, la vigencia y el fundamento de la propuesta.');
   else setMessage('No se pudo confirmar el guardado. Consulta las propuestas antes de reintentar.');
  }).finally(()=>{setBusy(false);onBusyChange?.(false);});
 }}><fieldset className="business-form-controls admin-form" disabled={busy} aria-describedby={message?errorId:undefined}>
 <label>Parámetro a personalizar<select required value={reference?selected:''} onChange={e=>{setSelected(e.target.value);setValue('');setMessage('');setRetry(null);}}><option value="">Selecciona un parámetro</option>{references.map(r=><option key={r.configuration_definition_id} value={r.configuration_definition_id}>{NORMATIVE_LIBRARY.definitions.definitions.find(d=>d.configuration_code===r.configuration_code)!.label_es} · versión {r.definition_version}</option>)}</select></label>
 {descriptor&&<><p className="form-guidance">La propuesta modifica la orientación operativa de esta empresa y conserva la fuente y los mínimos normativos.</p>{enumValues?<label>Valor propuesto<select required value={value} onChange={e=>setValue(e.target.value)}><option value="">Selecciona una periodicidad</option>{enumValues.map(code=><option key={code} value={code} disabled={!frequencyLabels[code]}>{frequencyLabels[code]??'Etiqueta no disponible'}</option>)}</select></label>:<label>Valor propuesto<textarea required maxLength={descriptor.value_schema.maxLength} value={value} onChange={e=>setValue(e.target.value)}/></label>}
 <TenantLocalDateTimeField label="Vigente desde" required value={from} onChange={setFrom}/><TenantLocalDateTimeField label="Vigente hasta" required value={to} onChange={setTo}/><label>Fundamento de la propuesta<textarea required maxLength={4096} value={rationale} onChange={e=>setRationale(e.target.value)}/></label></>}
 <button className="button primary" disabled={!descriptor||busy} type="submit">{busy?'Guardando propuesta…':'Guardar propuesta'}</button></fieldset>{message&&<p id={errorId} role="alert">{message}</p>}</form></section>;
}
