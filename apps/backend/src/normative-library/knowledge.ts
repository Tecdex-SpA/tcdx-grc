import { createHash } from 'node:crypto';
import { validateLibrarySchema, type KnowledgeWrite, type KnowledgeLink, type KnowledgeTarget } from '@tcdx-grc/contracts/normative-library';
import { hashCanonical } from '../regulatory/hash.js';
import { FoundationError } from '../errors.js';
import { assertCompatibleOwnership, concealed, invalid, invariant, type Ownership } from './authorization.js';

export type TargetFacts = Ownership & { id: string; kind: keyof KnowledgeTarget | string; readable: boolean };
export function validateKnowledgeWrite(input: unknown): KnowledgeWrite {
  if (!validateLibrarySchema('KnowledgeVersionWriteRequest', input).valid) invalid();
  const body = input as KnowledgeWrite;
  if (body.effective_to && Date.parse(body.effective_to) <= Date.parse(body.effective_from)) invariant('Invalid effective interval');
  const seen = new Set<string>();
  for (const link of body.links) {
    const key = hashCanonical({ target: link.target, context_role: link.context_role });
    if (seen.has(key)) invariant('Duplicate semantic Knowledge link');
    seen.add(key);
  }
  if ('comprender' in body.content) {
    for (const section of Object.values(body.content)) {
      for (const citation of section.citations) {
        const link = body.links[citation.link_ordinal];
        if (!link || (citation.excerpt_hash && link.excerpt_hash && citation.excerpt_hash !== link.excerpt_hash)) invariant('Citation does not match exact link manifest');
      }
    }
  } else if (!body.links.some(l => l.context_role === 'contexto_empresarial' && 'subject_id' in l.target)) {
    invariant('Business context requires a Subject link');
  }
  return body;
}
export async function validateKnowledgeTargets(source: Ownership, body: KnowledgeWrite, resolve: (target: KnowledgeTarget) => Promise<TargetFacts | null>): Promise<void> {
  if (!('comprender' in body.content) && source.ownership_class !== 'TENANT_OWNED') invariant('Business context must be tenant-owned');
  for (const link of body.links) {
    const facts = await resolve(link.target);
    const entries = Object.entries(link.target);
    if (!facts || !facts.readable || entries.length !== 1 || entries[0]![1] !== facts.id || entries[0]![0] !== facts.kind) concealed();
    assertCompatibleOwnership(source, facts);
    if (link.context_role === 'contexto_empresarial' && (!('subject_id' in link.target) || facts.tenant_id !== source.tenant_id || source.tenant_id === null)) invariant('Context Subject ownership mismatch');
  }
}
// Ordered links are part of the artifact: citation ordinals must not be sorted independently.
export function knowledgeArtifact(body: KnowledgeWrite): { bytes: Buffer; hash: string } {
  function canonical(v: unknown): unknown {
    if (Array.isArray(v)) return v.map(canonical);
    if (v !== null && typeof v === 'object') return Object.fromEntries(Object.entries(v).sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0).map(([k,x]) => [k,canonical(x)]));
    return v;
  }
  const bytes = Buffer.from(JSON.stringify(canonical({ content: body.content, content_language: body.content_language, links: body.links, effective_from: body.effective_from, effective_to: body.effective_to ?? null })), 'utf8');
  return { bytes, hash: createHash('sha256').update(bytes).digest('hex') };
}
export function verifyArtifact(bytes: Buffer, expectedHash: string): void {
  if (!/^[a-f0-9]{64}$/.test(expectedHash) || createHash('sha256').update(bytes).digest('hex') !== expectedHash) throw new FoundationError('TCDX.DEPENDENCY.UNAVAILABLE', 'Knowledge artifact integrity failure', 503, true);
}
export function strongAggregateEtag(aggregate: unknown, links: readonly KnowledgeLink[], materialAuditIds: readonly string[]): string {
  return '"'+hashCanonical({ aggregate:JSON.parse(JSON.stringify(aggregate)) as unknown, links, material_audit_ids: [...new Set(materialAuditIds)].sort() })+'"';
}
export function assertIfMatch(header: unknown, current: string): void {
  if (typeof header !== 'string' || !/^"[a-f0-9]{64}"$/.test(header)) invalid('If-Match');
  if (header !== current) throw new FoundationError('TCDX.CONFLICT.CONCURRENCY', 'Concurrent modification', 409);
}
export function assertDraftAuthor(row: { lifecycle_state: string; published_at?: string | null; created_by_user_identity_id: string }, actorId: string): void {
  if (row.lifecycle_state !== 'draft' || row.published_at != null) throw new FoundationError('TCDX.LIFECYCLE.TRANSITION_DENIED', 'Immutable Knowledge version', 409);
  if (row.created_by_user_identity_id !== actorId) throw new FoundationError('TCDX.AUTHORIZATION.DENIED', 'Access denied', 403);
}

/** Identical persisted representation for command and GET, independent of SQL aliases or driver timestamp types. */
export function knowledgeVersionEtag(row:Record<string,unknown>,links:readonly KnowledgeLink[],auditIds:readonly string[]):string {
  const fields=['knowledge_version_id','knowledge_item_id','content_ref','content_hash','content_language','ownership_class','tenant_id','lifecycle_state','superseded_by_id','created_by_user_identity_id'];
  const aggregate:Record<string,unknown>=Object.fromEntries(fields.map(k=>[k,row[k]??null]));
  aggregate.version_number=String(row.version_number);
  for(const k of ['effective_from','effective_to','published_at'])aggregate[k]=row[k]==null?null:new Date(row[k] as string|Date).toISOString();
  return strongAggregateEtag(aggregate,[...links].sort((a,b)=>hashCanonical(a).localeCompare(hashCanonical(b))),auditIds);
}
