#!/usr/bin/env python3
"""Authorized QA inspection only. No credentials copied, SQL writes or application calls.
PO explicitly allowed postgres after the initial read-only-credential blocker.
The account is privileged; READ ONLY is imposed and verified per transaction.
"""
import datetime
import hashlib
import json
from pathlib import Path
import subprocess
import time

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[3]
TABLES = [
 'knowledge.knowledge_sources','knowledge.knowledge_items','knowledge.knowledge_versions',
 'knowledge.knowledge_version_context_links','knowledge.knowledge_source_usage_rights',
 'regulatory.normative_units','regulatory.requirements','regulatory.requirement_applicabilities',
 'regulatory.regulatory_pack_versions','controls.control_versions','org.subjects',
 'config.configuration_definitions','config.configuration_overrides','config.effective_configurations',
 'config.configuration_definition_scopes','config.configuration_validation_rules',
 'config.effective_configuration_layers','ops_audit.audit_events',
 'ops_audit.lifecycle_transition_definitions','iam.permissions','iam.role_permissions',
 'platform.schema_migrations']
FUNCTIONS = ['knowledge.check_context_link','knowledge.guard_context_link',
 'knowledge.guard_context_target_owner','knowledge.guard_published_version_core',
 'knowledge.enforce_source_usage_rights','config.guard_control_override_history',
 'config.check_control_override_successor','regulatory.guard_context_decision_history']
CONNECTION = "host=192.168.2.40 port=5432 dbname=tcdx-grc user=postgres connect_timeout=5 sslmode=require options='-c default_transaction_read_only=on -c statement_timeout=5000 -c lock_timeout=1000 -c idle_in_transaction_session_timeout=15000'"
IDENTITY = """SELECT jsonb_build_object('category','identity','database',current_database(),
 'user',current_user,'server_address',inet_server_addr(),'server_port',inet_server_port(),
 'version',version(),'server_version_num',current_setting('server_version_num'),
 'default_transaction_read_only',current_setting('default_transaction_read_only'),
 'transaction_read_only',current_setting('transaction_read_only'),
 'statement_timeout',current_setting('statement_timeout'),'lock_timeout',current_setting('lock_timeout'),
 'cluster_name',current_setting('cluster_name',true),'in_recovery',pg_is_in_recovery(),
 'role_superuser',(SELECT rolsuper FROM pg_catalog.pg_roles WHERE rolname=current_user));"""
GUARD = """SELECT current_database()='tcdx-grc' AND current_user='postgres'
 AND inet_server_addr()='192.168.2.40'::inet AND inet_server_port()=5432
 AND current_setting('server_version_num')::integer/10000=16
 AND current_setting('transaction_read_only')='on'
 AND current_setting('default_transaction_read_only')='on'
 AND current_setting('statement_timeout')='5s' AND current_setting('lock_timeout')='1s'
 AND NOT pg_is_in_recovery() AS qa_identity_ok \\gset
\\if :qa_identity_ok
"""

def quote(s):
    return "'" + s.replace("'", "''") + "'"

def dump(path, data):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False)+'\n')

def array(values):
    return 'ARRAY[' + ','.join(quote(v) for v in values) + ']'

def metadata(category, query):
    return "SELECT jsonb_build_object('category',"+quote(category)+",'rows',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) FROM ("+query+") x;"

def execute(label, selects):
    path = BASE / (label + '.sql')
    if path.exists():
        original = label
        n = 2
        while (BASE / (original + '_ATTEMPT_%02d.sql' % n)).exists():
            n += 1
        label = original + '_ATTEMPT_%02d' % n
        path = BASE / (label + '.sql')
    sql = '\\set ON_ERROR_STOP on\nBEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;\nSHOW transaction_read_only;\n' + GUARD + IDENTITY + '\n' + selects + '\n\\else\n\\quit 3\n\\endif\nROLLBACK;\n'
    path.write_text(sql)
    start=time.monotonic()
    p=subprocess.run(['psql',CONNECTION,'-X','-w','-qAt','-v','ON_ERROR_STOP=1'],
                     input=sql,text=True,capture_output=True,timeout=75)
    lines=p.stdout.splitlines()
    result={'label':label,'command':'psql fixed canonical QA endpoint; pgpass via libpq; no credential values logged',
            'sql_sha256':hashlib.sha256(sql.encode()).hexdigest(),
            'duration_seconds':round(time.monotonic()-start,4),'exit_code':p.returncode,
            'at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'show_transaction_read_only':lines[0] if lines else None,
            'results':[json.loads(s) for s in lines[1:] if s.startswith('{')],
            'error':p.stderr.strip() or None}
    dump(BASE/(label+'.json'),result)
    assert p.returncode==0 and lines[0]=='on', 'READONLY/QUERY_FAILED: '+label
    identity=result['results'][0]
    assert identity['category']=='identity' and identity['server_address']=='192.168.2.40'
    assert identity['database']=='tcdx-grc' and identity['transaction_read_only']=='on'
    assert identity['default_transaction_read_only']=='on'
    return result['results']

