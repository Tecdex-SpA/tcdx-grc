"""Synthetic physical fixtures only. No application/QA permissions or content."""
import json
import subprocess
import time
from pathlib import Path

def uid(n):
    return '00000000-0000-7000-8000-%012d' % n

def q(value):
    if value is None: return 'NULL'
    if isinstance(value, bool): return 'true' if value else 'false'
    if isinstance(value, (int, float)): return str(value)
    if isinstance(value, dict): return q(json.dumps(value)) + '::jsonb'
    return "'" + str(value).replace("'", "''") + "'"

def ins(table, **values):
    return 'INSERT INTO ' + table + '(' + ','.join(values) + ') VALUES (' + ','.join(q(v) for v in values.values()) + ');'

def source(n=10, tenant=None, **extra):
    return ins('knowledge.knowledge_sources', **dict(dict(knowledge_source_id=uid(n), ownership_class='TENANT_OWNED' if tenant else 'GLOBAL_REFERENCE', tenant_id=uid(tenant) if tenant else None, source_code='SYNTHETIC_SOURCE_'+str(n), name='Synthetic only', source_kind='editorial', license_classification='synthetic_test_only', lifecycle_state='active'), **extra))

def item(n=20, tenant=None, src=10):
    return ins('knowledge.knowledge_items', knowledge_item_id=uid(n), knowledge_source_id=uid(src), ownership_class='TENANT_OWNED' if tenant else 'GLOBAL_REFERENCE', tenant_id=uid(tenant) if tenant else None, knowledge_code='SYNTHETIC_ITEM_'+str(n), title='Synthetic only', lifecycle_state='active')

def version(n=30, tenant=None, parent=20, number=1, **extra):
    return ins('knowledge.knowledge_versions', **dict(dict(knowledge_version_id=uid(n), knowledge_item_id=uid(parent), ownership_class='TENANT_OWNED' if tenant else 'GLOBAL_REFERENCE', tenant_id=uid(tenant) if tenant else None, version_number=number, content_ref='synthetic://fixture/'+str(n), content_hash='a'*64, content_language='es', lifecycle_state='draft'), **extra))

def link(n=100, version_id=30, tenant=None, target='normative_unit_id', target_id=60, role='comprender', **extra):
    return ins('knowledge.knowledge_version_context_links', **dict(dict(knowledge_version_context_link_id=uid(n), created_by_user_identity_id=uid(3), ownership_class='TENANT_OWNED' if tenant else 'GLOBAL_REFERENCE', tenant_id=uid(tenant) if tenant else None, knowledge_version_id=uid(version_id), context_role=role, source_locator='synthetic:1', provenance_ref='synthetic:fixture', **{target:uid(target_id)}), **extra))

def override(n=120, tenant=1, control=81, definition=90, version_number=1, state='draft', predecessor=None, start='2026-01-01', **extra):
    return ins('config.configuration_overrides', **dict(dict(configuration_override_id=uid(n), ownership_class='TENANT_OWNED', tenant_id=uid(tenant), configuration_definition_id=uid(definition), override_version=version_number, scope_level='control_version', control_version_id=uid(control), supersedes_configuration_override_id=uid(predecessor) if predecessor else None, lifecycle_state=state, effective_from=start, effective_to='2030-01-01', json_value={'synthetic':True}), **extra))

def ec(n=140, tenant=1, control=81, **extra):
    return ins('config.effective_configurations', **dict(dict(effective_configuration_id=uid(n), tenant_id=uid(tenant), configuration_definition_id=uid(90), control_version_id=uid(control), resolved_at='2026-01-01', effective_at='2026-01-01', resolution_status='resolved', input_hash='b'*64, effective_json_value={'synthetic':True}), **extra))

def applicability(n=160, tenant=1, context=31, state='draft', **extra):
    return ins('regulatory.requirement_applicabilities', **dict(dict(requirement_applicability_id=uid(n), tenant_id=uid(tenant), requirement_id=uid(70), applicability_version=n, applicability_decision='applicable', rationale='Synthetic only', lifecycle_state=state, effective_from='2026-01-01', context_knowledge_version_id=uid(context) if context else None), **extra))

