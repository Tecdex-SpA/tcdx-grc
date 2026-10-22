import {requireReferenceGrantPublication,requireReferencePublication} from "../security/reference-publication.js";
import { createHash } from "node:crypto";
import { CompiledQuery, sql, type Kysely, type Transaction } from "kysely";
import { validate, version } from "uuid";
import type { ScopeKind } from "@tcdx-grc/shared-types";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";
import { packVisibility } from "../regulatory/pack-entitlement.js";
import { getResource } from "./repository.js";
import { resources, type CoreActor, type CoreGrcDependencies, type ResourceKey } from "./model.js";
import { grantedScopes, requireAccess } from "./security.js";

type Executor = Kysely<FoundationDatabase> | Transaction<FoundationDatabase>;
type Row = Record<string, unknown>;
export type ReferenceKind = "framework" | "membership" | "retention";
export type ReferenceQuery = { purpose: string; size: number; cursor?: string; filters: Record<string,string>; parents: Record<string,string> };
const parentNames = ["statement_of_applicability_id","requirement_id","control_id","requirement_assessment_id","control_assessment_id","assurance_test_id","issue_id","evidence_request_id","action_id","evidence_id","file_object_id","file_upload_intent_id"];
const referencePermissions = { framework: "compliance.framework.read", membership: "platform.membership_reference.read", retention: "privacy.retention_policy_reference.read" };
const allScopes: readonly ScopeKind[] = ["tenant","assigned_object","owned_object","audit_engagement"];
function invalid(): never { throw new FoundationError("TCDX.VALIDATION.FAILED","Invalid reference query",400); }
function hidden(): never { throw new FoundationError("TCDX.RESOURCE.NOT_FOUND","Resource not found",404); }
function invariant(): never { throw new FoundationError("TCDX.INVARIANT.VIOLATION","Policy is not eligible for this context",422); }
const isId = (value: string) => validate(value) && version(value) === 7;
export function parseReferenceQuery(kind: ReferenceKind, raw: string): ReferenceQuery {
 const params=new URLSearchParams(raw.includes("?") ? raw.slice(raw.indexOf("?")+1) : "");
 const q: ReferenceQuery={purpose: kind==="framework" ? "select" : "",size:25,filters:{},parents:{}};
 const seen=new Set<string>();
 const ids=kind==="framework" ? ["framework_id","framework_version_id"] : kind==="membership" ? ["tenant_membership_id"] : ["retention_policy_id"];
 for (const [key,value] of params) {
  if(seen.has(key) || !value) invalid(); seen.add(key);
  if(key==="purpose") q.purpose=value;
  else if(key==="page[size]") {if(!/^[1-9][0-9]*$/.test(value) || Number(value)>100) invalid();q.size=Number(value);}
  else if(key==="page[cursor]") {if(value.length>2048) invalid();q.cursor=value;}
  else if(key==="filter[query]") {if(value.length<2 || value.length>160 || value!==value.trim()) invalid();q.filters.query=value;}
  else if(ids.some(id=>key===`filter[${id}]`)) {if(!isId(value)) invalid();q.filters[key.slice(7,-1)]=value;}
  else if(kind==="retention" && key==="filter[policy_kind]") {if(!["legal_hold","mandatory_regulatory_policy","contractual_policy","tenant_policy","product_baseline"].includes(value)) invalid();q.filters.policy_kind=value;}
  else if(kind==="retention" && key==="filter[version_number]") {if(!/^[1-9][0-9]*$/.test(value) || BigInt(value)>9223372036854775807n) invalid();q.filters.version_number=value;}
  else if(parentNames.includes(key)) {if(!isId(value)) invalid();q.parents[key]=value;}
  else invalid();
 }
 let required: string[]=[]; let optional: string[]=[];let oneOf: string[]=[];
 if(kind==="framework") {
  if(q.purpose==="history") {required=["statement_of_applicability_id"];if(!q.filters.framework_version_id || q.filters.query || q.filters.framework_id) invalid();}
  else if(q.purpose!=="select") invalid();
 } else if(kind==="membership") {
  if(q.purpose==="evidence-request-assignment") oneOf=["requirement_id","control_id","requirement_assessment_id","control_assessment_id","assurance_test_id"];
  else if(q.purpose==="action-assignment") required=["issue_id"];
  else if(q.purpose==="evidence-request-history") required=["evidence_request_id"];
  else if(q.purpose==="action-history") required=["action_id"];
  else if(q.purpose==="assurance-test-history") required=["assurance_test_id"];
  else invalid();
  if(q.purpose.endsWith("history") && (!q.filters.tenant_membership_id || q.filters.query)) invalid();
 } else {
  if(q.purpose==="upload") optional=[];
  else if(q.purpose==="evidence") optional=["file_object_id"];
  else if(q.purpose==="history") {oneOf=["evidence_id","file_object_id","file_upload_intent_id"];if(!q.filters.retention_policy_id || Object.keys(q.filters).length!==1) invalid();}
  else invalid();
 }
 if(required.some(p=>!q.parents[p]) || (oneOf.length && oneOf.filter(p=>q.parents[p]).length!==1) || Object.keys(q.parents).some(p=>![...required,...optional,...oneOf].includes(p))) invalid();
 return q;
}
const contextKey=(kind:ReferenceKind,actor:CoreActor,q:ReferenceQuery)=>createHash("sha256").update(JSON.stringify([kind==="membership"?"STEP6A3_MEMBERSHIP_READ_v2":"STEP6A3_REFERENCE_READS_v1",kind,actor.tenantId,actor.membershipId,q.purpose,Object.entries(q.parents).sort(),Object.entries(q.filters).sort()])).digest("base64url");
type Cursor={v:1|2; context:string; instant:string; after:[string,string,string]};
async function cursorState(codec:CoreGrcDependencies["referenceCursor"],kind:ReferenceKind,actor:CoreActor,q:ReferenceQuery):Promise<Cursor> {
 const context=contextKey(kind,actor,q);
 if(!q.cursor) return {v:kind==="membership"?2:1,context,instant:new Date().toISOString(),after:["","",""]};
 if(!codec) throw new FoundationError("TCDX.DEPENDENCY.UNAVAILABLE","Pagination unavailable",503,true);
 try {const c=JSON.parse(await codec.verifyReferenceCursor(q.cursor)) as Cursor;
 if(c.v!==(kind==="membership"?2:1) || c.context!==context || typeof c.instant!=="string" || !/^\d{4}-\d{2}-\d{2}T.+Z$/.test(c.instant) || !Number.isFinite(Date.parse(c.instant)) || Date.parse(c.instant)>Date.now() || !Array.isArray(c.after) || c.after.length!==3 || c.after.some(x=>typeof x!=="string") || !isId(c.after[2])) invalid();
 if(kind!=="membership" && (!/^[1-9][0-9]*$/.test(c.after[1]) || BigInt(c.after[1])>9223372036854775807n)) invalid();
 if(kind==="membership" && (c.after[1]!=="" || !/^\d{4}-\d{2}-\d{2}T.+Z$/.test(c.after[0]) || !Number.isFinite(Date.parse(c.after[0])))) invalid();
 return c;}catch {return invalid();}
}
/** No creator-derived ownership: parent policies use only published, persisted relations. */
async function parent(ex:Executor,actor:CoreActor,key:ResourceKey,id:string,permission?:string):Promise<Row> {
 const resource={...resources[key],ownedByCreator:false}; const p=permission??resource.permission;
 if(key==="soa") {
  requireAccess(actor,p,"ISO_COMPLIANCE",["tenant"]);
  const found=await sql<Row>`SELECT statement_of_applicability_id,framework_version_id FROM regulatory.statements_of_applicability WHERE tenant_id=${actor.tenantId}::uuid AND statement_of_applicability_id=${id}::uuid`.execute(ex);
  if(found.rows.length!==1) hidden();return found.rows[0]!;
 }
 requireAccess(actor,p,resource.capability,allScopes);
 return getResource(ex,actor,resource,id,false,p);
}
function referenceScope(actor:CoreActor,permission:string,row:Row,assignedFields:string[]):void {
 const scopes=grantedScopes(actor,permission);
 if(scopes.has("tenant")) return;
 if(scopes.has("assigned_object") && assignedFields.some(field=>row[field]===actor.membershipId)) return;
 // No canonical owner/audit-engagement relation exists on these parents. Never manufacture one.
 hidden();
}
async function authorizeMembership(ex:Executor,actor:CoreActor,q:ReferenceQuery):Promise<void> {
 const permission=referencePermissions.membership;
 requireAccess(actor,permission,"CORE_PLATFORM",allScopes);
 if(q.purpose.endsWith("assignment")) {
  const action=q.purpose==="action-assignment";
  const command=action?"remediation.action.create":"evidence.evidence_request.create";
  requireAccess(actor,command,action?"ISSUES_ACTIONS":"EVIDENCE_DOCUMENTS",["tenant"]);
  requireAccess(actor,permission,"CORE_PLATFORM",["tenant"]);
  const [field,id]=Object.entries(q.parents)[0]!;
  if(action) {await parent(ex,actor,"issue",id,command);return;}
  const map:Record<string,ResourceKey>={control_id:"control",requirement_assessment_id:"requirementAssessment",control_assessment_id:"controlAssessment",assurance_test_id:"assuranceTest"};
  if(field!=="requirement_id") {await parent(ex,actor,map[field]!,id,command);return;}
  const vis=await packVisibility(ex,actor.tenantId,actor.runtimeEnvironment);
  const found=await sql<Row>`SELECT r.requirement_id FROM regulatory.requirements r WHERE r.requirement_id=${id}::uuid AND (r.tenant_id=${actor.tenantId}::uuid OR (r.tenant_id IS NULL AND r.framework_version_id=ANY(${[...vis.frameworkVersionIds]}::uuid[])))`.execute(ex);
  if(found.rows.length!==1) hidden();return;
 }
 const key=q.purpose==="action-history"?"action":q.purpose==="evidence-request-history"?"evidenceRequest":"assuranceTest";
 const row=await parent(ex,actor,key,Object.values(q.parents)[0]!);
 const fields=key==="action"?["assigned_membership_id"]:key==="evidenceRequest"?["requested_by_membership_id","assigned_membership_id"]:["executor_membership_id","reviewer_membership_id"];
 referenceScope(actor,permission,row,fields);
 if(!fields.some(field=>row[field]===q.filters.tenant_membership_id)) hidden();
}
/** Fresh command eligibility uses the same persisted roots as CT01, without borrowing its read grant. */
export async function assertSelectableFramework(ex:Executor,actor:CoreActor,id:string,lock=true):Promise<void> {
 const vis=await packVisibility(ex,actor.tenantId,actor.runtimeEnvironment);
 const official=[...vis.frameworkAccessModes].filter(([,mode])=>mode==="official").map(([id])=>id);
 const validation=[...vis.frameworkAccessModes].filter(([,mode])=>mode==="non_authoritative_validation").map(([id])=>id);
 const result=await sql<Row>`SELECT fv.framework_version_id FROM regulatory.framework_versions fv JOIN regulatory.frameworks f ON f.framework_id=fv.framework_id
 WHERE fv.framework_version_id=${id}::uuid AND fv.ownership_class=f.ownership_class
 AND (fv.effective_from IS NULL OR fv.effective_from<=clock_timestamp()) AND (fv.effective_to IS NULL OR fv.effective_to>clock_timestamp())
 AND ((fv.tenant_id=${actor.tenantId}::uuid AND f.tenant_id=${actor.tenantId}::uuid AND fv.lifecycle_state='published' AND f.lifecycle_state='published')
 OR (fv.tenant_id IS NULL AND f.tenant_id IS NULL AND ((fv.framework_version_id=ANY(${official}::uuid[]) AND fv.lifecycle_state='published' AND f.lifecycle_state='published') OR fv.framework_version_id=ANY(${validation}::uuid[]))))
 ${sql.raw(lock ? "FOR SHARE OF fv,f" : "")}`.execute(ex);
 if(result.rows.length!==1) hidden();
}
export async function assertAssignableMembership(ex:Executor,tenantId:string,id:string):Promise<void> {
 const found=await sql<Row>`SELECT m.tenant_membership_id FROM iam.tenant_memberships m JOIN iam.user_identities u ON u.user_identity_id=m.user_identity_id WHERE m.tenant_id=${tenantId}::uuid AND m.tenant_membership_id=${id}::uuid AND m.membership_state='active' AND m.joined_at<=clock_timestamp() AND (m.ended_at IS NULL OR m.ended_at>clock_timestamp()) AND u.lifecycle_state='active' AND length(btrim(u.display_name))>0 FOR SHARE OF m,u`.execute(ex);
 if(found.rows.length!==1) hidden();
}
function normalize(row:Row):Row {
 return Object.fromEntries(Object.entries(row).map(([key,value])=>[key,value instanceof Date?value.toISOString():["version_number","retention_seconds"].includes(key)&&value!==null ? rawInteger(String(value)) : value]));
}
function rawInteger(value:string):unknown {
 if(!/^[0-9]+$/.test(value)) throw new Error("Invalid persisted integer");
 const n=Number(value); if(Number.isSafeInteger(n)) return n;
 // Node 22 supports exact decimal JSON tokens. Never round PostgreSQL int64.
 return (JSON as unknown as {rawJSON(value:string):unknown}).rawJSON(value);
}
export async function readReferencePage(ex:Executor,actor:CoreActor,kind:ReferenceKind,q:ReferenceQuery,codec?:CoreGrcDependencies["referenceCursor"]):Promise<{items:Row[];page:{has_more:boolean;next_cursor:string|null}}> {
 const history=q.purpose.endsWith("history");const perm=referencePermissions[kind];
 requireAccess(actor,perm,kind==="framework"?"ISO_COMPLIANCE":kind==="membership"?"CORE_PLATFORM":"EVIDENCE_DOCUMENTS",kind==="framework"?["tenant"]:allScopes);
 const c=await cursorState(codec,kind,actor,q);
 await requireReferencePublication(ex);
 await requireReferenceGrantPublication(ex,actor.tenantId,actor.membershipId,perm);
 const values:unknown[]=[];const bind=(v:unknown,cast="")=>{values.push(v);return `$${values.length}${cast}`;};
 const tenant=bind(actor.tenantId,"::uuid"),instant=bind(c.instant,"::timestamptz");
 const clauses:string[]=[];let from="",select="",id="",first="",second="";let descending=false;
 if(kind==="framework") {
  if(history) {const row=await parent(ex,actor,"soa",q.parents.statement_of_applicability_id!);if(row.framework_version_id!==q.filters.framework_version_id) hidden();}
  const vis=await packVisibility(ex,actor.tenantId,actor.runtimeEnvironment);
  const official=[...vis.frameworkAccessModes].filter(([,mode])=>mode==="official").map(([id])=>id);
  const validation=[...vis.frameworkAccessModes].filter(([,mode])=>mode==="non_authoritative_validation").map(([id])=>id);
  const officialIds=bind(official,"::uuid[]"),validationIds=bind(validation,"::uuid[]");
  const active=`(fv.effective_from IS NULL OR fv.effective_from<=${instant}) AND (fv.effective_to IS NULL OR fv.effective_to>${instant})`;
  const ownership=`fv.ownership_class=f.ownership_class`;
  const published=`fv.lifecycle_state='published' AND f.lifecycle_state='published'`;
  const visible=`(${ownership} AND ((fv.tenant_id=${tenant} AND f.tenant_id=${tenant}${history?"":` AND ${published} AND ${active}`}) OR (fv.tenant_id IS NULL AND f.tenant_id IS NULL AND ((fv.framework_version_id=ANY(${officialIds}) AND ${history?"TRUE":`${published} AND ${active}`}) OR (fv.framework_version_id=ANY(${validationIds}) AND ${history?"TRUE":active})))) )`;
  clauses.push(visible);from="regulatory.framework_versions fv JOIN regulatory.frameworks f ON f.framework_id=fv.framework_id";
  id="fv.framework_version_id";first='f.framework_code COLLATE "C"';second="fv.version_number";descending=true;
  select=`fv.framework_version_id,f.framework_id,f.framework_code,f.name AS framework_name,fv.edition,fv.version_number::text,fv.ownership_class,fv.lifecycle_state,fv.effective_from,fv.effective_to,fv.published_at,CASE WHEN fv.framework_version_id=ANY(${validationIds}) THEN 'non_authoritative_validation' ELSE 'official' END AS access_mode,(((${published}) OR (fv.framework_version_id=ANY(${validationIds}) AND fv.tenant_id IS NULL AND f.tenant_id IS NULL)) AND ${active}) AS selectable`;
  for(const [key,expr] of [["framework_id","f.framework_id"],["framework_version_id",id]]) if(q.filters[key!]) clauses.push(`${expr}=${bind(q.filters[key!],"::uuid")}`);
 } else if(kind==="membership") {
  await authorizeMembership(ex,actor,q);
  from="iam.tenant_memberships m JOIN iam.user_identities u ON u.user_identity_id=m.user_identity_id";id="m.tenant_membership_id";first="m.joined_at";second="m.tenant_membership_id";
  const active=`m.membership_state='active' AND m.joined_at<=${instant} AND (m.ended_at IS NULL OR m.ended_at>${instant}) AND u.lifecycle_state='active' AND length(btrim(u.display_name))>0`;
  select=`m.tenant_membership_id,u.display_name,to_char(m.joined_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS joined_at,(${active}) AS selectable`;clauses.push(`m.tenant_id=${tenant}`);
  if(!history) {
   clauses.push(active);
   const ambiguity=await sql<Row>`SELECT 1 FROM iam.tenant_memberships m JOIN iam.user_identities u ON u.user_identity_id=m.user_identity_id
    WHERE m.tenant_id=${actor.tenantId}::uuid AND m.membership_state='active' AND m.joined_at<=${c.instant}::timestamptz AND (m.ended_at IS NULL OR m.ended_at>${c.instant}::timestamptz) AND u.lifecycle_state='active' AND length(btrim(u.display_name))>0
    AND (${q.filters.tenant_membership_id??null}::uuid IS NULL OR m.tenant_membership_id=${q.filters.tenant_membership_id??null}::uuid)
    AND (${q.filters.query??null}::text IS NULL OR u.display_name ILIKE '%' || ${q.filters.query?.replace(/[\\%_]/g,"\\$&")??null} || '%' ESCAPE '\\')
    GROUP BY u.display_name COLLATE "C" HAVING count(*)>1 LIMIT 1`.execute(ex);
   if(ambiguity.rows.length) throw new FoundationError("TCDX.CONFLICT.RESOURCE","Reference is ambiguous",409);
  }
  if(q.filters.tenant_membership_id) clauses.push(`${id}=${bind(q.filters.tenant_membership_id,"::uuid")}`);
 } else {
  let exactPolicy:string|undefined;
  if(history) {
   const key=q.parents.evidence_id?"evidence":q.parents.file_object_id?"fileObject":"fileUploadIntent";
   const row=await parent(ex,actor,key,Object.values(q.parents)[0]!);
   referenceScope(actor,perm,row,key==="evidence"?["assigned_membership_id"]:[]);
   if(row.retention_policy_id!==q.filters.retention_policy_id) hidden();exactPolicy=q.filters.retention_policy_id;
  } else {
   requireAccess(actor,q.purpose==="upload"?"evidence.document.create":"evidence.evidence.create","EVIDENCE_DOCUMENTS",["tenant"]);
   requireAccess(actor,perm,"EVIDENCE_DOCUMENTS",["tenant"]);
   if(q.parents.file_object_id) {const row=await parent(ex,actor,"fileObject",q.parents.file_object_id);if(row.scan_status!=="passed") invariant();exactPolicy=String(row.retention_policy_id);if(q.filters.retention_policy_id && exactPolicy!==q.filters.retention_policy_id) invariant();}
  }
  const vis=await packVisibility(ex,actor.tenantId,actor.runtimeEnvironment);
  const packIds=bind(vis.packs.filter(p=>p.access_mode==="official").map(p=>p.regulatory_pack_version_id),"::uuid[]");
  const active=`rp.lifecycle_state='published' AND rp.effective_from IS NOT NULL AND rp.effective_from<=${instant} AND (rp.effective_to IS NULL OR rp.effective_to>${instant})`;
  const discovery=`rp.tenant_id IS NULL AND (rp.policy_kind='product_baseline' OR (rp.policy_kind='mandatory_regulatory_policy' AND EXISTS(SELECT 1 FROM regulatory.regulatory_import_manifests im WHERE im.regulatory_source_id=rp.regulatory_source_id AND im.regulatory_pack_version_id=ANY(${packIds}) AND im.outcome='validated')))`;
  clauses.push(history?`(rp.tenant_id=${tenant} OR rp.tenant_id IS NULL)`:`(rp.tenant_id=${tenant} OR (${discovery})) AND ${active}`);
  from="privacy.retention_policies rp";id="rp.retention_policy_id";first='rp.policy_code COLLATE "C"';second="rp.version_number";descending=true;
  // Current physical model has no typed legal applicability binding. Discovery is not eligibility.
  select="rp.retention_policy_id,rp.policy_code,rp.version_number::text,rp.policy_kind,rp.retention_seconds::text,rp.trigger_event_code,rp.precedence_rank,rp.is_mandatory,rp.ownership_class,rp.lifecycle_state,rp.effective_from,rp.effective_to,false AS selectable";
  if(!history) {
    const initialActor=actor.roles.includes('TENANT_ADMIN') || actor.roles.includes('EVIDENCE_OWNER');
    const selectable=`rp.tenant_id=${tenant} AND rp.ownership_class='TENANT_OWNED' AND rp.policy_kind<>'legal_hold' AND ${active}
      AND EXISTS (SELECT 1 FROM privacy.retention_policy_applicabilities a
        WHERE a.tenant_id=rp.tenant_id AND a.retention_policy_id=rp.retention_policy_id AND a.purpose='evidence_document'
        AND ((a.lifecycle_state='published' AND a.effective_from<=${instant} AND (a.effective_to IS NULL OR a.effective_to>${instant}))
          OR (${initialActor?'TRUE':'FALSE'} AND a.lifecycle_state='draft' AND a.source_evidence_version_id IS NULL
            AND a.version_number=1 AND a.supersedes_applicability_id IS NULL
            AND EXISTS (SELECT 1 FROM iam.tenant_memberships tm JOIN iam.membership_roles mr
              ON mr.tenant_id=tm.tenant_id AND mr.tenant_membership_id=tm.tenant_membership_id
              JOIN iam.roles rr ON rr.tenant_id=mr.tenant_id AND rr.role_id=mr.role_id
              WHERE tm.tenant_id=a.tenant_id AND tm.user_identity_id=a.created_by_user_identity_id
                AND tm.membership_state='active' AND rr.lifecycle_state='published' AND rr.role_code='TENANT_ADMIN'
                AND mr.scope_kind='tenant' AND mr.valid_from<=${instant} AND (mr.valid_to IS NULL OR mr.valid_to>${instant}))
            AND NOT EXISTS (SELECT 1 FROM privacy.retention_policy_applicabilities peer
              JOIN privacy.retention_policies pp ON pp.tenant_id=peer.tenant_id AND pp.retention_policy_id=peer.retention_policy_id
              WHERE peer.tenant_id=a.tenant_id AND peer.classification=a.classification AND peer.purpose=a.purpose
                AND (peer.scope_subject_id IS NULL OR peer.scope_subject_id=a.scope_subject_id)
                AND (peer.processing_activity_id IS NULL OR peer.processing_activity_id=a.processing_activity_id)
                AND peer.lifecycle_state='published' AND peer.effective_from<=${instant} AND (peer.effective_to IS NULL OR peer.effective_to>${instant})
                AND pp.lifecycle_state='published' AND pp.policy_kind<>'legal_hold' AND pp.effective_from<=${instant} AND (pp.effective_to IS NULL OR pp.effective_to>${instant})))))`;
    // Eligibility is contextual and revalidated by the command, never inferred
    // from publication of an ordinary policy alone.
    select=select.replace('false AS selectable',`(${selectable}) AS selectable`);
  }
  if(exactPolicy) clauses.push(`${id}=${bind(exactPolicy,"::uuid")}`);
  for(const [key,expr,cast] of [["retention_policy_id",id,"::uuid"],["policy_kind","rp.policy_kind",""],["version_number","rp.version_number","::bigint"]]) if(q.filters[key!]) clauses.push(`${expr}=${bind(q.filters[key!],cast)}`);
 }
 if(q.filters.query) {const pattern=bind(q.filters.query.replace(/[\\%_]/g,"\\$&"));const name=kind==="framework"?"(f.framework_code || ' ' || f.name || ' ' || fv.edition)":kind==="membership"?"u.display_name":"rp.policy_code";clauses.push(`${name} ILIKE '%' || ${pattern} || '%' ESCAPE '\\'`);}
 if(q.cursor) {
  if(kind==="membership") clauses.push(`(m.joined_at,m.tenant_membership_id)>(${bind(c.after[0],"::timestamptz")},${bind(c.after[2],"::uuid")})`);
  else {const a=bind(c.after[0]),b=bind(c.after[1],"::bigint"),d=bind(c.after[2],"::uuid");
  clauses.push(`(${first}>${a} COLLATE "C" OR (${first}=${a} COLLATE "C" AND (${second}${descending?"<":">"}${b} OR (${second}=${b} AND ${id}>${d}))))`);}
 }
 const result=await ex.executeQuery<Row>(CompiledQuery.raw(`SELECT ${select} FROM ${from} WHERE ${clauses.join(" AND ")} ORDER BY ${first} ASC,${second} ${descending?"DESC":"ASC"},${id} ASC LIMIT ${bind(q.size+1,"::integer")}`,values));
 const more=result.rows.length>q.size;const rows=result.rows.slice(0,q.size);
 if(history && rows.length!==1) hidden();
 if(kind==="retention" && !history && rows.length>0 && !rows.some(row=>row.selectable===true)) invariant();
 let next:string|null=null;
 if(more) {
  if(!codec) throw new FoundationError("TCDX.DEPENDENCY.UNAVAILABLE","Pagination unavailable",503,true);
  const last=rows.at(-1)!;const idField=kind==="framework"?"framework_version_id":kind==="membership"?"tenant_membership_id":"retention_policy_id";
  const after:[string,string,string]=kind==="membership"?[last.joined_at instanceof Date?last.joined_at.toISOString():String(last.joined_at),"",String(last[idField])]:[String(last[kind==="framework"?"framework_code":"policy_code"]),String(last.version_number),String(last[idField])];
  next=await codec.signReferenceCursor(JSON.stringify({...c,after}));if(next.length>2048) throw new FoundationError("TCDX.DEPENDENCY.UNAVAILABLE","Pagination unavailable",503,true);
 }
 return {items:rows.map(normalize),page:{has_more:more,next_cursor:next}};
}
