import { NORMATIVE_LIBRARY, validateLibrarySchema, type MatrixType, type MatrixAxis, type MatrixCell, type MatrixPage, type MatrixRef } from '@tcdx-grc/contracts/normative-library';
import type { CoreActor } from '../core-grc/model.js';
import { requireAccess } from '../core-grc/security.js';
import { hashCanonical } from '../regulatory/hash.js';
import { FoundationError } from '../errors.js';
import { authorizeLibraryOperation, invalid, invariant, deny } from './authorization.js';

export type MatrixQuery = { type: MatrixType; filters: Readonly<Record<string,string>>; limits: { row: number; column: number; cell: number }; cursors: { row?: string; column?: string; cell?: string } };
export type CursorPort = { signReferenceCursor(payload: string): Promise<string>; verifyReferenceCursor(value: string): Promise<string> };
export type MatrixPopulation = { rows: readonly MatrixAxis[]; columns: readonly MatrixAxis[]; cells: readonly MatrixCell[]; readAt: string };
export type MatrixAuthorization = { axis(ref: MatrixRef): Promise<boolean>; relation(cell: MatrixCell): Promise<boolean>; filter(field: string, id: string): Promise<void> };
function descriptor(type: string) { const d=NORMATIVE_LIBRARY.matrices.types.find(x=>x.matrix_type===type);if(!d)invalid('matrix_type');return d; }
function instant(value: string, key: string) { if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,19)!==value.slice(0,19))invalid(key); }
export function parseMatrixQuery(type: string, raw: Record<string, unknown>, lifecycleValues: readonly string[]): MatrixQuery {
  const d=descriptor(type);const filters:Record<string,string>={};const limits={row:50,column:50,cell:500};const cursors:{row?:string;column?:string;cell?:string}={};
  for(const key of d.required_filters)if(typeof raw[key]!=='string'||!raw[key])invalid(key);
  for(const [key,v]of Object.entries(raw)) {
    if(!d.supported_filters.includes(key))invalid(key);
    if(key.endsWith('_limit')) { const axis=key.slice(0,-6) as 'row'|'column'|'cell';const value=typeof v==='number'?v:typeof v==='string'&&/^[1-9][0-9]*$/.test(v)?Number(v):NaN;const contract=NORMATIVE_LIBRARY.matrices.limits[key as keyof typeof NORMATIVE_LIBRARY.matrices.limits];if(!contract||!Number.isInteger(value)||value<1||value>contract.maximum)invalid(key);limits[axis]=value;continue; }
    if(typeof v!=='string'||!v.trim())invalid(key);
    if(key.endsWith('_cursor')){if(v.length>4096)invalid(key);cursors[key.slice(0,-7) as 'row'|'column'|'cell']=v;continue;}
    if(key==='as_of'||key==='period_start'||key==='period_end')instant(v,key);
    if(key.endsWith('_id')&&!/^[a-f0-9]{8}-[a-f0-9]{4}-7[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v))invalid(key);
    if(key==='query'&&([...v].length<2||[...v].length>160))invalid(key);
    if(key==='lifecycle_state'&&!lifecycleValues.includes(v))invalid(key);
    // Result-status values are the existing published vocabulary, not lifecycle.
    if(key==='result_status'&&!['valid','no_data','insufficient_data','insufficient_coverage','stale_source','conflicting_sources','dependency_pending','invalid_input','source_error','calculation_error','not_applicable','superseded'].includes(v))invalid(key);
    filters[key]=v;
  }
  if(Boolean(filters.period_start)!==Boolean(filters.period_end)||(filters.period_start&&Date.parse(filters.period_start)>=Date.parse(filters.period_end!)))invalid('period_end');
  return {type:type as MatrixType,filters,limits,cursors};
}
export function authorizeMatrix(actor: CoreActor, type: MatrixType): void {
  authorizeLibraryOperation(actor,'matrixRead');
  for(const permission of descriptor(type).required_source_permissions) {
    const capability=(NORMATIVE_LIBRARY.sourceCapabilities as Record<string,string>)[permission];
    if(!capability)deny();
    requireAccess(actor,permission,capability,['tenant','organizational_unit','process','service','assigned_object','owned_object']);
  }
}
export function matrixRefKey(ref: MatrixRef): string { const e=Object.entries(ref);if(e.length!==1)invariant('Invalid typed matrix reference');return e[0]![0]+':'+e[0]![1]; }
function axisKey(axis:MatrixAxis){return (axis.code??'')+'\u0000'+matrixRefKey(axis.ref);}
function cellKey(cell:MatrixCell){return matrixRefKey(cell.row_ref)+'\u0000'+matrixRefKey(cell.column_ref)+'\u0000'+hashCanonical(cell.relation_ref);}
function sorted<T>(values: readonly T[],key:(x:T)=>string):T[]{return [...values].sort((a,b)=>key(a)<key(b)?-1:key(a)>key(b)?1:0);}
function conflict():never {throw new FoundationError('TCDX.CONFLICT.CONCURRENCY','Matrix cursor context changed',409);}
type Position={binding:string;axis:string;after:string;window:string|null;row_after:string;column_after:string};
/** One page of an already coherent source snapshot; filter authorization BEFORE hashing or paging. */
export async function projectMatrixPage(actor:CoreActor, query:MatrixQuery, population:MatrixPopulation, authority:MatrixAuthorization, signer:CursorPort):Promise<MatrixPage>{
  authorizeMatrix(actor,query.type);
  for(const [field,id]of Object.entries(query.filters))if(field.endsWith('_id'))await authority.filter(field,id);
  const rows:MatrixAxis[]=[],columns:MatrixAxis[]=[];
  for(const a of population.rows)if(await authority.axis(a.ref))rows.push(a);
  for(const a of population.columns)if(await authority.axis(a.ref))columns.push(a);
  const rowIds=new Set(rows.map(r=>matrixRefKey(r.ref))),columnIds=new Set(columns.map(r=>matrixRefKey(r.ref)));
  const cells:MatrixCell[]=[];
  for(const c of population.cells)if(rowIds.has(matrixRefKey(c.row_ref))&&columnIds.has(matrixRefKey(c.column_ref))&&await authority.relation(c))cells.push(c);
  const rs=sorted(rows,axisKey),cs=sorted(columns,axisKey),es=sorted(cells,cellKey);
  if(new Set(rs.map(a=>matrixRefKey(a.ref))).size!==rs.length||new Set(cs.map(a=>matrixRefKey(a.ref))).size!==cs.length||new Set(es.map(cellKey)).size!==es.length)invariant('Duplicate matrix projection identity');
  const fingerprint=hashCanonical({rows:rs,columns:cs,cells:es});
  const binding=hashCanonical({actor:actor.userIdentityId,tenant:actor.tenantId,membership:actor.membershipId,permissions:[...actor.permissionScopes].map(([p,s])=>[p,[...s].sort()]).sort(),capabilities:[...actor.capabilityGroups].sort(),type:query.type,filters:query.filters,limits:query.limits,fingerprint});
  async function decode(token:string|undefined,axis:string):Promise<Position|null>{if(!token)return null;try{const p=JSON.parse(await signer.verifyReferenceCursor(token)) as Position;if(p.binding!==binding||p.axis!==axis||typeof p.after!=='string'||typeof p.row_after!=='string'||typeof p.column_after!=='string')conflict();return p;}catch(e){if(e instanceof FoundationError)throw e;invalid(axis+'_cursor');}}
  const rp=await decode(query.cursors.row,'row'),cp=await decode(query.cursors.column,'column'),ep=await decode(query.cursors.cell,'cell');
  const ra=rp?.after??'',ca=cp?.after??'';
  if(ep&&(ep.row_after!==ra||ep.column_after!==ca))conflict();
  const rw=rs.filter(r=>axisKey(r)>ra).slice(0,query.limits.row),cw=cs.filter(c=>axisKey(c)>ca).slice(0,query.limits.column);
  const window=hashCanonical({rows:rw,columns:cw});if(ep&&ep.window!==window)conflict();
  const ri=new Set(rw.map(r=>matrixRefKey(r.ref))),ci=new Set(cw.map(c=>matrixRefKey(c.ref)));
  const ew=es.filter(c=>ri.has(matrixRefKey(c.row_ref))&&ci.has(matrixRefKey(c.column_ref))&&cellKey(c)>(ep?.after??''));
  const pageCells=ew.slice(0,query.limits.cell);
  async function next(axis:string,after:string,win:string|null){return signer.signReferenceCursor(JSON.stringify({binding,axis,after,window:win,row_after:ra,column_after:ca} satisfies Position));}
  const moreCells=ew.length>pageCells.length;
  const result:MatrixPage={matrix_type:query.type,as_of:query.filters.as_of!,rows:rw,columns:cw,cells:pageCells,
    // Axis advancement is withheld until the current cell window is exhausted.
    next_row_cursor:!moreCells&&rw.length&&rs.some(r=>axisKey(r)>axisKey(rw.at(-1)!))?await next('row',axisKey(rw.at(-1)!),null):null,
    next_column_cursor:!moreCells&&cw.length&&cs.some(c=>axisKey(c)>axisKey(cw.at(-1)!))?await next('column',axisKey(cw.at(-1)!),null):null,
    next_cell_cursor:moreCells?await next('cell',cellKey(pageCells.at(-1)!),window):null,authorization_notice:'Sólo información autorizada; no se exponen conteos de objetos fuera de alcance.',snapshot_fingerprint:fingerprint,read_at:population.readAt,temporal_semantics:descriptor(query.type).temporal_semantics as MatrixPage['temporal_semantics']};
  if(!validateLibrarySchema('MatrixReadResult',result).valid)invariant('Invalid canonical matrix projection');
  return result;
}
