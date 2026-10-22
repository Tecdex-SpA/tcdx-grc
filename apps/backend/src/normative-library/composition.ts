import type {MinioFileStoragePort} from '../ports/minio-file-storage.js';
import type {Kysely} from 'kysely';
import type {FoundationDatabase} from '../database.js';
import type {VerifiedIdentity} from '../security/authentication.js';
import {NORMATIVE_LIBRARY,type MatrixType} from '@tcdx-grc/contracts/normative-library';
import {CanonicalKnowledgePolicy} from './knowledge-policy.js';
import {CanonicalControlAdjustmentPolicy} from '../configuration/control-adjustment-policy.js';
import type {KnowledgeCustody} from './custody.js';
import type {RightsEvidence,UseEnvironment} from './rights.js';
import type {CursorPort} from './matrices.js';
import {createKnowledgeCatalogEntry,createKnowledgeVersion,mutateKnowledgeVersion} from './knowledge-service.js';
import {readKnowledge} from './knowledge-read.js';
import {mutateControlAdjustment} from '../configuration/control-adjustment-service.js';
import {readControlDefinitionReferences} from '../configuration/control-definition-references.js';
import {readControlAdjustment} from '../configuration/control-adjustment-read.js';
import {readMatrix} from './matrix-service.js';
import {readEffectiveControlConfiguration} from '../configuration/effective-control-read.js';
import {invalid} from './authorization.js';
import {composeApplicabilityContextHooks,type ApplicabilityContextHooks} from './applicability-persistence.js';
export type LibraryInput={identity:VerifiedIdentity;tenantId?:string;id?:string;matrixType?:string;body:unknown;query:Record<string,unknown>;correlationId:string;idempotencyKey:string;ifMatch?:string};
export type LibraryOutput={response:unknown;etag?:string|undefined;replay?:boolean};
export type LibraryHandler=(input:LibraryInput)=>Promise<LibraryOutput>;
export type LibraryComposition={handlers:ReadonlyMap<string,LibraryHandler>;applicabilityHooks:ApplicabilityContextHooks;effectiveConfiguration:typeof readEffectiveControlConfiguration};
export function composeNormativeLibrary(deps:{database:Kysely<FoundationDatabase>;custody:KnowledgeCustody;rightsEvidence:RightsEvidence;environment:UseEnvironment;cursor:CursorPort}):LibraryComposition{
 const knowledge=new CanonicalKnowledgePolicy(deps.environment,deps.rightsEvidence),config=new CanonicalControlAdjustmentPolicy();
 const handlers=new Map<string,LibraryHandler>();
 for(const op of NORMATIVE_LIBRARY.registry.new_operations){
  const operation=op.operation_id;
  handlers.set(operation,async input=>{
   const base={identity:input.identity,...(input.tenantId?{tenantId:input.tenantId}:{}),correlationId:input.correlationId};
   if(operation==='controlConfigurationDefinitionReferenceList'){if(!input.tenantId||!input.id)invalid();return {response:await readControlDefinitionReferences(deps.database,{identity:input.identity,tenantId:input.tenantId,id:input.id,query:input.query,body:input.body})};}
   if(operation==='matrixRead'){if(!input.tenantId||!input.matrixType)invalid();return {response:await readMatrix(deps.database,{identity:input.identity,tenantId:input.tenantId,type:input.matrixType as MatrixType,query:input.query},deps.cursor)};}
   if(operation==='configurationOverrideGet'||operation==='controlConfigurationOverrideList'){
    if(!input.tenantId||!input.id)invalid();return readControlAdjustment(deps.database,deps.cursor,{...base,tenantId:input.tenantId,id:input.id,list:operation==='controlConfigurationOverrideList',query:input.query});
   }
   if(['configurationOverrideUpdate','configurationOverrideReview','configurationOverrideDecide'].includes(operation)){
    if(!input.tenantId||!input.id)invalid();return mutateControlAdjustment(deps.database,config,{...base,tenantId:input.tenantId,targetId:input.id,operationId:operation as 'configurationOverrideUpdate'|'configurationOverrideReview'|'configurationOverrideDecide',body:input.body,idempotencyKey:input.idempotencyKey,...(input.ifMatch?{ifMatch:input.ifMatch}:{})});
   }
   const kind=operation.includes('Source')?'source':operation.includes('Item')?'item':'version';
   if(op.method==='get')return readKnowledge(deps.database,deps.custody,knowledge,deps.cursor,{...base,kind,...(input.id?{id:input.id}:{}),query:input.query});
   if(operation.endsWith('SourceCreate')||operation.endsWith('ItemCreate'))return createKnowledgeCatalogEntry(deps.database,{...base,kind:kind as 'source'|'item',body:input.body,idempotencyKey:input.idempotencyKey});
   if(!input.id)invalid('id');
   if(operation.endsWith('VersionCreate'))return createKnowledgeVersion(deps.database,deps.custody,knowledge,{...base,itemId:input.id,body:input.body,idempotencyKey:input.idempotencyKey});
   return mutateKnowledgeVersion(deps.database,deps.custody,knowledge,{...base,versionId:input.id,operationId:operation as Parameters<typeof mutateKnowledgeVersion>[3]['operationId'],body:input.body,ifMatch:input.ifMatch??'',idempotencyKey:input.idempotencyKey});
  });
 }
 handlers.set('configurationOverrideCreate',async input=>{if(!input.tenantId)invalid();return mutateControlAdjustment(deps.database,config,{identity:input.identity,tenantId:input.tenantId,correlationId:input.correlationId,operationId:'configurationOverrideCreate',body:input.body,idempotencyKey:input.idempotencyKey});});
 return {handlers,applicabilityHooks:composeApplicabilityContextHooks((tx,actor,id)=>knowledge.assertRead(tx,actor,id)),effectiveConfiguration:readEffectiveControlConfiguration};
}

/** Canonical storage adapter composition, no new client, bucket, credentials or readiness/DDL side effects. */
export async function composeNormativeLibraryFromStorage(deps:{database:Kysely<FoundationDatabase>;fileStorage:MinioFileStoragePort;environment:UseEnvironment;cursor:CursorPort}):Promise<LibraryComposition>{
 const ports=await deps.fileStorage.createKnowledgePorts();
 return composeNormativeLibrary({database:deps.database,environment:deps.environment,cursor:deps.cursor,...ports});
}
