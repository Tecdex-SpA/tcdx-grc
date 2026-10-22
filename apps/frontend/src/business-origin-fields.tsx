import React, {useState} from 'react';
import {ApiClient} from './api-client.js';
import {ContractField} from './business-form-fields.js';
import {originFields,changeOrigin,type FormErrors} from './business-forms.js';
import {RequirementReferenceField,TypedReferenceField} from './structured-reference-fields.js';
import {fieldLabel} from './i18n/display-text.js';

/** The type is editing context only; the request keeps its published typed FK. */
export function BusinessOriginFields({api,schema,values,errors,onChange}:{api:ApiClient;schema:string;values:Record<string,string>;errors:FormErrors;onChange:React.Dispatch<React.SetStateAction<Record<string,string>>>}) {
  const fields=originFields(schema);
  const [type,setType]=useState(()=>{const selected=fields.filter(field=>values[field]);return selected.length===1?selected[0]!:'';});
  return <>
    <ContractField schema={schema} field="_reference" values={values} errors={errors}>
      <label>Tipo de origen<select aria-label="Tipo de origen" value={type} onChange={event=>{
        setType(event.target.value);onChange(current=>changeOrigin(schema,current));
      }}><option value="">Selecciona el tipo de origen</option>{fields.map(field=><option key={field} value={field}>{fieldLabel(field)}</option>)}</select></label>
      <p className="form-guidance">Elige un solo objeto de origen. Al cambiar el tipo se borra la referencia anterior{schema==='EvidenceRequestCreateRequest'?' y el responsable asignado':''}.</p>
    </ContractField>
    {type&&<ContractField key={type} schema={schema} field={type} values={values} errors={errors}>
      {type==='requirement_id'?<RequirementReferenceField api={api} value={values[type]??''} onChange={value=>onChange(current=>({...current,[type]:value,assigned_membership_id:''}))}/>
        :<TypedReferenceField api={api} field={type} form={values} value={values[type]??''} onChange={value=>onChange(current=>({...current,[type]:value,...(schema==='EvidenceRequestCreateRequest'?{assigned_membership_id:''}:{})}))}/>}
      <p className="form-guidance">{type==='requirement_id'?'El marco normativo filtra los requisitos; selecciona después el requisito que será el origen.':'Selecciona el registro que será el origen de esta operación.'}</p>
    </ContractField>}
    <p className="form-guidance">{schema==='EvidenceRequestCreateRequest'?'Responsable y fecha límite son opcionales; el responsable depende del objeto elegido.':'Responsable de negocio y fecha límite son opcionales. El rol del origen describe la relación y es obligatorio; no añade otro objeto de origen.'}</p>
  </>;
}
