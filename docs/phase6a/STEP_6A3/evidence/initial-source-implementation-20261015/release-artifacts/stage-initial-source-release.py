"""Run on the exact QA host by the next operator. Stages gates; never runs Docker."""
from pathlib import Path
import hashlib,json,socket,sys,shutil
EXPECTED_GATE='549687ebca9215a5b2936898db47e62c35fad7f212194217605d8c0da22c4af6'
OLD={'grc-bk':'8889ab6a0eaea04c989e4c2540fe5dd6e346e64904bf2a7cfac8cbc1455bfb05','grc-www':'f700d274b42dead1c84115a456fec3451310b127cf0ac34217bf5f430f15caa5'}
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
 host=socket.gethostname().split('.')[0]
 if host not in OLD or len(sys.argv)!=2:raise RuntimeError('EXACT_QA_HOST_AND_CONFIG_DIRECTORY_REQUIRED')
 source=Path(__file__).resolve().parent;config=Path(sys.argv[1]).resolve()
 if config!=Path.home()/'.config/tcdx-grc/step6a3-iam-m2m-20261014' or not config.is_dir() or config.stat().st_mode&0o077:raise RuntimeError('PROTECTED_EXISTING_CONFIG_REQUIRED')
 gate=source/'release-gate-initial-source.json'
 if digest(gate)!=EXPECTED_GATE:raise RuntimeError('EXACT_HANDOFF_GATE_REQUIRED')
 j=json.loads(gate.read_text())
 for entry in j['artifacts'].values():
  src=source/entry['filename']
  if Path(entry['filename']).name!=entry['filename'] or digest(src)!=entry['sha256']:raise RuntimeError('ARTIFACT_HASH_MISMATCH')
  dest=config/src.name
  if dest.exists():
   if digest(dest)!=entry['sha256']:raise RuntimeError('EXISTING_ARTIFACT_DIFFERS_PRESERVE_AND_RECONCILE')
  else:shutil.copy2(src,dest)
 promoter='qa-promote-step6a3-initial-source-20261015.py';dest=config/promoter
 if dest.exists() and digest(dest)!=digest(source/promoter):raise RuntimeError('EXISTING_PROMOTER_DIFFERS')
 if not dest.exists():shutil.copy2(source/promoter,dest)
 current=config/'release-gate.json';previous=digest(current)
 if previous==EXPECTED_GATE:
  print(json.dumps({'status':'ALREADY_STAGED_NO_DEPLOY','host':host,'gate_sha256':EXPECTED_GATE}));return
 if previous!=OLD[host]:raise RuntimeError('CURRENT_GATE_CHANGED_RECONCILE_BEFORE_STAGING')
 backup=config/('release-gate-before-initial-source-'+host+'-20261015.json')
 if backup.exists():
  if digest(backup)!=previous:raise RuntimeError('BACKUP_CONFLICT')
 else:shutil.copy2(current,backup)
 temporary=config/'release-gate.initial-source.staging.json'
 if temporary.exists():raise RuntimeError('STAGING_FILE_EXISTS_RECONCILE')
 shutil.copy2(gate,temporary);temporary.replace(current)
 print(json.dumps({'status':'STAGED_NO_DEPLOY','host':host,'gate_sha256':EXPECTED_GATE,'previous_gate_sha256':previous,'previous_gate_preserved':str(backup)}))
if __name__=='__main__':main()
