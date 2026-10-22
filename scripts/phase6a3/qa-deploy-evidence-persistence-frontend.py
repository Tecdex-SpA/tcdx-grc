"""Promote only the verified frontend image to the existing QA host, with rollback."""
import hashlib,json,pathlib,subprocess,urllib.request,re
root=pathlib.Path(__file__).resolve().parents[2]
out=root/'docs/phase6a/STEP_6A3/evidence/evidence-persistence-deploy-20261019'
verified=json.loads((out/'image-verification.json').read_text())
assert verified['status']=='PASS'
assert hashlib.sha256((root/'apps/frontend/src/core-grc.tsx').read_bytes()).hexdigest()==verified['source_sha256']
image=verified['image_id']
script=(root/'scripts/phase6a3/qa-promote-evidence-persistence-frontend.py').read_text()
stream=subprocess.Popen(['docker','save',image],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
try:
 loaded=subprocess.run(['ssh','tecdex@192.168.2.46','docker load'],stdin=stream.stdout,capture_output=True,text=True,timeout=180)
 stream.stdout.close();stream.wait(timeout=180)
 assert loaded.returncode==0 and stream.returncode==0,'QA_IMAGE_TRANSFER_FAILED'
finally:
 if stream.poll() is None:stream.terminate()
for preflight in [True,False]:
 command='python3 - '+image+(' --preflight-only' if preflight else '')
 done=subprocess.run(['ssh','tecdex@192.168.2.46',command],input=script,capture_output=True,text=True,timeout=120)
 if done.returncode:raise RuntimeError('FRONTEND_PROMOTION_FAILED: '+done.stdout[-600:])
 receipt=json.loads(done.stdout)
 (out/('preflight.json' if preflight else 'promotion.json')).write_text(json.dumps(receipt,indent=2)+'\n')
 print(json.dumps(receipt),flush=True)
remote="""import hashlib,json,pathlib,subprocess
c=json.loads(subprocess.check_output(['docker','inspect','tcdx-grc-frontend']))[0]
print(json.dumps({'container_id':c['Id'],'image_id':c['Image'],'running':c['State']['Running'],'health':c['State'].get('Health',{}).get('Status'),'restart_count':c['RestartCount']}))
"""
done=subprocess.run(['ssh','tecdex@192.168.2.46','python3 -'],input=remote,capture_output=True,text=True,check=True)
health=json.loads(done.stdout)
assert health['image_id']==image and health['running'] and health['health']=='healthy' and health['restart_count']==0
with urllib.request.urlopen('https://grc.tecdex.net/',timeout=15) as response:
 assert response.status==200
 html=response.read().decode()
 asset=re.search(r'<script[^>]+src="([^"]+\.js)"',html).group(1)
 assert asset=='/assets/'+verified['bundle'],'PUBLIC_BUNDLE_MISMATCH'
with urllib.request.urlopen('https://grc.tecdex.net'+asset,timeout=15) as response:
 assert response.status==200
 bundle=response.read()
assert b'Correlaci' in bundle and b'provenance_ref' in bundle
receipt={'status':'PASS','frontend':health,'canonical_origin':'https://grc.tecdex.net/','https_status':200,'tls_certificate_validation':'PASS','public_bundle':asset,'public_bundle_sha256':hashlib.sha256(bundle).hexdigest(),'file_object_reuse':'Preserves a finalized FileObject within the same open form; does not recover one from a closed/reloaded form.','qa_evidence_created':False,'qa_files_transferred':False}
(out/'postdeploy.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt),flush=True)
