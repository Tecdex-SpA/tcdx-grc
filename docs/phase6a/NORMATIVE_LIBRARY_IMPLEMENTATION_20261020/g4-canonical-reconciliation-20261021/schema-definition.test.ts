import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizedConstraintDefinition as normalize } from '../../../../scripts/foundations/schema-definition.ts';
const evidence=JSON.parse(readFileSync(new URL('./BACKUP_RESTORE_RECONCILED.json',import.meta.url),'utf8'));
const rows=evidence.constraint_diagnostic.differences as Array<{source:{definition:string};restore:{definition:string}}>;
test('180 observed PG16 dump/restore casts normalize identically',()=>{
 assert.equal(rows.length,180);
 for(const row of rows)assert.equal(normalize(row.source.definition),normalize(row.restore.definition));
});
test('180 changed enum literals remain different',()=>{
 for(const row of rows){const bad=row.restore.definition.replace(/'((?:''|[^'])*)'/, (_match,value:string)=>`'${value}__NEGATIVE__'`);assert.notEqual(normalize(row.source.definition),normalize(bad));}
});
test('cast normalization preserves operators, order, typmods and nonliteral expressions',()=>{
 const source="CHECK (value::text = ANY (ARRAY['a'::character varying, 'b'::character varying]::text[]))";
 assert.notEqual(normalize(source),normalize(source.replace(' = ',' <> ')));
 assert.notEqual(normalize(source),normalize(source.replace("'a'", "'c'")));
 assert.notEqual(normalize(source),normalize(source.replace("'a'", "'b'").replace(", 'b'", ", 'a'")));
 for(const x of ["ARRAY['abc'::character varying(2)]::text[]",'ARRAY[column_name::character varying]::text[]',"ARRAY['a'::text]::text[]",'ARRAY[]::text[]'])assert.equal(normalize(x),x);
});
