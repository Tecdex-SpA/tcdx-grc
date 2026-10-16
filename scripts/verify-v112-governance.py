#!/usr/bin/env python3
"""Verify v1.12 documentary activation and immutable v1.11 predecessor."""
import hashlib
import json
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
R = ROOT / "docs/rector"

OLD = "TCDX_GRC_MASTER_REGENT_BASELINE_v1.11_2026-10-15"
NEW = "TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16"

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def inventory(directory):
    entries = {}
    for line in (directory / "SHA256SUMS.txt").read_text().splitlines():
        h, name = line.split("  ", 1)
        name = name.removeprefix("./")
        assert "/" not in name and name not in entries
        assert not (directory / name).is_symlink()
        assert digest(directory / name) == h, name
        entries[name] = h
    assert set(entries) | {"SHA256SUMS.txt"} == {
        p.name for p in directory.iterdir()
    }
    return entries

active = R / "baseline"
candidate = R / "candidates" / NEW
history = R / "history" / OLD
old_candidate = R / "candidates" / OLD

assert inventory(active) == inventory(candidate)
assert inventory(history) == inventory(old_candidate)
assert len(inventory(active)) == len(inventory(history)) == 51

manifest_hash = digest(active / "SHA256SUMS.txt")
assert (R / "RECTOR_MANIFEST.sha256").read_bytes() == (
    active / "SHA256SUMS.txt"
).read_bytes()

assert (R / "BASELINE_ID").read_text().strip() == NEW
assert (R / "BASELINE_STATUS").read_text().strip() == "ACTIVE"

activation = json.loads((R / "ACTIVE_ACTIVATION.json").read_text())

assert activation["baseline_id"] == NEW
assert activation["predecessor"] == OLD
assert activation["manifest_sha256"] == manifest_hash
assert activation["approved_candidate_manifest_sha256"] == manifest_hash
assert activation["scope"] == "DOCUMENTARY_RECTOR_ACTIVATION_ONLY"
assert activation["main_integration"] == "NOT_PERFORMED"
assert activation["sog_v2"] == "DRAFT_NOT_EFFECTIVE"
assert activation["runtime_implemented"] is False

effective = datetime.fromisoformat(activation["effective_at"])
assert effective <= datetime.now(timezone.utc)

authorization = ROOT / activation["authorization_path"]
review = ROOT / activation["review_manifest_path"]

assert digest(authorization) == activation["authorization_sha256"]
assert digest(review) == activation["review_manifest_sha256"]

approval = json.loads(authorization.read_text())
assert approval["decision"] == "APPROVED_DOCUMENTARY_ACTIVATION"
assert approval["baseline_id"] == NEW
assert approval["predecessor"] == OLD
assert approval["candidate_manifest_sha256"] == manifest_hash
assert approval["review_manifest_sha256"] == digest(review)
assert approval["runtime_implemented"] is False

review_data = json.loads(review.read_text())
for entry in review_data["files"]:
    assert digest(ROOT / entry["path"]) == entry["sha256"], entry["path"]

for path in [
    "AGENTS.md",
    "docs/governance/CODEX_RECTOR_ENFORCEMENT.md"
]:
    assert NEW in (ROOT / path).read_text()

status = (
    ROOT / "docs/governance/MASTER_EXECUTION_STATUS.md"
).read_text().splitlines()

assert f"`MASTER_REGENT={NEW}`" in status[:5]

print("V112_DOCUMENTARY_ACTIVATION=PASS")
print("V111_HISTORICAL_INTEGRITY=PASS")
print("V112_CANDIDATE_INTEGRITY=PASS")
print("PO_AUTHORIZATION=PASS")
print("RUNTIME_IMPLEMENTED=NO")
print("MAIN_INTEGRATION=NOT_PERFORMED")
