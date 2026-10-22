import {ContractField} from "./business-form-fields.js";
import {type FormErrors} from "./business-forms.js";
import {TenantLocalDateTimeField} from "./tenant-timezone.js";
import React,{useState} from "react";
import {FORM_VOCABULARIES,type FormVocabularyKey} from "@tcdx-grc/contracts";
import {ApiClient} from "./api-client.js";
import {BusinessReferenceSelect,ContractVocabularySelect,ControlVersionSelect,EvidenceVersionSelect,EntityReferenceSelect,ReferenceState} from "./reference-selectors.js";
import {fieldLabel} from "./i18n/display-text.js";
import {readBusinessReferences,readReferenceDetail,readReferences,readControlVersions,type ReferenceEntity} from "./reference-read.js";
import {TenantTimezoneContext} from "./tenant-timezone.js";
type Row=Record<string,unknown>;
export function TypedReferenceField({api,field,form,value,onChange,onRetentionContext,publishedOnly=false,classification}:{api:ApiClient;field:string;form:Record<string,string>;value:string;onChange(value:string):void;onRetentionContext?(row:Row|undefined):void;publishedOnly?:boolean;classification?:string|undefined}) {
 const entities:Record<string,ReferenceEntity>={requirement_applicability_id:"applicability",retention_policy_applicability_id:"retentionPolicyApplicability",control_id:"control",requirement_assessment_id:"requirementAssessment",control_assessment_id:"controlAssessment",assurance_test_id:"assuranceTest",evidence_request_id:"evidenceRequest",issue_id:"issue",business_owner_subject_id:"subject",scope_subject_id:"subject"};
 if(field==="control_version_id") return <ControlVersionSelect api={api} ownership="tenant" parentControlId={form.control_id??""} disabled={!form.control_id} value={value} onChange={onChange}/>;
 if(field==="requirement_id") return <RequirementReferenceField api={api} value={value} onChange={onChange}/>;
 if(field==="effective_configuration_id") return <div><p className="form-guidance">Configuración efectiva opcional</p><ReferenceState state="MISSING_CONFIGURATION"/></div>;
 if(field==="business_owner_subject_id") return <EntityReferenceSelect api={api} entity="subject" label="Responsable de negocio" value={value} onChange={onChange}/>;
 if(field==="retention_policy_applicability_id" || field==="supersedes_applicability_id") return <EntityReferenceSelect api={api} entity="retentionPolicyApplicability" label={field==="supersedes_applicability_id"?"Versión anterior de aplicabilidad":"Aplicabilidad de retención"} {...(onRetentionContext?{onOption:onRetentionContext}:{})} disabled={publishedOnly&&!classification} context={{parentId:form.retention_policy_id??"",initialSource:field==="retention_policy_applicability_id"&&!publishedOnly,publishedOnly,classification,ownerSubjectId:form.business_owner_subject_id??""}} value={value} onChange={onChange}/>;
 const entity=entities[field];return entity?<EntityReferenceSelect api={api} entity={entity} label={fieldLabel(field)} {...(field==="control_id"?{context:{tenantOwnedControl:true}}:{})} value={value} onChange={onChange}/>:null;
}
export function RequirementReferenceField({api,value,onChange}:{api:ApiClient;value:string;onChange(value:string):void}) {
 const [framework,setFramework]=useState("");
 return <div><BusinessReferenceSelect api={api} label="Marco normativo" context={{kind:"framework",purpose:"select"}} value={framework} onChange={id=>{setFramework(id);onChange("");}}/><EntityReferenceSelect api={api} entity="requirement" label="Requisito" context={{parentId:framework}} value={value} onChange={onChange}/></div>;
}
const soaFields=["reference_control_version_id","applicability_decision","justification","implementation_state","tenant_control_version_id"];
const linkTargets=["requirement_id","control_id","control_version_id","requirement_assessment_id","control_assessment_id","assurance_test_id"];
const sampleFields=["sample_code","population_count","sample_count","selection_method","sample_period_start","sample_period_end","result_status"];
/** Structured editing of published request arrays. JSON is transport only, never a user input. */
export function StructuredCollectionEditor({api,kind,value,onChange,errors={}}:{api:ApiClient;kind:"items"|"links"|"samples";value:string;onChange(value:string):void;errors?:FormErrors}) {
 const records:Row[]=value?JSON.parse(value) as Row[]:[];
 const recordsRef=React.useRef(records);recordsRef.current=records;
 const update=(rows:Row[])=>{recordsRef.current=rows;onChange(JSON.stringify(rows));};
 const prefix=kind==="items"?"SoaItemCreateInput":kind==="samples"?"AssuranceSampleExecuteInput":"EvidenceLinkCreateInput";
 const change=(index:number,field:string,next:unknown)=>{
  const copy=recordsRef.current.map(row=>({...row}));
  if(next===""&&!(kind==="links"&&linkTargets.includes(field)))delete copy[index]![field];else copy[index]![field]=next;
  update(copy);
 };
 const fields=kind==="items"?soaFields:kind==="samples"?sampleFields:[];
 const renderField=(record:Row,index:number,field:string):React.ReactNode=>{
  const current=String(record[field]??""),set=(next:string)=>change(index,field,next),key=`${prefix}.${field}`;
  if(Object.hasOwn(FORM_VOCABULARIES,key))return <ContractVocabularySelect schemaField={key as FormVocabularyKey} label={fieldLabel(field)} value={current} onChange={set}/>;
  if(field==="tenant_control_version_id")return <ControlVersionSelect api={api} ownership="tenant" value={current} onParentControlChange={id=>{
   const copy=recordsRef.current.map(row=>({...row}));if(id)copy[index]!.tenant_control_id=id;else delete copy[index]!.tenant_control_id;
   delete copy[index]!.tenant_control_version_id;update(copy);
  }} onChange={set}/>;
  if(field==="reference_control_version_id"||field==="control_version_id")return <ControlVersionSelect api={api} value={current} onChange={set}/>;
  if(field==="control_id")return <EntityReferenceSelect api={api} entity="control" label={fieldLabel(field)} context={{tenantOwnedControl:true}} value={current} onChange={set}/>;
  if(field==="requirement_id")return <RequirementReferenceField api={api} value={current} onChange={set}/>;
  if(linkTargets.includes(field))return <TypedReferenceField api={api} field={field} form={record as Record<string,string>} value={current} onChange={set}/>;
  if(["effective_from","effective_to","sample_period_start","sample_period_end"].includes(field))return <TenantLocalDateTimeField label={fieldLabel(field)} value={current} onChange={set}/>;
  if(field==="claim"||field==="justification")return <label>{fieldLabel(field)}<textarea value={current} onChange={e=>set(e.target.value)}/></label>;
  const numeric=["population_count","sample_count"].includes(field);
  return <label>{fieldLabel(field)}<input type={numeric?"number":"text"} min={numeric?0:undefined} step={numeric?1:undefined} maxLength={field==="sample_code"?128:undefined} value={current} onChange={e=>{
   const raw=e.target.value,parsed=Number(raw);change(index,field,raw===""?"":numeric&&/^\d+$/.test(raw)&&Number.isSafeInteger(parsed)?parsed:raw);
  }}/></label>;
 };
 return <fieldset><legend>{fieldLabel(kind)}</legend>{records.map((record,index)=>{
  const rowPrefix=`${kind}.${index}.`,rowErrors=Object.fromEntries(Object.entries(errors).filter(([field])=>field.startsWith(rowPrefix)).map(([field,message])=>[field.slice(rowPrefix.length),message]));
  const active=linkTargets.find(field=>Object.hasOwn(record,field));
  const members=kind==="links"?[...(active?[active]:[]),"claim","effective_from","effective_to"]:fields;
  return <fieldset key={index}><legend>{kind==="items"?"Control aplicable":kind==="samples"?"Muestra":"Vínculo de evidencia"} {index+1}</legend>
   {kind==="links"&&<label>Tipo de objeto<select value={active??""} onChange={event=>{
    const copy=recordsRef.current.map(row=>({...row}));for(const target of linkTargets)delete copy[index]![target];if(event.target.value)copy[index]![event.target.value]="";update(copy);
   }}><option value="">Selecciona un tipo</option>{linkTargets.map(field=><option key={field} value={field}>{fieldLabel(field)}</option>)}</select></label>}
   {members.map(field=><ContractField key={field} schema={prefix} field={field} values={record} errors={rowErrors}>{renderField(record,index,field)}</ContractField>)}
   <button type="button" className="button secondary" aria-label={`Quitar ${kind==="items"?"control aplicable":kind==="samples"?"muestra":"vínculo"} ${index+1}`} onClick={()=>update(recordsRef.current.filter((_,i)=>i!==index))}>Quitar elemento</button>
  </fieldset>;
 })}<button type="button" className="button secondary" onClick={()=>update([...recordsRef.current,{}])}>Agregar elemento</button></fieldset>;
}

