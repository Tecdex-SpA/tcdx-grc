/** PostgreSQL's array coercion deparser can distribute a text[] cast into
 * varchar literal elements during pg_dump/pg_restore. Preserve every literal,
 * inner cast, operator and order; normalize only this equivalent finite form.
 */
export function normalizedConstraintDefinition(value: string): string {
  return value.replace(/ARRAY\[((?:'(?:''|[^'])*'::character varying)(?:, '(?:''|[^'])*'::character varying)*)\]::text\[\]/g,
    (_whole, literals: string) => `ARRAY[${literals.replace(/'(?:''|[^'])*'::character varying/g, (literal) => `${literal}::text`)}]`);
}
