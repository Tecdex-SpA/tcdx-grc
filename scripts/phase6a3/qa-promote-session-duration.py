"""Promote only a reviewed QA application container, retaining its exact rollback runtime."""
import json
import os
import shlex
import subprocess
import sys
import time

SUFFIX = os.environ.get("QA_SESSION_ROLLOUT", "step6a3-session-duration-20261019")


def docker(*args, input_text=None):
    result = subprocess.run(["docker", *args], input=input_text, capture_output=True,
                            text=True, timeout=120, check=True)
    return result.stdout.strip()


def inspect(kind, identifier):
    return json.loads(docker(kind, "inspect", identifier))[0]


def main():
    if len(sys.argv) not in (3, 4) or sys.argv[1] not in ("backend", "frontend") \
            or not sys.argv[2].startswith("sha256:") \
            or (len(sys.argv) == 4 and sys.argv[3] != "--preflight-only"):
        raise RuntimeError("COMPONENT_AND_EXACT_IMAGE_ID_REQUIRED")
    kind, image_id = sys.argv[1:3]
    name = "tcdx-grc-" + kind
    rollback = name + "-rollback-" + SUFFIX
    candidate = inspect("image", image_id)
    current = inspect("container", name)
    if candidate["Id"] != image_id or candidate["Architecture"] != "amd64" or candidate["Os"] != "linux":
        raise RuntimeError("AMD64_IMAGE_MISMATCH")
    if not current["State"]["Running"] or current["State"].get("Health", {}).get("Status") != "healthy":
        raise RuntimeError("CURRENT_RUNTIME_NOT_HEALTHY")
    if current["Config"].get("User") != candidate["Config"].get("User"):
        raise RuntimeError("IMAGE_USER_MISMATCH")
    host = current["HostConfig"]
    if host.get("Privileged") or host.get("CapAdd") or host.get("Devices"):
        raise RuntimeError("UNEXPECTED_RUNTIME_PRIVILEGES")
    networks = current["NetworkSettings"]["Networks"]
    if len(networks) != 1:
        raise RuntimeError("MULTIPLE_RUNTIME_NETWORKS")
    if subprocess.run(["docker", "container", "inspect", rollback], capture_output=True).returncode == 0:
        raise RuntimeError("ROLLBACK_NAME_ALREADY_USED")
    env = current["Config"]["Env"]
    if "NODE_ENV=qa" not in env:
        raise RuntimeError("QA_ENVIRONMENT_REQUIRED")
    if kind == "backend":
        replacements = {key: os.environ[key] for key in ("APP_SESSION_IDLE_SECONDS", "APP_SESSION_MAX_SECONDS")}
        if any(not value.isdecimal() or int(value) <= 0 for value in replacements.values()):
            raise RuntimeError("POSITIVE_SESSION_POLICY_REQUIRED")
        env = [value for value in env if value.split("=", 1)[0] not in replacements]
        env.extend(key + "=" + value for key, value in replacements.items())
    if any("\n" in value or "\r" in value for value in env):
        raise RuntimeError("UNSUPPORTED_ENV_VALUE")
    health = current["Config"].get("Healthcheck")
    if not health or health["Test"][0] not in ("CMD", "CMD-SHELL"):
        raise RuntimeError("HEALTHCHECK_REQUIRED")

    args = ["run", "-d", "--name", name, "--restart", host["RestartPolicy"]["Name"] or "no",
            "--env-file", "/dev/stdin"]
    network_name, network = next(iter(networks.items()))
    args.extend(["--network", network_name])
    for alias in network.get("Aliases") or []:
        if alias not in {current["Id"], current["Id"][:12]}:
            args.extend(["--network-alias", alias])
    for port, bindings in (host.get("PortBindings") or {}).items():
        for binding in bindings:
            ip = binding.get("HostIp") or ""
            args.extend(["-p", (ip + ":" if ip else "") + binding["HostPort"] + ":" + port])
    for value in host.get("ExtraHosts") or []:
        args.extend(["--add-host", value])
    for value in host.get("SecurityOpt") or []:
        args.extend(["--security-opt", value])
    log = host.get("LogConfig") or {}
    if log.get("Type"):
        args.extend(["--log-driver", log["Type"]])
    for key, value in (log.get("Config") or {}).items():
        args.extend(["--log-opt", key + "=" + value])
    if host.get("ReadonlyRootfs"):
        args.append("--read-only")
    if host.get("Memory"):
        args.extend(["--memory", str(host["Memory"])])
    for value in host.get("Dns") or []:
        args.extend(["--dns", value])
    for mount in current["Mounts"]:
        if mount["Type"] == "bind":
            source = mount["Source"]
        elif mount["Type"] == "volume":
            source = mount["Name"]
        else:
            raise RuntimeError("UNSUPPORTED_MOUNT_TYPE")
        args.extend(["--mount", "type=" + mount["Type"] + ",src=" + source + ",dst=" + mount["Destination"]
                     + ("" if mount["RW"] else ",readonly")])
    args.extend(["--health-cmd", shlex.join(health["Test"][1:]) if health["Test"][0] == "CMD" else health["Test"][1]])
    for key, option in (("Interval", "interval"), ("Timeout", "timeout"), ("StartPeriod", "start-period")):
        if health.get(key):
            args.extend(["--health-" + option, str(health[key]) + "ns"])
    args.extend(["--health-retries", str(health.get("Retries", 3)), image_id])

    if len(sys.argv) == 4:
        print(json.dumps({"status": "PASS_QA_PREFLIGHT", "component": kind, "image_id": image_id,
                          "current_container_id": current["Id"], "current_health": "healthy", "runtime_changed": False}))
        return
    docker("stop", "-t", "20", name)
    docker("rename", name, rollback)
    try:
        new_id = docker(*args, input_text="\n".join(env) + "\n")
        for _ in range(45):
            state = inspect("container", name)["State"]
            if state.get("Health", {}).get("Status") == "healthy":
                print(json.dumps({"status": "PASS_QA", "component": kind, "image_id": image_id,
                                  "container_id": new_id, "previous_image_id": current["Image"],
                                  "rollback_container": rollback, "health": "healthy"}))
                return
            if not state["Running"]:
                break
            time.sleep(2)
        raise RuntimeError("NEW_RUNTIME_NOT_HEALTHY")
    except Exception:
        subprocess.run(["docker", "stop", "-t", "10", name], capture_output=True)
        subprocess.run(["docker", "rename", name, name + "-failed-" + SUFFIX], capture_output=True)
        docker("rename", rollback, name)
        docker("start", name)
        raise


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(json.dumps({"status": "BLOCKED", "code": str(error) if isinstance(error, RuntimeError) else "QA_PROMOTION_FAILED"}))
        raise SystemExit(1)
