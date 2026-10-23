import type {FastifyInstance,FastifyRequest} from 'fastify';
import type {IdentityVerifier} from '../security/authentication.js';
import {resolveAuthenticatedIdentity} from '../core-grc/security.js';
import type {LibraryComposition} from '../normative-library/composition.js';
import {bindingFail,bindingId,RUNTIME_BINDING_API} from './runtime-binding-core.js';

export function registerRuntimeBindingRoutes(app:FastifyInstance,verifier:IdentityVerifier,services:LibraryComposition['runtimeBindings']){
 for(const [path,methods]of Object.entries(RUNTIME_BINDING_API.paths))for(const [method,definition]of Object.entries(methods)){
  const op=definition as {operationId:string;responses:Record<string,unknown>};
  const url='/api/v1'+path.replace(/\{id\}(?=:)/g,':id(.*):').replace(/\{id\}/g,':id');
  app.route({method:method.toUpperCase() as 'GET'|'POST',url,handler:async(request:FastifyRequest,reply)=>{
   reply.header('cache-control','no-store, no-transform').header('vary','Authorization, X-TCDX-Tenant-Id');
   const identity=await resolveAuthenticatedIdentity(verifier,request),tenant=request.headers['x-tcdx-tenant-id'];
   const platform=path.startsWith('/platform/');if(platform&&tenant!==undefined)bindingFail(403);if(!platform&&typeof tenant!=='string')bindingFail(403);
   if(Object.keys(request.query??{}).length||method==='get'&&request.body!==undefined)bindingFail(400);
   const id=(request.params as {id?:string}).id;if(id)bindingId(id);
   const key=request.headers['idempotency-key'],etag=request.headers['if-match'];if(Array.isArray(key)||Array.isArray(etag))bindingFail(400);
   const input={key:key??'',correlationId:String(reply.getHeader('x-correlation-id')??request.id),...(etag?{ifMatch:etag}:{})};
   let out:{result:unknown;replay?:boolean;etag?:string};
   switch(op.operationId){
    case 'regulatoryPackPublicationGet':out=await services.publication.get(identity,id!);break;
    case 'regulatoryPackValidationCreate':out=await services.publication.validate(identity,id!,request.body,input);break;
    case 'regulatoryPackPublish':out=await services.publication.publish(identity,id!,request.body,input);break;
    case 'documentIncorporate':out=await services.ticket.incorporate(identity,tenant as string,request.body,input);break;
    case 'documentVersionIncorporate':out=await services.ticket.incorporate(identity,tenant as string,request.body,input,id!);break;
    case 'documentGet':out=await services.ticket.readDocument(identity,tenant as string,id!,'document');break;
    case 'documentVersionGet':out=await services.ticket.readDocument(identity,tenant as string,id!,'version');break;
    case 'subscriptionTicketGet':out=await services.ticket.readTicket(identity,id!);break;
    case 'subscriptionTicketLink':out=await services.ticket.link(identity,id!,request.body,input);break;
    default:bindingFail(503,'Unbound published runtime operation');
   }
   if(out.replay)reply.header('idempotency-replayed','true');if(out.etag)reply.header('etag',out.etag);
   const status=Number(Object.keys(op.responses).find(code=>code.startsWith('2')));return reply.code(status).send(out.result);
  }});
 }
}
