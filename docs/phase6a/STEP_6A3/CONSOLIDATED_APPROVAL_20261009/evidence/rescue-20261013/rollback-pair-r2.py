import argparse,hashlib,json,pathlib,shlex,subprocess
p=pathlib.Path(__file__).resolve().parent
a=argparse.ArgumentParser();a.add_argument('--go-receipt',required=True);a.add_argument('--go-sha256',required=True);args=a.parse_args()
raw=pathlib.Path(args.go_receipt).read_bytes();assert hashlib.sha256(raw).hexdigest()==args.go_sha256
r=json.loads(raw);assert r['decision']=='GO' and 'rollback' in r['authorized_actions'] and r['human_approval_record']
ops=json.loads((p/'operational-specs-r2.json').read_text());assert r['specs']==ops['specs'] and r['driver_sha256']==ops['driver_sha256']
root='/home/tecdex/.cache/tcdx-grc/iana-qa30-20261013'
for name in ['tcdx-grc-backend','tcdx-grc-frontend']:
 s=ops['specs'][name];cmd=['env','TCDX_QA_GO_RECEIPT='+root+'/go-receipt.json','TCDX_QA_GO_RECEIPT_SHA256='+args.go_sha256,'python3',root+'/driver.py',json.dumps(s,separators=(',',':')),'rollback']
 result=subprocess.run(['ssh','-o','BatchMode=yes','-o','ConnectTimeout=10',s['host'],shlex.join(cmd)],capture_output=True,text=True,timeout=270);assert result.returncode==0,'ROLLBACK_REQUIRES_OPERATOR';j=json.loads(result.stdout);assert j['restored']['containerId']==s['containerId'] and j['restored']['imageId']==s['oldImage'];print(s['component']+' ROLLBACK=PASS')
