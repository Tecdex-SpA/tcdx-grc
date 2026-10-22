#!/usr/bin/env python3
"""Local NO-GO continuity verifier. No SQL, network, trust installation or writes."""
import json,hashlib,subprocess
from pathlib import Path
BASE=Path(__file__).resolve().parent;ROOT=BASE.parents[3]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def load(p):return json.loads(p.read_text())
def main():
 entry=load(BASE/'ENTRY.json');assert len(entry['files'])==5328
 for path,h in entry['files'].items():assert sha(ROOT/path)==h,path
 def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT).decode().strip()
 assert git('branch','--show-current')==entry['branch'] and git('rev-parse','HEAD')==entry['head']
 assert git('diff','--cached','--binary')==entry['index']==''
 assert load(BASE/'RECTOR_PRE.json')['exit_code']==0
 assert load(BASE/'PRE.json')['exit_code']==0
 assert load(BASE/'NO_GO_01.json')['decision']=='NO_GO'
 failed=load(BASE/'CANONICAL_STATUS.json');assert failed['exit_code']!=0 and 'DEPTH_ZERO_SELF_SIGNED_CERT' in failed['stderr']
 assert not (BASE/'CANONICAL_APPLY.json').exists() and not (BASE/'GO_NO_GO.json').exists() and not (BASE/'POST.json').exists()
 tls=load(BASE/'TLS_PUBLIC_INSPECTION.json');assert tls['network_exit_code']==1 and tls['verification_fatal'] and not tls['verification_disabled'] and not tls['database_authentication_attempted']
 cert=BASE/'TLS_PUBLIC_CERT_OBSERVED_UNTRUSTED.pem';assert sha(cert)==tls['certificate_pem_sha256']
 fp=subprocess.check_output(['/opt/homebrew/opt/openssl@3/bin/openssl','x509','-in',str(cert),'-noout','-fingerprint','-sha256']).decode().strip().split('=',1)[1]
 assert fp=='FB:68:09:DA:13:9E:E3:E5:2C:2F:1F:EA:D7:5B:11:92:7B:04:B8:96:7A:2B:5D:B8:46:9C:B6:70:E3:BB:A3:E6'
 assert tls['authorized_IP_identity_check']['exit_code']==1
 names=load(BASE/'TLS_NAME_ASSESSMENT.json');assert names['exit_code']==0 and names['authorized_name_binding'].startswith('NOT_VERIFIED') and names['certificate_trusted']=='NO'
 result=load(BASE/'RESULT.json');assert result['QA_PHYSICAL_ADOPTION']=='NOT_EXECUTED' and result['WINDOW_START_UTC']=='NOT_STARTED' and result['QA_TLS_IDENTITY_VERIFIED']=='NO'
 inv=load(BASE/'DELTAS.json');own={str(p.relative_to(ROOT)) for p in BASE.rglob('*') if p.is_file()};assert len(own)==inv['files_created'] and inv['files_preexisting_modified']==0
 assert own=={x['path'] for x in inv['files']}|set(inv['seal_exclusions'])
 for x in inv['files']:assert sha(ROOT/x['path'])==x['sha256']
 visible=set(subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=ROOT).decode().split('\0'))-{''};assert visible-set(entry['files'])==own
 hashed=set()
 for line in (BASE/'SHA256SUMS.txt').read_text().splitlines():
  h,p=line.split('  ',1);assert sha(ROOT/p)==h,p;hashed.add(p)
 assert hashed==own-set(inv['manifest_exclusions']);assert sha(BASE/'SHA256SUMS.txt')==load(BASE/'FINAL_INTEGRITY.json')['manifest_sha256']
 return {'integrity':'PASS','files_received_preserved':5328,'files_created':len(own),'files_previous_modified':0,'canonical_34_checksums':'PASS','QA_pre_adoption_schema_drift':'NONE','QA_TLS':'BLOCKED_UNTRUSTED_AND_IP_IDENTITY_MISMATCH','decision':'NO_GO','DDL':'NONE','ledger_writes':'NONE','window':'NOT_STARTED','index':'EMPTY_PRESERVED'}
if __name__=='__main__':print(json.dumps(main(),indent=2))