def audit(n=201, right=200, tenant=None, source_id=10, revoke=False, **extra):
    return ins('ops_audit.audit_events', **dict(dict(audit_event_id=uid(n), ownership_class='TENANT_OWNED' if tenant else 'GLOBAL_REFERENCE', tenant_id=uid(tenant) if tenant else None, correlation_id=uid(n+10000), event_code='audit.knowledge.knowledge_source.rights.'+('revoke' if revoke else 'record')+'.v1', event_version=1, aggregate_type='KnowledgeSource', aggregate_id=uid(source_id), command_code='synthetic.physical_validation', actor_user_identity_id=uid(3), occurred_at='2026-01-01', outcome='succeeded', after_payload={'knowledge_source_usage_right_id':uid(right),'evidence_hash':'c'*64}, classification='internal'), **extra))

def rights(n=200, event=201, tenant=None, source_id=10, **extra):
    return ins('knowledge.knowledge_source_usage_rights', **dict(dict(knowledge_source_usage_right_id=uid(n), created_by_user_identity_id=uid(3), ownership_class='TENANT_OWNED' if tenant else 'GLOBAL_REFERENCE', tenant_id=uid(tenant) if tenant else None, knowledge_source_id=uid(source_id), audience_tenant_id=uid(tenant) if tenant else None, content_hash='a'*64, edition_ref='SYNTHETIC_NOT_A_LICENSE', use_act='consultation', use_environment='test', content_kind='metadata', effective_from='2026-01-01', effective_to='2030-01-01', evidence_ref='synthetic://not-real-rights', evidence_hash='c'*64, recorded_audit_event_id=uid(event)), **extra))

def fixtures():
    sql=[]
    for n in [1,2]:
        sql.append(ins('platform.tenants', tenant_id=uid(n),tenant_code='SYNTHETIC_'+str(n),legal_name='Synthetic',display_name='Synthetic',default_timezone='UTC',lifecycle_state='active',data_classification='internal'))
    sql.append(ins('iam.user_identities',user_identity_id=uid(3),identity_key='synthetic_validator',display_name='Synthetic',lifecycle_state='active'))
    for n,t in [(10,None),(11,1),(12,2)]: sql.append(source(n,t))
    for n,t,s in [(20,None,10),(21,1,11),(22,2,12),(23,None,10)]: sql.append(item(n,t,s))
    for n,t,p in [(30,None,20),(31,1,21),(32,2,22),(33,None,23)]: sql.append(version(n,t,p))
    sql.append(ins('regulatory.frameworks',framework_id=uid(50),ownership_class='GLOBAL_REFERENCE',framework_code='SYNTHETIC',name='Synthetic',source_type='editorial',lifecycle_state='draft'))
    sql.append(ins('regulatory.framework_versions',framework_version_id=uid(51),ownership_class='GLOBAL_REFERENCE',framework_id=uid(50),version_number=1,edition='SYNTHETIC',lifecycle_state='draft',content_hash='d'*64))
    sql.append(ins('regulatory.normative_units',normative_unit_id=uid(60),ownership_class='GLOBAL_REFERENCE',framework_version_id=uid(51),unit_type='clause',unit_code='SYNTHETIC',title='Synthetic',display_order=1,source_locator='synthetic:unit',content_language='es',content_hash='d'*64,license_classification='synthetic_test_only',provenance_ref='synthetic'))
    sql.append(ins('regulatory.requirements',requirement_id=uid(70),ownership_class='GLOBAL_REFERENCE',framework_version_id=uid(51),normative_unit_id=uid(60),requirement_code='SYNTHETIC',requirement_kind='requirement',statement_locator='synthetic:requirement',content_language='es',content_hash='d'*64,is_mandatory=True,provenance_ref='synthetic',editorial_summary='Synthetic only'))
    for c,v,t,num in [(80,81,1,1),(82,83,2,2),(84,85,1,3)]:
        sql.append(ins('controls.controls',control_id=uid(c),ownership_class='TENANT_OWNED',tenant_id=uid(t),control_code='SYNTHETIC_'+str(c),name='Synthetic',control_origin='tenant',lifecycle_state='draft'))
        sql.append(ins('controls.control_versions',control_version_id=uid(v),ownership_class='TENANT_OWNED',tenant_id=uid(t),control_id=uid(c),version_number=num,objective='Synthetic',control_type='preventive',nature='manual',frequency_code='daily',execution_method='Synthetic',verification_method='Synthetic',minimum_evidence='Synthetic',lifecycle_state='draft'))
    for s,t in [(86,1),(87,2)]: sql.append(ins('org.subjects',subject_id=uid(s),tenant_id=uid(t),subject_type='organization',canonical_key='SYNTHETIC_'+str(s),display_name='Synthetic',lifecycle_state='active',effective_from='2026-01-01'))
    sql.append(ins('config.configuration_definitions',configuration_definition_id=uid(90),ownership_class='PLATFORM_CONTROL',configuration_code='SYNTHETIC_PHYSICAL_ONLY',version_number=1,value_type='json',tenant_overridable=True,object_overridable=True,owner_domain='controls',lifecycle_state='draft',effective_from='2026-01-01',effective_to='2030-01-01',default_json_value={'synthetic':True}))
    sql.append(ins('regulatory.regulatory_packs',regulatory_pack_id=uid(300),pack_code='SYNTHETIC_PHYSICAL_ONLY',name='Synthetic',source_type='editorial',lifecycle_state='draft'))
    sql.append(ins('regulatory.regulatory_pack_versions',regulatory_pack_version_id=uid(301),regulatory_pack_id=uid(300),version_number=1,lifecycle_state='draft',edition='SYNTHETIC',license_classification='synthetic_test_only',content_hash='d'*64))
    return '\n'.join(sql)

