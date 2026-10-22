"""STEP6A4 frontend-only QA promotion using the documented STEP6A3 transport/promoter.

Requires sealed predeploy/build/image receipts; never builds or changes Git/backend.
"""
import datetime, hashlib, json, pathlib, re, subprocess, urllib.request
ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/phase6a/STEP_6A4/evidence/qa-20261020'
def save(name, value):
    (OUT / name).write_text(json.dumps(value, indent=2) + '\n')
def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()
def main():
    assert not (OUT/'promotion.json').exists(), 'PROMOTION_ALREADY_RECORDED_DO_NOT_REPEAT'
    assert json.loads((OUT/'PREDEPLOYMENT_GATE.json').read_text())['PREDEPLOYMENT_GATE']=='PASS'
    built=json.loads((OUT/'BUILD_RESULT.json').read_text()); assert built['BUILD_STATUS']=='PASS'
    verified=json.loads((OUT/'image-verification.json').read_text()); assert verified['status']=='PASS'
    for p,h in json.loads((OUT/'build-source-sha256.json').read_text()).items():
        assert hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==h, p
    image=verified['image_id']
    archive=pathlib.Path('/private/tmp/step6a4-frontend-20261020.tar')
    subprocess.run(['docker','save','-o',str(archive),image],check=True)
    digest=hashlib.file_digest(archive.open('rb'),'sha256').hexdigest()
    with archive.open('rb') as stream:
        loaded=subprocess.run(['ssh','tecdex@192.168.2.46','docker load'],stdin=stream,capture_output=True,text=True,timeout=180)
    save('transport.json',{'archive_sha256':digest,'archive_bytes':archive.stat().st_size,'exit_code':loaded.returncode,'output':loaded.stdout,'transport':'docker save -> SSH -> docker load; no registry/Git publication'})
    assert loaded.returncode==0,'QA_IMAGE_TRANSFER_FAILED'
    promoter=(ROOT/'scripts/phase6a4/qa-promote-frontend.py').read_text()
    for preflight in [True,False]:
        start=now()
        done=subprocess.run(['ssh','tecdex@192.168.2.46','python3 - '+image+(' --preflight-only' if preflight else '')],input=promoter,capture_output=True,text=True,timeout=120)
        receipt=json.loads(done.stdout);receipt.update(started_at_utc=start,ended_at_utc=now(),exit_code=done.returncode)
        save('candidate-preflight.json' if preflight else 'promotion.json',receipt)
        assert done.returncode==0,receipt
        print(json.dumps(receipt),flush=True)
    with urllib.request.urlopen('https://grc.tecdex.net/',timeout=20) as response:
        assert response.status==200; html=response.read().decode()
    asset=re.search(r'<script[^>]+src="([^"]+\.js)"',html).group(1)
    assert asset=='/assets/'+verified['bundle'],'PUBLIC_BUNDLE_MISMATCH'
    with urllib.request.urlopen('https://grc.tecdex.net'+asset,timeout=20) as response:
        bundle=response.read()
    assert hashlib.sha256(bundle).hexdigest()==verified['bundle_sha256'],'PUBLIC_BUNDLE_HASH_MISMATCH'
    assert b'grc.tecdx.net' not in bundle,'INCORRECT_DOMAIN'
    save('public-parity.json',{'status':'PASS','recorded_at_utc':now(),'url':'https://grc.tecdex.net/','tls_verified':True,'http_status':200,'bundle':asset,'bundle_sha256':verified['bundle_sha256'],'incorrect_domain_present':False})
if __name__=='__main__':
    main()
