import {sql,type Transaction} from 'kysely';
import type {FoundationDatabase} from '../database.js';
import {FoundationError} from '../errors.js';
import {newUuidV7} from '../uuid.js';
import {claimIdempotency,completeIdempotency,persistAuditEvent,persistOutboxEvent} from '../persistence/foundation-records.js';
import {hashCanonical} from './hash.js';
import data from './runtime-bindings-contract.generated.json' with {type:'json'};
import * as validators from './runtime-bindings-validators.generated.js';
export const RUNTIME_BINDING_CONTRACT=data.contract;
export const RUNTIME_BINDING_API=data.api;
export type BindingTx=Transaction<FoundationDatabase>;
export function bindingFail(status:number,message='Runtime binding rejected'):never{
 const code=status===400?'TCDX.VALIDATION.FAILED':status===403?'TCDX.AUTHORIZATION.DENIED':status===404?'TCDX.RESOURCE.NOT_FOUND':status===409?'TCDX.CONFLICT.CONCURRENCY':status===422?'TCDX.INVARIANT.VIOLATION':'TCDX.DEPENDENCY.UNAVAILABLE';
 throw new FoundationError(code,message,status,status===503);
}
export function bindingId(value:unknown):string{
 if(typeof value!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-7[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value))bindingFail(400);
 return value;
}
export function bindingSchema<T>(name:string,value:unknown,status=400):T{
 const validate=(validators as unknown as Record<string,(v:unknown)=>boolean>)[name];
 if(!validate||!validate(value))bindingFail(status,'Invalid published runtime binding projection');
 return value as T;
}
export function bindingIfMatch(value:unknown,kind:'numeric'|'hash'):string{
 if(typeof value!=='string'||!(kind==='numeric'?/^"[1-9][0-9]*"$/:/^"[a-f0-9]{64}"$/).test(value))bindingFail(400,'If-Match required');
 return value;
}
export type BindingMutation={key:string;correlationId:string;ifMatch?:string};
export async function bindingClaim(tx:BindingTx,scope:{tenantId:string|null;actorId:string;operation:string;targetId:string|null;body:unknown;schema:string;ownershipClass?:'GLOBAL_REFERENCE'},input:BindingMutation){
 if(typeof input.key!=='string'||!input.key.trim()||input.key.length>255)bindingFail(400,'Idempotency-Key required');
 const requestHash=hashCanonical({target_id:scope.targetId,body:scope.body,if_match:input.ifMatch??null});
 const claim=await claimIdempotency(tx,{idempotencyRecordId:newUuidV7(),ownershipClass:scope.ownershipClass??(scope.tenantId?'TENANT_OWNED':'PLATFORM_CONTROL'),tenantId:scope.tenantId,actor:{userIdentityId:scope.actorId},operationCode:scope.operation,key:input.key,correlationId:input.correlationId,requestHash,returnInProgress:true});
 if(claim.state==='in_progress')bindingFail(409,'Command in progress');
 let replay:unknown;
 if(claim.state==='replay'){
  try{if(claim.resultStatusCode!=='completed'||!claim.resultRef)throw Error();replay=JSON.parse(claim.resultRef);if(hashCanonical(replay)!==claim.responseHash)throw Error();}catch{bindingFail(503,'Durable command result integrity failed');}
  bindingSchema(scope.schema,replay,503);
 }
 return {replay,async complete(result:unknown){
  bindingSchema(scope.schema,result,503);
  await completeIdempotency(tx,{idempotencyRecordId:claim.idempotencyRecordId,requestHash,resultStatusCode:'completed',resultRef:JSON.stringify(result),responseHash:hashCanonical(result)});
 }};
}
export async function bindingAudit(tx:BindingTx,context:{tenantId:string|null;actorId:string;correlationId:string;operation:string;aggregateType:string;aggregateId:string;event:string;after:Record<string,unknown>;before?:Record<string,unknown>;ownershipClass?:'GLOBAL_REFERENCE'},eventId=newUuidV7()):Promise<string>{
 await persistAuditEvent(tx,{auditEventId:eventId,ownershipClass:context.ownershipClass??(context.tenantId?'TENANT_OWNED':'PLATFORM_CONTROL'),tenantId:context.tenantId,actor:{userIdentityId:context.actorId},correlationId:context.correlationId,commandCode:context.operation,aggregateType:context.aggregateType,aggregateId:context.aggregateId,eventCode:context.event,outcome:'succeeded',classification:'protected_metadata',after:context.after,...(context.before?{before:context.before}:{})});
 return eventId;
}
export async function bindingOutbox(tx:BindingTx,context:{tenantId:string|null;actorId:string;correlationId:string;aggregateType:string;aggregateId:string;event:string;payload:Record<string,unknown>;ownershipClass?:'GLOBAL_REFERENCE'}):Promise<void>{
 await persistOutboxEvent(tx,{outboxEventId:newUuidV7(),eventId:newUuidV7(),ownershipClass:context.ownershipClass??(context.tenantId?'TENANT_OWNED':'PLATFORM_CONTROL'),tenantId:context.tenantId,actor:{userIdentityId:context.actorId},correlationId:context.correlationId,aggregateType:context.aggregateType,aggregateId:context.aggregateId,eventType:context.event,classification:'protected_metadata',payload:context.payload});
}
export const bindingNow=async(tx:BindingTx)=>(await sql<{now:string}>`SELECT statement_timestamp()::text AS now`.execute(tx)).rows[0]!.now;
