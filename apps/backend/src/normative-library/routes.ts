import type {FastifyInstance,FastifyRequest,FastifyReply} from 'fastify';
import {NORMATIVE_LIBRARY} from '@tcdx-grc/contracts/normative-library';
import type {IdentityVerifier} from '../security/authentication.js';
import {resolveAuthenticatedIdentity} from '../core-grc/security.js';
import {deny,invalid,concealed} from './authorization.js';
import type {LibraryComposition} from './composition.js';
type Operation=(typeof NORMATIVE_LIBRARY.registry.new_operations)[number]|(typeof NORMATIVE_LIBRARY.existingOperations)[number];
/** Trusted composition only; current bootstrap supplies none. No runtime flag or migration-on-start. */
export function registerNormativeLibraryRoutes(app:FastifyInstance,identityVerifier:IdentityVerifier,composition:LibraryComposition):void{
 const operations=[...NORMATIVE_LIBRARY.registry.new_operations,...NORMATIVE_LIBRARY.existingOperations];
 for(const op of operations)if(!composition.handlers.has(op.operation_id))throw Error('Missing library handler: '+op.operation_id);
 async function invoke(op:Operation,request:FastifyRequest,reply:FastifyReply,params:Record<string,string>){
  reply.header('cache-control','no-store').header('vary','Authorization, X-TCDX-Tenant-Id');
  const identity=await resolveAuthenticatedIdentity(identityVerifier,request);
  const tenant=request.headers['x-tcdx-tenant-id'];if(op.context==='PLATFORM'&&tenant!==undefined)deny();
  if(op.context==='TENANT'&&(typeof tenant!=='string'||!tenant))deny();
  if(params.id&&!/^[a-f0-9]{8}-[a-f0-9]{4}-7[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(params.id))invalid('id');
  if(op.operation_id==='controlConfigurationDefinitionReferenceList'&&(request.body!==undefined||Object.keys(request.query??{}).length))invalid();
  const headers=request.headers;if(Array.isArray(headers['if-match'])||Array.isArray(headers['idempotency-key']))invalid('headers');
  const output=await composition.handlers.get(op.operation_id)!({identity,...(typeof tenant==='string'?{tenantId:tenant}:{}),...(params.id?{id:params.id}:{}),...(params.matrix_type?{matrixType:params.matrix_type}:{}),body:request.body,query:(request.query??{}) as Record<string,unknown>,correlationId:String(reply.getHeader('x-correlation-id')??request.id),idempotencyKey:String(headers['idempotency-key']??''),...(headers['if-match']?{ifMatch:String(headers['if-match'])}:{})});
  if(output.etag)reply.header('etag',output.etag);if(output.replay)reply.header('idempotency-replayed','true');
  return reply.code(op.success).send(output.response);
 }
 // Same action-suffix dispatch as canonical core routes; Fastify normalizes adjacent parameter colons.
 const groups=new Map<string,Map<string,Operation>>();
 for(const op of operations){
  const action=op.path.match(/^(.*)\/\{id\}:(review|publish|decide)$/);
  if(action){const key=op.method+' '+action[1];const group=groups.get(key)??new Map();group.set(action[2]!,op);groups.set(key,group);continue;}
  app.route({method:op.method.toUpperCase() as 'GET'|'POST'|'PATCH',url:'/api/v1'+op.path.replace(/\{([a-z_]+)\}/g,':$1'),handler:(request,reply)=>invoke(op,request,reply,request.params as Record<string,string>)});
 }
 for(const [key,group]of groups){
  const [method,path]=key.split(' ');
  app.route({method:method!.toUpperCase() as 'POST',url:'/api/v1'+path+'/:idCommand',handler:(request,reply)=>{
   const combined=(request.params as {idCommand:string}).idCommand,index=combined.lastIndexOf(':');const op=group.get(combined.slice(index+1));if(index<1||!op)concealed();
   return invoke(op,request,reply,{id:combined.slice(0,index)});
  }});
 }
}
