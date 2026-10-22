import {describe,it,expect} from 'vitest';
import {NORMATIVE_LIBRARY} from '@tcdx-grc/contracts/normative-library';
import {matchesLibraryRegistry,type RuntimeLibraryEdge} from './lifecycle.js';
const binding=NORMATIVE_LIBRARY.lifecycle.bindings[0]!;
const row:RuntimeLibraryEdge={to_state:binding.to_state,audit_event_code:binding.audit_event_code,precondition_policy_ref:binding.precondition_policy_ref,sod_policy_ref:binding.sod_policy_ref,system_actor_allowed:false,scope_kind:'tenant',idempotency_semantics:binding.idempotency_semantics,concurrency_semantics:binding.concurrency_semantics,notification_policy_ref:'NONE',recalculation_policy_ref:'NONE',side_effect_event_codes:binding.side_effect_event_codes,all_effects_required:true};
describe('B06 exact runtime binding adoption without activating registry',()=>{
 it('accepts the exact binding and rejects missing or additional scope/effects',()=>{expect(matchesLibraryRegistry(binding,[row])).toBe(true);expect(matchesLibraryRegistry(binding,[])).toBe(false);expect(matchesLibraryRegistry(binding,[row,{...row,scope_kind:'platform'}])).toBe(false);expect(matchesLibraryRegistry(binding,[{...row,side_effect_event_codes:[...row.side_effect_event_codes,'unexpected']}])).toBe(false);});
 it.each(['to_state','audit_event_code','precondition_policy_ref','sod_policy_ref','idempotency_semantics','concurrency_semantics','notification_policy_ref','recalculation_policy_ref'] as const)('rejects a mismatched %s',key=>{expect(matchesLibraryRegistry(binding,[{...row,[key]:'unexpected'}])).toBe(false);});
 it('does not silently accept service actors or optional side effects',()=>{expect(matchesLibraryRegistry(binding,[{...row,system_actor_allowed:true}])).toBe(false);expect(matchesLibraryRegistry(binding,[{...row,all_effects_required:false}])).toBe(false);});
});
