#!/usr/bin/env python3
"""Offline PG16 AST proof for the observed dump/restore deparser difference.
No database connection, no data rows, no expression weakening.
"""
import sys,json,copy,hashlib
from pathlib import Path
sys.dont_write_bytecode=True;sys.path.insert(0,'/private/tmp/grc-normative-contract-parser-pg16-py39')
from pglast import parse_sql
BASE=Path(__file__).resolve().parent
proofs=[]
def clean(x):
 if isinstance(x,(list,tuple)):return [clean(v) for v in x]
 if not isinstance(x,dict):return x
 return {k:clean(v) for k,v in x.items() if k not in ['location','stmt_location','stmt_len']}
def normalize(x):
 if isinstance(x,(list,tuple)):return [normalize(v) for v in x]
 if not isinstance(x,dict):return x
 x={k:normalize(v) for k,v in x.items()}
 if x.get('@')=='TypeCast' and x.get('arg',{}).get('@')=='A_ArrayExpr':
  t=x['typeName'];elems=x['arg']['elements']
  if t['names']==[{'@':'String','sval':'text'}] and t['arrayBounds']==[{'@':'Integer','ival':-1}] and t['typmods'] is None and elems and all(e.get('@')=='TypeCast' and e['arg'].get('@')=='A_Const' and e['arg'].get('val',{}).get('@')=='String' and e['typeName']['names']==[{'@':'String','sval':'pg_catalog'},{'@':'String','sval':'varchar'}] and e['typeName']['typmods'] is None and e['typeName']['arrayBounds'] is None for e in elems):
   scalar=copy.deepcopy(t);scalar['arrayBounds']=None
   return {'@':'A_ArrayExpr','elements':[{'@':'TypeCast','arg':e,'typeName':copy.deepcopy(scalar)} for e in elems]}
 return x
def tree(s):
 assert s.startswith('CHECK ')
 return clean(parse_sql('SELECT '+s[len('CHECK '):])[0].stmt())
def mutate_literal(x):
 if isinstance(x,dict):
  if x.get('@')=='A_Const' and x.get('val',{}).get('@')=='String':x['val']['sval']+='__NEGATIVE_PROBE__';return True
  return any(mutate_literal(v) for v in x.values())
 if isinstance(x,(list,tuple)):return any(mutate_literal(v) for v in x)
 return False
def main():
 d=json.loads((BASE/'BACKUP_RESTORE_RECONCILED.json').read_text());diffs=d['constraint_diagnostic']['differences'];assert len(diffs)==180
 for row in diffs:
  a=row['source'];b=row['restore'];assert a['name']==b['name'] and a['relation']==b['relation'] and a['validated']==b['validated']
  original=tree(a['definition']);restored=tree(b['definition']);same=normalize(original)==normalize(restored);assert same,row['object']
  bad=copy.deepcopy(restored);assert mutate_literal(bad);negative=normalize(original)!=normalize(bad);assert negative,row['object']
  proofs.append({'object':row['object'],'normalized_AST_equal':same,'changed_literal_rejected':negative})
 evidence={'status':'PASS_NARROW_ARRAY_CAST_EQUIVALENCE','parser':'pglast6.17 PostgreSQL16 grammar','rule':'Distribute only text[] casts over nonempty arrays of unbounded varchar string literals; preserve all values, operators and metadata','constraints':len(proofs),'AST_positive_assertions':len(proofs),'AST_negative_assertions':len(proofs),'assertions':proofs}
 p=BASE/'CONSTRAINT_EQUIVALENCE.json';assert not p.exists();p.write_text(json.dumps(evidence,indent=2)+'\n');print(json.dumps({k:v for k,v in evidence.items() if k!='assertions'}))
if __name__=='__main__':main()
