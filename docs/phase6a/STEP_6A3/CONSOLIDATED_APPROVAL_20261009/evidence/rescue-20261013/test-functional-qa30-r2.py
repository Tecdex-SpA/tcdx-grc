import ast
import hashlib
import json
import pathlib
import re

p = pathlib.Path(__file__).resolve().parent
original = p / 'functional-qa30-runtime-driver.py'
candidate = p / 'functional-qa30-runtime-driver-r2.py'
promoter = p / 'promote-functional-plan-qa30-r2.py'
package = json.loads((p / 'functional-plan-qa30-package-r2.json').read_text())
specs = json.loads((p / 'functional-plan-qa30-operational-specs-r2.json').read_text())

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

assert sha(original) == '34262bdd63addea3adea8f46bbaa279b178245f404492525f666cc5b9cf7d4ca'
assert sha(candidate) == specs['driver_sha256'] == package['rollback']['driver_sha256']
assert sha(promoter) == package['rollback']['promoter_sha256']
assert specs['specs'] == json.loads((p / 'functional-plan-qa30-operational-specs.json').read_text())['specs']

tree = ast.parse(candidate.read_text())
precheck = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == 'precheck')
guard = next(node for node in precheck.body if isinstance(node, ast.If) and ast.unparse(node.test) == "old['State']['Running']")
code = compile(ast.Module(body=[guard], type_ignores=[]), str(candidate), 'exec')

def check(running, name, action, user, uid):
    calls = []
    def checked(args):
        calls.append(args)
        return uid
    scope = {'old': {'State': {'Running': running}, 'Config': {'User': user}}, 'NAME': name,
             'ACTION': action, 'checked': checked}
    exec(code, scope)
    return calls

assert len(check(True, 'tcdx-grc-frontend', 'preflight', 'node', '1000')) == 1
assert check(False, 'tcdx-grc-frontend', 'deploy', 'node', '0') == []
for name, action, user in [('tcdx-grc-frontend', 'deploy', 'root'),
                           ('tcdx-grc-frontend', 'preflight', 'node'),
                           ('tcdx-grc-backend', 'deploy', 'node')]:
    try:
        check(False, name, action, user, '1000')
        raise AssertionError('parked user guard accepted invalid context')
    except AssertionError as error:
        assert str(error) == 'PARKED_FRONTEND_USER_DRIFT'
try:
    check(True, 'tcdx-grc-frontend', 'preflight', 'node', '0')
    raise AssertionError('running UID guard accepted root')
except AssertionError as error:
    assert str(error) != 'running UID guard accepted root'

promoter_tree = ast.parse(promoter.read_text())
safe_reason = next(node for node in promoter_tree.body if isinstance(node, ast.FunctionDef) and node.name == 'safe_reason')
scope = {'re': re}
exec(compile(ast.Module(body=[safe_reason], type_ignores=[]), str(promoter), 'exec'), scope)
assert scope['safe_reason'](RuntimeError('DRIVER_FAILED_frontend_SAFE_COMMAND_FAILED')) == 'DRIVER_FAILED_frontend_SAFE_COMMAND_FAILED'
assert scope['safe_reason'](RuntimeError('secretBearerToken')) == 'UNCLASSIFIED_OPERATION_GATE_FAILED'
assert scope['safe_reason'](AssertionError('private')) == 'ASSERTION_OR_OPERATION_GATE_FAILED'
print('QA30_R2_OFFLINE=PASS; QA_WRITE=NOT_EXECUTED')
