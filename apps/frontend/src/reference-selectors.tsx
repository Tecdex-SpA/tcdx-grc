import { TenantTimezoneContext } from "./tenant-timezone.js";
import React, { useEffect, useId, useRef, useState } from "react";
import { ApiClient, ApiProblem } from "./api-client.js";
import { readBusinessReferences, type BusinessReferenceContext, readReferences, readControlVersions, readEvidenceVersions, referenceReads, type ReferenceEntity, type ReferencePage, type ReferenceOption, type ReferenceContext } from "./reference-read.js";
import { FORM_VOCABULARIES, PUBLISHED_VOCABULARY_LABELS, VOCABULARY_FIELD_SCHEMAS, PUBLISHED_LIFECYCLE_STATES, type FormVocabularyKey } from "@tcdx-grc/contracts";
import { publishedOptionLabel } from "./i18n/display-text.js";
import { uiText } from "./i18n/es.js";

export type ReferenceEmptyState = "NO_RECORDS" | "NO_ELIGIBLE_RECORDS" | "NO_PERMISSION" | "MISSING_CONFIGURATION" | "CATALOG_NOT_PUBLISHED" | "TEMPORARY_READ_FAILURE" | "LOCALIZATION_UNAVAILABLE" | "LEGAL_BINDING_PENDING" | "AMBIGUOUS_REFERENCE";
const messages = uiText.references.messages;
export function ReferenceState({ state }: { state: ReferenceEmptyState }) {
  return <p className={state === "TEMPORARY_READ_FAILURE" || state === "NO_PERMISSION" ? "form-error" : "form-guidance"} role={state === "TEMPORARY_READ_FAILURE" || state === "NO_PERMISSION" ? "alert" : "status"}>{messages[state]}</p>;
}
type Shared = { api: ApiClient; value: string; onChange(value: string): void; onOption?(row:Record<string,unknown>|undefined):void; disabled?: boolean; permissionState?: "allowed" | "denied" | "unknown"; required?: boolean; invalid?: boolean };
type PickerProps = Shared & { label: string; contextKey: string; load(cursor: string | undefined, signal: AbortSignal): Promise<ReferencePage>; search?: React.ReactNode; emptyState?: ReferenceEmptyState; restartCursorOn400?:boolean };
// Presentation only. Reads/policies are supplied exclusively by entity-specific wrappers below.
function PagedReferencePicker({ api, value, onChange, onOption, label, contextKey, load, disabled, permissionState = "unknown", search, required, invalid, emptyState = "NO_RECORDS", restartCursorOn400=false }: PickerProps) {
  const id = useId(); const tenant = api.currentTenantId(); const key = `${tenant}:${contextKey}`;
  const [page, setPage] = useState<{ key: string; options: ReferenceOption[]; cursor: string | null }>({ key, options: [], cursor: null });
  const [loading, setLoading] = useState(false); const [error, setError] = useState<ReferenceEmptyState>();
  const [retry, setRetry] = useState(0); const [more, setMore] = useState<string>();
  const [validated, setValidated] = useState("");
  const previousKey = useRef(key);
  useEffect(() => {
    const controller = new AbortController();
    setPage({ key, options: [], cursor: null }); setMore(undefined); setError(undefined); setValidated("");
    const initialValue = previousKey.current === key ? value : "";
    previousKey.current = key;
    if (value && !initialValue) onChange("");
    if (permissionState === "denied" || disabled || !tenant) { if (value) onChange(""); setLoading(false); return () => controller.abort(); }
    setLoading(true);
    void (async () => {
      let result = await load(undefined, controller.signal);
      const seen = new Set<string>();
      while (initialValue && !result.options.some(option => option.value === initialValue) && result.nextCursor) {
        if (controller.signal.aborted || seen.has(result.nextCursor)) throw new Error("INVALID_REFERENCE_CURSOR");
        seen.add(result.nextCursor);
        const more = await load(result.nextCursor, controller.signal);
        result = { options: [...result.options, ...more.options], nextCursor: more.nextCursor };
      }
      return result;
    })().then(result => {
      if (controller.signal.aborted || api.currentTenantId() !== tenant) return;
      setPage({ key, options: result.options, cursor: result.nextCursor }); setLoading(false);
      if (initialValue) { if (result.options.some(option => option.value === initialValue)) setValidated(key); else onChange(""); }
    }).catch(cause => {
      if (controller.signal.aborted) return;
      if ((cause instanceof ApiProblem && [401, 403, 409, 422].includes(cause.status)) || (cause instanceof Error && cause.message === "REFERENCE_LOCALIZATION_UNAVAILABLE")) { setPage({ key, options: [], cursor: null }); setValidated(""); onChange(""); }
      setError(cause instanceof ApiProblem && [401, 403].includes(cause.status) ? "NO_PERMISSION" : cause instanceof Error && cause.message === "REFERENCE_LOCALIZATION_UNAVAILABLE" ? "LOCALIZATION_UNAVAILABLE" : cause instanceof ApiProblem && cause.status === 422 ? "LEGAL_BINDING_PENDING" : cause instanceof ApiProblem && cause.status === 409 ? "AMBIGUOUS_REFERENCE" : "TEMPORARY_READ_FAILURE"); setLoading(false);
    });
    return () => controller.abort();
  }, [api, key, retry, permissionState, disabled]);
  useEffect(() => {
    if (!more || page.key !== key) return;
    const controller = new AbortController(); setLoading(true); setError(undefined);
    void load(more, controller.signal).then(result => {
      if (controller.signal.aborted || api.currentTenantId() !== tenant) return;
      setPage(old => ({ key, options: [...old.options, ...result.options.filter(option => !old.options.some(item => item.value === option.value))], cursor: result.nextCursor })); setLoading(false); setMore(undefined);
    }).catch(cause => { if (!controller.signal.aborted) { if(restartCursorOn400 && cause instanceof ApiProblem && cause.status===400){setPage({key,options:[],cursor:null});setValidated("");onChange("");setMore(undefined);setRetry(x=>x+1);setLoading(false);return;} if ((cause instanceof ApiProblem && [401, 403, 409, 422].includes(cause.status)) || (cause instanceof Error && cause.message === "REFERENCE_LOCALIZATION_UNAVAILABLE")) { setPage({ key, options: [], cursor: null }); setValidated(""); onChange(""); }
      setError(cause instanceof ApiProblem && [401, 403].includes(cause.status) ? "NO_PERMISSION" : cause instanceof Error && cause.message === "REFERENCE_LOCALIZATION_UNAVAILABLE" ? "LOCALIZATION_UNAVAILABLE" : cause instanceof ApiProblem && cause.status === 422 ? "LEGAL_BINDING_PENDING" : cause instanceof ApiProblem && cause.status === 409 ? "AMBIGUOUS_REFERENCE" : "TEMPORARY_READ_FAILURE"); setLoading(false); setMore(undefined); } });
    return () => controller.abort();
  }, [more, key]);
  // A caller-provided UUID is never displayed or accepted without an authorized option.
  const visible = page.key === key && permissionState !== "denied" && error !== "NO_PERMISSION" && error !== "LOCALIZATION_UNAVAILABLE" ? page.options : [];
  const selected = visible.some(option => option.value === value) && validated === key ? value : "";
  return <div className="control-version-selector">{search}<label htmlFor={id}>{label}</label><select id={id} required={required} aria-invalid={invalid || undefined} aria-describedby={`${id}-state`} disabled={disabled || loading || permissionState === "denied" || error === "NO_PERMISSION" || error === "LOCALIZATION_UNAVAILABLE" || error === "LEGAL_BINDING_PENDING" || error === "AMBIGUOUS_REFERENCE"} value={selected} onChange={event => { setValidated(key); onChange(event.target.value); onOption?.(visible.find(option=>option.value===event.target.value)?.row); }}><option value="">{loading ? uiText.references.loading : uiText.references.select}</option>{visible.map(option => <option key={option.value} value={option.value} disabled={option.row.selectable === false}>{option.label}</option>)}</select><div id={`${id}-state`}>{invalid && <p role="alert" className="form-error">{uiText.references.invalid}</p>}{permissionState === "denied" ? <ReferenceState state="NO_PERMISSION"/> : error ? <ReferenceState state={error}/> : disabled ? <p className="form-guidance">{uiText.references.parentRequired}</p> : !loading && visible.length === 0 ? <ReferenceState state={emptyState}/> : null}</div>{error === "TEMPORARY_READ_FAILURE" && <button type="button" className="button secondary" onClick={() => setRetry(x => x + 1)}>{uiText.actions.retry}</button>}{page.key === key && page.cursor && !error && <button type="button" className="button secondary" disabled={loading} onClick={() => setMore(page.cursor!)}>{uiText.references.more}</button>}</div>;
}
export function EntityReferenceSelect(props: Shared & { entity: ReferenceEntity; label: string; context?: ReferenceContext }) {
  const timezone = React.useContext(TenantTimezoneContext);
  const [searchInput, setSearchInput] = useState(""); const [query, setQuery] = useState("");
  const def = referenceReads[props.entity]; const context = { ...props.context, timezone, ...(query ? { query } : {}) };
  const search = "search" in def ? <div><label>{uiText.references.searchLabel(props.label)}<input type="search" maxLength={160} value={searchInput} onChange={event => setSearchInput(event.target.value)}/></label><button type="button" className="button secondary" disabled={searchInput.trim().length === 1} onClick={() => setQuery(searchInput.trim())}>{uiText.references.search}</button></div> : undefined;
  return <PagedReferencePicker {...props} disabled={props.disabled || (["requirement", "retentionPolicyApplicability"].includes(props.entity) && !context.parentId)} contextKey={JSON.stringify([props.entity, context.parentId, context.subjectType, context.query, context.initialSource, context.publishedOnly, context.classification, context.ownerSubjectId, timezone])} search={search} emptyState={props.entity === "retentionPolicyApplicability" && context.publishedOnly ? "NO_ELIGIBLE_RECORDS" : "NO_RECORDS"} load={(cursor, signal) => readReferences(props.api, props.entity, { ...context, cursor }, signal)}/>;
}
export function SubjectSelect(props: Shared) { return <EntityReferenceSelect {...props} entity="subject" label={uiText.references.owner}/>; }
export function MethodologySelect(props: Shared & { domain: "compliance" | "controls" }) { return <EntityReferenceSelect {...props} entity={props.domain === "compliance" ? "complianceMethodology" : "controlsMethodology"} label={uiText.references.methodology}/>; }
export function ControlVersionSelect(props: Shared & { ownership?: "reference" | "tenant"; parentControlId?: string; onParentControlChange?(id:string):void }) {
  const [controlId, setControlId] = useState(props.parentControlId ?? ""); const ownership = props.ownership ?? "reference";
  useEffect(()=>{if(props.parentControlId!==undefined)setControlId(props.parentControlId);},[props.parentControlId]);
  const tenant = props.api.currentTenantId();
  const [query, setQuery] = useState(""); const [input, setInput] = useState("");
  const eligible = (option: ReferenceOption) => ownership === "tenant" ? option.row.ownership_class === "TENANT_OWNED" : ["GLOBAL_REFERENCE", "PLATFORM_CONTROL"].includes(String(option.row.ownership_class));
  return <div className="control-version-selector">{props.parentControlId===undefined && <PagedReferencePicker {...props} value={controlId} onChange={id=>{setControlId(id);props.onParentControlChange?.(id);props.onChange("");}} label={ownership === "tenant" ? uiText.references.tenantControl : uiText.references.baseControl} contextKey={JSON.stringify([ownership, query])} search={<div><label>{uiText.references.searchControl}<input type="search" maxLength={160} value={input} onChange={event => setInput(event.target.value)}/></label><button type="button" className="button secondary" disabled={input.trim().length === 1} onClick={() => setQuery(input.trim())}>{uiText.references.search}</button></div>} emptyState="NO_ELIGIBLE_RECORDS" load={async (cursor, signal) => { const page = await readReferences(props.api, "control", { query: query || undefined, cursor }, signal); return { ...page, options: page.options.filter(eligible) }; }}/>}<PagedReferencePicker {...props} label={uiText.references.controlVersion} disabled={props.disabled || !controlId} contextKey={JSON.stringify([tenant, ownership, controlId])} load={(_, signal) => readControlVersions(props.api, controlId, ownership, signal)}/></div>;
}
export function ContractVocabularySelect({ schemaField, label, value, onChange, disabled }: { schemaField: FormVocabularyKey; label: string; value: string; onChange(value: string): void; onOption?(row:Record<string,unknown>|undefined):void; disabled?: boolean }) {
  const options: readonly (string | number)[] = FORM_VOCABULARIES[schemaField];
  const schema=(VOCABULARY_FIELD_SCHEMAS as Record<string,string>)[schemaField];
  const labelFor=(code:string|number)=>schema ? (PUBLISHED_VOCABULARY_LABELS as Record<string,Record<string,string>>)[schema]?.[String(code)] : publishedOptionLabel(code);
  return <label>{label}<select aria-label={label} value={value} disabled={disabled} onChange={event => onChange(event.target.value)}><option value="">{uiText.references.select}</option>{options.map(option => <option key={option} value={option} disabled={!labelFor(option)}>{labelFor(option) ?? uiText.references.translationUnavailable}</option>)}</select></label>;
}

