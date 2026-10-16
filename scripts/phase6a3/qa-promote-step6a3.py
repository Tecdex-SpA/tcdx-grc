"""Promote one QA container after exact persisted publication gates; retain its rollback container."""
import hashlib
import json
import os
import re
from pathlib import Path
import shlex
import socket
import subprocess
import sys
import time

def run(args, required=True):
    p = subprocess.run(args, capture_output=True, text=True, timeout=90)
    if required and p.returncode:
        raise RuntimeError("QA_CONTAINER_OPERATION_FAILED")
    return p.stdout.strip()


def validate_release_gate(gate, manifest, kind, image_id, source_sha):
    """Validate the reviewed release snapshot before inspecting or stopping a runtime."""
    expected = {"active_platform_service_principals": 1, "reference_publication_audits": 132,
                "commercial_permissions": 3, "commercial_lifecycle_registry_rows": 3, "v2": 3,
                "entitlements_v2": 36, "unvalidated_fks": 0, "catalog_audits": 6, "catalog_outbox": 5}
    counts = gate["state"]["counts"]
    if (gate["environment"] != "qa" or gate["release_authorized"] is not True
            or gate["historical_fingerprints_preserved"] is not True
            or any(counts.get(key) != value for key, value in expected.items())
            or gate[kind + "_image_id"] != image_id
            or gate[kind + "_source_sha256"] != source_sha):
        raise RuntimeError("QA_PUBLICATION_OR_PRESERVATION_GATE_FAILED")
    entries = manifest["migrations"]
    ids = [entry["id"] for entry in entries]
    if not entries or ids != sorted(set(ids)):
        raise RuntimeError("REVIEWED_MIGRATION_MANIFEST_REQUIRED")
    expected_ledger = [{"migration_id": entry["id"], "filename": entry["filename"],
                        "content_sha256": entry["sha256"], "outcome": "applied"} for entry in entries]
    if counts.get("migrations") != len(entries) or gate["state"].get("migrations") != expected_ledger:
        raise RuntimeError("EXACT_QA_MIGRATION_LEDGER_REQUIRED")
    schema = gate["state"].get("schema", {})
    if (schema.get("database") != "tcdx-grc" or schema.get("postgresql_major") != 16
            or schema.get("mismatches") != 0 or schema.get("unvalidated_foreign_keys") != 0
            or schema.get("forbidden_delete_cascades") != 0
            or schema.get("expected_schema_sha256") != gate["artifacts"]["expected_schema"]["sha256"]):
        raise RuntimeError("EXACT_QA_SCHEMA_REQUIRED")
    for key in ("physical_publication", "executable_publication"):
        if gate["contract_gates"].get(key) != "PASS_CONTRACT_EFFECTIVE":
            raise RuntimeError("EFFECTIVE_CONTRACT_PUBLICATION_REQUIRED")
    lifecycle = gate["state"].get("c04w_lifecycle", {})
    if (lifecycle.get("exact_bindings_verified") is not True or lifecycle.get("published_rows") != 5
            or lifecycle.get("authenticated_publication_audits") != 5
            or lifecycle.get("unexpected_scopes_or_effects") != 0):
        raise RuntimeError("EXACT_AUDITED_C04W_LIFECYCLE_REQUIRED")

    if gate.get("release_id", "").startswith("step6a3-initial-source-"):
        initial = gate.get("state", {}).get("initial_source_lifecycle", {})
        if (gate.get("initial_source_required") is not True
                or initial.get("exact_binding_verified") is not True
                or initial.get("published_version") != 2
                or initial.get("authenticated_publication_audits") != 1
                or initial.get("unexpected_scopes_or_effects") != 0
                or initial.get("replay_created") != 0 or initial.get("replay_audited") != 0
                or gate.get("initial_source_review_sha256") != "df66515d794942c6f18e8a61fb3d398fb679c7b2111ea225571a77e605b8f19b"
                or gate.get("human_acceptance") != "PENDING"):
            raise RuntimeError("EXACT_INITIAL_SOURCE_SCOPE_PUBLICATION_REQUIRED")


