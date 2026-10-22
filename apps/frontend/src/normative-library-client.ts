import {NORMATIVE_LIBRARY,validateLibrarySchema} from '@tcdx-grc/contracts/normative-library';
import type {ApiClient} from './api-client.js';
export type LibraryCall={operationId:string;params?:Record<string,string>;query?:Record<string,string>;body?:unknown;etag?:string;idempotencyKey?:string;signal?:AbortSignal};
/** Uses only published operation descriptors and the canonical auth/tenant transport. No local grants or persistence. */
export async function callLibrary(api:ApiClient,call:LibraryCall):Promise<{body:unknown;etag:string|null}>{
 const op=[...NORMATIVE_LIBRARY.registry.new_operations,...NORMATIVE_LIBRARY.existingOperations].find(o=>o.operation_id===call.operationId);
 if(!op)throw Error('Operación de biblioteca no publicada.');
 const params=call.params??{},used=new Set<string>();
 const path='/api/v1'+op.path.replace(/\{([a-z_]+)\}/g,(_,key:string)=>{const v=params[key];if(!v||key==='id'&&!/^[a-f0-9]{8}-[a-f0-9]{4}-7[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v))throw Error('Referencia de biblioteca inválida.');used.add(key);return encodeURIComponent(v);});
 if(Object.keys(params).some(k=>!used.has(k)))throw Error('Referencia no admitida.');
 if(op.request_schema&&!validateLibrarySchema(op.request_schema,call.body).valid)throw Error('Solicitud de biblioteca inválida.');
 const cas=op.method==='patch'||op.operation_id.endsWith('Review')||op.operation_id.endsWith('Publish')||op.operation_id.endsWith('Decide');
 if(cas&&!/^"[a-f0-9]{64}"$/.test(call.etag??''))throw Error('Obtén la versión actual antes de modificarla.');
 if(op.method!=='get'&&!call.idempotencyKey)throw Error('Falta la clave de reintento de esta operación.');
 const response=await api.requestVersioned<unknown>(path+(call.query?'?'+new URLSearchParams(call.query).toString():''),{method:op.method.toUpperCase(),cache:'no-store',...(call.signal?{signal:call.signal}:{}),...(op.method!=='get'?{body:JSON.stringify(call.body),headers:{'content-type':'application/json','idempotency-key':call.idempotencyKey!,...(cas?{'if-match':call.etag!}:{})}}:{})},{tenantContext:op.context==='PLATFORM'?'omit':'required'});
 if(op.response_schema&&!validateLibrarySchema(op.response_schema,response.body).valid)throw Error('Respuesta de biblioteca inválida.');
 if(response.etag!==null&&!/^"[a-f0-9]{64}"$/.test(response.etag))throw Error('Versión de biblioteca inválida.');
 return response;
}