export function ApprovedEvidenceReferenceField({api,value,onChange,requestId}:{api:ApiClient;value:string;onChange(value:string):void;requestId?:string}) {
 const [evidence,setEvidence]=useState("");return <div><EntityReferenceSelect api={api} entity="evidence" label="Evidencia" value={evidence} onChange={id=>{setEvidence(id);onChange("");}}/><EvidenceVersionSelect api={api} evidenceId={evidence} {...(requestId?{requestId}:{})} value={value} onChange={onChange}/></div>;
}

export function HistoricalReferenceLabel({api,kind,purpose,parent,filter}:{api:ApiClient;kind:"framework"|"membership"|"retention";purpose:string;parent:Record<string,string>;filter:Record<string,string>}) {
 const [label,setLabel]=useState<string>();const key=JSON.stringify([api.currentTenantId(),kind,purpose,parent,filter]);
 React.useEffect(()=>{const controller=new AbortController();setLabel(undefined);void readBusinessReferences(api,{kind,purpose,parents:parent,filters:filter},controller.signal).then(page=>{if(!controller.signal.aborted)setLabel(page.options[0]?.label??'Referencia no disponible');}).catch(()=>{if(!controller.signal.aborted)setLabel('Referencia no disponible');});return()=>controller.abort();},[api,key]);
 return <span>{label??'Cargando referencia…'}</span>;
}

