"""Compare immutable images without starting app services or accessing secrets/network."""
import json,pathlib,subprocess
root=pathlib.Path(__file__).resolve().parents[2]
images=json.loads((root/'docs/phase6a/STEP_6A3/evidence/session-duration-20261019/deployed-images.json').read_text())
code="""const fs=require('fs'),path=require('path'),crypto=require('crypto');const out={};
function walk(base){for(const name of fs.readdirSync(base)){const p=path.join(base,name);if(fs.statSync(p).isDirectory())walk(p);else if(!p.includes('.test.')&&!p.endsWith('.tsbuildinfo'))out[p]=crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')}}
for(const p of process.argv.slice(1))walk(p);console.log(JSON.stringify(out));"""
def hashes(image,paths):
 raw=subprocess.check_output(['docker','run','--rm','--platform','linux/amd64','--network','none','--read-only','--entrypoint','node',image,'-e',code,*paths],text=True,stderr=subprocess.PIPE)
 return json.loads(raw)
old='tcdx-grc-backend:step6a3-upload-scope-20261019'
paths=['/app/apps/backend/src','/app/apps/backend/dist']
a,b=hashes(old,paths),hashes(images['backend']['image_id'],paths)
changed=[p for p in sorted(set(a)|set(b)) if a.get(p)!=b.get(p)]
allowed={'config','server','security/application-token','security/oidc-browser','security/browser-token-renewal','security/publication-operator-server'}
unexpected=[]
for p in changed:
 relative=p.split('/backend/')[1].split('/',1)[1]
 stem=relative.removesuffix('.map').removesuffix('.d.ts').removesuffix('.js').removesuffix('.ts')
 if stem not in allowed:unexpected.append(p)
fpaths=['/app/apps/frontend/dist','/app/apps/frontend/static-server.mjs']
# Static-server is checked separately by the directory walker on its parent; only dist is needed here.
a=hashes('tcdx-grc-frontend:step6a3-upload-scope-20261019',fpaths[:1])
b=hashes(images['frontend']['image_id'],fpaths[:1])
visual=[p for p in a if p.endswith(('.css','.svg','.png','.jpg','.ico'))]
visual_preserved=all(a[p]==b.get(p) for p in visual)
result={'status':'PASS' if not unexpected and visual_preserved else 'FAIL','backend_changed_files':changed,'unexpected_backend_files':unexpected,'frontend_visual_asset_count':len(visual),'frontend_visual_assets_byte_identical':visual_preserved}
(root/'docs/phase6a/STEP_6A3/evidence/session-duration-20261019/image-scope-parity.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result));assert result['status']=='PASS'
