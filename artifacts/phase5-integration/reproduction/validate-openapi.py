import sys
sys.path[:0] = ["/tmp/tcdx-grc-d3-r-python-deps", "/tmp/tcdx-mi8-python-deps"]
from pathlib import Path
import json,re,copy,warnings
warnings.filterwarnings('ignore',category=DeprecationWarning)
import yaml
from openapi_spec_validator import validate_spec
from jsonschema import Draft202012Validator,RefResolver,FormatChecker

root=Path('/Users/andresbarouh/repos/tcdx-grc');base=root/'docs/executable-contracts'
spec=yaml.safe_load((base/'02_OPENAPI_BASE_CONTRACT.yaml').read_text())
validate_spec(spec)
ops={op['operationId']:(path,method,op) for path,item in spec['paths'].items() for method,op in item.items() if method in ['get','post','put','patch','delete']}
matrix=(base/'03_API_RESOURCE_OPERATION_MATRIX.md').read_text()
rows={m[1]:(m[3],m[2].lower()) for m in re.finditer(r'^\| (\w+) \| (GET|POST|PUT) `([^`]+)` \|',matrix,re.M)}
assert {k:(v[0],v[1]) for k,v in ops.items()}==rows
assert len(ops)>0
new=['userIdentityDiscovery','tenantInitialOnboardingCreate']
read=ops[new[0]][2];onboard=ops[new[1]][2]
assert read['x-tcdx-scope']=='platform, tenant'
assert read['x-tcdx-permission']=='`platform.user_identity.read`'
assert read['x-tcdx-tenant-exact-policy']=={'list':False,'pagination':False,'prefix':False,'fuzzy':False,'autocomplete':False,'wildcard':False,'maximum_results':1}
assert read['x-tcdx-mode-authorization']=={'platform_search':'PLATFORM_CHAIN_ONLY_NO_TENANT_HEADER','tenant_exact':'OWN_ACTIVE_MEMBERSHIP_TENANT_ADMIN_CORE_PLATFORM_VALIDATED_HEADER'}
assert read['x-tcdx-runtime-status']=='CONTRACT_ONLY_NOT_PUBLISHED'
assert onboard['x-tcdx-required-permissions']==['platform.tenant.create','platform.user_identity.read']
assert onboard['x-tcdx-preprovisioned-mi-permission']=='platform.managed_identity.create'
assert onboard['x-tcdx-platform-actor-membership-side-effect']==0
assert not onboard['x-tcdx-bootstrap-public-endpoint'] and not onboard['x-tcdx-arbitrary-existing-tenant-input']
assert onboard['x-tcdx-first-role-limit']=='TENANT_ADMIN_ONLY'
assert all('bootstrap' not in path for path in spec['paths'])
catalog=(base/'05_PERMISSION_CATALOG.md').read_text()
assert catalog.count('| platform.user_identity.read |')==1
assert '| platform.user_identity.read | platform.user_identity (physical resource_code=user_identity) | read | CORE_PLATFORM | platform, tenant |' in catalog
assert 'LOCAL_CONTRACT_ONLY; runtime deferred' in catalog
physical=json.loads((root/'database/expected-schema.json').read_text());tables={t['name']:t for t in physical['tables']}
assert not any(c['name'].startswith('scope') for c in tables['iam.permissions']['columns'])
assert ['ownership_class','tenant_id','role_id','permission_id'] in tables['iam.role_permissions']['uniqueConstraints']

resolver=RefResolver.from_schema(spec)
def validator(name):return Draft202012Validator({'$ref':'#/components/schemas/'+name},resolver=resolver,format_checker=FormatChecker())
uid='019b03ab-1111-7000-8000-000000000001'
candidate={'user_identity_id':uid,'display_name':'Persona de prueba contractual','provider':None,'provider_display':None,'lifecycle_state':'active'}
tenantpage={'items':[candidate],'meta':{'has_more':False,'next_cursor':None}}
testnames=[]
def good(name,obj,label):validator(name).validate(obj);testnames.append(label)
def bad(name,obj,label):assert list(validator(name).iter_errors(obj)),label;testnames.append(label)
good('UserIdentityDiscoveryTenantPage',tenantpage,'tenant unique minimal')
good('UserIdentityDiscoveryTenantPage',{'items':[],'meta':{'has_more':False,'next_cursor':None}},'tenant indistinguishable empty')
for field,value in [('email_normalized','person@example.invalid'),('username','nominal'),('subject','forbidden'),('identity_key','forbidden'),('credential_metadata',{}),('mfa_state','forbidden')]:
 obj=copy.deepcopy(tenantpage);obj['items'][0][field]=value;bad('UserIdentityDiscoveryTenantPage',obj,'tenant forbids '+field)
