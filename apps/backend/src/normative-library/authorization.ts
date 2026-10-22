import { NORMATIVE_LIBRARY } from '@tcdx-grc/contracts/normative-library';
import type { CoreActor } from '../core-grc/model.js';
import { requireAccess } from '../core-grc/security.js';
import type { PlatformActor } from '../security/platform-authority.js';
import { requirePlatformAccess } from '../security/platform-authority.js';
import { FoundationError } from '../errors.js';

export type Ownership = { ownership_class: 'TENANT_OWNED' | 'PLATFORM_CONTROL' | 'GLOBAL_REFERENCE'; tenant_id: string | null };
export function deny(): never { throw new FoundationError('TCDX.AUTHORIZATION.DENIED', 'Access denied', 403); }
export function concealed(): never { throw new FoundationError('TCDX.RESOURCE.NOT_FOUND', 'Resource not found', 404); }
export function invalid(field?: string): never { throw new FoundationError('TCDX.VALIDATION.FAILED', 'Validation failed', 400, false, field ? { field } : undefined); }
export function invariant(message: string): never { throw new FoundationError('TCDX.VALIDATION.FAILED', message, 422); }
export function authorizeLibraryOperation(actor: CoreActor | PlatformActor, operationId: string, object?: Ownership): 'body_available' | 'metadata_only' {
  const op = [...NORMATIVE_LIBRARY.registry.new_operations,...NORMATIVE_LIBRARY.existingOperations].find(o => o.operation_id === operationId);
  if (!op) deny();
  if (op.context === 'PLATFORM') {
    if (!('identity' in actor) || actor.identity.principalClass !== 'HUMAN_INTERACTIVE') deny();
    requirePlatformAccess(actor, op.permission);
    if (object && (object.tenant_id !== null || object.ownership_class === 'TENANT_OWNED')) concealed();
    if (actor.roles.includes('PLATFORM_ADMIN')) return 'body_available';
    if (actor.roles.includes('PLATFORM_SUPPORT') && op.method === 'get') return 'metadata_only';
    deny();
  }
  if ('identity' in actor) deny();
  requireAccess(actor, op.permission, 'CORE_PLATFORM', ['tenant']);
  if (object?.ownership_class === 'TENANT_OWNED' && object.tenant_id !== actor.tenantId) concealed();
  if (object && ((object.ownership_class === 'TENANT_OWNED') !== (object.tenant_id !== null))) concealed();
  if (op.policy === 'CONTROL_OVERRIDE_DEFINITION_REFERENCE' && !actor.roles.some(r=>r==='TENANT_ADMIN'||r==='GRC_MANAGER')) deny();
  if (op.method !== 'get') {
    if (object && object.ownership_class !== 'TENANT_OWNED') deny();
    if (op.policy.includes('AUTHOR') && !actor.roles.some(r => r === 'TENANT_ADMIN' || r === 'GRC_MANAGER')) deny();
    if (['CONTROL_OVERRIDE_REVIEWER','CONTROL_OVERRIDE_DECIDER','KNOWLEDGE_TENANT_REVIEW','KNOWLEDGE_TENANT_PUBLISH'].includes(op.policy) && !actor.roles.includes('GRC_MANAGER')) deny();
  }
  return 'body_available';
}
/** Pack rights/target scope remain separate checks; a relation never grants access. */
export function assertCompatibleOwnership(source: Ownership, target: Ownership): void {
  if ((source.ownership_class === 'TENANT_OWNED') !== (source.tenant_id !== null) ||
      (target.ownership_class === 'TENANT_OWNED') !== (target.tenant_id !== null)) invariant('Invalid ownership');
  if (target.tenant_id !== null && target.tenant_id !== source.tenant_id) concealed();
}
