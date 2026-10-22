import React, { useEffect, useId, useState } from 'react';
import { NORMATIVE_LIBRARY, validateLibrarySchema, type MatrixPage, type MatrixType, type MatrixRef, type KnowledgeWrite } from '@tcdx-grc/contracts/normative-library';
import { ApiClient, ApiProblem } from './api-client.js';
import { statusLabel } from './i18n/status-labels.js';
const relationshipLabel=(value:string|null)=>value===null?'Consultar relación':({supports:'Apoya',satisfies:'Satisface',mitigates:'Mitiga',detects:'Detecta',evidences:'Aporta evidencia',equivalent:'Equivalente',partially_equivalent:'Parcialmente equivalente',overlaps:'Coincide parcialmente',supersedes:'Sustituye',no_match:'Sin correspondencia'} as Record<string,string>)[value]??value;

const titles:Record<MatrixType,string>={requirements_controls:'Requisitos × Controles',controls_evidence:'Controles × Evidencias',requirements_assessments:'Requisitos × Evaluaciones',frameworks_frameworks:'Normas × Normas',obligations_applicability:'Obligaciones × Aplicabilidad',issues_actions:'Hallazgos × Acciones'};
function refKey(ref:MatrixRef){return Object.entries(ref).map(([k,v])=>k+':'+v).join('|');}
export function validateMatrixPage(value:unknown):MatrixPage {
 if(!validateLibrarySchema('MatrixReadResult',value).valid)throw new Error('Respuesta de matriz inválida.');
 const page=value as MatrixPage,rows=new Set(page.rows.map(r=>refKey(r.ref))),cols=new Set(page.columns.map(c=>refKey(c.ref)));
 if(rows.size!==page.rows.length||cols.size!==page.columns.length||page.cells.some(c=>!rows.has(refKey(c.row_ref))||!cols.has(refKey(c.column_ref))))throw new Error('Referencias de matriz fuera de la ventana autorizada.');
 return page;
}
export async function readLibraryMatrix(api:ApiClient,type:MatrixType,filters:Record<string,string>,signal?:AbortSignal):Promise<MatrixPage>{
 const descriptor=NORMATIVE_LIBRARY.matrices.types.find(d=>d.matrix_type===type);
 if(!descriptor||Object.keys(filters).some(k=>!descriptor.supported_filters.includes(k)))throw new Error('Filtros de matriz no admitidos.');
 const query=new URLSearchParams(filters);
 const result=await api.request<unknown>('/api/v1/matrices/'+type+'?'+query.toString(),{cache:'no-store',...(signal?{signal}:{})});
 const page=validateMatrixPage(result);if(page.matrix_type!==type||page.as_of!==filters.as_of)throw new Error('Contexto de matriz no coincide.');return page;
}
/** Shared presentation for dashboard windows and full matrices. No compliance colours or local scores. */
export function MatrixTable({page,onContinue}:{page:MatrixPage;onContinue?:(axis:'row'|'column'|'cell',cursor:string)=>void}){
 const id=useId(),[detail,setDetail]=useState<number|null>(null);const checked=validateMatrixPage(page);
 const current=detail===null?null:checked.cells[detail];
 return <section className="data-card table-card matrix-card" aria-labelledby={id}>
  <header className="matrix-heading"><div><p className="eyebrow">Correspondencias</p><h2 id={id}>{titles[checked.matrix_type]}</h2><p>{checked.authorization_notice}</p></div></header>
  <p className="admin-secondary matrix-context">{checked.temporal_semantics==='current_state_with_as_of_population'?'Estados actuales a la lectura; población a la fecha seleccionada.':'Relaciones según su intervalo de vigencia.'}</p>
  {checked.rows.length===0||checked.columns.length===0?<p role="status">Sin relaciones autorizadas para esta selección.</p>:<div className="table-scroll" tabIndex={0} role="region" aria-label={titles[checked.matrix_type]}><table><caption className="sr-only">Relaciones canónicas autorizadas. Una relación no acredita cumplimiento.</caption><thead><tr><th scope="col">Registro</th>{checked.columns.map(c=><th scope="col" key={refKey(c.ref)}>{c.label}</th>)}</tr></thead><tbody>{checked.rows.map(r=><tr key={refKey(r.ref)}><th scope="row">{r.label}</th>{checked.columns.map(c=>{
   const indices=checked.cells.flatMap((cell,index)=>refKey(cell.row_ref)===refKey(r.ref)&&refKey(cell.column_ref)===refKey(c.ref)?[index]:[]);
   return <td key={refKey(c.ref)}>{indices.length?indices.map(index=><button className="link-button" key={index} onClick={()=>setDetail(index)} aria-expanded={detail===index} aria-controls={id+'-detail'}>{relationshipLabel(checked.cells[index]!.relationship_type)}{checked.cells[index]!.source_lifecycle_state?' · '+statusLabel(checked.cells[index]!.source_lifecycle_state):''}</button>):'—'}</td>;
  })}</tr>)}</tbody></table></div>}
  {current&&<section id={id+'-detail'} aria-label="Trazabilidad de la relación"><h3>Trazabilidad</h3><dl><dt>Procedencia</dt><dd>{current.provenance_ref??'No registrada'}</dd><dt>Fundamento</dt><dd>{current.rationale??'No registrado'}</dd><dt>Dirección</dt><dd>{current.direction??'No corresponde'}</dd><dt>Estado de origen</dt><dd>{current.source_lifecycle_state??'No registrado'}</dd></dl>{current.stored_result&&<p>Resultado almacenado: {String(current.stored_result.result_status)} · {String(current.stored_result.domain_conclusion??'Sin conclusión')}. Su interpretación requiere método, ámbito y vigencia válidos.</p>}<button className="link-button" onClick={()=>setDetail(null)}>Cerrar detalle</button></section>}
  {onContinue&&<nav aria-label="Paginación de matriz">{(['cell','row','column'] as const).map(axis=>{const cursor=checked[`next_${axis}_cursor`];return cursor?<button key={axis} disabled={axis!=='cell'&&!!checked.next_cell_cursor} onClick={()=>{setDetail(null);onContinue(axis,cursor);}}>{axis==='cell'?'Más relaciones':axis==='row'?'Más filas':'Más columnas'}</button>:null;})}</nav>}
 </section>;
}
/** Shared mini/full reader mounted by the canonical shell; authorization remains server-side. */
export function LibraryMatrixView({api,type,filters}:{api:ApiClient;type:MatrixType;filters:Record<string,string>}){
 const [cursors,setCursors]=useState<Record<string,string>>({});
 const [load,setLoad]=useState<{state:'loading'}|{state:'error';message:string}|{state:'ready';page:MatrixPage;context:string}>({state:'loading'});
 const base=JSON.stringify(filters),tenant=api.currentTenantId();const context=JSON.stringify([type,base,tenant]);
 useEffect(()=>{setCursors({});},[base,type,tenant]);
 useEffect(()=>{const controller=new AbortController();setLoad({state:'loading'});void readLibraryMatrix(api,type,{...filters,...cursors},controller.signal).then(page=>{if(!controller.signal.aborted)setLoad({state:'ready',page,context});}).catch(e=>{if(!controller.signal.aborted)setLoad({state:'error',message:e instanceof ApiProblem&&(e.status===403||e.status===404)?'Consulta no disponible con el acceso actual.':'No se pudo cargar la matriz. Vuelve a intentar la consulta.'});});return()=>controller.abort();},[api,type,base,JSON.stringify(cursors),tenant]);
 if(load.state==='loading'||(load.state==='ready'&&load.context!==context))return <p role="status">Cargando relaciones autorizadas…</p>;
 if(load.state==='error')return <p role="alert">{load.message}</p>;
 return <MatrixTable page={load.page} onContinue={(axis,cursor)=>setCursors(current=>axis==='cell'?{...current,cell_cursor:cursor}:Object.fromEntries([...Object.entries(current).filter(([key])=>key!=='cell_cursor'),[axis+'_cursor',cursor]]))}/>;
}
export function KnowledgeContentView({projection}:{projection:unknown}){
 if(!validateLibrarySchema('KnowledgeVersionProjection',projection).valid)return <p role="alert">No se pudo verificar el contenido recibido.</p>;
 const v=projection as {content_access:string;content_restriction:string|null;publication_authority:string;version_number:number|string;lifecycle_state:string;content:KnowledgeWrite['content']|null};
 return <section className="data-card" aria-label="Biblioteca normativa"><div><h2>{v.publication_authority==='tenant_context'?'Contexto empresarial':'Guía editorial Tecdex'}</h2><p>Versión {v.version_number} · {statusLabel(v.lifecycle_state)}</p><p>Este contenido conserva su autoridad editorial o contextual; no sustituye la fuente normativa oficial.</p></div>{v.content_access==='metadata_only'||!v.content?<p role="status">{v.content_restriction??'Sólo metadatos disponibles con el acceso actual.'}</p>:'comprender' in v.content?<>{(['comprender','implementar','demostrar'] as const).map(k=><section key={k}><h3>{k.toUpperCase()}</h3><p>{(v.content as Extract<KnowledgeWrite['content'],{comprender:unknown}>)[k].text}</p><ul>{(v.content as Extract<KnowledgeWrite['content'],{comprender:unknown}>)[k].citations.map((c,i)=><li key={i}>Referencia {c.link_ordinal+1}: {c.locator}</li>)}</ul></section>)}</>:<dl>{Object.entries(v.content).map(([k,text])=><React.Fragment key={k}><dt>{({descripcion:'Descripción',alcance:'Alcance',actividades:'Actividades',supuestos:'Supuestos',preguntas_pendientes:'Preguntas pendientes'} as Record<string,string>)[k]}</dt><dd>{String(text)}</dd></React.Fragment>)}</dl>}</section>;
}
