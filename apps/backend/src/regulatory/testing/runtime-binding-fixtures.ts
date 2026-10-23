import {newUuidV7} from '../../uuid.js';
import {sha256} from '../hash.js';
import {calculateImportChecksum} from '../validator.js';
import type {RegulatoryPackImportInput,RegulatoryPackCode} from '../model.js';
/** Synthetic content and asserted test facts only; never actual source material or human receipts. */
export function publicationFixture(actor:string,version:number,code:RegulatoryPackCode='CL_LEY_21663'):RegulatoryPackImportInput{
 const seed=newUuidV7();
 const input:RegulatoryPackImportInput={packCode:code,packName:'Synthetic publication test',edition:seed,versionNumber:version,effectiveFrom:'2025-01-01T00:00:00Z',jurisdictionCode:'CL',frameworkCode:seed,frameworkName:'Synthetic source',
 source:{sourceCode:seed,sourceType:'law',publisher:'Synthetic test publisher',officialUri:'https://example.invalid/'+seed,sourceChecksum:sha256(seed),licenseClassification:'synthetic_fixture',origin:'official_source',authorized:true,definitivePublication:true},
 governance:{authorityClass:'AUTHORIZED_NORMATIVE_SOURCE',sourceRoles:['authorized_normative_source'],devDemoExecutionEligible:true,commercialPublicationEligible:true,certificationAssertionEligible:true,provenance:'test:'+seed,contentScope:'Synthetic fixture only',coverageScope:'Synthetic declared population'},importedByUserIdentityId:actor,importChecksum:'',
 units:[{sourceLocator:seed+':1',parentSourceLocator:null,unitType:'article',unitCode:'1',title:'Synthetic test unit',displayOrder:1,contentLanguage:'es',licensedContent:'Synthetic non-normative content',licensedContentRef:null,contentHash:sha256('Synthetic non-normative content'),provenanceRef:'test:'+seed,reviewed:true}],
 requirements:[{requirementCode:seed,sourceLocator:seed+':1',normativeUnitSourceLocator:seed+':1',requirementKind:'legal_obligation',statementOrdinal:1,contentLanguage:'es',licensedStatement:'Synthetic test statement',licensedContentRef:null,contentHash:sha256('Synthetic test statement'),isMandatory:false,applicabilityGuidance:'Test only',evidenceExpectations:null,provenanceRef:'test:'+seed,reviewed:true}],
 controls:[{controlCode:seed,versionNumber:1,name:'Synthetic control',origin:'tcdx_baseline',objective:'Synthetic',controlType:'preventive',nature:'manual',frequencyCode:'annual',executionMethod:'Synthetic',verificationMethod:'Synthetic',minimumEvidence:'Synthetic',suggestedOwnerRoleCode:null,reviewed:true}],
 requirementControlMappings:[{requirementCode:seed,controlCode:seed,mappingType:'supports',coverageContribution:null,rationale:'Synthetic',provenanceRef:'test:'+seed,reviewed:true}],normativeUnitControlMappings:[{normativeUnitSourceLocator:seed+':1',controlCode:seed,sourceLocator:seed+':location',rationale:'Synthetic location',provenanceRef:'test:'+seed,reviewed:true}],crosswalks:[],coverageExpected:{normativeUnits:1,requirements:1,referenceControls:1,editorialMappings:1,complianceMappings:1},approvals:[]};
 if(code.startsWith('ISO_')){input.source.sourceType='standard';input.source.origin='licensed_file';input.jurisdictionCode=null;}
 if(code==='ISO_IEC_27001_2022'||code==='ISO_IEC_42001_2023')for(const control of input.controls)control.origin='regulatory_reference';
 if(code==='CL_LEY_21719'){input.source.publisher='Biblioteca del Congreso Nacional de Chile';input.effectiveFrom='2026-12-01T00:00:00.000Z';}
 // These are synthetic assertions exercising existing source guards, not source attestations.
 input.importChecksum=calculateImportChecksum(input);return input;
}
