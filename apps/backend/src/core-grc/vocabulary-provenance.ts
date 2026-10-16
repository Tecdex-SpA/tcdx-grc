import {AsyncLocalStorage} from "node:async_hooks";
import {sql,type Kysely,type Transaction} from "kysely";
import {validate,version as uuidVersion} from "uuid";
import {VOCABULARY_FAMILY_CODES,VOCABULARY_PROVENANCE_BINDINGS,VOCABULARY_MANIFEST_SHA256,PUBLISHED_VOCABULARY_VERSION,REQUEST_VOCABULARIES} from "@tcdx-grc/contracts";
import {FoundationError} from "../errors.js";
import type {FoundationDatabase} from "../database.js";
type Row=Record<string,unknown>;
type Binding={family:string;table:string;column:string;entity:string;id:string;version:string|null;parentLinks:ReadonlyArray<{column:string;parent:string;parentId:string}>};
type Revision={kind:"row_version"|"version_number"|"root_row_version"|"root_version_number";value:string};
export type VocabularyProvenance={profile_version:1;contract_version:typeof PUBLISHED_VOCABULARY_VERSION;manifest_sha256:string;root:{entity_type:string;entity_id:string;entity_version:Revision};occurrences:Array<{family_id:string;code:string;input_path:string;entity_type:string;entity_id:string;entity_version:Revision}>};
const bindings=VOCABULARY_PROVENANCE_BINDINGS as Readonly<Record<string,Readonly<Record<string,Binding>>>>;
const captured=new AsyncLocalStorage<Array<{table:string;row:Row}>>();
const id=(x:unknown):x is string=>typeof x==="string"&&validate(x)&&uuidVersion(x)===7;
function unavailable():never {throw new FoundationError("TCDX.DEPENDENCY.UNAVAILABLE","Contract provenance unavailable",503,true);}
/** Per-command observation of authoritative RETURNING rows, not a second data model. */
export async function captureVocabularyWrites<T>(operation:()=>Promise<T>):Promise<{result:T;writes:Array<{table:string;row:Row}>}> {
 const writes:Array<{table:string;row:Row}>=[];return captured.run(writes,async()=>({result:await operation(),writes}));
}
export function recordVocabularyWrite(table:string,row:Row):void {const writes=captured.getStore();if(writes)writes.push({table,row});}
function revision(row:Row,key:string):Revision {
 const value=String(row[key]);if(!/^[1-9][0-9]*$/.test(value)||BigInt(value)>9223372036854775807n)unavailable();
 return {kind:key==="row_version"?"row_version":"version_number",value};
}
function parentRevision(binding:Binding,row:Row,root:{table:string;idColumn:string;row:Row}):Revision {
 const link=binding.parentLinks.find(l=>l.parent===root.table&&l.parentId===root.idColumn);
 if(!link||row[link.column]!==root.row[root.idColumn])unavailable();
 const key=Object.hasOwn(root.row,"row_version")?"row_version":Object.hasOwn(root.row,"version_number")?"version_number":unavailable();
 const actual=revision(root.row,key);return {kind:actual.kind==="row_version"?"root_row_version":"root_version_number",value:actual.value};
}
export function buildVocabularyProvenance(operationId:string,body:Row,writes:Array<{table:string;row:Row}>,root:{table:string;entity:string;idColumn:string;row:Row}):VocabularyProvenance|undefined {
 const rules=bindings[operationId];if(!rules)return;
 const occurrences:VocabularyProvenance["occurrences"]=[];
 for(const [path,b]of Object.entries(rules)) {
  const [array,field]=path.split("[].");
  const expected=field?(Array.isArray(body[array!])?(body[array!] as Row[]).map((r,i)=>({path:`${array}[${i}].${field}`,code:r[field]})):[]):Object.hasOwn(body,path)?[{path,code:body[path]}]:operationId==="uploadFinalize"?writes.filter(w=>w.table===b.table).map(w=>({path,code:w.row[b.column]})):[];
  const rows=writes.filter(w=>w.table===b.table).map(w=>w.row);
  if(b.table===root.table&&!rows.length)rows.push(root.row);
  for(let i=0;i<expected.length;i++) {
   const e=expected[i]!;const row=field?rows[i]:rows.find(r=>r[b.column]===e.code);
   if(!row||row[b.column]!==e.code||!id(row[b.id]))unavailable();
   const codes=(REQUEST_VOCABULARIES as Readonly<Record<string,Readonly<Record<string,readonly string[]>>>>)[operationId]?.[path]??(operationId==="uploadFinalize"?(VOCABULARY_FAMILY_CODES as Record<string,readonly string[]>)[b.family]:undefined);
   if(typeof e.code!=="string"||!codes?.includes(e.code))unavailable();
   occurrences.push({family_id:b.family,code:e.code,input_path:e.path,entity_type:b.entity,entity_id:row[b.id] as string,entity_version:b.version?revision(row,b.version):parentRevision(b,row,root)});
  }
 }
 if(!occurrences.length)return;
 const rootId=root.row[root.idColumn];if(!id(rootId))unavailable();
 const rootKey=Object.hasOwn(root.row,"row_version")?"row_version":Object.hasOwn(root.row,"version_number")?"version_number":unavailable();
 return {profile_version:1,contract_version:PUBLISHED_VOCABULARY_VERSION,manifest_sha256:VOCABULARY_MANIFEST_SHA256,root:{entity_type:root.entity,entity_id:rootId,entity_version:revision(root.row,rootKey)},occurrences};
}
function closed(value:unknown,keys:string[]):value is Row {return !!value&&typeof value==="object"&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&Object.keys(value).every(k=>keys.includes(k));}
function validRevision(value:unknown,allowRoot=false):boolean {
 if(!closed(value,["kind","value"]))return false;
 return (allowRoot?["row_version","version_number","root_row_version","root_version_number"]:["row_version","version_number"]).includes(String(value.kind))&&typeof value.value==="string"&&/^[1-9][0-9]*$/.test(value.value)&&value.value.length<=19&&BigInt(value.value)<=9223372036854775807n;
}
export function validVocabularyProvenance(value:unknown):value is VocabularyProvenance {
 if(!closed(value,["profile_version","contract_version","manifest_sha256","root","occurrences"])||value.profile_version!==1||value.contract_version!==PUBLISHED_VOCABULARY_VERSION||value.manifest_sha256!==VOCABULARY_MANIFEST_SHA256)return false;
 const root=value.root;if(!closed(root,["entity_type","entity_id","entity_version"])||typeof root.entity_type!=="string"||root.entity_type.length<1||root.entity_type.length>128||!id(root.entity_id)||!validRevision(root.entity_version))return false;
 if(!Array.isArray(value.occurrences)||!value.occurrences.length)return false;
 return value.occurrences.every(o=> {
 if(!closed(o,["family_id","code","input_path","entity_type","entity_id","entity_version"])||typeof o.family_id!=="string"||typeof o.code!=="string"||typeof o.input_path!=="string"||!id(o.entity_id)||!validRevision(o.entity_version,true)||typeof o.entity_type!=="string")return false;
 const codes=(VOCABULARY_FAMILY_CODES as Record<string,readonly string[]>)[o.family_id];
 const rev=o.entity_version as Row,rootRev=root.entity_version as Row;
 if(String(rev.kind).startsWith('root_')&&(rev.value!==rootRev.value||String(rev.kind)!=='root_'+rootRev.kind))return false;
 return !!codes?.includes(o.code)&&/^[a-z_]+(\[[0-9]+\]\.[a-z_]+)?$/.test(o.input_path)&&o.entity_type.length>0&&o.entity_type.length<=128;
 });
}
export async function readVocabularyProvenance(ex:Kysely<FoundationDatabase>|Transaction<FoundationDatabase>,tenantId:string,entity:string,entityId:string):Promise<VocabularyProvenance[]> {
 const result=await sql<{profile:VocabularyProvenance}>`SELECT after_payload->'contract_provenance' AS profile FROM ops_audit.audit_events WHERE tenant_id=${tenantId}::uuid AND ownership_class='TENANT_OWNED' AND aggregate_type=${entity} AND aggregate_id=${entityId}::uuid AND outcome='success' AND after_payload ? 'contract_provenance' ORDER BY occurred_at,audit_event_id`.execute(ex);
 return result.rows.map(row=> {const profile=row.profile;if(!validVocabularyProvenance(profile)||profile.root.entity_type!==entity||profile.root.entity_id!==entityId)unavailable();return profile;});
}