def cases():
    out=[]
    def add(name,sql,state=None,msg=None): out.append((name,sql,state,msg))
    add('knowledge_version_per_item', version(34,None,20,2)+version(35,None,23,2))
    add('knowledge_version_duplicate_item_rejected', version(34,None,20,1),'23505','uq_knowledge_versions__item_version')
    for target,tid,vid,t in [('normative_unit_id',60,30,None),('requirement_id',70,30,None),('control_version_id',81,31,1),('subject_id',86,31,1)]:
        add('context_positive_'+target,link(target=target,target_id=tid,version_id=vid,tenant=t))
    add('context_business_subject',link(version_id=31,tenant=1,target='subject_id',target_id=86,role='contexto_empresarial'))
    add('context_xor_zero',link(normative_unit_id=None),'23514','ck_knowledge_context__target_xor')
    add('context_xor_two',link(requirement_id=uid(70)),'23514','ck_knowledge_context__target_xor')
    add('context_unknown_target_fk',link(target_id=999),'23503','normative_unit_id')
    add('context_wrong_source_tenant',link(tenant=1),'23514','knowledge source ownership mismatch')
    add('context_global_to_private_denied',link(target='subject_id',target_id=86),'23514','private target mismatch')
    add('context_cross_tenant_target',link(version_id=31,tenant=1,target='control_version_id',target_id=83),'23514','private target mismatch')
    add('context_cross_tenant_source',link(version_id=32,tenant=1),'23514','knowledge source ownership mismatch')
    add('context_role_closed',link(role='invented'),'23514','ck_knowledge_context__role')
    add('context_business_requires_subject',link(role='contexto_empresarial'),'23514','ck_knowledge_context__context')
    add('context_provenance_required',link(provenance_ref=' '),'23514','ck_knowledge_context__locator')
    add('context_semantic_unique_nulls',link()+link(n=101),'23505','uq_knowledge_context__semantic')
    add('context_draft_update_delete',link()+"UPDATE knowledge.knowledge_version_context_links SET source_locator='synthetic:2'; DELETE FROM knowledge.knowledge_version_context_links;")
    add('context_restrict_parent_delete',link()+'DELETE FROM knowledge.knowledge_versions WHERE knowledge_version_id='+q(uid(30))+';','23503',None)
    publish="UPDATE knowledge.knowledge_versions SET lifecycle_state='published',published_at=now(),effective_from='2026-01-01' WHERE knowledge_version_id="+q(uid(30))+';'
    add('publish_then_context_insert_denied',publish+link(),'23514','published knowledge links immutable')
    add('published_context_update_denied',link()+publish+"UPDATE knowledge.knowledge_version_context_links SET source_locator='changed';",'23514','published knowledge links immutable')
    add('published_context_delete_denied',link()+publish+'DELETE FROM knowledge.knowledge_version_context_links;','23514','published knowledge links immutable')
    add('published_reparent_denied',link()+publish+'UPDATE knowledge.knowledge_version_context_links SET knowledge_version_id='+q(uid(33))+';','23514','published knowledge links immutable')
    add('published_core_update_denied',publish+"UPDATE knowledge.knowledge_versions SET content_hash=repeat('f',64) WHERE knowledge_version_id="+q(uid(30))+';','23514','published core immutable')
    add('published_delete_denied',publish+'DELETE FROM knowledge.knowledge_versions WHERE knowledge_version_id='+q(uid(30))+';','23514','published knowledge immutable')
    successor=version(34,None,20,2,lifecycle_state='published',published_at='2026-02-01',effective_from='2026-02-01')
    add('published_valid_supersession',publish+successor+'UPDATE knowledge.knowledge_versions SET superseded_by_id='+q(uid(34))+' WHERE knowledge_version_id='+q(uid(30))+';')
    add('published_supersession_one_time',publish+successor+'UPDATE knowledge.knowledge_versions SET superseded_by_id='+q(uid(34))+' WHERE knowledge_version_id='+q(uid(30))+'; UPDATE knowledge.knowledge_versions SET superseded_by_id=NULL WHERE knowledge_version_id='+q(uid(30))+';','23514','supersession immutable')
    add('published_context_reparent_into_published',link(version_id=33)+publish+'UPDATE knowledge.knowledge_version_context_links SET knowledge_version_id='+q(uid(30))+';','23514','published knowledge links immutable')
    add('published_wrong_item_supersession',publish+'UPDATE knowledge.knowledge_versions SET superseded_by_id='+q(uid(33))+' WHERE knowledge_version_id='+q(uid(30))+';','23514','invalid supersession')
    for tab,key,n in [('regulatory.normative_units','normative_unit_id',60),('regulatory.requirements','requirement_id',70),('controls.control_versions','control_version_id',81),('knowledge.knowledge_versions','knowledge_version_id',31),('org.subjects','subject_id',86)]:
        add('ownership_immutable_'+key,'UPDATE '+tab+' SET tenant_id='+q(uid(2))+' WHERE '+key+'='+q(uid(n))+';','23514','ownership keys immutable')
    add('override_control_positive',override())
    add('override_control_cross_tenant',override(control=83),'23503','fk_config_override__control')
    add('override_control_missing',override(control_version_id=None),'23514','ck_config_override__control_scope')
    add('override_wrong_scope',override(scope_level='tenant'),'23514','ck_config_override__control_scope')
    add('override_extra_scope',override(scope_subject_id=uid(86)),'23514','ck_config_override__control_scope')
    add('override_self_successor',override(predecessor=120),'23514','ck_config_override__control_scope')
    add('override_revision_unique',override()+override(n=121),'23505','uq_config_override__control_revision')
    for state in ['approved','rejected']:
        add('override_'+state+'_immutable',override(state=state)+"UPDATE config.configuration_overrides SET json_value='{}';",'23514','decided override immutable')
        add('override_'+state+'_delete_denied',override(state=state)+'DELETE FROM config.configuration_overrides;','23514','decided override immutable')
    add('override_successor_positive',override(state='approved')+override(n=121,version_number=2,predecessor=120,start='2026-02-01'))
    add('override_draft_update_delete',override()+"UPDATE config.configuration_overrides SET json_value='{}'; DELETE FROM config.configuration_overrides;")
    add('override_successor_control_mismatch',override(state='approved')+override(n=121,control=85,version_number=2,predecessor=120,start='2026-02-01'),'23514','invalid override predecessor')
    add('override_successor_tenant_mismatch',override(state='approved')+override(n=121,tenant=2,control=83,version_number=2,predecessor=120,start='2026-02-01'),'23503','fk_config_override__previous')
    add('override_predecessor_not_approved',override()+override(n=121,version_number=2,predecessor=120,start='2026-02-01'),'23514','invalid override predecessor')
    add('override_cut_not_later',override(state='approved')+override(n=121,version_number=2,predecessor=120),'23514','invalid override predecessor')
    add('override_cut_outside_interval',override(state='approved')+override(n=121,version_number=2,predecessor=120,start='2030-02-01',effective_to='2031-01-01'),'23514','invalid override predecessor')
    add('override_multiple_approved_successors',override(state='approved')+override(n=121,version_number=2,state='approved',predecessor=120,start='2026-02-01')+override(n=122,version_number=3,state='approved',predecessor=120,start='2026-03-01'),'23505','uq_config_override__approved_successor')
    add('effective_control_positive',ec())
    add('effective_control_cross_tenant',ec(control=83),'23503','fk_effective_config__control')
    add('effective_control_subject_xor',ec(resolved_for_subject_id=uid(86)),'23514','ck_effective_config__control_scope')
    add('effective_duplicate_inputs',ec()+ec(n=141),'23505',None)
    # Contract includes the ControlVersion in input_hash. Identical hashes for
    # distinct inputs are not a valid resolver output; keep the rejection check.
    add('effective_distinct_controls_same_hash_rejected',ec()+ec(n=141,control=85),'23505','uq_ec__canonical_business_key')
    add('effective_distinct_controls_distinct_hashes',ec()+ec(n=141,control=85,input_hash='c'*64))
    add('applicability_context_positive',applicability())
    add('applicability_historical_null_preserved',applicability(context=None,state='approved'))
    add('applicability_context_cross_tenant',applicability(context=32),'23503','fk_applicability__context')
    add('applicability_global_context_denied',applicability(context=30),'23503','fk_applicability__context')
    add('applicability_decided_context_immutable',applicability(state='approved')+'UPDATE regulatory.requirement_applicabilities SET context_knowledge_version_id=NULL;','23514','decided context immutable')
    add('applicability_draft_context_mutable',applicability()+'UPDATE regulatory.requirement_applicabilities SET context_knowledge_version_id=NULL;')
    for act in ['consultation','extraction','storage','presentation','export','import','publication']:
        add('rights_act_'+act,audit()+rights(use_act=act))
    for env in ['development','test','qa','production']:
        add('rights_environment_'+env,audit()+rights(use_environment=env))
    for kind in ['metadata','editorial','tenant_context','third_party']:
        add('rights_kind_'+kind,audit()+rights(content_kind=kind))
    add('rights_tenant_positive',audit(tenant=1,source_id=11)+rights(tenant=1,source_id=11))
    add('rights_pack_exact_positive',audit()+rights(regulatory_pack_version_id=uid(301)))
    add('rights_pack_tenant_source_global_pack',audit(tenant=1,source_id=11)+rights(tenant=1,source_id=11,regulatory_pack_version_id=uid(301)))
    add('rights_pack_unknown_fk',audit()+rights(regulatory_pack_version_id=uid(999)),'23503',None)
    add('rights_source_owner_mismatch',audit()+rights(tenant=1),'P0001','source ownership mismatch')
    add('rights_tenant_audience_cross',audit(tenant=1,source_id=11)+rights(tenant=1,source_id=11,audience_tenant_id=uid(2)),'23514','ck_knowledge_source_usage_rights__tenant')
    add('rights_tenant_audience_missing',audit(tenant=1,source_id=11)+rights(tenant=1,source_id=11,audience_tenant_id=None),'23514','ck_knowledge_source_usage_rights__tenant_audience')
    for label,changes,expected in [('act',{'use_act':'invented'},'act'),('environment',{'use_environment':'invented'},'environment'),('hash',{'content_hash':'z'*64},'hashes'),('interval',{'effective_to':'2025-01-01'},'interval'),('evidence',{'evidence_ref':' '},'evidence')]:
        add('rights_invalid_'+label,audit()+rights(**changes),'23514','ck_knowledge_source_usage_rights__'+expected)
    add('rights_no_audit',rights(),'P0002',None)
    add('rights_audience_unknown_fk',audit()+rights(audience_tenant_id=uid(999)),'23503',None)
    for label,changes in [('outcome',{'outcome':'failed'}),('actor',{'actor_user_identity_id':None}),('aggregate',{'aggregate_id':uid(11)}),('code',{'event_code':'invalid'}),('payload',{'after_payload':{}}),('tenant',{'ownership_class':'TENANT_OWNED','tenant_id':uid(1)})]:
        add('rights_audit_mismatch_'+label,audit(**changes)+rights(),'P0001','canonical rights audit mismatch')
    add('rights_cannot_update_history',audit()+rights()+"UPDATE knowledge.knowledge_source_usage_rights SET edition_ref='changed';",'P0001','only first audited revocation is allowed')
    add('rights_cannot_delete_history',audit()+rights()+'DELETE FROM knowledge.knowledge_source_usage_rights;','P0001','immutable rights history')
    revoke=audit(n=202,revoke=True)+"UPDATE knowledge.knowledge_source_usage_rights SET revoked_at=now(),revoked_audit_event_id="+q(uid(202))+';'
    add('rights_first_audited_revocation',audit()+rights()+revoke)
    add('rights_revocation_wrong_event',audit()+rights()+audit(n=202,revoke=False)+"UPDATE knowledge.knowledge_source_usage_rights SET revoked_at=now(),revoked_audit_event_id="+q(uid(202))+';','P0001','canonical rights audit mismatch')
    add('rights_revocation_backdated',audit()+rights()+audit(n=202,revoke=True)+"UPDATE knowledge.knowledge_source_usage_rights SET revoked_at='2020-01-01',revoked_audit_event_id="+q(uid(202))+';','23514','ck_knowledge_source_usage_rights__revocation')
    add('rights_second_revocation_denied',audit()+rights()+revoke+'UPDATE knowledge.knowledge_source_usage_rights SET revoked_at=now();','P0001','only first audited revocation is allowed')
    add('rights_revocation_no_paired_event',audit()+rights()+'UPDATE knowledge.knowledge_source_usage_rights SET revoked_at=now();','P0001','only first audited revocation is allowed')
    # Unknown rights are absent, not inferred from source license classification.
    add('rights_absence_stays_absent',"DO $$ BEGIN IF EXISTS(SELECT FROM knowledge.knowledge_source_usage_rights) THEN RAISE EXCEPTION 'fixture leakage'; END IF; END $$;")
    add('atomic_rollback_no_residue',"DO $$ BEGIN BEGIN "+link()+link(n=101)+" EXCEPTION WHEN unique_violation THEN NULL; END; IF EXISTS(SELECT FROM knowledge.knowledge_version_context_links) THEN RAISE EXCEPTION 'partial write survived'; END IF; END $$;")
    add('atomic_rights_and_audit_rollback',"DO $$ BEGIN BEGIN "+audit(outcome='failed')+rights()+" EXCEPTION WHEN raise_exception THEN NULL; END; IF EXISTS(SELECT FROM knowledge.knowledge_source_usage_rights) OR EXISTS(SELECT FROM ops_audit.audit_events) THEN RAISE EXCEPTION 'partial audited rights write survived'; END IF; END $$;")
    add('candidate_indexes_valid',"DO $$ BEGIN IF EXISTS(SELECT FROM pg_index WHERE NOT indisvalid OR NOT indisready) THEN RAISE EXCEPTION 'invalid index'; END IF; END $$;")
    add('candidate_constraints_validated',"DO $$ BEGIN IF EXISTS(SELECT FROM pg_constraint WHERE NOT convalidated AND conrelid IN ('knowledge.knowledge_version_context_links'::regclass,'knowledge.knowledge_source_usage_rights'::regclass,'config.configuration_overrides'::regclass,'config.effective_configurations'::regclass,'regulatory.requirement_applicabilities'::regclass)) THEN RAISE EXCEPTION 'unvalidated candidate constraint'; END IF; END $$;")
    add('candidate_new_indexes_present',"DO $$ DECLARE n text; BEGIN FOREACH n IN ARRAY ARRAY['knowledge.ix_knowledge_context__tenant_version','knowledge.ix_knowledge_context__unit','knowledge.ix_knowledge_context__requirement','knowledge.ix_knowledge_context__control','knowledge.ix_knowledge_context__subject','config.uq_config_override__control_revision','config.uq_config_override__approved_successor','config.ix_config_override__control_interval','config.uq_effective_config__control_inputs','regulatory.ix_applicability__context','knowledge.ix_knowledge_source_usage_rights__lookup'] LOOP IF to_regclass(n) IS NULL THEN RAISE EXCEPTION 'missing index %',n; END IF; END LOOP; END $$;")
    add('deferred_guards_are_deferred',"DO $$ BEGIN IF (SELECT count(*) FROM pg_trigger WHERE tgname IN ('ck_knowledge_context__compatibility','ck_control_override__succession') AND tgdeferrable AND tginitdeferred)<>2 THEN RAISE EXCEPTION 'missing deferred guards'; END IF; END $$;")
    return out