obj=copy.deepcopy(tenantpage);obj['items']*=2;bad('UserIdentityDiscoveryTenantPage',obj,'tenant cannot enumerate multiple results')
obj=copy.deepcopy(tenantpage);obj['meta']['has_more']=True;bad('UserIdentityDiscoveryTenantPage',obj,'tenant cannot signal more')
obj=copy.deepcopy(tenantpage);obj['meta']['next_cursor']='forbidden';bad('UserIdentityDiscoveryTenantPage',obj,'tenant cannot page')
obj=copy.deepcopy(tenantpage);obj['items'][0]['lifecycle_state']='inactive';bad('UserIdentityDiscoveryTenantPage',obj,'inactive not eligible')
request={'tenant':{'tenant_code':'CONTRACT-ONLY','legal_name':'Contract validation only','display_name':'Contract validation only','default_timezone':'America/Santiago'},'initial_administrator':{'kind':'existing_identity','user_identity_id':uid}}
good('TenantInitialOnboardingRequest',request,'existing identity request')
mi=copy.deepcopy(request);mi['initial_administrator']['kind']='provisioned_managed_identity';good('TenantInitialOnboardingRequest',mi,'already provisioned MI request without credential')
for field,value in [('tenant_id',uid),('role_codes',['VIEWER']),('bootstrap',True),('actor_id',uid),('password','forbidden')]:
 obj=copy.deepcopy(request);obj[field]=value;bad('TenantInitialOnboardingRequest',obj,'onboarding forbids '+field)
for field in ['issuer','subject','email','username','temporary_credential','roles']:
 obj=copy.deepcopy(request);obj['initial_administrator'][field]='forbidden';bad('TenantInitialOnboardingRequest',obj,'initial selection forbids '+field)
result={'tenant_id':uid,'user_identity_id':uid,'membership_id':uid,'initial_assignment_id':uid,'completed_steps':['tenant_create','tenant_bootstrap'],'pending_steps':[]}
good('TenantInitialOnboardingResult',result,'complete success receipt')
partial=copy.deepcopy(result);partial['pending_steps']=['tenant_bootstrap'];partial['completed_steps']=['tenant_create'];bad('TenantInitialOnboardingResult',partial,'pending cannot be success201')
error={'code':'TCDX.DEPENDENCY.UNAVAILABLE','message':'Safe error','correlation_id':uid,'retryable':True,'details':{'onboarding_progress':{'tenant_id':uid,'completed_steps':['tenant_create'],'pending_steps':['tenant_bootstrap']}}}
good('TenantInitialOnboardingError',error,'safe partial error progress')
obj=copy.deepcopy(error);obj['details']['lookup_value']='forbidden';bad('TenantInitialOnboardingError',obj,'partial error forbids arbitrary details')


central=ops['tenantUserOnboardingCreate'][2]
assert central['x-tcdx-scope']=='platform' and central['x-tcdx-permission']=='`platform.tenant_user.onboard`'
assert ops['membershipRoleAssign'][2]['x-tcdx-scope']=='tenant'
assert ops['userIdentityTenantAccessList'][2]['x-tcdx-permission']=='`platform.membership.read`'
assert catalog.count('| platform.tenant_user.onboard |')==1
assert '| onboard | CORE_PLATFORM | platform |' in catalog
central_request={'user_identity_id':uid,'tenant_role_codes':['VIEWER'],'reason':'Verified person'}
good('TenantUserOnboardingRequest',central_request,'central ID target')
for field in ['email','username','tenant_id','actor_id','identity_key','password','bootstrap']:
 obj=copy.deepcopy(central_request);obj[field]='forbidden';bad('TenantUserOnboardingRequest',obj,'central forbids '+field)
central_result={'tenant_id':uid,'user_identity_id':uid,'membership_id':uid,'completed_roles':[],'pending_role_codes':[]}
good('TenantUserOnboardingResult',central_result,'central membership-only success')
obj=copy.deepcopy(central_result);obj['pending_role_codes']=['VIEWER'];bad('TenantUserOnboardingResult',obj,'central partial cannot be success')
new.extend(['tenantUserOnboardingCreate','userIdentityTenantAccessList'])

contract=(base/'25_TENANT_INITIAL_ONBOARDING_AND_IDENTITY_DISCOVERY.md').read_text()
assert 'TENANT_BOOTSTRAP_PUBLIC_ENDPOINT=0' in contract
assert 'No grant to Platform Support or any other base role' in contract
assert 'CORE_PLATFORM' in contract and 'Initial Platform tenant creation' in contract
assert 'Raw value' in (base/'08_AUDIT_EVENT_CATALOG.md').read_text()
result={'openApiValidation':'PASS','operationMatrix':'PASS','permissionCatalog':'PASS_LOCAL_STAGED_DEFINITION','rbacScopeDefaultDeny':'PASS','tenantPlatformBoundary':'PASS','permissionPhysicalRepresentation':'SUPPORTED','negativeProjectionAndRequestCases':len(testnames),'caseNames':testnames,'operations':len(ops),'readOperations':sum(method=='get' for path,method,op in ops.values()),'newOperations':new,'schemaChanges':2,'runtimePublication':False,'runtimeTested':False}
Path('/tmp/tcdx-grc-phase5-methodology-openapi-gates.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='caseNames'},indent=2))
