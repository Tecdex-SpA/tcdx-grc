import { sql, type Kysely, type Transaction } from 'kysely';
import { NORMATIVE_LIBRARY, validateLibrarySchema } from '@tcdx-grc/contracts/normative-library';
import type { FoundationDatabase } from '../database.js';
import type { VerifiedIdentity } from '../security/authentication.js';
import { resolveTenantActor } from '../core-grc/security.js';
import { resolvePlatformActor, type PlatformActor } from '../security/platform-authority.js';
import type { CoreActor } from '../core-grc/model.js';
import { claimIdempotency, completeIdempotency, persistAuditEvent, persistOutboxEvent } from '../persistence/foundation-records.js';
import { newUuidV7 } from '../uuid.js';
import { hashCanonical } from '../regulatory/hash.js';
import { FoundationError } from '../errors.js';
import { assertIfMatch } from './knowledge.js';
import { assertRepresentableLifecycleCommand, selectLibraryTransition, matchesLibraryRegistry, type RuntimeLibraryEdge } from './lifecycle.js';
import { authorizeLibraryOperation, invalid, invariant, type Ownership } from './authorization.js';

type Actor = CoreActor | PlatformActor;
type Tx = Transaction<FoundationDatabase>;
type LockedMutation = { ownership: Ownership; aggregateId: string; aggregateType: 'KnowledgeSource'|'KnowledgeItem'|'KnowledgeVersion'|'ConfigurationOverride'; etag?: string; lifecycleState?: string; before?: Record<string,unknown> };
/** Implementations must bind canonical repository, object rights and lifecycle guards; no public generic command route. */
export type LibraryMutationPlan = {
  lockAndValidate(tx:Tx,actor:Actor,body:Record<string,unknown>):Promise<LockedMutation>;
  authorizeReplay(tx:Tx,actor:Actor,persistedResponse:Record<string,unknown>):Promise<void>;
  apply(tx:Tx,actor:Actor,locked:LockedMutation,body:Record<string,unknown>,auditId:string):Promise<{ response:Record<string,unknown>; after:Record<string,unknown> }>;
};
export async function executeLibraryMutation(database:Kysely<FoundationDatabase>, input:{ identity:VerifiedIdentity; tenantId?:string; operationId:string; targetId?:string; correlationId:string; idempotencyKey:string; ifMatch?:string; body:unknown }, plan:LibraryMutationPlan) {
  const op=[...NORMATIVE_LIBRARY.registry.new_operations,...NORMATIVE_LIBRARY.existingOperations].find(o=>o.operation_id===input.operationId);
  if(!op||op.method==='get'||!op.request_schema||!op.audit_event||!op.domain_event)invalid('operation_id');
  if(input.identity.principalClass!=='HUMAN_INTERACTIVE')throw new FoundationError('TCDX.AUTHORIZATION.DENIED','Access denied',403);
  if(op.context==='PLATFORM'&&input.tenantId!==undefined)invalid('X-TCDX-Tenant-Id');
  if(!input.idempotencyKey.trim()||input.idempotencyKey.length>255)invalid('Idempotency-Key');
  if(!validateLibrarySchema(op.request_schema,input.body).valid)invalid();
  assertRepresentableLifecycleCommand(input.operationId);
  const platform=op.context==='PLATFORM';
  const body=input.body as Record<string,unknown>;
  const requestHash=hashCanonical({body,target_id:input.targetId??null,if_match:input.ifMatch??null});
  return database.transaction().execute(async tx=>{
    async function resolve():Promise<Actor>{return platform?resolvePlatformActor(tx,input.identity):resolveTenantActor(tx,input.identity,input.tenantId);}
    let actor=await resolve();authorizeLibraryOperation(actor,input.operationId);
    const authority:Ownership=op.context==='PLATFORM'?{ownership_class:'PLATFORM_CONTROL',tenant_id:null}:{ownership_class:'TENANT_OWNED',tenant_id:(actor as CoreActor).tenantId};
    const common={ownershipClass:authority.ownership_class,tenantId:authority.tenant_id,actor:{userIdentityId:input.identity.principalId},correlationId:input.correlationId};
    const claim=await claimIdempotency(tx,{...common,idempotencyRecordId:newUuidV7(),operationCode:input.operationId,key:input.idempotencyKey,requestHash});
    if(claim.state==='in_progress')throw new FoundationError('TCDX.CONFLICT.IDEMPOTENCY_IN_PROGRESS','Operation in progress',409,true);
    if(claim.state==='replay'){
      let response:Record<string,unknown>;
      try{response=JSON.parse(claim.resultRef??'') as Record<string,unknown>;}catch{throw new FoundationError('TCDX.INTERNAL.FAILURE','Invalid stored idempotent result',500);}
      if(hashCanonical(response)!==claim.responseHash||!op.response_schema||!validateLibrarySchema(op.response_schema,response).valid)throw new FoundationError('TCDX.INTERNAL.FAILURE','Invalid stored idempotent result',500);
      actor=await resolve();authorizeLibraryOperation(actor,input.operationId);await plan.authorizeReplay(tx,actor,response);
      return {response,replay:true}; // No ETag on replay; no audit/outbox or reconstructed response.
    }
    const locked=await plan.lockAndValidate(tx,actor,body);
    actor=await resolve();authorizeLibraryOperation(actor,input.operationId,locked.ownership);
    if(locked.ownership.ownership_class!==authority.ownership_class||locked.ownership.tenant_id!==authority.tenant_id)invariant('Mutation ownership mismatch');
    const transition=NORMATIVE_LIBRARY.lifecycle.bindings.some(e=>e.operation_id===input.operationId);
    if(transition){
      if(!locked.etag)invariant('Missing locked aggregate ETag');assertIfMatch(input.ifMatch,locked.etag);
      const binding=selectLibraryTransition(input.operationId,locked.lifecycleState??'',body);
      const registry=await sql<RuntimeLibraryEdge>`
        WITH current AS (SELECT DISTINCT ON(entity_type,from_state,command_code) * FROM ops_audit.lifecycle_transition_definitions WHERE lifecycle_state='published' ORDER BY entity_type,from_state,command_code,version_number DESC)
        SELECT e.to_state,e.audit_event_code,e.precondition_policy_ref,e.sod_policy_ref,e.system_actor_allowed,s.scope_kind,e.idempotency_semantics,e.concurrency_semantics,e.notification_policy_ref,e.recalculation_policy_ref,ARRAY(SELECT se.event_code FROM ops_audit.lifecycle_transition_side_effects se WHERE se.lifecycle_transition_definition_id=e.lifecycle_transition_definition_id ORDER BY se.ordinal) AS side_effect_event_codes,NOT EXISTS(SELECT 1 FROM ops_audit.lifecycle_transition_side_effects se WHERE se.lifecycle_transition_definition_id=e.lifecycle_transition_definition_id AND NOT se.is_required) AS all_effects_required
        FROM current e JOIN iam.permissions p ON p.permission_id=e.permission_id AND p.lifecycle_state='published'
        JOIN ops_audit.lifecycle_transition_scopes s ON s.lifecycle_transition_definition_id=e.lifecycle_transition_definition_id
        WHERE e.entity_type=${binding.entity_type} AND e.from_state=${binding.from_state} AND e.command_code=${binding.command_code} AND p.permission_code=${binding.permission_code}
      `.execute(tx);
      const eligible=matchesLibraryRegistry(binding,registry.rows)&&registry.rows.some(e=>'identity' in actor?e.scope_kind==='platform':actor.permissionScopes.get(op.permission)?.has(e.scope_kind as 'tenant'));
      if(!eligible)throw new FoundationError('TCDX.LIFECYCLE.TRANSITION_DENIED','Canonical lifecycle registry not adopted',409);
    }
    const auditId=newUuidV7();const change=await plan.apply(tx,actor,locked,body,auditId);
    if(!validateLibrarySchema('MaterialChangePayload',change.after).valid||!op.response_schema||!validateLibrarySchema(op.response_schema,change.response).valid)invariant('Invalid material mutation result');
    await persistAuditEvent(tx,{...common,auditEventId:auditId,eventCode:op.audit_event,aggregateType:locked.aggregateType,aggregateId:locked.aggregateId,commandCode:input.operationId,outcome:'succeeded',classification:'confidential',...(locked.before?{before:locked.before}:{}),after:change.after});
    await persistOutboxEvent(tx,{...common,outboxEventId:newUuidV7(),eventId:newUuidV7(),eventType:op.domain_event,aggregateType:locked.aggregateType,aggregateId:locked.aggregateId,classification:'confidential',payload:change.after,causationId:auditId});
    await completeIdempotency(tx,{idempotencyRecordId:claim.idempotencyRecordId,requestHash,resultStatusCode:'completed',resultRef:JSON.stringify(change.response),responseHash:hashCanonical(change.response)});
    return {response:change.response,replay:false};
  });
}