export function LifecycleFilterSelect({ entity, label, value, onChange }: { entity: keyof typeof PUBLISHED_LIFECYCLE_STATES; label: string; value: string; onChange(value: string): void }) {
  return <label>{label}<select value={value} onChange={event => onChange(event.target.value)}><option value="">{uiText.references.allStates}</option>{PUBLISHED_LIFECYCLE_STATES[entity].map(state => <option key={state} value={state} disabled={!publishedOptionLabel(state, "lifecycle")}>{publishedOptionLabel(state, "lifecycle") ?? uiText.references.translationUnavailable}</option>)}</select></label>;
}

export function EvidenceVersionSelect(props: Shared & { evidenceId: string; requestId?: string }) {
  return <PagedReferencePicker {...props} label={uiText.references.approvedEvidence} disabled={props.disabled || !props.evidenceId} contextKey={JSON.stringify(["evidenceVersion", props.evidenceId, props.requestId])} emptyState="NO_ELIGIBLE_RECORDS" load={(_, signal) => readEvidenceVersions(props.api, props.evidenceId, props.requestId, signal)}/>;
}

export function BusinessReferenceSelect(props:Shared & {label:string; context:BusinessReferenceContext}) {
 return <PagedReferencePicker {...props} restartCursorOn400={props.context.kind==="membership"} contextKey={JSON.stringify(props.context)} emptyState="NO_ELIGIBLE_RECORDS" load={(cursor,signal)=>readBusinessReferences(props.api,{...props.context,cursor},signal)}/>;
}