def read_release_artifacts(config, gate):
    """All release inputs are hash-bound to the pinned release gate, including review receipts."""
    artifacts = {}
    for key in ("migration_manifest", "expected_schema", "physical_publication", "executable_publication"):
        entry = gate["artifacts"][key]
        name = entry["filename"]
        if not isinstance(name, str) or not name or Path(name).name != name or name in {".", ".."}:
            raise RuntimeError("RELEASE_ARTIFACT_BASENAME_REQUIRED")
        data = (config / name).read_bytes()
        if hashlib.sha256(data).hexdigest() != entry["sha256"]:
            raise RuntimeError("EXACT_RELEASE_ARTIFACT_REQUIRED")
        artifacts[key] = json.loads(data)
    for key in ("physical_publication", "executable_publication"):
        receipt = artifacts[key]
        if (receipt.get("status") != "PASS_CONTRACT_EFFECTIVE"
                or not receipt.get("human_decision_reference") or not receipt.get("files")):
            raise RuntimeError("EFFECTIVE_CONTRACT_PUBLICATION_REQUIRED")
    if (artifacts["physical_publication"].get("publication_manifest_sha256")
            != artifacts["executable_publication"].get("publication_manifest_sha256")
            or not artifacts["executable_publication"].get("publication_manifest_sha256")):
        raise RuntimeError("MATCHING_SUCCESSOR_PUBLICATION_MANIFEST_REQUIRED")
    if gate.get("initial_source_required") is True:
        for key in ("initial_source_contracts", "initial_source_scope_contracts", "initial_source_authority", "initial_source_scope_approval", "initial_source_runtime"):
            entry=gate["artifacts"][key]
            name=entry["filename"]
            if Path(name).name != name or name in {".",".."}:
                raise RuntimeError("RELEASE_ARTIFACT_BASENAME_REQUIRED")
            data=(config/name).read_bytes()
            if hashlib.sha256(data).hexdigest()!=entry["sha256"]:
                raise RuntimeError("EXACT_INITIAL_SOURCE_ARTIFACT_REQUIRED")
            artifacts[key]=json.loads(data)
        if (artifacts["initial_source_contracts"].get("status")!="PUBLISHED_LOCAL_EFFECTIVE"
                or artifacts["initial_source_scope_contracts"].get("status")!="PUBLISHED_LOCAL_EFFECTIVE"
                or artifacts["initial_source_scope_contracts"].get("review_manifest_sha256")!=gate["initial_source_review_sha256"]
                or artifacts["initial_source_scope_approval"].get("manifest_sha256")!=gate["initial_source_review_sha256"]
                or artifacts["initial_source_authority"].get("qa_acceptance")!="NOT_PERFORMED"):
            raise RuntimeError("EXACT_INITIAL_SOURCE_DECISION_REQUIRED")
    return artifacts


def validate_candidate_image(image, image_id, source_sha):
    if image["Id"] != image_id or image["Architecture"] != "amd64" or image["Os"] != "linux":
        raise RuntimeError("EXACT_AMD64_IMAGE_REQUIRED")
    if (image["Config"].get("Labels") or {}).get("tcdx.source.sha256") != source_sha:
        raise RuntimeError("EXACT_IMAGE_SOURCE_REQUIRED")

