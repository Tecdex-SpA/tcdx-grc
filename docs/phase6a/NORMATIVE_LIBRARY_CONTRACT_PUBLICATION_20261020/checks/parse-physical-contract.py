"""Offline PostgreSQL 16 SQL/PLpgSQL grammar verification, never a DB connection."""
import argparse,sys,json,hashlib
from pathlib import Path
args=argparse.ArgumentParser();args.add_argument('--library-path');args.add_argument('--output');opts=args.parse_args()
if opts.library_path:sys.path.insert(0,opts.library_path)
import pglast,pglast.parser
assert pglast.get_postgresql_version()[0]==16, 'This receipt requires the PostgreSQL 16 parser, not a newer grammar'
root=Path.cwd();p=root/'docs/physical-data-model/amendments/NORMATIVE_LIBRARY_20261020/03_DDL_SPEC.sql';sql=p.read_text();ast=pglast.parse_sql(sql);pl=json.loads(pglast.parser.parse_plpgsql_json(sql))
result={'status':'PASS','scope':'OFFLINE_POSTGRESQL16_SQL_AND_PLPGSQL_GRAMMAR_ONLY','source':str(p.relative_to(root)),'source_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'parser':pglast.__version__,'postgresql_grammar':pglast.get_postgresql_version(),'python':sys.version.split()[0],'sql_statements':len(ast),'plpgsql_functions':len(pl),'catalog_name_resolution':'NOT_EXECUTED','ddl_executed':False,'foreign_key_enforcement':'NOT_TESTED','runtime_tenant_sod_concurrency':'NOT_TESTED'}
if opts.output:
 out=(root/opts.output).resolve();assert str(out).startswith(str(root/'docs/phase6a/NORMATIVE_LIBRARY_CONTRACT_PUBLICATION_20261020/evidence')+'/');out.write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