def main():
    rel="n.nspname||'.'||c.relname=ANY("+array(TABLES)+')'
    queries=[
      metadata('extensions',"SELECT extname,extversion FROM pg_catalog.pg_extension ORDER BY extname LIMIT 50"),
      metadata('namespaces',"SELECT nspname,pg_get_userbyid(nspowner) AS owner FROM pg_catalog.pg_namespace WHERE nspname IN ('knowledge','config','regulatory','controls','org','ops_audit','iam','platform') ORDER BY nspname LIMIT 20"),
      metadata('relations',"SELECT n.nspname||'.'||c.relname AS name,c.relkind,pg_get_userbyid(c.relowner) AS owner,c.reltuples::bigint AS estimated_rows,c.relrowsecurity,c.relforcerowsecurity FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE "+rel+' ORDER BY name LIMIT 100'),
      metadata('columns',"SELECT n.nspname||'.'||c.relname AS relation,a.attname AS name,format_type(a.atttypid,a.atttypmod) AS type,a.attnotnull,pg_get_expr(d.adbin,d.adrelid) AS default_expression,a.attidentity,a.attgenerated FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace JOIN pg_catalog.pg_attribute a ON a.attrelid=c.oid LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum WHERE "+rel+" AND a.attnum>0 AND NOT a.attisdropped ORDER BY relation,a.attnum LIMIT 1500"),
      metadata('constraints',"SELECT n.nspname||'.'||c.relname AS relation,k.conname AS name,k.contype,k.convalidated,k.condeferrable,k.condeferred,pg_get_constraintdef(k.oid,true) AS definition FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_class c ON c.oid=k.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE "+rel+' ORDER BY relation,name LIMIT 2000'),
      metadata('indexes',"SELECT n.nspname||'.'||c.relname AS relation,i.relname AS name,x.indisvalid,x.indisready,pg_get_indexdef(i.oid) AS definition FROM pg_catalog.pg_index x JOIN pg_catalog.pg_class c ON c.oid=x.indrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace JOIN pg_catalog.pg_class i ON i.oid=x.indexrelid WHERE "+rel+' ORDER BY relation,name LIMIT 2000'),
      metadata('functions',"SELECT n.nspname||'.'||p.proname AS name,pg_get_function_identity_arguments(p.oid) AS arguments,p.prosecdef,pg_get_userbyid(p.proowner) AS owner,pg_get_functiondef(p.oid) AS definition FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname||'.'||p.proname=ANY("+array(FUNCTIONS)+") AND p.prokind='f' ORDER BY name LIMIT 30"),
      metadata('triggers',"SELECT n.nspname||'.'||c.relname AS relation,t.tgname AS name,t.tgenabled,pg_get_triggerdef(t.oid,true) AS definition FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE "+rel+" AND NOT t.tgisinternal ORDER BY relation,name LIMIT 200"),
      metadata('sequences',"SELECT schemaname,sequencename,data_type,increment_by,cycle FROM pg_catalog.pg_sequences WHERE schemaname IN ('knowledge','config','regulatory','controls','org','ops_audit') ORDER BY schemaname,sequencename LIMIT 100"),
      metadata('dependencies',"SELECT n.nspname||'.'||c.relname AS relation,d.deptype,d.classid::regclass::text AS class,d.refclassid::regclass::text AS referenced_class,pg_describe_object(d.refclassid,d.refobjid,d.refobjsubid) AS referenced_object FROM pg_catalog.pg_depend d JOIN pg_catalog.pg_class c ON d.classid='pg_class'::regclass AND c.oid=d.objid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE "+rel+" ORDER BY relation,d.deptype LIMIT 1000")]
    rows=execute('CATALOG_INSPECTION','\n'.join(queries))
    catalog={r['category']:r.get('rows') for r in rows[1:]}
    available={r['name']:r for r in catalog['relations']}
    columns={(r['relation'],r['name']) for r in catalog['columns']}
    # Pure aggregate probes only. No identifiers, tenant payloads, content or PII
    # returned. Larger/unestimated relations are excluded to bound scan costs.
    plans=[
      ('knowledge_versions_duplicates','knowledge.knowledge_versions',"SELECT count(*) AS duplicate_groups FROM (SELECT knowledge_item_id,version_number FROM knowledge.knowledge_versions GROUP BY knowledge_item_id,version_number HAVING count(*)>1) x"),
      ('knowledge_versions_orphan_item','knowledge.knowledge_versions',"SELECT count(*) AS orphan_rows FROM knowledge.knowledge_versions v LEFT JOIN knowledge.knowledge_items i ON i.knowledge_item_id=v.knowledge_item_id WHERE i.knowledge_item_id IS NULL"),
      ('knowledge_versions_owner_mismatch','knowledge.knowledge_versions',"SELECT count(*) AS mismatched_rows FROM knowledge.knowledge_versions v JOIN knowledge.knowledge_items i ON i.knowledge_item_id=v.knowledge_item_id WHERE v.ownership_class IS DISTINCT FROM i.ownership_class OR v.tenant_id IS DISTINCT FROM i.tenant_id"),
      ('knowledge_items_owner_mismatch','knowledge.knowledge_items',"SELECT count(*) AS mismatched_rows FROM knowledge.knowledge_items i JOIN knowledge.knowledge_sources s ON s.knowledge_source_id=i.knowledge_source_id WHERE i.ownership_class IS DISTINCT FROM s.ownership_class OR i.tenant_id IS DISTINCT FROM s.tenant_id"),
      ('knowledge_versions_tenant_nullability','knowledge.knowledge_versions',"SELECT count(*) AS invalid_rows FROM knowledge.knowledge_versions WHERE (ownership_class='TENANT_OWNED')<>(tenant_id IS NOT NULL)"),
      ('applicability_subject_cross_tenant','regulatory.requirement_applicabilities',"SELECT count(*) AS mismatched_rows FROM regulatory.requirement_applicabilities a JOIN org.subjects s ON s.subject_id=a.scope_subject_id WHERE a.tenant_id IS DISTINCT FROM s.tenant_id"),
      ('effective_existing_key_duplicates','config.effective_configurations',"SELECT count(*) AS duplicate_groups FROM (SELECT tenant_id,configuration_definition_id,resolved_for_subject_id,effective_at,input_hash FROM config.effective_configurations GROUP BY tenant_id,configuration_definition_id,resolved_for_subject_id,effective_at,input_hash HAVING count(*)>1) x")]
    skips=[]
    aggregates=[]
    for label,table,query in plans:
        row=available.get(table)
        if not row or row['estimated_rows']<0 or row['estimated_rows']>10000:
            skips.append({'category':label,'status':'NOT_VERIFIED','reason':'Missing table or row estimate outside safe 0..10000 bound'})
        else:
            aggregates.append(metadata(label,query))
    for table in ['knowledge.knowledge_sources','knowledge.knowledge_items','knowledge.knowledge_versions','config.configuration_overrides','config.effective_configurations','regulatory.requirement_applicabilities']:
        row=available.get(table)
        if row and 0<=row['estimated_rows']<=10000:
            aggregates.append(metadata('cardinality_'+table,'SELECT count(*) AS rows FROM '+table))
    permissions=json.loads((ROOT/'docs/executable-contracts/amendments/NORMATIVE_LIBRARY_20261020/PERMISSIONS_AND_GRANTS.json').read_text())
    def find_codes(value, key):
        result=set()
        if isinstance(value,dict):
            for k,v in value.items():
                if k==key and isinstance(v,str):result.add(v)
                else:result.update(find_codes(v,key))
        elif isinstance(value,list):
            for v in value:result.update(find_codes(v,key))
        return result
    codes=sorted(find_codes(permissions,'permission_code'))
    if 'iam.permissions' in available and codes:
        aggregates.append(metadata('permission_presence',"SELECT count(*) AS matching_permissions FROM iam.permissions WHERE permission_code=ANY("+array(codes)+")"))
    definitions=json.loads((ROOT/'docs/executable-contracts/amendments/NORMATIVE_LIBRARY_20261020/CONFIGURATION_DEFINITIONS.json').read_text())
    codes=[d['configuration_code'] for d in definitions['definitions']]
    if 'config.configuration_definitions' in available:
        aggregates.append(metadata('definition_presence',"SELECT count(*) AS matching_definitions FROM config.configuration_definitions WHERE configuration_code=ANY("+array(codes)+")"))
    lifecycle=json.loads((ROOT/'docs/executable-contracts/amendments/NORMATIVE_LIBRARY_B06_REGISTRY_20261020/LIFECYCLE_BINDINGS.json').read_text())
    commands=sorted(find_codes(lifecycle,'command_code'))
    if 'ops_audit.lifecycle_transition_definitions' in available:
        aggregates.append(metadata('registry_presence',"SELECT count(*) AS matching_rows FROM ops_audit.lifecycle_transition_definitions WHERE command_code=ANY("+array(commands)+") AND entity_type IN ('KnowledgeVersion','ConfigurationOverride')"))
    if aggregates:
        execute('STRUCTURAL_AGGREGATES','\n'.join(aggregates))
    dump(BASE/'NOT_VERIFIED.json',skips)
    print(json.dumps({'catalog_categories':len(catalog),'existing_relations':len(available),'planned_relations':len(TABLES),'aggregate_queries':len(aggregates),'skipped':len(skips),'all_sessions':'READ_ONLY','product_mutations':'NONE'}))

if __name__=='__main__':
    main()
