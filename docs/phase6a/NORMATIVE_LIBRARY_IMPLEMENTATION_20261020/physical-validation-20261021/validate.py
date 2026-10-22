#!/usr/bin/env python3
"""Explicit PO-authorized disposable PG16 test. Never uses host database settings.

Run with /usr/bin/python3 (local pglast 6.17 dependency). No migration runner,
seeds, permission grants, registry activation, host mounts or published ports.
Every attempt is retained; the owned container is removed in finally.
"""
import collections
import datetime
import hashlib
import json
import os
import re
from pathlib import Path
import subprocess
import sys
import time
import uuid

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
sys.path.insert(0, '/private/tmp/grc-normative-contract-parser-pg16-py39')
from pglast import parse_sql
from cases import fixtures, cases, concurrency

def sha(data):
    return hashlib.sha256(data).hexdigest()

def run(args, sql=None, timeout=60):
    # Docker daemon access only; no host DB env/config/credentials are forwarded.
    return subprocess.run(args, input=sql, text=True, capture_output=True, timeout=timeout)

def dump(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n')

def main():
    attempt = HERE / ('attempt-%02d' % (1 + len(list(HERE.glob('attempt-*')))))
    attempt.mkdir()
    result = {'started_at_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'checks': [], 'cleanup': 'PENDING', 'scope': 'ISOLATED_SYNTHETIC_PHYSICAL_ONLY'}
    name = 'grc-b01-h04-validation-' + uuid.uuid4().hex[:12]
    token = uuid.uuid4().hex
    cid = None
    command = ['docker', 'run', '--pull=never', '--detach', '--name', name,
               '--label', 'grc.validation.owner=' + token,
               '--network', 'none', '--tmpfs', '/var/lib/postgresql/data:rw,noexec,nosuid,size=512m',
               '--memory', '768m', '--cpus', '2',
               '--env', 'POSTGRES_HOST_AUTH_METHOD=trust', '--env', 'POSTGRES_USER=synthetic_validator',
               '--env', 'POSTGRES_DB=synthetic_contract_validation',
               'postgres:16.15-bookworm', '-c', 'listen_addresses=', '-c', 'max_connections=20']
    result['container_command'] = command
    try:
        created = run(command)
        if created.returncode:
            raise RuntimeError(created.stderr)
        cid = created.stdout.strip()
        result['container_id'] = cid
        inspection = run(['docker', 'inspect', cid])
        info = json.loads(inspection.stdout)[0]
        assert info['HostConfig']['NetworkMode'] == 'none'
        assert not info['HostConfig']['PortBindings']
        assert not info['HostConfig']['Binds']
        assert info['Mounts'] == [] or all(m['Type'] == 'tmpfs' for m in info['Mounts'])
        assert info['Config']['Labels']['grc.validation.owner'] == token
        assert not info['HostConfig']['VolumesFrom']
        assert info['Config']['Cmd'] == command[-4:]
        dump(attempt / 'ISOLATION.json', {
            'container_id': cid, 'image_id': info['Image'], 'image': info['Config']['Image'],
            'network': info['HostConfig']['NetworkMode'], 'ports': info['HostConfig']['PortBindings'],
            'mounts': info['Mounts'], 'binds': info['HostConfig']['Binds'],
            'tmpfs': info['HostConfig']['Tmpfs'], 'volumes_from': info['HostConfig']['VolumesFrom'],
            'environment': info['Config']['Env'], 'postgres_command': info['Config']['Cmd'],
            'credential_source': 'NONE; local trust socket in network-none container only',
            'qa_production_connections_credentials_volumes': 'NONE'})
        psql = ['docker', 'exec', '-i', cid, 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1',
                '-v', 'VERBOSITY=verbose', '-U', 'synthetic_validator', '-d', 'synthetic_contract_validation']
        for _ in range(60):
            probe = run(psql, 'SELECT 1;')
            if probe.returncode == 0:
                break
            time.sleep(.25)
        else:
            raise RuntimeError('temporary PostgreSQL did not become ready')

        def check(label, sql, state=None, message=None, transaction=True):
            index = len(result['checks']) + 1
            payload = ('BEGIN;\n' + sql + '\nSET CONSTRAINTS ALL IMMEDIATE;\nROLLBACK;\n') if transaction else sql
            (attempt / ('%03d-%s.sql' % (index, label))).write_text(payload)
            started = time.monotonic()
            proc = run(psql, payload)
            output = proc.stdout + proc.stderr
            (attempt / ('%03d-%s.log' % (index, label))).write_text(output)
            ok = proc.returncode == 0 if state is None else proc.returncode != 0 and bool(re.search(r'\b' + re.escape(state) + ':', output))
            if message:
                ok = ok and message in output
            item = {'id': label, 'status': 'PASS' if ok else 'FAIL', 'returncode': proc.returncode,
                    'expected_sqlstate': state, 'expected_message': message,
                    'duration_seconds': round(time.monotonic() - started, 4), 'sql_sha256': sha(payload.encode())}
            result['checks'].append(item)
            print(label, item['status'], flush=True)
            dump(attempt / 'RESULT.json', result)
            return ok

        assert check('postgres16_identity', "DO $$ BEGIN IF current_setting('server_version_num')::int/10000<>16 OR current_database()<>'synthetic_contract_validation' THEN RAISE EXCEPTION 'unsafe database'; END IF; END $$; SELECT version();")
        # Replay exact structural statements in approved migration order, not migration
        # histories/preflights/data. DO blocks were inspected: no embedded DDL/DML.
        allowed = {'CreateSchemaStmt', 'CreateStmt', 'AlterTableStmt', 'IndexStmt',
                   'CreateFunctionStmt', 'CreateTrigStmt', 'DropStmt', 'CreateExtensionStmt'}
        inventory = []
        expected = json.loads((ROOT / 'database/migrations/manifest.json').read_text())
        for migration in expected['migrations']:
            path = ROOT / 'database/migrations' / migration['filename']
            raw = path.read_bytes()
            assert sha(raw) == migration['sha256'], str(path)
            text = raw.decode()
            selected = []
            omitted = collections.Counter()
            offsets = []
            for parsed in parse_sql(text):
                kind = type(parsed.stmt).__name__
                if kind in allowed:
                    end = parsed.stmt_location + parsed.stmt_len if parsed.stmt_len else len(raw)
                    exact = raw[parsed.stmt_location:end].decode().strip()
                    selected.append(exact.rstrip(';') + ';')
                    offsets.append({'offset': parsed.stmt_location, 'length': parsed.stmt_len, 'kind': kind})
                else:
                    omitted[kind] += 1
            inventory.append({'path': str(path.relative_to(ROOT)), 'sha256': sha(raw),
                              'selected': offsets, 'omitted': dict(omitted)})
            if selected:
                assert check('base_' + migration['id'], 'BEGIN;\n' + '\n'.join(selected) + '\nCOMMIT;', transaction=False), 'base structural replay failed'
        dump(attempt / 'BASE_STRUCTURAL_INVENTORY.json', inventory)
        paths = [ROOT / 'docs/physical-data-model/amendments/NORMATIVE_LIBRARY_20261020/03_DDL_SPEC.sql',
                 ROOT / 'docs/executable-contracts/amendments/NORMATIVE_LIBRARY_H04_SQL_GRAMMAR_20261021/DDL_SPEC.sql']
        result['candidate_ddls'] = []
        labels = ['B01_B09', 'H04_EFFECTIVE']
        if '--with-corrector' in sys.argv[1:]:
            paths.append(ROOT / 'docs/executable-contracts/amendments/NORMATIVE_LIBRARY_H04_PHYSICAL_VALIDATION_20261021/DDL_SPEC.sql')
            labels.append('H04_PHYSICAL_CORRECTOR_CANDIDATE')
        for label, path in zip(labels, paths):
            raw = path.read_bytes()
            result['candidate_ddls'].append({'path': str(path.relative_to(ROOT)), 'sha256': sha(raw),
                                             'statements': len(parse_sql(raw.decode()))})
            assert check('ddl_' + label, 'BEGIN;\n' + raw.decode() + '\nCOMMIT;', transaction=False), label + ' DDL failed'
        assert check('fixtures_synthetic_only', 'BEGIN;\n' + fixtures() + '\nCOMMIT;', transaction=False)
        for label, sql, state, message in cases():
            check(label, sql, state, message)
        concurrency(psql, check, attempt, result)
        check('no_operational_activation', "DO $$ DECLARE n bigint; BEGIN SELECT (SELECT count(*) FROM iam.permissions)+(SELECT count(*) FROM iam.roles)+(SELECT count(*) FROM platform.schema_migrations) INTO n; IF n<>0 THEN RAISE EXCEPTION 'unexpected permissions roles ledger'; END IF; END $$;")
        catalog = run(psql, "SELECT jsonb_build_object('constraints',(SELECT jsonb_agg(jsonb_build_object('table',conrelid::regclass::text,'name',conname,'definition',pg_get_constraintdef(oid),'validated',convalidated)) FROM pg_constraint WHERE conrelid IN ('knowledge.knowledge_version_context_links'::regclass,'knowledge.knowledge_source_usage_rights'::regclass,'config.configuration_overrides'::regclass,'config.effective_configurations'::regclass,'regulatory.requirement_applicabilities'::regclass)), 'indexes',(SELECT jsonb_agg(to_jsonb(x)) FROM pg_indexes x WHERE schemaname IN ('knowledge','config','regulatory')), 'triggers',(SELECT jsonb_agg(jsonb_build_object('table',tgrelid::regclass::text,'definition',pg_get_triggerdef(oid))) FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN ('knowledge.knowledge_version_context_links'::regclass,'knowledge.knowledge_versions'::regclass,'knowledge.knowledge_source_usage_rights'::regclass,'config.configuration_overrides'::regclass,'regulatory.requirement_applicabilities'::regclass)));")
        assert catalog.returncode == 0, catalog.stderr
        dump(attempt / 'CATALOG.json', json.loads(catalog.stdout))
    except Exception as exc:
        result['execution_error'] = str(exc)
        print('EXECUTION_ERROR', str(exc), flush=True)
    finally:
        if cid:
            inspect = run(['docker', 'inspect', cid])
            owned = inspect.returncode == 0 and json.loads(inspect.stdout)[0]['Config']['Labels'].get('grc.validation.owner') == token
            if owned:
                removed = run(['docker', 'rm', '--force', '--volumes', cid])
                absent = run(['docker', 'inspect', cid])
                result['cleanup'] = 'PASS_DESTROYED' if removed.returncode == 0 and absent.returncode != 0 else 'FAIL'
                dump(attempt / 'CLEANUP.json', {'container_id': cid, 'removal_returncode': removed.returncode,
                      'removal_stdout': removed.stdout, 'absence_returncode': absent.returncode,
                      'absence_stderr': absent.stderr, 'status': result['cleanup']})
            else:
                result['cleanup'] = 'FAIL_OWNERSHIP_NOT_VERIFIED'
        else:
            result['cleanup'] = 'NOT_CREATED'
        result['finished_at_utc'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        result['status'] = 'PASS' if not result.get('execution_error') and result['checks'] and all(x['status']=='PASS' for x in result['checks']) and result['cleanup']=='PASS_DESTROYED' else 'FAIL'
        dump(attempt / 'RESULT.json', result)
        print(json.dumps({'attempt': str(attempt.relative_to(ROOT)), 'status': result['status'], 'checks': len(result['checks']), 'cleanup': result['cleanup']}, indent=2))
    return 0 if result['status']=='PASS' else 1

if __name__ == '__main__':
    sys.exit(main())
