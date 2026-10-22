"""Verify the exact compiled QA image using the existing mocked browser regression."""
import json,pathlib,subprocess,time,urllib.request,os
root=pathlib.Path(__file__).resolve().parents[2]
out=root/'docs/phase6a/STEP_6A3/evidence/evidence-persistence-deploy-20261019'
tag='tcdx-grc-frontend:step6a3-evidence-persistence-20261019'
name='tcdx-grc-frontend-evidence-retry-verify'
image=subprocess.check_output(['docker','image','inspect',tag,'--format','{{.Id}}'],text=True).strip()
original=root/'docs/phase6a/STEP_6A3/evidence/evidence-persistence-20261019/creation-provenance-error.png'
before=original.read_bytes() if original.exists() else None
container=subprocess.check_output(['docker','run','--rm','-d','--name',name,'--platform','linux/amd64','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','-p','127.0.0.1:4173:8080',image],text=True).strip()
try:
 for _ in range(30):
  try:
   with urllib.request.urlopen('http://127.0.0.1:4173/',timeout=2) as response:html=response.read().decode()
   break
  except Exception:time.sleep(.5)
 else:raise RuntimeError('IMAGE_PREVIEW_UNAVAILABLE')
 assert 'index-DD_KnZUO.js' in html, 'EXACT_COMPILED_BUNDLE_REQUIRED'
 env=dict(os.environ,TCDX_UI_EVIDENCE_DIR=str(out))
 result=subprocess.run(['pnpm','exec','playwright','test','e2e/core-grc-ui.spec.ts','--project=chromium-desktop','--grep','evidence provenance rejection stays'],cwd=root,env=env,capture_output=True,text=True,timeout=90)
 (out/'image-playwright.log').write_text(result.stdout+result.stderr)
 if result.returncode:raise RuntimeError('COMPILED_IMAGE_BROWSER_REGRESSION_FAILED')
 if original.exists():(out/'compiled-image-creation-error.png').write_bytes(original.read_bytes())
 receipt={'status':'PASS','image_id':image,'architecture':'linux/amd64','bundle':'index-DD_KnZUO.js','test':'existing provenance rejection / reference serialization / retry with same FileObject / one upload','qa_requests':0,'source_sha256':__import__('hashlib').sha256((root/'apps/frontend/src/core-grc.tsx').read_bytes()).hexdigest()}
 (out/'image-verification.json').write_text(json.dumps(receipt,indent=2)+'\n')
 print(json.dumps(receipt))
finally:
 if before is not None:original.write_bytes(before)
 subprocess.run(['docker','stop',name],capture_output=True,text=True,timeout=30)
