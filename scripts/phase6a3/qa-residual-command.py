"""Send a scoped QA command to the authenticated browser; never handles credentials."""
import json, sys, time
from pathlib import Path
root=Path('docs/phase6a/STEP_6A3/evidence/residual-closeout-20261020/qa-review')
cmd=json.loads(sys.argv[1]); cmd.setdefault('tenantId','01a0cfc7-0c97-75a3-890f-d6ca9db8bbe9')
(root/('request-'+cmd['id']+'.json')).write_text(json.dumps(cmd,indent=2)+'\n')
(root/'browser-command.json').write_text(json.dumps(cmd))
response=root/('response-'+cmd['id']+'.json')
for _ in range(45):
 if response.exists():
  j=json.loads(response.read_text());print(json.dumps(j,ensure_ascii=False)[:14000]);break
 time.sleep(1)
else:raise SystemExit('BROWSER_RESPONSE_PENDING')
