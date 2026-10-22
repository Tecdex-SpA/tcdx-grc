import {it,expect,vi} from 'vitest';
import {ApiClient} from './api-client.js';
import {readReferences,type ReferenceEntity} from './reference-read.js';
const tenant='018f47f2-6170-7bd0-9d43-12f644a2b111';
it.each([
 ['requirement','requirement_id'],['requirementAssessment','requirement_assessment_id'],
 ['controlAssessment','control_assessment_id'],['assuranceTest','assurance_test_id']
])('selector deploy preserves %s reference options',async(entity,key)=>{
 const api=new ApiClient('http://127.0.0.1',{} as never,()=>({tenantId:tenant}) as never);
 const request=vi.spyOn(api,'request').mockResolvedValue({items:[{[key]:tenant,tenant_id:tenant,name:'Referencia autorizada'}],page:{has_more:false,next_cursor:null}});
 const result=await readReferences(api,entity as ReferenceEntity,{parentId:tenant});
 expect(result.options.map(x=>x.value)).toEqual([tenant]);expect(request).toHaveBeenCalledTimes(1);
});
it('selector deploy preserves rejection of a control from another tenant',async()=>{
 const api=new ApiClient('http://127.0.0.1',{} as never,()=>({tenantId:tenant}) as never);
 vi.spyOn(api,'request').mockResolvedValue({items:[{control_id:tenant,tenant_id:'018f47f2-6170-7bd0-9d43-12f644a2b112',ownership_class:'TENANT_OWNED'}],page:{has_more:false,next_cursor:null}});
 await expect(readReferences(api,'control',{tenantOwnedControl:true})).rejects.toThrow('REFERENCE_CONTEXT_CHANGED');
});
