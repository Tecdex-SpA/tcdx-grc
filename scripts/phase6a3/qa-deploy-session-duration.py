"""Build artifacts are local; stream only the two reviewed QA images and promote with rollback."""
import json,pathlib,shlex,subprocess,sys
root=pathlib.Path(__file__).resolve().parents[2]
evidence=root/'docs/phase6a/STEP_6A3/evidence/session-duration-20261019'
policy=json.loads((root/'deploy/qa/session-duration.json').read_text())
assert policy['environment']=='qa'
script=(root/'scripts/phase6a3/qa-promote-session-duration.py').read_text()
receipts=json.loads((evidence/'deployed-images.json').read_text())
for kind,host in [('backend','192.168.2.45')]:
 tag='tcdx-grc-'+kind+':step6a3-session-duration-20261019'
 image=subprocess.check_output(['docker','image','inspect',tag,'--format','{{.Id}}'],text=True).strip()
 stream=subprocess.Popen(['docker','save',tag],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
 loaded=subprocess.run(['ssh','tecdex@'+host,'docker load'],stdin=stream.stdout,capture_output=True,text=True,timeout=180)
 stream.stdout.close(); stream.wait(timeout=180)
 if loaded.returncode or stream.returncode: raise RuntimeError('QA_IMAGE_TRANSFER_FAILED_'+kind)
 env='QA_SESSION_ROLLOUT=step6a3-session-duration-r2-20261019 '+' '.join(k+'='+shlex.quote(str(policy[k])) for k in ['APP_SESSION_IDLE_SECONDS','APP_SESSION_MAX_SECONDS'])
 for preflight in [True,False]:
  command=env+' python3 - '+kind+' '+image+(' --preflight-only' if preflight else '')
  done=subprocess.run(['ssh','tecdex@'+host,command],input=script,capture_output=True,text=True,timeout=150)
  if done.returncode: raise RuntimeError('QA_PROMOTION_FAILED_'+kind+': '+done.stdout[-600:])
  receipt=json.loads(done.stdout)
  (evidence/(kind+('-r2-preflight' if preflight else '-r2-promotion')+'.json')).write_text(json.dumps(receipt,indent=2)+'\n')
  print(json.dumps(receipt),flush=True)
 receipts[kind]={'image_id':image,'host':host}
(evidence/'deployed-images.json').write_text(json.dumps(receipts,indent=2)+'\n')
