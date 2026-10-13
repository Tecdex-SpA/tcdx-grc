import React,{useState} from "react";
import {FORM_VOCABULARIES,type FormVocabularyKey} from "@tcdx-grc/contracts";
import {ApiClient} from "./api-client.js";
import {BusinessReferenceSelect,ContractVocabularySelect,ControlVersionSelect,EvidenceVersionSelect,EntityReferenceSelect,ReferenceState} from "./reference-selectors.js";
import {fieldLabel} from "./i18n/display-text.js";
import {readBusinessReferences,type ReferenceEntity} from "./reference-read.js";
type Row=Record<string,unknown>;
export function TypedReferenceField({api,field,form,value,onChange}:{api:ApiClient;field:string;form:Record<string,string>;value:string;onChange(value:string):void}) {
 const entities:Record<string,ReferenceEntity>={requirement_applicability_id:"applicability",control_id:"control",requirement_assessment_id:"requirementAssessment",control_assessment_id:"controlAssessment",assurance_test_id:"assuranceTest",evidence_request_id:"evidenceRequest",issue_id:"issue",business_owner_subject_id:"subject",scope_subject_id:"subject"};
 if(field==="control_version_id") return <ControlVersionSelect api={api} ownership="tenant" parentControlId={form.control_id??""} disabled={!form.control_id} value={value} onChange={onChange}/>;
 if(field==="requirement_id") return <RequirementReferenceField api={api} value={value} onChange={onChange}/>;
 if(field==="effective_configuration_id") return <div><p className="form-guidance">Configuración efectiva opcional</p><ReferenceState state="MISSING_CONFIGURATION"/></div>;
 if(field==="business_owner_subject_id") return <EntityReferenceSelect api={api} entity="subject" label="Responsable de negocio" value={value} onChange={onChange}/>;
 const entity=entities[field];return entity?<EntityReferenceSelect api={api} entity={entity} label={fieldLabel(field)} value={value} onChange={onChange}/>:null;
}
export function RequirementReferenceField({api,value,onChange}:{api:ApiClient;value:string;onChange(value:string):void}) {
 const [framework,setFramework]=useState("");
 return <div><BusinessReferenceSelect api={api} label="Marco normativo" context={{kind:"framework",purpose:"select"}} value={framework} onChange={id=>{setFramework(id);onChange("");}}/><EntityReferenceSelect api={api} entity="requirement" label="Requisito" context={{parentId:framework}} value={value} onChange={onChange}/></div>;
}
const soaFields=["reference_control_version_id","applicability_decision","justification","implementation_state","tenant_control_version_id"];
const linkTargets=["requirement_id","control_id","requirement_assessment_id","control_assessment_id","assurance_test_id"];
const sampleFields=["sample_code","population_count","sample_count","selection_method","sample_period_start","sample_period_end","result_status"];
/** Structured editing of published request arrays. JSON is transport only, never a user input. */
export function StructuredCollectionEditor({api,kind,value,onChange}:{api:ApiClient;kind:"items"|"links"|"samples";value:string;onChange(value:string):void}) {
 const records:Row[]=value?JSON.parse(value) as Row[]:[];
 const change=(index:number,field:string,next:unknown)=>{const copy=records.map(row=>({...row}));if(next==="" && !linkTargets.includes(field))delete copy[index]![field];else copy[index]![field]=next;onChange(JSON.stringify(copy));};
 const fields=kind==="items"?soaFields:kind==="samples"?sampleFields:[];
 const prefix=kind==="items"?"SoaItemCreateInput":kind==="samples"?"AssuranceSampleExecuteInput":"EvidenceLinkCreateInput";
 return <fieldset><legend>{fieldLabel(kind)}</legend>{records.map((record,index)=><fieldset key={index}><legend>{kind==="items"?"Control aplicable":kind==="samples"?"Muestra":"Vínculo de evidencia"} {index+1}</legend>{kind==="links"?<><label>Tipo de objeto<select value={linkTargets.find(key=>Object.hasOwn(record,key))??""} onChange={event=>{const copy=records.map(row=>({...row}));for(const field of linkTargets)delete copy[index]![field];if(event.target.value)copy[index]![event.target.value]="";onChange(JSON.stringify(copy));}}><option value="">Selecciona un tipo</option>{linkTargets.map(field=><option key={field} value={field}>{fieldLabel(field)}</option>)}</select></label>{linkTargets.filter(key=>Object.hasOwn(record,key)).map(field=>field==="requirement_id"?<RequirementReferenceField key={field} api={api} value={String(record[field]??"")} onChange={v=>change(index,field,v)}/>:<TypedReferenceField key={field} api={api} field={field} form={record as Record<string,string>} value={String(record[field]??"")} onChange={v=>change(index,field,v)}/>)}<label>Declaración de evidencia<textarea value={String(record.claim??"")} onChange={e=>change(index,"claim",e.target.value)}/></label></>:fields.map(field=> {
 const key=`${prefix}.${field}`;
 if(Object.hasOwn(FORM_VOCABULARIES,key))return <ContractVocabularySelect key={field} schemaField={key as FormVocabularyKey} label={fieldLabel(field)} value={String(record[field]??"")} onChange={v=>change(index,field,v)}/>;
 if(field==="tenant_control_version_id")return <ControlVersionSelect key={field} api={api} ownership="tenant" value={String(record[field]??"")} onParentControlChange={id=>{const copy=records.map(row=>({...row}));if(id)copy[index]!.tenant_control_id=id;else delete copy[index]!.tenant_control_id;delete copy[index]!.tenant_control_version_id;onChange(JSON.stringify(copy));}} onChange={v=>change(index,field,v)}/>;
 if(field==="reference_control_version_id")return <ControlVersionSelect key={field} api={api} value={String(record[field]??"")} onChange={v=>change(index,field,v)}/>;
 const numeric=["population_count","sample_count"].includes(field);
 if(field.startsWith("sample_period_"))return <p key={field} className="form-guidance">{fieldLabel(field)}: pendiente de contexto de zona horaria de la empresa.</p>;
 const numericInvalid=numeric&&record[field]!==undefined&&typeof record[field]!=="number";
 return <label key={field}>{fieldLabel(field)}<input type={numeric?"number":"text"} aria-invalid={numericInvalid||undefined} min={numeric?0:undefined} step={numeric?1:undefined} value={String(record[field]??"")} onChange={e=>{const raw=e.target.value;const parsed=Number(raw);change(index,field,raw===""?"":numeric&&/^\d+$/.test(raw)&&Number.isSafeInteger(parsed)?parsed:raw);}}/>{numericInvalid&&<span role="alert" className="form-error">Ingresa un número entero representable sin pérdida de precisión.</span>}</label>;
 })}<button type="button" className="button secondary" onClick={()=>onChange(JSON.stringify(records.filter((_,i)=>i!==index)))}>Quitar elemento</button></fieldset>)}<button type="button" className="button secondary" onClick={()=>onChange(JSON.stringify([...records,{}]))}>Agregar elemento</button></fieldset>;
}