def concurrency(psql, check, attempt, result):
    check('deferred_commit_rejects_tenant_mismatch','BEGIN;'+link(tenant=1)+'COMMIT;','23514','knowledge source ownership mismatch',transaction=False)
    check('deferred_commit_rolled_back',"DO $$ BEGIN IF EXISTS(SELECT FROM knowledge.knowledge_version_context_links) THEN RAISE EXCEPTION 'failed commit leaked row'; END IF; END $$;")
    # Two real PG sessions. Session A publishes while holding the version lock;
    # session B cannot mutate a binding after the publication commits.
    sql_a="BEGIN; SELECT knowledge_version_id FROM knowledge.knowledge_versions WHERE knowledge_version_id="+q(uid(30))+" FOR UPDATE; SELECT pg_sleep(1.5); UPDATE knowledge.knowledge_versions SET lifecycle_state='published',published_at=now(),effective_from='2026-01-01' WHERE knowledge_version_id="+q(uid(30))+"; COMMIT;"
    (attempt/'concurrency-session-A.sql').write_text(sql_a)
    proc=subprocess.Popen(psql,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    proc.stdin.write(sql_a);proc.stdin.close()
    # Verify lock ownership from pg_locks instead of assuming sleep establishes order.
    locked=False
    for _ in range(80):
        probe=subprocess.run(psql,input="SELECT count(*) FROM pg_locks WHERE relation='knowledge.knowledge_versions'::regclass AND mode='RowShareLock' AND granted;",text=True,capture_output=True)
        if probe.stdout.strip()=='1': locked=True;break
        time.sleep(.025)
    try:
        if not locked: raise RuntimeError('publication concurrency lock not observed')
        check('concurrent_publication_blocks_link',link(),'23514','published knowledge links immutable')
    finally:
        proc.wait(timeout=15)
        output=proc.stdout.read()+proc.stderr.read()
        (attempt/'concurrency-session-A.log').write_text(output)
        if proc.returncode: raise RuntimeError(output)
    # Concurrent approvals compete on the same approved predecessor. The unique
    # index waits for session A and rejects the second writer after A commits.
    assert check('concurrent_successor_setup','BEGIN;'+override(n=180,state='approved')+'COMMIT;',transaction=False)
    sql_a='BEGIN;'+override(n=181,version_number=2,state='approved',predecessor=180,start='2026-02-01')+'SELECT pg_sleep(1.5); COMMIT;'
    (attempt/'concurrency-successor-A.sql').write_text(sql_a)
    proc=subprocess.Popen(psql,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    proc.stdin.write(sql_a);proc.stdin.close()
    locked=False
    for _ in range(80):
        probe=subprocess.run(psql,input="SELECT count(*) FROM pg_locks WHERE relation='config.configuration_overrides'::regclass AND mode='RowExclusiveLock' AND granted;",text=True,capture_output=True)
        if probe.stdout.strip()=='1': locked=True;break
        time.sleep(.025)
    try:
        if not locked: raise RuntimeError('approval insertion lock not observed')
        check('concurrent_second_approved_successor_denied',override(n=182,version_number=3,state='approved',predecessor=180,start='2026-03-01'),'23505','uq_config_override__approved_successor')
    finally:
        proc.wait(timeout=15)
        output=proc.stdout.read()+proc.stderr.read()
        (attempt/'concurrency-successor-A.log').write_text(output)
        if proc.returncode: raise RuntimeError(output)
