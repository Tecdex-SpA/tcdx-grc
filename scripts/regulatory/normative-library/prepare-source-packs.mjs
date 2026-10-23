import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {generatedRequirementCode} from '../../../apps/backend/dist/regulatory/validator.js';

// Adapter to the existing input contract. These are private, source-bound draft
// payloads, not a new catalog, database, workflow or executable authority.
const root=path.resolve(new URL('../../../',import.meta.url).pathname);
const [structureDirectory,outputDirectory,identifierReviewPath,crosswalkReviewPath,atomicReviewPath]=process.argv.slice(2);
if(!structureDirectory||!outputDirectory||!path.resolve(outputDirectory).split(path.sep).includes('.release-custody'))throw Error('Private source/output directories required');
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const catalog=path.join(root,'data/regulatory/catalogs/tcdx-unified-compliance-control-catalog/v1.1');
const referenceRoots=await read(path.join(catalog,'regulatory_reference_controls.json'));
const referenceVersions=await read(path.join(catalog,'regulatory_reference_control_versions.json'));
const identifierReview=identifierReviewPath?await read(identifierReviewPath):null;
const crosswalkReview=crosswalkReviewPath?await read(crosswalkReviewPath):{relations:[]};
const atomicReview=atomicReviewPath?await read(atomicReviewPath):{selected_requirements:[],requirement_control_proposals:[]};
const sourceProfiles={
 CL_LEY_21663:{edition:'BCN2025-03-01',publisher:'Biblioteca del Congreso Nacional de Chile',uri:'https://www.bcn.cl/leychile/navegar?idNorma=1202434&idVersion=2025-03-01',effective:'2025-03-01T00:00:00.000Z'},
 CL_LEY_21719:{edition:'BCN2026-12-01_amended2026-02-05',publisher:'Biblioteca del Congreso Nacional de Chile',uri:'https://www.bcn.cl/leychile/navegar?idNorma=1209272&idVersion=2026-12-01',effective:'2026-12-01T00:00:00.000Z'},
 ISO_IEC_42001_2023:{edition:'2023',publisher:'ISO/IEC',uri:'https://www.iso.org/standard/81230.html',effective:null},
 ISO_IEC_27001_2022:{edition:'2022; NCh adoption 2023',publisher:'ISO/IEC; Instituto Nacional de Normalizacion adoption2023',uri:'https://www.iso.org/standard/27001',effective:null},
 ISO_9001_2015:{edition:'2015',publisher:'ISO; received Spanish translation',uri:'https://www.iso.org/standard/62085.html',effective:null}
};
await fs.mkdir(outputDirectory,{recursive:true});
const summary=[];
for(const [packCode,profile]of Object.entries(sourceProfiles)){
 const source=await read(path.join(structureDirectory,packCode+'.structure.json'));
 if(source.pack_code!==packCode||!/^([a-f0-9]{64})$/.test(source.source_sha256))throw Error('Source identity mismatch');
 for(const fragment of [...source.units,...source.requirement_candidates])if(digest(fragment.source_text)!==fragment.content_hash)throw Error('Source fragment checksum mismatch');
 const officialPublicLaw=packCode==='CL_LEY_21719',law=packCode.startsWith('CL_');
 const provenance='received-sha256:'+source.source_sha256+':'+source.source_member;
 const byCode=new Map(source.units.map(unit=>[unit.code,unit]));
 const units=source.units.map(unit=>({sourceLocator:unit.source_locator,parentSourceLocator:unit.parent_source_locator,
  unitType:unit.unit_type,unitCode:unit.code,title:unit.title,displayOrder:unit.display_order,
  contentLanguage:packCode==='ISO_IEC_42001_2023'?'en':'es',licensedContent:null,
  licensedContentRef:unit.source_locator,contentHash:unit.content_hash,provenanceRef:provenance,
  reviewed:false,effectiveFrom:null,effectiveTo:null}));
 const selected=atomicReview.selected_requirements.filter(r=>r.pack_code===packCode);
 const requirements=selected.map(proposal=>{
  const candidate=source.requirement_candidates.find(c=>c.source_locator===proposal.source_locator);
  if(!candidate||candidate.content_hash!==proposal.statement_sha256||source.source_sha256!==proposal.source_sha256||proposal.reviewed!==false)throw Error('Atomic requirement source or review status changed');
  return {sourceLocator:candidate.source_locator,
  normativeUnitSourceLocator:candidate.normative_unit_source_locator,requirementCode:null,
  statementOrdinal:candidate.statement_ordinal,requirementKind:law?'legal_obligation':'shall',
  contentLanguage:packCode==='ISO_IEC_42001_2023'?'en':'es',licensedStatement:null,
  licensedContentRef:candidate.source_locator,contentHash:candidate.content_hash,isMandatory:true,
  applicabilityGuidance:proposal.single_evaluable_action+'. '+proposal.subject_and_scope+'. '+proposal.conditions_and_temporality,
  evidenceExpectations:null,provenanceRef:provenance,reviewed:false,effectiveFrom:null,effectiveTo:null};});
 const roots=referenceRoots.filter(control=>control.source_framework_code===packCode);
 const controls=[],editorial=[];
 for(const control of roots){
  const correction=identifierReview?.pack_code===packCode?identifierReview.changes.find(c=>c.legacy_control_code===control.control_code):undefined;
  if(correction&&identifierReview.source_sha256!==source.source_sha256)throw Error('Identifier correction has a different source');
  const unit=byCode.get(correction?.source_unit_code??control.source_normative_unit_code);
  if(!unit)throw Error('Existing reference control has no exact source unit: '+control.control_code);
  if(correction&&correction.source_fragment_sha256!==unit.content_hash)throw Error('Identifier correction fragment changed');
  const controlCode=correction?.prepared_control_code??control.control_code;
  const matches=referenceVersions.filter(version=>version.control_code===control.control_code);
  if(matches.length!==1)throw Error('Ambiguous existing control version');
  const version=matches[0];
  // Keep canonical parent identity and declared TCDX operational metadata. No
  // frequency/evidence recommendation is attributed to the ISO normative text.
  controls.push({controlCode,versionNumber:Number(version.version_number),
   name:control.name,origin:'regulatory_reference',objective:version.objective,
   controlType:version.control_type,nature:version.nature,frequencyCode:version.frequency_code,
   executionMethod:version.execution_method,verificationMethod:version.verification_method,
   minimumEvidence:version.minimum_evidence,suggestedOwnerRoleCode:version.suggested_owner_role_code||null,reviewed:false});
  editorial.push({normativeUnitSourceLocator:unit.source_locator,controlCode,
   sourceLocator:unit.source_locator,rationale:'Exact Annex A identifier in the received source; operational fields remain TCDX editorial metadata, not normative frequency/evidence requirements.',
   provenanceRef:provenance,reviewed:false});
 }
 const crosswalks=[];
 for(const relation of crosswalkReview.relations.filter(r=>r.source.pack_code===packCode)){
  for(const end of [relation.source,relation.target]){
   const document=await read(path.join(structureDirectory,end.pack_code+'.structure.json'));
   const unit=document.units.find(u=>u.code===end.unit_code);
   if(document.source_sha256!==end.source_sha256||unit?.source_locator!==end.source_locator||unit?.content_hash!==end.source_fragment_sha256)throw Error('Crosswalk source evidence changed');
  }
  if(relation.reviewed!==false||relation.confidence!==0)throw Error('Preparation cannot assert human review or calibrated confidence');
  let group=crosswalks.find(c=>c.targetFrameworkCode===relation.target.pack_code);
  if(!group){group={versionNumber:1,targetFrameworkCode:relation.target.pack_code,targetEdition:sourceProfiles[relation.target.pack_code].edition,targetVersionNumber:2,direction:'source_to_target',provenanceRef:'SOURCE_CROSSWALK_PROPOSALS.json',reviewed:false,effectiveFrom:relation.effective_from,mappings:[]};crosswalks.push(group);}
  group.mappings.push({objectType:'normative_unit',sourceCode:relation.source.source_locator,targetCode:relation.target.source_locator,relationshipType:relation.relationship_type,rationale:relation.rationale,confidence:0,reviewed:false,provenanceRef:JSON.stringify({proposal:relation.id,source:relation.source,target:relation.target}),versionNumber:1,effectiveFrom:relation.effective_from});
 }
 if(identifierReview?.pack_code===packCode){
  crosswalks.push({versionNumber:1,targetFrameworkCode:packCode,targetEdition:profile.edition,targetVersionNumber:1,direction:'source_to_target',provenanceRef:'SOURCE_IDENTIFIER_RECONCILIATION.json',reviewed:false,effectiveFrom:'2026-10-23T00:00:00.000Z',mappings:identifierReview.changes.map(change=>({objectType:'control',sourceCode:change.prepared_control_code,targetCode:change.legacy_control_code,relationshipType:'supersedes',rationale:change.rationale,confidence:0,reviewed:false,provenanceRef:JSON.stringify({source_sha256:identifierReview.source_sha256,source_locator:change.source_locator,source_fragment_sha256:change.source_fragment_sha256,legacy_catalog:'v1.1'}),versionNumber:1,effectiveFrom:'2026-10-23T00:00:00.000Z'}))});
 }
 const requirementControlMappings=atomicReview.requirement_control_proposals.filter(r=>r.pack_code===packCode).map(proposal=>{
  const unit=source.units.find(u=>u.source_locator===proposal.control_source_locator);
  const requirement=requirements.find(r=>r.sourceLocator===proposal.requirement_source_locator);
  if(!unit||unit.content_hash!==proposal.control_source_fragment_sha256||!requirement||!controls.some(c=>c.controlCode===proposal.control_code)||proposal.reviewed!==false)throw Error('Requirement-control source evidence changed');
  const requirementCode=generatedRequirementCode(requirement.sourceLocator,requirement.statementOrdinal);
  return {requirementCode,controlCode:proposal.control_code,mappingType:proposal.mapping_type,coverageContribution:null,rationale:proposal.rationale,provenanceRef:JSON.stringify(proposal),reviewed:false};
 });
 const payload={packCode,packName:packCode+' source-bound internal preparation',edition:profile.edition,
  versionNumber:2,effectiveFrom:profile.effective,jurisdictionCode:law?'CL':null,
  frameworkCode:packCode,frameworkName:packCode,
  source:{sourceCode:('SOURCE:'+packCode+':'+source.source_sha256.slice(0,20)),sourceType:law?'law':'standard',publisher:profile.publisher,
   officialUri:profile.uri,sourceChecksum:source.source_sha256,
   licenseClassification:officialPublicLaw?'public_legal_source':'non_authoritative_test_pack',
   origin:officialPublicLaw?'official_source':'received_preliminary_file',authorized:officialPublicLaw,definitivePublication:true},
  governance:{authorityClass:officialPublicLaw?'AUTHORIZED_NORMATIVE_SOURCE':'NON_AUTHORITATIVE_TEST_PACK',
   sourceRoles:[officialPublicLaw?'authorized_normative_source':'supporting_reference'],devDemoExecutionEligible:true,
   commercialPublicationEligible:false,certificationAssertionEligible:false,provenance,
   contentScope:'Exact received source locators/hashes and review-pending statements; no normative text distributed, rights granted or human approval asserted.',
   coverageScope:'Observed extraction candidate population, NOT independently proven complete normative coverage.'},
  units,requirements,controls,requirementControlMappings,normativeUnitControlMappings:editorial,
  crosswalks,coverageExpected:{normativeUnits:units.length,requirements:requirements.length,
   referenceControls:controls.length,editorialMappings:editorial.length,complianceMappings:requirementControlMappings.length},approvals:[]};
 // The actual actor and canonical checksum are bound by the existing pipeline
 // caller, not a fictional operational identity stored in a source package.
 const filename=packCode+'.draft.json',bytes=JSON.stringify(payload,null,2)+'\n';
 await fs.writeFile(path.join(outputDirectory,filename),bytes);
 summary.push({pack_code:packCode,filename,sha256:digest(bytes),source_sha256:source.source_sha256,
  ...payload.coverageExpected,source_text_distributed:false,reviewed:0,human_approvals:0,
  status:'PARTIAL_SOURCE_BOUND_DRAFT; NO_HOMOLOGATION_OR_PUBLICATION',
  expected_population_basis:payload.governance.coverageScope});
}
summary.push({pack_code:'ISO_9001_2026',status:'NO_CANONICAL_PAYLOAD; DEFINITIVE_SOURCE_ABSENT',
 candidate_proposals:104,source_text_distributed:false,human_approvals:0});
await fs.writeFile(path.join(outputDirectory,'manifest.json'),JSON.stringify(summary,null,2)+'\n');
process.stdout.write(JSON.stringify(summary)+'\n');
