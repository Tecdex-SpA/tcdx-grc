"""Exercise the immutable frontend candidate locally; every API interaction is mocked."""
import hashlib,json,pathlib,subprocess,time,urllib.request,os,re
root=pathlib.Path(__file__).resolve().parents[2]
out=root/'docs/phase6a/STEP_6A3/evidence/evidence-control-selector-deploy-20261019'
tag='tcdx-grc-frontend:step6a3-evidence-control-selector-20261019'
name='tcdx-grc-frontend-evidence-control-selector-verify'
image=subprocess.check_output(['docker','image','inspect',tag,'--format','{{.Id}}'],text=True).strip()
container=subprocess.check_output(['docker','run','--rm','-d','--name',name,'--platform','linux/amd64','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','-p','127.0.0.1:4173:8080',image],text=True).strip()
try:
 for _ in range(30):
  try:
   with urllib.request.urlopen('http://127.0.0.1:4173/',timeout=2) as response:html=response.read().decode()
   break
  except Exception:time.sleep(.5)
 else:raise RuntimeError('IMAGE_PREVIEW_UNAVAILABLE')
 asset=re.search(r'<script[^>]+src="([^"]+\.js)"',html).group(1)
 with urllib.request.urlopen('http://127.0.0.1:4173'+asset,timeout=3) as response:bundle=response.read()
 image_bundle=subprocess.check_output(['docker','exec',container,'cat','/app/apps/frontend/dist'+asset])
 assert image_bundle==bundle,'SERVED_IMAGE_BUNDLE_MISMATCH'
 assert b'https://grc.tecdex.net' in bundle,'CANONICAL_API_ORIGIN_REQUIRED'
 env=dict(os.environ,TCDX_UI_EVIDENCE_DIR=str(out))
 result=subprocess.run(['pnpm','exec','playwright','test','e2e/core-grc-ui.spec.ts','--project=chromium-desktop','--project=chromium-narrow','--grep','evidence link control picker excludes'],cwd=root,env=env,capture_output=True,text=True,timeout=120)
 (out/'image-playwright.log').write_text(result.stdout+result.stderr)
 if result.returncode:raise RuntimeError('COMPILED_IMAGE_BROWSER_REGRESSION_FAILED')
 receipt={'status':'PASS','image_id':image,'architecture':'linux/amd64','bundle':asset.rsplit('/',1)[-1],'bundle_sha256':hashlib.sha256(bundle).hexdigest(),'test':'EvidenceLink control_id excludes global references and preserves tenant controls; desktop and narrow; no uploads or creations','qa_requests':0,'source_sha256':{p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in ['apps/frontend/src/reference-read.ts','apps/frontend/src/structured-reference-fields.tsx']}}
 (out/'image-verification.json').write_text(json.dumps(receipt,indent=2)+'\n')
 print(json.dumps(receipt))
finally:
 subprocess.run(['docker','stop',name],capture_output=True,text=True,timeout=30)
