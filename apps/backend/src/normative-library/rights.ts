import {createHash} from 'node:crypto';
import type {Client} from 'minio';
import rightsData from './rights-contract.generated.json' with {type:'json'};
import {hashCanonical} from '../regulatory/hash.js';
import {FoundationError} from '../errors.js';
export const SOURCE_RIGHTS_CONTRACT=rightsData.contract;
export const INTERNAL_SOURCE_POLICY=rightsData.internalPolicy;
export type UseAct='consultation'|'extraction'|'storage'|'presentation'|'export'|'import'|'publication';
export type UseEnvironment='development'|'test'|'qa'|'production';
export type RightsRecord={knowledge_source_usage_right_id:string;knowledge_source_id:string;ownership_class:string;tenant_id:string|null;audience_tenant_id:string|null;content_hash:string;edition_ref:string;regulatory_pack_version_id:string|null;use_act:string;use_environment:string;content_kind:string;effective_from:string;effective_to:string;revoked_at:string|null;evidence_ref:string;evidence_hash:string;recorded_audit_event_id:string};
export type RightsRequest={sourceId:string;ownershipClass:string;sourceTenantId:string|null;audienceTenantId:string|null;contentHash:string;packVersionId:string|null;act:UseAct;environment:UseEnvironment;now:string;preliminary:boolean;edition?:string};
export type RightsEvidence={verify(record:RightsRecord):Promise<boolean>};
/** Server-resolved internal normative context; this removes accreditation, never grants access. */
export function internalNormativeAccreditationNotRequired(environment:UseEnvironment,acts:readonly UseAct[],preliminaryPacks:readonly boolean[]):boolean{
 return INTERNAL_SOURCE_POLICY.internal_environments.includes(environment)&&acts.length>0&&
  acts.every(act=>INTERNAL_SOURCE_POLICY.knowledge_internal_acts.includes(act))&&
  preliminaryPacks.length>0&&preliminaryPacks.every(preliminary=>preliminary===true);
}
export function rightsInstant(value:string):string{
 const parsed=new Date(value);if(!Number.isFinite(parsed.getTime()))throw Error('Invalid rights instant');
 const fraction=value.match(/\.(\d+)(?:Z|[+-]\d\d(?::?\d\d)?)$/)?.[1]??'';
 if(fraction.length>6)throw Error('Rights instant exceeds PostgreSQL precision');
 return parsed.toISOString().replace(/\.\d{3}Z$/,'.'+fraction.padEnd(6,'0')+'Z');
}
export function rightsBindingHash(record:RightsRecord):string{
 const keys=[...SOURCE_RIGHTS_CONTRACT.exact_scope,'knowledge_source_usage_right_id','effective_from','effective_to'];
 return hashCanonical(Object.fromEntries(keys.map(k=>[k,k==='effective_from'||k==='effective_to'?rightsInstant(record[k]):(record as unknown as Record<string,unknown>)[k]])));
}
/** A constraint on existing object/RBAC/pack authority, never a grant or a legal-right inference. */
export async function permitsSourceUse(request:RightsRequest,records:readonly RightsRecord[],evidence:RightsEvidence):Promise<boolean>{
 if(!SOURCE_RIGHTS_CONTRACT.use_acts.includes(request.act)||!SOURCE_RIGHTS_CONTRACT.environments.includes(request.environment)||!Number.isFinite(Date.parse(request.now))||!/^[a-f0-9]{64}$/.test(request.contentHash))return false;
 if(!['TENANT_OWNED','GLOBAL_REFERENCE','PLATFORM_CONTROL'].includes(request.ownershipClass))return false;
 if((request.ownershipClass==='TENANT_OWNED')!==(request.sourceTenantId!==null)||request.sourceTenantId!==null&&request.sourceTenantId!==request.audienceTenantId)return false;
 if(request.preliminary&&request.environment==='production')return false;
 // PostgreSQL timestamps retain microseconds. Date.parse alone can authorize
 // before effective_from by rounding away that precision. Compare the same
 // canonical instants used by the attestation binding, including revocation.
 let now:string;try{now=rightsInstant(request.now);}catch{return false;}
 const matches=records.filter(r=>{
  let effective:boolean;
  try{effective=rightsInstant(r.effective_from)<=now&&now<rightsInstant(r.effective_to)&&(r.revoked_at===null||now<rightsInstant(r.revoked_at));}catch{return false;}
  return effective&&r.knowledge_source_id===request.sourceId&&r.ownership_class===request.ownershipClass&&r.tenant_id===request.sourceTenantId&&r.audience_tenant_id===request.audienceTenantId&&r.content_hash===request.contentHash&&r.regulatory_pack_version_id===request.packVersionId&&r.use_act===request.act&&r.use_environment===request.environment&&SOURCE_RIGHTS_CONTRACT.content_kinds.includes(r.content_kind)&&r.content_kind!=='metadata'&&r.edition_ref.trim()&&(request.edition===undefined||r.edition_ref===request.edition);
 });
 if(matches.length!==1)return false;
 try{return await evidence.verify(matches[0]!);}catch{return false;}
}
/** Existing private object store, exact immutable evidence version, bounded bytes; no URL resolver or upload path. */
export class MinioRightsEvidence implements RightsEvidence{
 constructor(private readonly client:Client,private readonly bucket:string){}
 async verify(record:RightsRecord):Promise<boolean>{
  const ref=JSON.parse(record.evidence_ref) as {key:string;version:string};
  if(Object.keys(ref).sort().join(',')!=='key,version'||typeof ref.version!=='string'||!ref.version||ref.version==='null'||typeof ref.key!=='string'||!new RegExp('^knowledge-rights/'+record.knowledge_source_usage_right_id+'/[a-f0-9-]{36}\\.json$').test(ref.key))return false;
  const encryption=await this.client.getBucketEncryption(this.bucket);
  if(encryption?.ServerSideEncryptionConfiguration?.Rule?.ApplyServerSideEncryptionByDefault?.SSEAlgorithm!=='AES256'||(await this.client.getBucketVersioning(this.bucket)).Status!=='Enabled')return false;
  const stream=await this.client.getObject(this.bucket,ref.key,{versionId:ref.version});const parts:Buffer[]=[];let size=0;
  for await(const raw of stream){const part=Buffer.from(raw as Uint8Array);size+=part.length;if(size>65536){stream.destroy();return false;}parts.push(part);}
  const bytes=Buffer.concat(parts);if(createHash('sha256').update(bytes).digest('hex')!==record.evidence_hash)return false;
  const proof=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)) as Record<string,unknown>;
  if(Object.keys(proof).sort().join(',')!==[...SOURCE_RIGHTS_CONTRACT.proof_format.required].sort().join(','))return false;
  return proof.binding_hash===rightsBindingHash(record)&&['authority','basis','evidence_locator'].every(k=>typeof proof[k]==='string'&&String(proof[k]).trim().length>0)&&typeof proof.evidence_sha256==='string'&&/^[a-f0-9]{64}$/.test(proof.evidence_sha256);
 }
}
export function requireSourceUse(allowed:boolean):void{if(!allowed)throw new FoundationError('TCDX.AUTHORIZATION.DENIED','Source use not authorized',403);}
