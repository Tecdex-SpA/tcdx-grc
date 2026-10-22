"""Promote only the reviewed QA frontend image; preserve the previous container for rollback."""
import json
import shlex
import subprocess
import sys
import time

NAME = "tcdx-grc-frontend"
ROLLBACK = NAME + "-rollback-step6a3-evidence-selectors-20261019"


def docker(*args):
    return subprocess.check_output(["docker", *args], text=True, timeout=90).strip()


def inspect(kind, identifier):
    return json.loads(docker(kind, "inspect", identifier))[0]


def main():
    if len(sys.argv) not in (2, 3) or not sys.argv[1].startswith("sha256:") or (len(sys.argv) == 3 and sys.argv[2] != "--preflight-only"):
        raise RuntimeError("EXACT_FRONTEND_IMAGE_ID_REQUIRED")
    image_id = sys.argv[1]
    image = inspect("image", image_id)
    current = inspect("container", NAME)
    if image["Id"] != image_id or image["Architecture"] != "amd64" or image["Os"] != "linux":
        raise RuntimeError("AMD64_IMAGE_MISMATCH")
    if not current["State"]["Running"] or current["State"].get("Health", {}).get("Status") != "healthy":
        raise RuntimeError("FRONTEND_NOT_HEALTHY")
    if current["Config"].get("User") != image["Config"].get("User"):
        raise RuntimeError("FRONTEND_USER_MISMATCH")
    if current["HostConfig"].get("Privileged") or current["HostConfig"].get("CapAdd"):
        raise RuntimeError("UNEXPECTED_FRONTEND_PRIVILEGES")
    if current["HostConfig"].get("Mounts") or current["Mounts"]:
        raise RuntimeError("UNEXPECTED_FRONTEND_MOUNTS")
    networks = current["NetworkSettings"]["Networks"]
    if len(networks) != 1:
        raise RuntimeError("FRONTEND_NETWORK_MISMATCH")
    if subprocess.run(["docker", "container", "inspect", ROLLBACK], capture_output=True).returncode == 0:
        raise RuntimeError("ROLLBACK_NAME_ALREADY_USED")

    args = ["run", "-d", "--name", NAME, "--restart",
            current["HostConfig"]["RestartPolicy"]["Name"] or "no"]
    for value in current["Config"]["Env"]:
        name = value.split("=", 1)[0]
        if any(word in name.upper() for word in ("PASSWORD", "SECRET", "TOKEN", "PRIVATE_KEY")):
            raise RuntimeError("FRONTEND_SECRET_ENV_UNEXPECTED")
        args.extend(["-e", value])
    network_name, network = next(iter(networks.items()))
    args.extend(["--network", network_name])
    for alias in network.get("Aliases") or []:
        if alias not in {current["Id"], current["Id"][:12]}:
            args.extend(["--network-alias", alias])
    for port, bindings in (current["HostConfig"].get("PortBindings") or {}).items():
        for binding in bindings:
            host = binding.get("HostIp") or ""
            args.extend(["-p", f"{host + ':' if host else ''}{binding['HostPort']}:{port}"])
    for host in current["HostConfig"].get("ExtraHosts") or []:
        args.extend(["--add-host", host])
    for option in current["HostConfig"].get("SecurityOpt") or []:
        args.extend(["--security-opt", option])
    log = current["HostConfig"].get("LogConfig") or {}
    if log.get("Type"):
        args.extend(["--log-driver", log["Type"]])
    for key, value in (log.get("Config") or {}).items():
        args.extend(["--log-opt", key + "=" + value])
    if current["HostConfig"].get("ReadonlyRootfs"):
        args.append("--read-only")
    if current["HostConfig"].get("Memory"):
        args.extend(["--memory", str(current["HostConfig"]["Memory"])])
    for address in current["HostConfig"].get("Dns") or []:
        args.extend(["--dns", address])
    health = current["Config"].get("Healthcheck")
    if not health or health["Test"][0] not in ("CMD", "CMD-SHELL"):
        raise RuntimeError("FRONTEND_HEALTHCHECK_MISMATCH")
    args.extend(["--health-cmd", shlex.join(health["Test"][1:]) if health["Test"][0] == "CMD" else health["Test"][1]])
    for key, option in (("Interval", "interval"), ("Timeout", "timeout"), ("StartPeriod", "start-period")):
        if health.get(key):
            args.extend(["--health-" + option, str(health[key]) + "ns"])
    args.extend(["--health-retries", str(health.get("Retries", 3)), image_id])

    if len(sys.argv) == 3:
        print(json.dumps({"status": "PASS_QA_PREFLIGHT", "component": "frontend", "image_id": image_id,
                          "current_container_id": current["Id"], "current_health": "healthy", "runtime_changed": False}))
        return

    docker("stop", "-t", "20", NAME)
    docker("rename", NAME, ROLLBACK)
    try:
        candidate_id = docker(*args)
        for _ in range(30):
            state = inspect("container", NAME)["State"]
            if state.get("Health", {}).get("Status") == "healthy":
                print(json.dumps({"status": "PASS_QA", "component": "frontend", "image_id": image_id,
                                  "container_id": candidate_id, "previous_image_id": current["Image"],
                                  "rollback_container": ROLLBACK, "health": "healthy"}))
                return
            if not state["Running"]:
                break
            time.sleep(2)
        raise RuntimeError("FRONTEND_HEALTH_FAILED")
    except Exception:
        subprocess.run(["docker", "stop", "-t", "10", NAME], capture_output=True)
        subprocess.run(["docker", "rename", NAME, NAME + "-failed-step6a3-evidence-selectors-20261019"], capture_output=True)
        docker("rename", ROLLBACK, NAME)
        docker("start", NAME)
        raise


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(json.dumps({"status": "BLOCKED", "code": str(error) if isinstance(error, RuntimeError) else "FRONTEND_PROMOTION_FAILED"}))
        raise SystemExit(1)
