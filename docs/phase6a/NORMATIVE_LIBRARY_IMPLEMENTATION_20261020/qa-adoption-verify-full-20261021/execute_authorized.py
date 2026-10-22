#!/usr/bin/env python3
"""One authorized QA migration only, after fresh GO. Never loops or repairs DDL."""
import sys,subprocess,json,datetime
from pathlib import Path
BASE=Path(__file__).resolve().parent
def read(name):return json.loads((BASE/name).read_text())
def operator(mode):
 subprocess.run([sys.executable,str(BASE/'operator.py'),mode],check=True)
 return read('CANONICAL_'+mode.upper()+'.json')['exit_code']
def main():
 assert not (BASE/'GO_NO_GO.json').exists() and not (BASE/'CANONICAL_APPLY.json').exists()
 assert read('PREFLIGHT_ASSESSMENT.json')['decision']=='PASS_PRECHECK' and read('TYPECHECK_FINAL.json')['exit_code']==0
 assert operator('IMMEDIATE')==0,'Final read-only guard failed'
 subprocess.run([sys.executable,str(BASE/'assess.py'),'IMMEDIATE'],check=True)
 # The window starts inside assess.py only after the last gate and fresh activity.
 result={'started_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'migration_id':'20261021221204','no_other_migration_authorized':True}
 try:
  applied=operator('apply');result['apply_exit_code']=applied
  if applied!=0:
   result['status']='FAILED_STOPPED_NO_AUTOMATIC_REPAIR';operator('POST');return
  result['canonical_verify_exit_code']=operator('verify')
  result['post_readonly_exit_code']=operator('POST')
  result['status']='APPLIED_PENDING_POST_ASSESSMENT'
 finally:
  result['finished_utc']=datetime.datetime.now(datetime.timezone.utc).isoformat();(BASE/'EXECUTION.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
if __name__=='__main__':main()