def main():
    if len(sys.argv) not in (6, 7) or (len(sys.argv) == 7 and sys.argv[6] != "--preflight-only"):
        raise RuntimeError("USAGE: qa-promote-step6a3 backend|frontend IMAGE_ID SOURCE_SHA CONFIG_DIRECTORY GATE_SHA [--preflight-only]")
    kind, image_id, source_sha, directory, gate_sha = sys.argv[1:6]
    if kind not in {"backend", "frontend"} or socket.gethostname().split(".")[0] != {"backend": "grc-bk", "frontend": "grc-www"}[kind]:
        raise RuntimeError("EXACT_QA_HOST_REQUIRED")
    config = Path(directory)
    gate_bytes = (config / "release-gate.json").read_bytes()
    if hashlib.sha256(gate_bytes).hexdigest() != gate_sha:
        raise RuntimeError("EXACT_RELEASE_GATE_REQUIRED")
    gate = json.loads(gate_bytes)
    release_id = gate.get("release_id", "step6a3-20261014")
    if not re.fullmatch(r"step6a3-[a-z0-9-]+", release_id):
        raise RuntimeError("INVALID_QA_RELEASE_IDENTIFIER")
    artifacts = read_release_artifacts(config, gate)
    validate_release_gate(gate, artifacts["migration_manifest"], kind, image_id, source_sha)
    name = "tcdx-grc-" + kind
    current = json.loads(run(["docker", "inspect", name]))[0]
    env = dict(x.split("=", 1) for x in current["Config"]["Env"])
    if env.get("NODE_ENV") != "qa" or not current["State"]["Running"]:
        raise RuntimeError("ACTIVE_QA_RUNTIME_REQUIRED")
    image = json.loads(run(["docker", "image", "inspect", image_id]))[0]
    validate_candidate_image(image, image_id, source_sha)
    if len(sys.argv) == 7:
        print(json.dumps({"status": "PASS_QA_PREFLIGHT", "kind": kind, "image_id": image_id,
                          "current_container_id": current["Id"], "release_gate_sha256": gate_sha,
                          "runtime_changed": False}))
        return
    backup = config / (kind + "-runtime-before-" + release_id + ".private.json")
    fd = os.open(backup, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w") as stream:
        json.dump(current, stream)
    rollback = name + "-rollback-" + release_id
    args = ["docker", "run", "-d", "--name", name, "--restart", current["HostConfig"]["RestartPolicy"]["Name"] or "no"]
    extra_mounts = []
    if kind == "backend":
        for key, filename in {"TCDX_IAM_M2M_PROFILE": "step6a3-m2m-qa-profile.json", "TCDX_IAM_BINDINGS": "08_COMMAND_PERMISSION_LIFECYCLE_AUDIT_BINDINGS.json",
                              "TCDX_IAM_DECISION": "IAM_M2M_QA_DECISION_RECEIPT_20261014.json", "TCDX_IAM_RBAC_R3": "20261009000400_phase6a3_rbac_resolution.sql"}.items():
            env[key + "_FILE"] = "/run/config/step6a3-iam/" + filename
            env[key + "_SHA256"] = hashlib.sha256((config / filename).read_bytes()).hexdigest()
        extra_mounts = [f"type=bind,src={config},dst=/run/config/step6a3-iam,readonly",
                        f"type=bind,src={Path.home()}/.secrets/tcdx-grc-qa/iam-publisher-client-secret,dst=/run/secrets/iam_publisher_client_secret,readonly"]
    private_env = config / (kind + "-promotion.private.env")
    fd = os.open(private_env, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w") as stream:
        for key, value in env.items():
            if "\n" in value or "\r" in value:
                raise RuntimeError("UNSUPPORTED_RUNTIME_ENV_VALUE")
            stream.write(key + "=" + value + "\n")
    args += ["--env-file", str(private_env)]
    networks = list(current["NetworkSettings"]["Networks"])
    if len(networks) != 1:
        raise RuntimeError("REVIEWED_SINGLE_QA_NETWORK_REQUIRED")
    args += ["--network", networks[0]]
    for alias in current["NetworkSettings"]["Networks"][networks[0]].get("Aliases") or []:
        if alias not in {current["Id"], current["Id"][:12]}:
            args += ["--network-alias", alias]
    for port, bindings in (current["HostConfig"]["PortBindings"] or {}).items():
        for binding in bindings:
            host_ip = binding.get("HostIp") or ""
            if ":" in host_ip:
                host_ip = "[" + host_ip + "]"
            args += ["-p", (host_ip + ":" if host_ip else "") + binding["HostPort"] + ":" + port]
    for host in current["HostConfig"].get("ExtraHosts") or []:
        args += ["--add-host", host]
    for security in current["HostConfig"].get("SecurityOpt") or []:
        args += ["--security-opt", security]
    log = current["HostConfig"].get("LogConfig") or {}
    if log.get("Type"):
        args += ["--log-driver", log["Type"]]
    for key, value in (log.get("Config") or {}).items():
        args += ["--log-opt", key + "=" + value]
    if current["HostConfig"].get("ReadonlyRootfs"):
        args += ["--read-only"]
    if current["HostConfig"].get("Memory"):
        args += ["--memory", str(current["HostConfig"]["Memory"])]
    for address in current["HostConfig"].get("Dns") or []:
        args += ["--dns", address]
    for mount in current["Mounts"]:
        if mount["Type"] != "bind":
            raise RuntimeError("REVIEWED_BIND_MOUNTS_REQUIRED")
        args += ["--mount", "type=bind,src=" + mount["Source"] + ",dst=" + mount["Destination"] + (",readonly" if not mount["RW"] else "")]
    for mount in extra_mounts:
        fields = dict(field.split("=", 1) for field in mount.split(",") if "=" in field)
        existing = [item for item in current["Mounts"] if item["Destination"] == fields["dst"]]
        if existing:
            if len(existing) != 1 or existing[0]["Source"] != fields["src"] or existing[0]["RW"]:
                raise RuntimeError("EXISTING_QA_CONFIGURATION_MOUNT_MISMATCH")
        else:
            args += ["--mount", mount]
    health = current["Config"].get("Healthcheck")
    if not health or health["Test"][0] not in {"CMD", "CMD-SHELL"}:
        raise RuntimeError("EXISTING_QA_HEALTHCHECK_REQUIRED")
    args += ["--health-cmd", shlex.join(health["Test"][1:]) if health["Test"][0] == "CMD" else health["Test"][1]]
    for key, option in {"Interval": "interval", "Timeout": "timeout", "StartPeriod": "start-period"}.items():
        if health.get(key):
            args += ["--health-" + option, str(health[key]) + "ns"]
    args += ["--health-retries", str(health.get("Retries", 3)), image_id]
    promoted = False
    try:
        run(["docker", "stop", "-t", "20", name])
        run(["docker", "rename", name, rollback])
        promoted = True
        new_id = run(args)
        deadline = time.monotonic() + 60
        while time.monotonic() < deadline:
            state = json.loads(run(["docker", "inspect", name]))[0]["State"]
            if state.get("Health", {}).get("Status") == "healthy":
                evidence = {"status": "PASS_QA", "kind": kind, "image_id": image_id, "container_id": new_id,
                            "previous_image_id": current["Image"], "rollback_container": rollback, "health": "healthy", "release_gate_sha256": gate_sha}
                (config / (kind + "-activation-" + release_id + ".json")).write_text(json.dumps(evidence, indent=2) + "\n")
                print(json.dumps(evidence))
                return
            if not state["Running"]:
                break
            time.sleep(2)
        raise RuntimeError("QA_HEALTH_GATE_FAILED")
    except Exception:
        if promoted:
            run(["docker", "stop", "-t", "10", name], required=False)
            run(["docker", "rename", name, name + "-failed-" + release_id], required=False)
            run(["docker", "rename", rollback, name])
            run(["docker", "start", name])
        raise
    finally:
        private_env.unlink(missing_ok=True)

if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(json.dumps({"status": "BLOCKED", "code": str(error) if isinstance(error, RuntimeError) else "QA_PROMOTION_FAILED"}))
        raise SystemExit(1)
