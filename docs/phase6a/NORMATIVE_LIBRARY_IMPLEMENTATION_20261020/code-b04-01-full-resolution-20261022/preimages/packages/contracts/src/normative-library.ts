import snapshot from './normative-library.generated.json' with { type: 'json' };
import * as validators from './normative-library-validators.generated.js';

/** Derived immutable contract data; these descriptors never grant runtime permissions. */
export const NORMATIVE_LIBRARY = snapshot;
export type MatrixType = 'requirements_controls' | 'controls_evidence' | 'requirements_assessments' | 'frameworks_frameworks' | 'obligations_applicability' | 'issues_actions';
export type KnowledgeTarget = { normative_unit_id: string } | { requirement_id: string } | { control_version_id: string } | { subject_id: string };
export type ContextRole = 'comprender' | 'implementar' | 'demostrar' | 'contexto_empresarial';
export type KnowledgeLink = { target: KnowledgeTarget; context_role: ContextRole; source_locator: string; provenance_ref: string; excerpt_hash?: string };
export type Citation = { link_ordinal: number; locator: string; excerpt_hash?: string };
export type KnowledgeSection = { text: string; citations: Citation[] };
export type KnowledgeContent = { comprender: KnowledgeSection; implementar: KnowledgeSection; demostrar: KnowledgeSection };
export type KnowledgeContextContent = { descripcion: string; alcance: string; actividades: string; supuestos: string; preguntas_pendientes: string };
export type KnowledgeWrite = { content_language: string; content: KnowledgeContent | KnowledgeContextContent; links: KnowledgeLink[]; effective_from: string; effective_to?: string; rationale: string };
export type MatrixRef = { requirement_id: string } | { control_id: string } | { control_version_id: string } | { evidence_version_id: string } | { requirement_assessment_id: string } | { framework_version_id: string } | { requirement_applicability_id: string } | { issue_id: string } | { action_id: string };
export type MatrixAxis = { ref: MatrixRef; label: string; code: string | null; framework_version_id: string | null; revision_hash: string };
export type MatrixCell = { row_ref: MatrixRef; column_ref: MatrixRef; relation_ref: Record<string, string>; relationship_type: string | null; direction: string | null; rationale: string | null; provenance_ref: string | null; effective_from: string | null; effective_to: string | null; stored_result: Record<string, unknown> | null; source_lifecycle_state: string | null };
export type MatrixPage = { matrix_type: MatrixType; as_of: string; rows: MatrixAxis[]; columns: MatrixAxis[]; cells: MatrixCell[]; next_row_cursor: string | null; next_column_cursor: string | null; next_cell_cursor: string | null; authorization_notice: 'Sólo información autorizada; no se exponen conteos de objetos fuera de alcance.'; snapshot_fingerprint: string; read_at: string; temporal_semantics: 'effective_interval' | 'current_state_with_as_of_population' };
export type LibraryValidationError = { instancePath: string; keyword: string; params: Record<string, unknown> };
type Validator = { (value: unknown): boolean; errors?: LibraryValidationError[] | null };
export function validateLibrarySchema(name: string, value: unknown): { valid: boolean; errors: LibraryValidationError[] } {
  const validator = (validators as Record<string, Validator>)[name];
  if (!validator) throw new Error('Unknown published library schema');
  const valid = validator(value);
  return { valid, errors: (validator.errors ?? []).map(e => ({ instancePath: e.instancePath, keyword: e.keyword, params: { ...e.params } })) };
}
