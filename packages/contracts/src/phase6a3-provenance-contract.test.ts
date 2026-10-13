import schemaSource from "../../../docs/executable-contracts/31_VOCABULARY_PROVENANCE_SCHEMA.json?raw";
import {Ajv2020} from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import {describe,it,expect} from "vitest";
import {VOCABULARY_MANIFEST_SHA256,VOCABULARY_FAMILY_CODES,PUBLISHED_VOCABULARY_VERSION} from "./phase6a-vocabularies.js";
const schema=JSON.parse(schemaSource);
const ajv=new Ajv2020({strict:false,allErrors:true});(addFormats as unknown as (a:Ajv2020)=>void)(ajv);const check=ajv.compile(schema);
const id='019aa000-0000-7000-8000-000000000001';
const entity={entity_type:'Action',entity_id:id,entity_version:{kind:'row_version',value:'1'}};
const profile=(family:string,code:string)=>({profile_version:1,contract_version:PUBLISHED_VOCABULARY_VERSION,manifest_sha256:VOCABULARY_MANIFEST_SHA256,root:entity,occurrences:[{...entity,family_id:family,code,input_path:'priority'}]});
describe('vocabulary provenance declared 2020-12 dialect',()=> {
 it('validates all52 codes in their exact14 families',()=>{let count=0;for(const [f,codes]of Object.entries(VOCABULARY_FAMILY_CODES))for(const code of codes){expect(check(profile(f,code))).toBe(true);count++;}expect(count).toBe(52);});
 it('preserves max int64 and indexed child paths',()=>{const p=profile('CV-08','normal');p.root.entity_version.value='9223372036854775807';p.occurrences[0]!.input_path='items[0].priority';expect(check(p)).toBe(true);});
 for(const [name,change]of Object.entries({unknown_code:(p:any)=>({...p,occurrences:[{...p.occurrences[0],code:'unpublished'}]}),wrong_family:(p:any)=>({...p,occurrences:[{...p.occurrences[0],family_id:'CV-99'}]}),cross_family:(p:any)=>({...p,occurrences:[{...p.occurrences[0],family_id:'CV-01'}]}),extra_pii:(p:any)=>({...p,email:'unnecessary'}),overflow_revision:(p:any)=>({...p,root:{...p.root,entity_version:{kind:'row_version',value:'9223372036854775808'}}}),wrong_revision:(p:any)=>({...p,root:{...p.root,entity_version:{kind:'row_version',value:'0'}}}),missing_version:(p:any)=>({...p,profile_version:undefined}),bad_hash:(p:any)=>({...p,manifest_sha256:'abc'}),non_uuid:(p:any)=>({...p,root:{...p.root,entity_id:'manual'}}),empty:(p:any)=>({...p,occurrences:[]})}))it(`rejects ${name}`,()=>expect(check(change(profile('CV-08','normal')))).toBe(false));
});
