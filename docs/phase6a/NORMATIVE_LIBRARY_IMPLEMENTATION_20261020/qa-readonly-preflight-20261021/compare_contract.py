#!/usr/bin/env python3
"""Offline comparison only; consumes recorded QA metadata, never connects."""
import collections
import hashlib
import json
from pathlib import Path
import re
import sys
sys.path.insert(0,'/private/tmp/grc-normative-contract-parser-pg16-py39')
from pglast import parse_sql
from pglast.stream import RawStream

BASE=Path(__file__).resolve().parent
ROOT=BASE.parents[3]
def read(p):return json.loads((ROOT/p).read_text())
def sha(p):return hashlib.sha256((ROOT/p).read_bytes()).hexdigest()
def rel(node):return node.schemaname+'.'+node.relname
def norm(t):
    t=t.lower().replace('timestamptz','timestamp with time zone').replace('varchar','character varying').replace('decimal','numeric')
    t=re.sub(r'\bchar\(', 'character(', t)
    return re.sub(r'\s+',' ',t).replace(', ', ',').strip()

def default_norm(value):
    if value is None:return None
    if value in ['empty_object',"'{}'::jsonb"]:return '{}'
    text=str(value).lower()
    literal=re.fullmatch(r"'([^']*)'::character varying",text)
    return literal.group(1) if literal else text

