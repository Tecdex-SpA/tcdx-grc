import hashlib,json,subprocess,sys,tarfile
from pathlib import Path
kind=sys.argv[1]
images={'backend':'sha256:af3a818693659e5e1f9a0e00800271aa621a941d81b969fc020e86b3a21f1516','frontend':'sha256:cf5b7d492cdf4030a4603773200aca5b20f1e6c66ce51a51755ab024ce3f9a2f'}
host={'backend':'192.168.2.45','frontend':'192.168.2.46'}[kind]
remote=r'''
import subprocess,tarfile,hashlib,json
image=IMAGE
kind=KIND
hashes={}
process=subprocess.Popen(['docker','image','save',image],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
with tarfile.open(fileobj=process.stdout,mode='r|') as outer:
 for member in outer:
  if not member.isfile() or not (member.name.endswith('/layer.tar') or member.name.startswith('blobs/sha256/')): continue
  try:
   layer=tarfile.open(fileobj=outer.extractfile(member),mode='r|*')
  except tarfile.ReadError:
   continue
  with layer:
   for item in layer:
    name=item.name.lstrip('./')
    if not item.isfile(): continue
    selected=(name.startswith('app/apps/'+kind+'/') or name.startswith('app/packages/'))
    if not selected: continue
    stream=layer.extractfile(item)
    digest=hashlib.sha256()
    for chunk in iter(lambda: stream.read(1024*1024),b''): digest.update(chunk)
    hashes[name.removeprefix('app/')]=digest.hexdigest()
if process.wait()!=0: raise SystemExit('IMAGE_READ_FAILED')
print(json.dumps({'image_id':image,'file_hashes':hashes},sort_keys=True))
'''.replace('IMAGE',repr(images[kind]),1).replace('KIND',repr(kind),1)
result=subprocess.run(['ssh','-o','BatchMode=yes','-o','ConnectTimeout=8','tecdex@'+host,'python3 -'],input=remote,capture_output=True,text=True,timeout=180)
if result.returncode: raise SystemExit('IMAGE_CONTENT_READ_FAILED')
d=json.loads(result.stdout)
assert d['file_hashes'],'NO_IMAGE_LAYER_FILES_READ'
manifest=json.loads(Path('/tmp/step6a3-resolution-'+kind+'-input-manifest.json').read_text())
required=[e for e in manifest['files'] if ('/src/' in e['path']) and '.test.' not in e['path']]
source_diffs=[e['path'] for e in required if d['file_hashes'].get(e['path'])!=e['sha256']] if kind=='backend' else []
artifacts=[(p,h) for p,h in d['file_hashes'].items() if '/dist/' in p and '.test.' not in p]
artifact_diffs=[p for p,h in artifacts if not Path(p).is_file() or hashlib.sha256(Path(p).read_bytes()).hexdigest()!=h]
Path('/tmp/step6a3-resolution-'+kind+'-image-content.json').write_text(json.dumps(d,indent=2,sort_keys=True)+'\n')
print(json.dumps({'kind':kind,'image_id':d['image_id'],'required_backend_source_files':len(required) if kind=='backend' else None,'source_differences':source_diffs,'non_test_runtime_artifacts':len(artifacts),'artifact_differences_from_local_dist':artifact_diffs},sort_keys=True))
