import { NORMATIVE_LIBRARY } from '@tcdx-grc/contracts/normative-library';
import { FoundationError } from '../errors.js';

/** Detect an actual registry representability conflict; never guess runtime versions. */
export function lifecycleRegistryConflicts(edges:readonly {entity_type:string;from_state:string;command_code:string;to_state:string}[]=NORMATIVE_LIBRARY.lifecycle.bindings) {
  const groups = new Map<string, Set<string>>();
  for (const edge of edges) {
    const key = [edge.entity_type,edge.from_state,edge.command_code].join('/');
    const targets = groups.get(key) ?? new Set<string>();targets.add(edge.to_state);groups.set(key,targets);
  }
  return [...groups].filter(([,targets])=>targets.size > 1).map(([registryKey,targets])=>({ registryKey,targets:[...targets].sort(),constraint:'UNIQUE(entity_type,from_state,command_code,version_number)',resolver:'DISTINCT ON(entity_type,from_state,command_code) ORDER BY version_number DESC' }));
}
export function assertRepresentableLifecycleCommand(operationId: string): void {
  if (NORMATIVE_LIBRARY.lifecycle.bindings.some(e => e.operation_id === operationId && lifecycleRegistryConflicts().some(c => c.registryKey === [e.entity_type,e.from_state,e.command_code].join('/')))) {
    throw new FoundationError('TCDX.LIFECYCLE.TRANSITION_DENIED','Published lifecycle binding cannot yet be adopted by the canonical runtime registry',409);
  }
}

// SQL adoption is deliberately separate from the immutable contract binding version.
// Actual runtime rows must exist and match every selected policy before a command can run.

/** The PO-approved B06 successor changes internal registry keys, never the API or audit command. */
export function selectLibraryTransition(operationId:string,fromState:string,body:Record<string,unknown>){
  const dispatch=NORMATIVE_LIBRARY.decisionDispatch.bindings.filter(b=>b.operation_id===operationId&&b.from_state===fromState);
  const command=dispatch.length?dispatch.find(b=>b.to_state===body.decision)?.command_code:undefined;
  const edges=NORMATIVE_LIBRARY.lifecycle.bindings.filter(e=>e.operation_id===operationId&&e.from_state===fromState&&(!dispatch.length||e.command_code===command));
  if(edges.length!==1)throw new FoundationError('TCDX.LIFECYCLE.TRANSITION_DENIED','No exact published lifecycle decision binding',409);
  return edges[0]!;
}

export type RuntimeLibraryEdge={to_state:string;audit_event_code:string;precondition_policy_ref:string;sod_policy_ref:string;system_actor_allowed:boolean;scope_kind:string;idempotency_semantics:string;concurrency_semantics:string;notification_policy_ref:string;recalculation_policy_ref:string;side_effect_event_codes:readonly string[];all_effects_required:boolean};
/** Runtime adoption must match the entire effective binding, including the complete scope/effect sets. */
export function matchesLibraryRegistry(binding:(typeof NORMATIVE_LIBRARY.lifecycle.bindings)[number],rows:readonly RuntimeLibraryEdge[]):boolean{
 if(JSON.stringify([...new Set(rows.map(r=>r.scope_kind))].sort())!==JSON.stringify([...binding.allowed_scopes].sort()))return false;
 return rows.length>0&&rows.every(r=>r.to_state===binding.to_state&&r.audit_event_code===binding.audit_event_code&&r.precondition_policy_ref===binding.precondition_policy_ref&&r.sod_policy_ref===binding.sod_policy_ref&&r.system_actor_allowed===binding.system_actor_allowed&&r.idempotency_semantics===binding.idempotency_semantics&&r.concurrency_semantics===binding.concurrency_semantics&&r.notification_policy_ref===binding.notification_policy&&r.recalculation_policy_ref===binding.recalculation_policy&&r.all_effects_required&&JSON.stringify(r.side_effect_event_codes)===JSON.stringify(binding.side_effect_event_codes));
}
