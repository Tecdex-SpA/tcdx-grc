"""QA private operator deployment using existing container configuration and secret custody.

No secret values are printed or transported in command arguments. This entry point
does not replace the application release or change PostgreSQL structures.
"""
import hashlib
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import re
import time

def run(args):
    result = subprocess.run(args, capture_output=True, text=True, timeout=120)
    if result.returncode:
        raise RuntimeError("QA_DOCKER_OPERATION_FAILED")
    return result.stdout.strip()

def main():
    if socket.gethostname().split(".")[0] != "grc-bk":
        raise RuntimeError("QA_BACKEND_HOST_REQUIRED")
    if len(sys.argv) != 4:
        raise RuntimeError("USAGE: qa-iam-publication-runtime IMAGE_ID SOURCE_SHA CONFIG_DIRECTORY")
    image_id, source_sha, directory = sys.argv[1:]
    name = os.environ.get("TCDX_QA_OPERATOR_NAME", "tcdx-grc-step6a3-publication-operator")
    if not re.fullmatch(r"tcdx-grc-step6a3-[a-z0-9-]+-operator", name):
        raise RuntimeError("CANONICAL_OPERATOR_NAME_REQUIRED")
    replacement = os.environ.get("TCDX_QA_OPERATOR_REPLACE", "")
    if replacement not in ["", "integrated-qa-release-20261022", "integrated-qa-release-20261022-v3"]:
        raise RuntimeError("UNREVIEWED_OPERATOR_REPLACEMENT")
    replace = bool(replacement)
    previous = json.loads(run(["docker", "inspect", name]))[0] if replace else None
    config = Path(directory)
    if not config.is_dir() or config.stat().st_mode & 0o077:
        raise RuntimeError("PROTECTED_CONFIG_DIRECTORY_REQUIRED")
    current = json.loads(run(["docker", "inspect", "tcdx-grc-backend"]))[0]
    env = dict(item.split("=", 1) for item in current["Config"]["Env"])
    identity_code = "import {createDatabase,sql} from '/app/apps/backend/dist/database.js'; import {loadConfig} from '/app/apps/backend/dist/config.js'; const c=loadConfig(process.env); const db=createDatabase(c); try { const r=await sql`SELECT current_database() AS db,host(inet_server_addr()) AS host,current_setting('server_version_num')::int/10000 AS major`.execute(db); console.log(JSON.stringify({environment:c.nodeEnv,...r.rows[0]})); } finally {await db.destroy();}"
    identity = json.loads(run(["docker", "exec", current["Id"], "node", "--input-type=module", "-e", identity_code]))
    if identity != {"environment": "qa", "db": "tcdx-grc", "host": "192.168.2.40", "major": 16}:
        raise RuntimeError("QA_RUNTIME_IDENTITY_REQUIRED")
    image = json.loads(run(["docker", "image", "inspect", image_id]))[0]
    if image["Id"] != image_id or image["Architecture"] != "amd64" or image["Os"] != "linux" or image["Config"]["Labels"].get("tcdx.source.sha256") != source_sha:
        raise RuntimeError("EXACT_AMD64_SOURCE_IMAGE_REQUIRED")
    secret = Path.home() / ".secrets/tcdx-grc-qa/iam-publisher-client-secret"
    if not secret.is_file() or secret.is_symlink() or secret.stat().st_mode & 0o077 or secret.stat().st_uid != os.getuid():
        raise RuntimeError("PROTECTED_EXTERNAL_CREDENTIAL_REQUIRED")
    filenames = {
        "TCDX_IAM_M2M_PROFILE": "step6a3-m2m-qa-profile.json",
        "TCDX_IAM_BINDINGS": "08_COMMAND_PERMISSION_LIFECYCLE_AUDIT_BINDINGS.json",
        "TCDX_IAM_DECISION": "IAM_M2M_QA_DECISION_RECEIPT_20261014.json",
        "TCDX_IAM_RBAC_R3": "20261009000400_phase6a3_rbac_resolution.sql",
    }
    for key, filename in filenames.items():
        env[key + "_FILE"] = "/run/config/step6a3-iam/" + filename
        env[key + "_SHA256"] = hashlib.sha256((config / filename).read_bytes()).hexdigest()
    manifest = config / "COMMERCIAL_CATALOG_PUBLICATION_MANIFEST_CANDIDATE_20261014.json"
    receipt = json.loads((config / "HUMAN_COMMERCIAL_MANIFEST_APPROVAL_RECEIPT_20261014.json").read_text())
    manifest_sha = hashlib.sha256(manifest.read_bytes()).hexdigest()
    if receipt["manifest_sha256"] != manifest_sha or receipt["decision_record_sha256"] != hashlib.sha256((config / "COMMERCIAL_CATALOG_DECISION_RECORD_CANDIDATE_20261014.json").read_bytes()).hexdigest():
        raise RuntimeError("EXACT_APPROVED_COMMERCIAL_MANIFEST_REQUIRED")
    env["TCDX_COMMERCIAL_APPROVED_MANIFEST_SHA256"] = manifest_sha
    env["TCDX_COMMERCIAL_CATALOG_OPERATOR_SOCKET"] = "/run/tcdx-operator/catalog.sock"
    env["TCDX_QA_EXISTING_SESSION_ORIGIN"] = "http://127.0.0.1:4000"
    library_root = os.environ.get("TCDX_LIBRARY_PUBLICATION_ROOT")
    if library_root:
        for key in ("TCDX_LIBRARY_PUBLICATION_ROOT", "TCDX_LIBRARY_PUBLICATION_INPUT_FILE", "TCDX_LIBRARY_PUBLICATION_INPUT_SHA256"):
            if not os.environ.get(key):
                raise RuntimeError("COMPLETE_LIBRARY_PUBLICATION_CONFIGURATION_REQUIRED")
            env[key] = os.environ[key]
    operator_dir = Path(next(m["Source"] for m in previous["Mounts"] if m["Destination"] == "/run/tcdx-operator")) if previous else config / "operator"
    operator_dir.mkdir(mode=0o700, exist_ok=True)
    private_env = config / "operator.private.env"
    fd = os.open(private_env, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        with os.fdopen(fd, "w") as stream:
            for key, value in env.items():
                if "\n" in value or "\r" in value:
                    raise RuntimeError("UNSUPPORTED_RUNTIME_ENV_VALUE")
                stream.write(key + "=" + value + "\n")
        args = ["docker", "run", "-d", "--name", name,
                "--network", "host", "--read-only", "--tmpfs", "/tmp:rw,noexec,nosuid,size=16m",
                "--security-opt", "no-new-privileges:true", "--env-file", str(private_env)]
        for host in current["HostConfig"].get("ExtraHosts") or []:
            args += ["--add-host", host]
        for mount in current["Mounts"]:
            if mount["Destination"] in {"/run/config/step6a3-iam", "/run/secrets/iam_publisher_client_secret"}:
                continue
            if mount["Type"] != "bind":
                raise RuntimeError("REVIEWED_BIND_MOUNTS_REQUIRED")
            args += ["--mount", "type=bind,src=" + mount["Source"] + ",dst=" + mount["Destination"] + ",readonly"]
        args += ["--mount", f"type=bind,src={config},dst=/run/config/step6a3-iam,readonly",
                 "--mount", f"type=bind,src={operator_dir},dst=/run/tcdx-operator",
                 "--mount", f"type=bind,src={secret},dst=/run/secrets/iam_publisher_client_secret,readonly",
                 ]
        if library_root:
            release_mount = os.environ.get("TCDX_LIBRARY_RELEASE_HOST_DIRECTORY")
            if not release_mount or not Path(release_mount).is_dir():
                raise RuntimeError("LIBRARY_RELEASE_CUSTODY_REQUIRED")
            args += ["--mount", f"type=bind,src={release_mount},dst=/run/config/library-release,readonly"]
        args += [image_id, "node", "apps/backend/dist/security/publication-operator-server.js"]
        rollback = name + "-rollback-" + replacement.removeprefix("integrated-qa-release-")
        if replace:
            if subprocess.run(["docker", "inspect", rollback], capture_output=True).returncode == 0:
                raise RuntimeError("OPERATOR_ROLLBACK_ALREADY_EXISTS")
            run(["docker", "stop", "-t", "20", name])
            run(["docker", "rename", name, rollback])
        try:
            container_id = run(args)
            ready = False
            for _ in range(30):
                observed = json.loads(run(["docker", "inspect", name]))[0]
                if not observed["State"]["Running"]:
                    break
                logs = run(["docker", "logs", "--tail", "10", name])
                if "QA_PRIVATE_PUBLICATION_OPERATOR_READY" in logs:
                    ready = True
                    break
                time.sleep(1)
            if not ready:
                raise RuntimeError("OPERATOR_STARTUP_NOT_READY")
        except Exception:
            subprocess.run(["docker", "stop", "-t", "10", name], capture_output=True)
            subprocess.run(["docker", "rename", name, name + "-failed-integrated-qa-20261022"], capture_output=True)
            if replace:
                run(["docker", "rename", rollback, name])
                run(["docker", "start", name])
            raise
        evidence = {"operator_container_id": container_id, "image_id": image_id, "source_sha256": source_sha,
                    "previous_backend_container_id": current["Id"], "previous_backend_image": current["Image"],
                    "manifest_sha256": manifest_sha, "configuration_hashes": {k: env[k + "_SHA256"] for k in filenames},
                    "qa_application_release_changed": False, "database_structure_changed": False}
        evidence.update(operator_name=name, ready=True, library_configured=bool(library_root), rollback_container=rollback if replace else None)
        (config / (name + "-integrated-runtime-evidence.json" if replace else "operator-runtime-evidence.json")).write_text(json.dumps(evidence, indent=2) + "\n")
        print(json.dumps(evidence))
    finally:
        private_env.unlink(missing_ok=True)

try:
    main()
except Exception as error:
    print(json.dumps({"status": "BLOCKED", "code": str(error) if isinstance(error, RuntimeError) else "QA_OPERATOR_DEPLOY_FAILED"}))
    raise SystemExit(1)
