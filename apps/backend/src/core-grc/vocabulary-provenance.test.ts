import {describe,it,expect} from "vitest";
import {newUuidV7} from "../uuid.js";
import {VOCABULARY_PROVENANCE_BINDINGS,REQUEST_VOCABULARIES} from "@tcdx-grc/contracts";
import {buildVocabularyProvenance,captureVocabularyWrites,recordVocabularyWrite,validVocabularyProvenance} from "./vocabulary-provenance.js";
describe("published vocabulary provenance",()=> {
 for(const [op,fields]of Object.entries(VOCABULARY_PROVENANCE_BINDINGS))for(const [path,b]of Object.entries(fields)) {
  it(`${op}.${path} binds exact persisted revision and rejects persistence mismatch`,()=> {
   const entityId=newUuidV7(),rootId=newUuidV7();const [array,field]=path.split('[].');const source=(REQUEST_VOCABULARIES as Record<string,Record<string,readonly string[]>>)[op]?.[path]??REQUEST_VOCABULARIES.uploadIntentCreate.classification;
   for(const code of source) {
    const siblings=Object.entries(fields).filter(([key])=>key!==path&&key.startsWith(`${array}[].`));const extra=Object.fromEntries(siblings.map(([key])=>[key.split('[].')[1],(REQUEST_VOCABULARIES as Record<string,Record<string,readonly string[]>>)[op]![key]![0]]));const parent=b.parentLinks[0];const row={[b.id]:entityId,...(!b.version&&parent?{[parent.column]:rootId}:{}),...extra,[b.column]:code,...(b.version?{[b.version]:'9223372036854775807'}:{})};const body=op==='uploadFinalize'?{}:field?{[array!]:[{...extra,[field]:code}]}:{[path]:code};const root={table:!b.version&&parent?parent.parent:'root.table',entity:'Root',idColumn:!b.version&&parent?parent.parentId:'root_id',row:{[!b.version&&parent?parent.parentId:'root_id']:rootId,row_version:'9'}};
    const profile=buildVocabularyProvenance(op,body,[{table:b.table,row}],root)!;expect(validVocabularyProvenance(profile)).toBe(true);expect(profile.occurrences.find(o=>o.input_path===(field?`${array}[0].${field}`:path))).toMatchObject({code,entity_id:entityId,entity_version:{kind:b.version??'root_row_version',value:b.version?'9223372036854775807':'9'}});expect(profile.root.entity_version.value).toBe('9');
    if(!b.version)expect(()=>buildVocabularyProvenance(op,body,[{table:b.table,row:{...row,[parent!.column]:newUuidV7()}}],root)).toThrow();
    if(op!=='uploadFinalize')expect(()=>buildVocabularyProvenance(op,body,[{table:b.table,row:{...row,[b.column]:'wrong'}}],root)).toThrow();
   }
  });
 }
 it("fails closed on unknown family/code/hash/revision/PII rather than leaking audit JSON",()=> {
  const entityId=newUuidV7();const p=buildVocabularyProvenance('actionCreate',{priority:'normal'},[],{table:'remediation.actions',entity:'Action',idColumn:'action_id',row:{action_id:entityId,priority:'normal',row_version:'2'}})!;
  for(const invalid of[{...p,email:'x'},{...p,profile_version:2},{...p,manifest_sha256:'f'.repeat(64)},{...p,occurrences:[{...p.occurrences[0],code:'medium'}]},{...p,occurrences:[{...p.occurrences[0],family_id:'CV-99'}]},{...p,root:{...p.root,entity_version:{kind:'row_version',value:'9223372036854775808'}}},{...p,root:{...p.root,entity_id:newUuidV7().replace(/-7/,'-4')}}])expect(validVocabularyProvenance(invalid)).toBe(false);
 });
 it("keeps simultaneous tenant commands' captured writes separate",async()=> {
  const a=newUuidV7(),b=newUuidV7();const result=await Promise.all([captureVocabularyWrites(async()=>{recordVocabularyWrite('one',{id:a});await Promise.resolve();return a;}),captureVocabularyWrites(async()=>{recordVocabularyWrite('two',{id:b});return b;})]);
  expect(result.map(r=>r.writes)).toEqual([[{table:'one',row:{id:a}}],[{table:'two',row:{id:b}}]]);
 });
 it("does not manufacture provenance for absent optional or historical inputs",()=> {
  expect(buildVocabularyProvenance('evidenceApprove',{},[],{table:'evidence.evidence_versions',entity:'EvidenceVersion',idColumn:'evidence_version_id',row:{evidence_version_id:newUuidV7(),row_version:'2'}})).toBeUndefined();
 });
});
