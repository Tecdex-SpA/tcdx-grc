import {describe,it,expect,vi,afterEach} from 'vitest';
import {ApiClient} from './api-client.js';
import {callLibrary} from './normative-library-client.js';
const id='018f47f2-6170-7000-8000-000000000001';
const tokens={getAccessToken:async()=> 'fixture',clearSession:async()=>{}};
const api=()=>new ApiClient('https://grc.tecdex.net',tokens,()=>({tenantId:id}));
afterEach(()=>vi.unstubAllGlobals());
describe('library canonical transport, fixtures only',()=>{
 it('preserves tenant and ETag for exact version reads, without local grants',async()=>{
  const body={items:[],next_cursor:null};const fetcher=vi.fn(async (_:unknown,init?:RequestInit)=>{expect(new Headers(init?.headers).get('x-tcdx-tenant-id')).toBe(id);return new Response(JSON.stringify(body),{headers:{etag:'"'+'a'.repeat(64)+'"'}});});vi.stubGlobal('fetch',fetcher);
  expect(await callLibrary(api(),{operationId:'knowledgeVersionList'})).toEqual({body,etag:'"'+'a'.repeat(64)+'"'});
 });
 it('uses Platform transport with no tenant and retains protected metadata restrictions',async()=>{const fetcher=vi.fn(async(input:unknown,init?:RequestInit)=>{expect(String(input)).toBe('https://grc.tecdex.net/api/v1/platform/knowledge-sources');expect(new Headers(init?.headers).has('x-tcdx-tenant-id')).toBe(false);return new Response(JSON.stringify({items:[],next_cursor:null}));});vi.stubGlobal('fetch',fetcher);await callLibrary(api(),{operationId:'platformKnowledgeSourceList'});expect(fetcher).toHaveBeenCalledOnce();});
 it('rejects missing CAS/idempotency, untyped target and unapproved operations before transport',async()=>{const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);for(const call of [{operationId:'unknown'},{operationId:'knowledgeVersionGet',params:{id:'not-uuid'}},{operationId:'configurationOverrideReview',params:{id},body:{decision:'reviewed',rationale:'Fixture'}},{operationId:'configurationOverrideReview',params:{id},body:{decision:'reviewed',rationale:'Fixture'},etag:'"'+'a'.repeat(64)+'"'}])await expect(callLibrary(api(),call)).rejects.toThrow();expect(fetcher).not.toHaveBeenCalled();});
 it('propagates denied or missing-dependency responses without a false successful projection',async()=>{vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({code:'TCDX.DEPENDENCY.UNAVAILABLE',message:'Dependency unavailable',correlation_id:id,retryable:true}),{status:503})));await expect(callLibrary(api(),{operationId:'knowledgeVersionList'})).rejects.toMatchObject({status:503});});
});
