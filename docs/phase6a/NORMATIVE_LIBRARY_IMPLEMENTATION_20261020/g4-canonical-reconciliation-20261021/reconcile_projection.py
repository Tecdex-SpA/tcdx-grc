#!/usr/bin/env python3
"""Derive the existing canonical inventory from sealed sources. No SQL execution."""
import sys,json,hashlib,re
from pathlib import Path
sys.dont_write_bytecode=True
sys.path.insert(0,'/private/tmp/grc-normative-contract-parser-pg16-py39')
from pglast import parse_sql,ast,enums
from pglast.stream import RawStream
ROOT=Path(__file__).resolve().parents[4];BASE=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
receipt_path='docs/executable-contracts/amendments/NORMATIVE_LIBRARY_H04_PV01_PUBLICATION_20261021/CONTRACT_PUBLICATION_RECEIPT.json'
receipt=json.loads((ROOT/receipt_path).read_text());assert receipt['PV_H04_01']=='CONTRACT_PUBLISHED_VERIFIED'
for x in receipt['effective_ddl_sequence']:assert sha(ROOT/x['path'])==x['sha256']
old=ROOT/'docs/phase6a/NORMATIVE_LIBRARY_IMPLEMENTATION_20261020/qa-physical-adoption-20261021'
rec=json.loads((old/'MIGRATION_RECONCILIATION.json').read_text());cand=rec['candidate_migration'];raw=(ROOT/cand['path']).read_bytes();assert hashlib.sha256(raw).hexdigest()==cand['sha256']
for x in cand['sources']:assert raw[x['offset']:x['offset']+x['length']]==(ROOT/x['path']).read_bytes()
manifest=json.loads((ROOT/'database/migrations/manifest.json').read_text());proposed=json.loads((old/'candidate-migration/manifest.proposed.json').read_text());assert proposed['migrations'][:34]==manifest['migrations'] and len(manifest['migrations'])==34
new=proposed['migrations'][-1];dest=ROOT/'database/migrations'/new['filename'];assert not dest.exists();dest.write_bytes(raw)
(ROOT/'database/migrations/manifest.json').write_text(json.dumps(proposed,indent=2)+'\n')
expected=json.loads((ROOT/'docs/physical-data-model/amendments/NORMATIVE_LIBRARY_20261020/EXPECTED_SCHEMA_CONTRACT.json').read_text())
h04=ROOT/receipt['effective_ddl_sequence'][1]['path'];table=parse_sql(h04.read_text())[0].stmt
columns=[];checks=[];primary=[]
for elt in table.tableElts:
 if isinstance(elt,ast.ColumnDef):
  constraints=elt.constraints or ();notnull=any(c.contype in [enums.ConstrType.CONSTR_NOTNULL,enums.ConstrType.CONSTR_PRIMARY] for c in constraints)
  if any(c.contype==enums.ConstrType.CONSTR_PRIMARY for c in constraints):primary.append(elt.colname)
  default=next((RawStream()(c.raw_expr) for c in constraints if c.contype==enums.ConstrType.CONSTR_DEFAULT),None)
  typ=RawStream()(elt.typeName).replace('timestamp with time zone','timestamptz').replace('character varying','varchar').replace('character(','char(')
  columns.append({'name':elt.colname,'type':typ,'nullable':not notnull,'default':default})
 elif isinstance(elt,ast.Constraint) and elt.contype==enums.ConstrType.CONSTR_CHECK:checks.append(elt.conname)
# MXI is the existing mixed-ownership immutable-history profile. H04 binding specifies
# its one audited revocation exception; no lifecycle state or new profile is introduced.
expected['tables'].append({'name':table.relation.schemaname+'.'+table.relation.relname,'profile':'MXI','primaryKey':primary,'columns':columns,'checks':checks,'uniqueConstraints':[]})
expected['tableCount']=len(expected['tables']);assert expected['tableCount']==244
expected['normativeLibraryAmendment']={'scope':'B01_B09_H04_PV_H04_01','status':'CANONICAL_PROJECTION_NOT_QA_ADOPTED','new_tables':2,'new_columns':4,'operational_grants':0,'publicationReceipt':{'path':receipt_path,'sha256':sha(ROOT/receipt_path)},'migration':{'path':str(dest.relative_to(ROOT)),'sha256':sha(dest)},'sources':cand['sources'],'physicalAssertions':None}
(ROOT/'database/expected-schema.json').write_text(json.dumps(expected,indent=2)+'\n')
print(json.dumps({'tables':244,'migrations':35,'new_migration_sha256':sha(dest),'columns_H04':len(columns),'source_blocks_byte_identical':True}))