def main():
    catalog={}
    for name in ['CATALOG_INSPECTION_ATTEMPT_02.json','FK_ROOT_METADATA.json']:
        data=json.loads((BASE/name).read_text());assert data['exit_code']==0
        for item in data['results'][1:]:catalog.setdefault(item['category'],[]).extend(item['rows'])
    tables={r['name']:r for r in catalog['relations']}
    cols={(r['relation'],r['name']):r for r in catalog['columns']}
    constraints={(r['relation'],r['name']):r for r in catalog['constraints']}
    indexes={(r['relation'],r['name']):r for r in catalog['indexes']}
    triggers={(r['relation'],r['name']):r for r in catalog['triggers']}
    functions={r['name']:r for r in catalog['functions']}
    receipt=read('docs/executable-contracts/amendments/NORMATIVE_LIBRARY_H04_PV01_PUBLICATION_20261021/CONTRACT_PUBLICATION_RECEIPT.json')
    assert receipt['PV_H04_01']=='CONTRACT_PUBLISHED_VERIFIED'
    records={}
    def put(kind,identity,expected,actual,source,state=None,**extra):
        if state is None:state='MISSING' if actual is None else 'MATCH'
        records[(kind,identity)]={'kind':kind,'object':identity,'state':state,'expected':expected,'actual':actual,'contract':source,**extra}
    snapshot='docs/physical-data-model/amendments/NORMATIVE_LIBRARY_20261020/EXPECTED_SCHEMA_CONTRACT.json'
    for table in read(snapshot)['tables']:
        name=table['name']
        if name not in tables and name!='knowledge.knowledge_version_context_links':continue
        put('relation',name,{'kind':'table'},tables.get(name),snapshot)
        for col in table['columns']:
            actual=cols.get((name,col['name']))
            expected={'type':col['type'],'nullable':col['nullable'],'default':col['default']}
            state='MISSING' if actual is None else 'MATCH' if norm(col['type'])==norm(actual['type']) and col['nullable']==(not actual['attnotnull']) else 'CONFLICT'
            put('column',name+'.'+col['name'],expected,actual,snapshot,state,
                verified_dimensions=['type','nullability'],
                default_status='MISSING' if actual is None else 'MATCH' if default_norm(col['default'])==default_norm(actual['default_expression']) else 'UNKNOWN')
    for source in receipt['effective_ddl_sequence']:
        assert sha(source['path'])==source['sha256']
        text=(ROOT/source['path']).read_text()
        for ordinal,parsed in enumerate(parse_sql(text),1):
            stmt=parsed.stmt;kind=type(stmt).__name__
            ref={'path':source['path'],'sha256':source['sha256'],'statement':ordinal}
            if kind=='CreateStmt':
                name=rel(stmt.relation)
                put('relation',name,{'kind':'table'},tables.get(name),ref)
                for node in stmt.tableElts:
                    if type(node).__name__=='ColumnDef':
                        typename=RawStream()(node.typeName)
                        cons=list(node.constraints or ())
                        nullable=not any(c.contype.name in ['CONSTR_NOTNULL','CONSTR_PRIMARY'] for c in cons)
                        put('column',name+'.'+node.colname,{'type':typename,'nullable':nullable},cols.get((name,node.colname)),ref)
                        for c in cons:
                            if c.contype.name not in ['CONSTR_FOREIGN','CONSTR_PRIMARY']:continue
                            identity=name+'.'+node.colname+':'+c.contype.name
                            put('inline_constraint',identity,{'definition':RawStream()(c),'physical_name':'POSTGRES_GENERATED_NOT_CONTRACT_NAMED'},None,ref,'MISSING' if name not in tables else 'UNKNOWN')
                    elif type(node).__name__=='Constraint' and node.conname:
                        put('constraint',name+'.'+node.conname,{'definition':RawStream()(node)},constraints.get((name,node.conname)),ref)
            elif kind=='AlterTableStmt':
                name=rel(stmt.relation)
                for cmd in stmt.cmds:
                    op=cmd.subtype.name
                    if op=='AT_AddColumn':
                        node=cmd.def_
                        put('column',name+'.'+node.colname,{'type':RawStream()(node.typeName),'nullable':True},cols.get((name,node.colname)),ref)
                    elif op=='AT_AddConstraint':
                        c=cmd.def_
                        put('constraint',name+'.'+c.conname,{'definition':RawStream()(c)},constraints.get((name,c.conname)),ref)
                    elif op=='AT_DropConstraint':
                        actual=constraints.get((name,cmd.name))
                        put('constraint',name+'.'+cmd.name,{'post_adoption_presence':False},actual,ref,'CONFLICT' if actual else 'MATCH',planned_removal=True,source_precondition='EXISTS' if actual else 'MISSING')
            elif kind=='IndexStmt':
                name=rel(stmt.relation)
                put('index',name+'.'+stmt.idxname,{'definition':RawStream()(stmt)},indexes.get((name,stmt.idxname)),ref)
            elif kind=='CreateFunctionStmt':
                name='.'.join(x.sval for x in stmt.funcname)
                actual=functions.get(name)
                put('function',name+'()',{'definition':RawStream()(stmt)},actual,ref,
                    'MISSING' if actual is None else 'UNKNOWN',variant='ABSENT' if actual is None else 'REQUIRES_EXACT_BODY_COMPARISON')
            elif kind=='CreateTrigStmt':
                name=rel(stmt.relation)
                put('trigger',name+'.'+stmt.trigname,{'definition':RawStream()(stmt)},triggers.get((name,stmt.trigname)),ref)
    rows=list(records.values());counts=collections.Counter(r['state'] for r in rows)
    output={'comparison_scope':'Published post-adoption expectations versus observed QA; planned deltas are not claims of runtime readiness',
      'effective_publication_receipt':'docs/executable-contracts/amendments/NORMATIVE_LIBRARY_H04_PV01_PUBLICATION_20261021/CONTRACT_PUBLICATION_RECEIPT.json',
      'expected_effective_sequence':receipt['effective_ddl_sequence'],'actual_catalog_files':['CATALOG_INSPECTION_ATTEMPT_02.json','FK_ROOT_METADATA.json'],
      'summary':dict(counts),'objects':rows,
      'PV_H04_01_actual_function_variant':'ABSENT; neither defective nor corrected function exists in QA',
      'RLS':'Disabled on observed tables; not tested or enabled; future defense in depth per physical05',
      'defaults_comparison':'Recorded expected defaults and actual expressions; literal normalization/execution of arbitrary defaults not performed',
      'data_probes':'See BOUNDED_INTEGRITY_AGGREGATES.json; no row values exported'}
    (BASE/'SCHEMA_DIFF.json').write_text(json.dumps(output,indent=2,ensure_ascii=False)+'\n')
    print(json.dumps({'objects':len(rows),'summary':dict(counts),'non_planned_conflicts':[r['object'] for r in rows if r['state']=='CONFLICT' and not r.get('planned_removal')]}))

if __name__=='__main__':main()