export function ApprovedEvidenceReferenceField({api,value,onChange,requestId}:{api:ApiClient;value:string;onChange(value:string):void;requestId?:string}) {
 const [evidence,setEvidence]=useState("");return <div><EntityReferenceSelect api={api} entity="evidence" label="Evidencia" value={evidence} onChange={id=>{setEvidence(id);onChange("");}}/><EvidenceVersionSelect api={api} evidenceId={evidence} {...(requestId?{requestId}:{})} value={value} onChange={onChange}/></div>;
}

export function HistoricalReferenceLabel({api,kind,purpose,parent,filter}:{api:ApiClient;kind:"framework"|"membership"|"retention";purpose:string;parent:Record<string,string>;filter:Record<string,string>}) {
 const [label,setLabel]=useState<string>();const key=JSON.stringify([api.currentTenantId(),kind,purpose,parent,filter]);
 React.useEffect(()=>{const controller=new AbortController();setLabel(undefined);void readBusinessReferences(api,{kind,purpose,parents:parent,filters:filter},controller.signal).then(page=>{if(!controller.signal.aborted)setLabel(page.options[0]?.label??'Referencia no disponible');}).catch(()=>{if(!controller.signal.aborted)setLabel('Referencia no disponible');});return()=>controller.abort();},[api,key]);
 return <span>{label??'Cargando referencia…'}</span>;
}
