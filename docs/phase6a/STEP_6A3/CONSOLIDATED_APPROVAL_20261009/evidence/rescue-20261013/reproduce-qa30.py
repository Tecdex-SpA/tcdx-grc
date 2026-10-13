import pathlib,subprocess,json,hashlib,sys
evidence=pathlib.Path(__file__).resolve().parent
target=pathlib.Path(sys.argv[1]).resolve()
if target.exists():raise SystemExit("Output must be a new directory")
target.mkdir(parents=True)
for e in json.loads((evidence/"candidate-source-manifest.json").read_text()):
 p=e["path"];overlay=evidence/"candidate-delta-source"/p
 data=overlay.read_bytes() if overlay.is_file() else subprocess.check_output(["git","show","6af66387aa03fa185ef139584de07700f247b903:"+p])
 assert hashlib.sha256(data).hexdigest()==e["sha256"],p
 dest=target/p;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
print("QA30_SOURCE_REPRODUCED=PASS;183 verified paths")
