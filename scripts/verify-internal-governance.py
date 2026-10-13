#!/usr/bin/env python3
"""Verify the expressly authorized v1.8 delta without waiving product SoD."""
import argparse
import copy
import datetime
import hashlib
import json
from pathlib import Path

OLD = "TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23"
NEW = "TCDX_GRC_MASTER_REGENT_BASELINE_v1.8_2026-10-09"
AMENDMENT = "docs/governance/amendments/INTERNAL_REVIEW_v1.8_20261009"

if not __debug__:
    raise RuntimeError("Governance verification requires Python assertion checks; optimization is forbidden")


def digest(data):
    return hashlib.sha256(data).hexdigest()


def bundle(root):
    paths = ["docs/rector/baseline", f"docs/rector/history/{OLD}"]
    for path in paths:
        assert not any(p.is_symlink() for p in (root / path).iterdir()), "symlinks forbidden in protected baseline/history"
    files = {str(p.relative_to(root)): p.read_bytes() for path in paths for p in (root / path).iterdir() if p.is_file()}
    for path in ["docs/rector/BASELINE_ID", "docs/rector/BASELINE_STATUS", "docs/rector/RECTOR_MANIFEST.sha256",
                 "docs/rector/ACTIVE_ACTIVATION.json", f"{AMENDMENT}/HUMAN_AUTHORIZATION.md", f"{AMENDMENT}/DELTA.json"]:
        files[path] = (root / path).read_bytes()
    return files


def verify(files):
    assert files["docs/rector/BASELINE_ID"].decode().strip() == NEW, "active ID"
    assert files["docs/rector/BASELINE_STATUS"].decode().strip() == "ACTIVE", "active status"
    manifest = files["docs/rector/baseline/SHA256SUMS.txt"]
    assert manifest == files["docs/rector/RECTOR_MANIFEST.sha256"], "root manifest"
    for directory in ["docs/rector/baseline", f"docs/rector/history/{OLD}"]:
        expected = {f"{directory}/SHA256SUMS.txt"}
        for line in files[f"{directory}/SHA256SUMS.txt"].decode().splitlines():
            sha, name = line.split("  ./", 1)
            path = f"{directory}/{name}"
            assert digest(files[path]) == sha, f"hash: {path}"
            expected.add(path)
        assert expected == {p for p in files if p.startswith(directory + "/")}, "exact inventory"
    delta = json.loads(files[f"{AMENDMENT}/DELTA.json"])
    assert delta["predecessor"] == OLD and delta["successor"] == NEW
    allowed = {row["path"]: row for row in delta["changes"]}
    assert set(allowed) == {"00_README_KNOWLEDGE_BASE.md", "22_RBAC_PERMISSION_SCOPE_MATRIX.md",
        "43_PLAN_MAESTRO_RECTOR_DISENO_Y_DESARROLLO.md", "45_CONTRATO_DESARROLLO_CERRADO_Y_NO_INFERENCIA.md",
        "46_REGENTE_MAESTRO_DEL_DESARROLLO.md", "47_APROBACION_Y_ACTIVACION_BASELINE.md",
        "49_GOBIERNO_INTERNO_Y_REVISION_UNIPERSONAL.md", "SHA256SUMS.txt"}, "precise scope"
    for path, data in files.items():
        prefix = "docs/rector/baseline/"
        if path.startswith(prefix):
            name = path.removeprefix(prefix)
            previous = files.get(f"docs/rector/history/{OLD}/{name}")
            if name in allowed:
                row = allowed[name]
                assert digest(data) == row["after_sha256"]
                assert (digest(previous) if previous is not None else None) == row["before_sha256"]
            else:
                assert data == previous, f"unauthorized rector change: {name}"
    rbac = files["docs/rector/baseline/22_RBAC_PERMISSION_SCOPE_MATRIX.md"].decode()
    for rule in ["submit + approve la misma Evidence", "complete + verify la misma Action",
                 "request risk acceptance + approve la misma aceptación",
                 "configure connector + approve privileged credential access",
                 "execute AuditTest + approve final conclusion si el tenant exige independencia"]:
        assert rule in rbac, f"preserved operational rule: {rule}"
    activation = json.loads(files["docs/rector/ACTIVE_ACTIVATION.json"])
    assert activation["baseline_id"] == NEW and activation["predecessor"] == OLD
    assert activation["manifest_sha256"] == digest(manifest), "activation manifest"
    assert activation["authorization_sha256"] == digest(files[f"{AMENDMENT}/HUMAN_AUTHORIZATION.md"]), "authorization"
    assert activation["delta_sha256"] == digest(files[f"{AMENDMENT}/DELTA.json"]), "activation delta"
    assert activation["scope"] == "INTERNAL_EDITORIAL_METHODOLOGICAL_GOVERNANCE_ONLY"
    assert activation["sog_v2"] == "DRAFT_NOT_EFFECTIVE", "SOG v2 is not authorized"
    effective = datetime.datetime.fromisoformat(activation["effective_at"].replace("Z", "+00:00"))
    assert effective.tzinfo is not None and effective <= datetime.datetime.now(datetime.timezone.utc), "effective UTC"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--negative-tests", action="store_true")
    args = parser.parse_args()
    files = bundle(Path(__file__).resolve().parents[1])
    verify(files)
    if args.negative_tests:
        mutations = [
            ("docs/rector/BASELINE_ID", OLD.encode()),
            ("docs/rector/BASELINE_STATUS", b"DRAFT"),
            ("docs/rector/RECTOR_MANIFEST.sha256", b"invalid manifest"),
            ("docs/rector/baseline/22_RBAC_PERMISSION_SCOPE_MATRIX.md", b"SoD removed"),
            (f"docs/rector/history/{OLD}/22_RBAC_PERMISSION_SCOPE_MATRIX.md", b"history altered"),
            (f"{AMENDMENT}/HUMAN_AUTHORIZATION.md", b"invented authorization"),
        ]
        for path, replacement in mutations:
            invalid = copy.copy(files)
            invalid[path] = replacement
            try:
                verify(invalid)
            except (AssertionError, KeyError, ValueError):
                continue
            raise AssertionError(f"accepted invalid governance: {path}")
        print("INTERNAL_GOVERNANCE_NEGATIVE_TESTS=6_PASS")
    print("INTERNAL_GOVERNANCE_ACTIVATION=PASS")
    print("PROTECTED_V1_7_INTEGRITY=PASS")


if __name__ == "__main__":
    main()