/** Resolve through the existing authorized tenant readers; a UUID alone never supplies a label. */
export function AuthorizedRetentionReference({api,entity,value}:{api:ApiClient;entity:"retentionPolicy"|"retentionPolicyApplicability";value:string}) {
 const tenant=api.currentTenantId();const key=JSON.stringify([tenant,entity,value]);
 const [label,setLabel]=useState<{key:string;text:string}>();
 React.useEffect(()=>{const controller=new AbortController();setLabel(undefined);
  void readReferenceDetail(api,entity,value,controller.signal).then(option=>{if(!controller.signal.aborted && api.currentTenantId()===tenant)setLabel({key,text:option.label});}).catch(()=>{if(!controller.signal.aborted)setLabel({key,text:"Referencia no disponible en tu alcance autorizado"});});
  return()=>controller.abort();
 },[api,tenant,entity,value]);
 return <span>{label?.key===key?label.text:"Cargando referencia…"}</span>;
}

/** Resolve labels exclusively through existing authorized readers, including parent/version context. */
export async function readBusinessEntityLabel(api:ApiClient,entity:ReferenceEntity|"controlVersion",value:string,parentId:string|undefined,timezone:string|null,signal:AbortSignal):Promise<string> {
 const unavailable='Referencia registrada; nombre no disponible en tu alcance';
 if(entity==='controlVersion'){
  if(!parentId)return unavailable;
  const parent=await readReferenceDetail(api,'control',parentId,signal);
  const versions=await readControlVersions(api,parentId,parent.row.ownership_class==='TENANT_OWNED'?'tenant':'reference',signal);
  return versions.options.find(option=>option.value===value)?.label??unavailable;
 }
 if(!['subject','requirement','complianceMethodology','controlsMethodology','administrativeMembership'].includes(entity)){
  const detail=await readReferenceDetail(api,entity as import('./reference-read.js').DetailReferenceEntity,value,signal);
  if(entity==='applicability'&&typeof detail.row.requirement_id==='string'){
   const name=await readBusinessEntityLabel(api,'requirement',detail.row.requirement_id,undefined,timezone,signal);
   return ['Aplicabilidad',name,...(detail.row.applicability_version!=null?[`v${String(detail.row.applicability_version)}`]:[])].join(' · ');
  }
  return detail.label;
 }
 const parents:(string|undefined)[]=parentId?[parentId]:[undefined];
 if(entity==='requirement'&&!parentId){
  parents.length=0;let cursor:string|undefined;const seen=new Set<string>();
  do{const page=await readBusinessReferences(api,{kind:'framework',purpose:'select',cursor},signal);parents.push(...page.options.map(option=>option.value));if(page.nextCursor&&seen.has(page.nextCursor))break;if(page.nextCursor)seen.add(page.nextCursor);cursor=page.nextCursor??undefined;}while(cursor);
 }
 for(const parent of parents){let cursor:string|undefined;const seen=new Set<string>();
  do{const page=await readReferences(api,entity,{...(entity==='requirement'?{parentId:parent}:{}),cursor,timezone},signal);const option=page.options.find(option=>option.value===value);if(option)return option.label;if(page.nextCursor&&seen.has(page.nextCursor))break;if(page.nextCursor)seen.add(page.nextCursor);cursor=page.nextCursor??undefined;}while(cursor);
 }
 return unavailable;
}
export function BusinessEntityLabel({api,entity,value,parentId}:{api:ApiClient;entity:ReferenceEntity|"controlVersion";value:string;parentId?:string}) {
 const timezone=React.useContext(TenantTimezoneContext);
 const tenant=api.currentTenantId(),key=JSON.stringify([tenant,entity,value,parentId]);
 const [result,setResult]=useState<{key:string;text:string}>();
 React.useEffect(()=>{const controller=new AbortController();setResult(undefined);
  void readBusinessEntityLabel(api,entity,value,parentId,timezone,controller.signal).then(text=>{if(!controller.signal.aborted&&api.currentTenantId()===tenant)setResult({key,text});}).catch(()=>{if(!controller.signal.aborted&&api.currentTenantId()===tenant)setResult({key,text:'Referencia registrada; nombre no disponible en tu alcance'});});
  return()=>controller.abort();
 },[api,key,timezone]);
 return <span>{result?.key===key?result.text:'Cargando referencia…'}</span>;
}
