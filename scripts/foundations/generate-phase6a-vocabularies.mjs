import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "../..");
const require = createRequire(resolve(root, "packages/contracts/package.json"));
const { parse } = require("yaml");
const source = parse(readFileSync(resolve(root, "docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml"), "utf8"));
const schemas = source.components.schemas;
// Only closed request enums; a bounded string never becomes an inferred vocabulary.
const vocabulary = {};
const inScope = new Set(["ApplicabilityCreateRequest", "RequirementAssessmentSubmitRequest", "ControlInstantiateRequest", "ControlAssessmentSubmitRequest", "AssuranceTestExecuteRequest", "EvidenceApproveRequest", "EvidenceRejectRequest", "RetentionPolicyCreateRequest", "IssueCreateRequest", "IssueVerifyCloseRequest", "ActionVerifyRequest", "AssuranceSampleExecuteInput", "SoaItemCreateInput", "EvidenceCreateRequest", "UploadIntentCreateRequest", "IssueTriageRequest", "ActionCreateRequest", "ActionCompleteRequest"]);
for (const [name, schema] of Object.entries(schemas)) {
  if (!inScope.has(name)) continue;
  for (const [field, property] of Object.entries(schema.properties ?? {})) {
    const definition = property.$ref ? schemas[property.$ref.split("/").at(-1)] : property;
    if (definition.enum) vocabulary[`${name}.${field}`] = definition.enum;
  }
}
const lifecycle = {};
const lifecycleEntities = new Set(["RequirementApplicability", "RequirementAssessment", "StatementOfApplicability", "ControlAssessment", "AssuranceTest", "EvidenceRequest", "EvidenceVersion", "RetentionPolicy", "Issue", "Action"]);
for (const line of readFileSync(resolve(root, "docs/executable-contracts/09_SEED_MANIFESTS.md"), "utf8").split("\n")) {
  const cells = line.split("|").slice(1, -1).map(cell => cell.trim().replaceAll("`", ""));
  if (lifecycleEntities.has(cells[0])) {
    lifecycle[cells[0]] ??= [];
    for (const state of cells.slice(1, 3)) if (!lifecycle[cells[0]].includes(state)) lifecycle[cells[0]].push(state);
  }
}
const manifest = JSON.parse(readFileSync(resolve(root,"docs/executable-contracts/30_PHASE6A3_VOCABULARIES_MANIFEST.json"),"utf8"));
if (manifest.status!=="PUBLISHED_LOCAL_V1" || manifest.families.length!==14 || manifest.families.reduce((n,f)=>n+f.values.length,0)!==52) throw new Error("Published vocabulary manifest invalid");
const labels={};
for (const family of manifest.families) for (const name of family.schemas) {
 if (JSON.stringify(schemas[name]?.enum)!==JSON.stringify(family.values.map(v=>v.code))) throw new Error(`Vocabulary schema drift ${name}`);
 labels[name]=Object.fromEntries(family.values.map(v=>[v.code,v.label_es]));
}
const operationVocabulary = {};
for (const item of Object.values(source.paths)) for (const operation of Object.values(item)) {
 const name=operation?.requestBody?.content?.["application/json"]?.schema?.$ref?.split("/").at(-1);
 if (!name || !operation.operationId) continue;
 const fields={};
 for(const [field,property] of Object.entries(schemas[name]?.properties??{})) {
  const definition=property.$ref ? schemas[property.$ref.split("/").at(-1)] : property;
  if (definition?.enum && definition["x-tcdx-vocabulary-family"]) fields[field]=definition.enum;
  const nested=property.items?.$ref ? schemas[property.items.$ref.split("/").at(-1)] : null;
  for(const [key,p] of Object.entries(nested?.properties??{})) {const d=p.$ref?schemas[p.$ref.split("/").at(-1)]:p; if(d?.enum && d["x-tcdx-vocabulary-family"]) fields[`${field}[].${key}`]=d.enum;}
 }
 if(Object.keys(fields).length) operationVocabulary[operation.operationId]=fields;
}
const schemaVocabularyNames=Object.fromEntries(Object.entries(schemas).flatMap(([schema,definition])=>Object.entries(definition.properties??{}).filter(([,p])=>p.$ref && schemas[p.$ref.split("/").at(-1)]?.["x-tcdx-vocabulary-family"]).map(([field,p])=>[`${schema}.${field}`,p.$ref.split("/").at(-1)])));
const macro=JSON.parse(readFileSync(resolve(root,"docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/MACRO_MANIFEST_R1.json"),"utf8"));
const physical=readFileSync(resolve(root,"docs/physical-data-model/01_PHYSICAL_DATA_MODEL.md"),"utf8");
const inventory=JSON.parse(readFileSync(resolve(root,"database/expected-schema.json"),"utf8"));
const uploadPhysical=readFileSync(resolve(root,"docs/physical-data-model/amendments/PHASE_5_FINAL_CLOSURE_v1.7/01_FILE_UPLOAD_INTENT_PHYSICAL_MODEL.md"),"utf8");
const mapping=readFileSync(resolve(root,"docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md"),"utf8");
const foreignKeySql=readFileSync(resolve(root,"database/migrations/20260916000700_foreign_keys.sql"),"utf8");
const foreignKeyLinks=[...foreignKeySql.matchAll(/ALTER TABLE "([a-z_]+)"\."([a-z_]+)" ADD CONSTRAINT "[^"]+" FOREIGN KEY \("tenant_id", "([a-z_]+)"\) REFERENCES "([a-z_]+)"\."([a-z_]+)" \("tenant_id", "([a-z_]+)"\)/g)].map(m=>({table:`${m[1]}.${m[2]}`,column:m[3],parent:`${m[4]}.${m[5]}`,parentId:m[6]}));
const bindings={};
for(const item of macro.consumer_map) {
 const [op,path]=item.consumer.split(" / ");if(op.endsWith("Get"))continue;
 const line=mapping.split("\n").find(l=>l.startsWith(`| ${item.field_id} /`));
 const columns=[...line.split("|")[3].matchAll(/([a-z_]+\.[a-z_]+)\.([a-z_]+)/g)];
 const chosen=op.startsWith("action")?columns.find(c=>c[1]==="remediation.actions")??columns[0]:columns[0];
 const table=inventory.tables.find(t=>t.name===chosen[1]);
 const row=physical.split("\n").find(l=>l.startsWith(`| \`${table.name}\` —`));
 const amendment=uploadPhysical.split("\n").find(l=>l.includes(`| \`${table.name}\` |`));
 const entity=row?row.split(" — ")[1].split(" | ")[0]:amendment?.split("|")[1]?.trim().replaceAll("`","");
 if(!entity)throw new Error(`Missing canonical entity name ${table.name}`);
 const version=table.columns.some(c=>c.name==="row_version")?"row_version":table.columns.some(c=>c.name==="version_number")?"version_number":null;
 if(!version && !["I","TI","MXI","EV"].includes(table.profile))throw new Error(`No canonical version binding ${table.name}`);
 (bindings[op]??={})[path]={family:item.family,table:table.name,column:chosen[2],entity,id:table.primaryKey[0],version,parentLinks:version?[]:foreignKeyLinks.filter(f=>f.table===table.name).map(({column,parent,parentId})=>({column,parent,parentId}))};
}
// Finalize copies only the actual persisted classification, never a client override.
bindings.uploadFinalize={classification:{...bindings.uploadIntentCreate.classification,table:"evidence.file_objects",entity:"FileObject",id:"file_object_id",version:"row_version"}};
const manifestSha=createHash("sha256").update(readFileSync(resolve(root,"docs/executable-contracts/30_PHASE6A3_VOCABULARIES_MANIFEST.json"))).digest("hex");
const output = "// Generated from approved OpenAPI request schemas. Do not edit values manually.\n"
  + `export const FORM_VOCABULARIES = ${JSON.stringify(vocabulary, null, 2)} as const;\n`
  + `export const CANONICAL_OWNERSHIP_CLASSES = ${JSON.stringify(schemas.OwnershipClass.enum)} as const;\n`
  + `export const PUBLISHED_LIFECYCLE_STATES = ${JSON.stringify(lifecycle, null, 2)} as const;\n`
  + `export const PUBLISHED_VOCABULARY_LABELS = ${JSON.stringify(labels,null,2)} as const;\n`
  + `export const REQUEST_VOCABULARIES = ${JSON.stringify(operationVocabulary,null,2)} as const;\n`
  + `export const VOCABULARY_FIELD_SCHEMAS = ${JSON.stringify(schemaVocabularyNames,null,2)} as const;\n`
  + `export const PUBLISHED_VOCABULARY_VERSION = ${JSON.stringify(manifest.version)} as const;\n`
  + `export const VOCABULARY_MANIFEST_SHA256 = ${JSON.stringify(manifestSha)} as const;\n`
  + `export const VOCABULARY_PROVENANCE_BINDINGS = ${JSON.stringify(bindings,null,2)} as const;\n`
  + `export const ROLE_PERMISSION_PUBLICATION = ${JSON.stringify(JSON.parse(readFileSync(resolve(root,"docs/executable-contracts/31_PHASE6A3_PUBLICATION_METADATA.json"),"utf8")),null,2)} as const;\n`
  + `export const RBAC_RESOLUTION_R3 = ${JSON.stringify(JSON.parse(readFileSync(resolve(root,"docs/executable-contracts/32_PHASE6A3_RBAC_RESOLUTION_R3_METADATA.json"),"utf8")),null,2)} as const;\n`
  + `export const VOCABULARY_FAMILY_CODES = ${JSON.stringify(Object.fromEntries(manifest.families.map(f=>[f.id,f.values.map(v=>v.code)])),null,2)} as const;\n`
  + "export type FormVocabularyKey = keyof typeof FORM_VOCABULARIES;\n";
const path = resolve(root, "packages/contracts/src/phase6a-vocabularies.ts");
if (process.argv.includes("--check")) {
  if (readFileSync(path, "utf8") !== output) throw new Error("Canonical form vocabulary asset differs from OpenAPI");
} else writeFileSync(path, output);
console.log("PHASE6A_VOCABULARY_ASSET=PASS");
