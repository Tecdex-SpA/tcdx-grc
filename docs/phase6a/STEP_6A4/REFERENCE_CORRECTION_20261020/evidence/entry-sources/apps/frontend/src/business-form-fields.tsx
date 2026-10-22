import React, { useLayoutEffect, useRef, useId, useState } from 'react';
import { type FormErrors, errorFieldLabel, propertySchema, requiredField } from './business-forms.js';
import { fieldLabel, fieldPlaceholder, displayValue } from './i18n/display-text.js';
import { TenantLocalDateTimeField } from './tenant-timezone.js';
import { ContractVocabularySelect } from './reference-selectors.js';
import { FORM_VOCABULARIES, type FormVocabularyKey } from '@tcdx-grc/contracts';

export function useBusinessDialog(close: () => void, busy = false) {
  const ref = useRef<HTMLElement>(null), latest = useRef({close,busy}); latest.current={close,busy};
  useLayoutEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog=ref.current;
    dialog?.querySelector<HTMLElement>('button, input, select, textarea')?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key==='Escape' && !latest.current.busy) {event.preventDefault();latest.current.close();}
      if (event.key!=='Tab' || !dialog) return;
      const controls=[...dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')].filter(el=>el.getClientRects().length);
      const first=controls[0],last=controls.at(-1);
      if(event.shiftKey&&document.activeElement===first&&last){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last&&first){event.preventDefault();first.focus();}
    };
    document.addEventListener('keydown',key);
    return()=>{document.removeEventListener('keydown',key);if(previous?.isConnected)previous.focus();};
  },[]);
  return ref;
}
export function ContractField({schema,field,values={},errors={},children}:{schema:string;field:string;values?:Record<string,unknown>;errors?:FormErrors;children:React.ReactNode}) {
  const ref=useRef<HTMLDivElement>(null), id=useId();
  const required=requiredField(schema,field,values);
  const message=errors[field];
  const nested=Object.entries(errors).filter(([key])=>key.startsWith(field+'.'));
  useLayoutEffect(()=>{
    const inputs=ref.current?.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>('input:not([type="search"]),select,textarea');
    const input=propertySchema(schema,field).type==='array'?undefined:ref.current?.querySelector<HTMLInputElement>('[data-contract-input]') ?? inputs?.[inputs.length-1];
    if(input){
      if(!input.id)input.id=id+'-input';
      input.required=required;
      input.setAttribute('aria-invalid',message?'true':'false');
      const described=(input.getAttribute('aria-describedby')??'').split(' ').filter(x=>x&&!x.startsWith(id));
      input.setAttribute('aria-describedby',[...described,id+'-help',...(message?[id+'-error']:[])].join(' '));
    }
  },[id,required,message,children]);
  return <div className="business-field" ref={ref} data-field={field}>{children}<small id={id+'-help'} className="form-guidance">{required?'Obligatorio':'Opcional'}{['control_code','request_code','evidence_code','issue_code','action_code','test_code','policy_code','sample_code'].includes(field)?' · Código de negocio definido por ti; no es un identificador técnico.':''}</small>{message&&<p id={id+'-error'} className="form-error" role="alert">{message}</p>}{nested.map(([key,text])=><p key={key} className="form-error" role="alert">{errorFieldLabel(key)}: {text}</p>)}</div>;
}
const groupLabels={main:'Información principal',references:'Relaciones y versiones',owners:'Responsables',temporal:'Fechas y conservación'};
function fieldGroup(field:string):keyof typeof groupLabels {
  if(/owner|membership/.test(field))return 'owners';
  if(/(_at|_date|_from|_to|_start|_end)$/.test(field)||['retention_seconds','expires_at'].includes(field))return 'temporal';
  if(/(_id|_ref)$/.test(field)||['items','links'].includes(field))return 'references';
  return 'main';
}
export function BusinessFields({schema,fields,values,errors,render}:{schema:string;fields:readonly string[];values:Record<string,unknown>;errors:FormErrors;render(field:string):React.ReactNode}) {
  return <>{(Object.keys(groupLabels) as (keyof typeof groupLabels)[]).map(group=>{
    const members=fields.filter(field=>fieldGroup(field)===group);
    return members.length?<fieldset className="business-form-group" key={group}><legend>{groupLabels[group]}</legend>{members.map(field=><ContractField key={field} schema={schema} field={field} values={values} errors={errors}>{render(field)}</ContractField>)}</fieldset>:null;
  })}</>;
}
export function BusinessScalarField({schema,field,value,onChange}:{schema:string;field:string;value:string;onChange(value:string):void}) {
  const rule=propertySchema(schema,field), key=`${schema}.${field}`;
  if(Object.hasOwn(FORM_VOCABULARIES,key))return <ContractVocabularySelect schemaField={key as FormVocabularyKey} label={fieldLabel(field)} value={value} onChange={onChange}/>;
  if(rule.format==='date-time')return <TenantLocalDateTimeField label={fieldLabel(field)} value={value} onChange={onChange}/>;
  if(field==='retention_seconds')return <RetentionDurationField value={value} onChange={onChange}/>;
  if(rule.enum)return <label>{fieldLabel(field)}<select aria-label={fieldLabel(field)} value={value} onChange={e=>onChange(e.target.value)}><option value="">Selecciona una opción</option>{rule.enum.map(code=><option key={code} value={code}>{displayValue(code)}</option>)}</select></label>;
  return <label>{fieldLabel(field)}<input aria-label={fieldLabel(field)} type={rule.format==='date'?'date':rule.type==='number'||rule.type==='integer'?'number':'text'} min={rule.minimum} max={rule.maximum} step={rule.type==='integer'?1:rule.type==='number'?'any':undefined} minLength={rule.minLength} maxLength={rule.maxLength} placeholder={fieldPlaceholder(field)} value={value} onChange={e=>onChange(e.target.value)}/></label>;
}
export function RetentionDurationField({value,onChange}:{value:string;onChange(value:string):void}) {
  const [unit,setUnit]=useState(1),[amount,setAmount]=useState(value);
  const units=[[1,'Segundos'],[60,'Minutos'],[3600,'Horas'],[86400,'Días (24 horas)']] as const;
  function update(raw:string,factor:number){setAmount(raw);const seconds=Number(raw)*factor;onChange(raw===''?'':/^\d+$/.test(raw)&&Number.isSafeInteger(seconds)?String(seconds):raw+' inválido');}
  return <div><label>Duración de retención<input data-contract-input aria-label="Duración de retención" type="number" min="0" step="1" value={amount} onChange={e=>update(e.target.value,unit)}/></label><label>Unidad de duración<select value={unit} onChange={e=>{const factor=Number(e.target.value);setUnit(factor);update(amount,factor);}}>{units.map(([factor,label])=><option value={factor} key={factor}>{label}</option>)}</select></label><small className="form-guidance">Duración exacta, sin equivalencias de meses o años. No establece por sí sola una obligación legal.</small></div>;
}

export function FormErrorSummary({errors}:{errors:FormErrors}) {
 const ref=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{if(Object.keys(errors).length)ref.current?.focus();},[errors]);
 if(!Object.keys(errors).length)return null;
 return <div ref={ref} tabIndex={-1} className="form-error-summary" role="alert"><strong>Revisa los campos indicados</strong><ul>{Object.entries(errors).map(([field,message])=><li key={field}><button type="button" className="link-button" onClick={()=>{
   const root=ref.current?.closest('[role="dialog"]');
   const wrapper=[...(root?.querySelectorAll<HTMLElement>('[data-field]')??[])].find(el=>el.dataset.field===field.split('.')[0]);
   wrapper?.querySelector<HTMLElement>('input:not([type="search"]),select,textarea')?.focus();
 }}>{field==='_form'?'Relaciones del formulario':errorFieldLabel(field)}</button>: {message}</li>)}</ul></div>;
}
