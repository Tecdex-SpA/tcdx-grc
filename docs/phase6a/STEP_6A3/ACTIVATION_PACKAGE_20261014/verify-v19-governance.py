#!/usr/bin/env python3
"""Verify staged v1.9 publication, or an activated tree after its ceremony."""

import datetime
import hashlib
import json
import sys
from pathlib import Path

if not __debug__:
    raise RuntimeError("Rector integrity verification requires assertions")

HERE = Path(__file__).resolve()
ROOT = HERE.parents[1] if HERE.parent.name == "scripts" else HERE.parents[4]
STAGING = "--staging" in sys.argv
override = next((x.split("=", 1)[1] for x in sys.argv if x.startswith("--staging-root=")), None)
STAGED = Path(override) if override else ROOT / "docs/phase6a/STEP_6A3/ACTIVATION_PACKAGE_20261014/staged"
V18 = "TCDX_GRC_MASTER_REGENT_BASELINE_v1.8_2026-10-09"
V19 = "TCDX_GRC_MASTER_REGENT_BASELINE_v1.9_2026-10-14"


def data(path):
    return path.read_bytes()


def sha(content):
    return hashlib.sha256(content).hexdigest()


def exact_inventory(directory):
    assert directory.is_dir() and not any(p.is_symlink() for p in directory.iterdir())
    sums = data(directory / "SHA256SUMS.txt").decode().splitlines()
    names = {"SHA256SUMS.txt"}
    for line in sums:
        digest, name = line.split("  ./", 1)
        assert name not in names and sha(data(directory / name)) == digest, name
        names.add(name)
    assert names == {p.name for p in directory.iterdir() if p.is_file()}, str(directory)
    return names


active = STAGED / "proposed/docs/rector/baseline" if STAGING else ROOT / "docs/rector/baseline"
history = STAGED / f"history/{V18}" if STAGING else ROOT / f"docs/rector/history/{V18}"
pointer = STAGED / "proposed/docs/rector" if STAGING else ROOT / "docs/rector"
candidate = ROOT / f"docs/rector/candidates/{V19}"
approved = ROOT / "docs/phase6a/STEP_6A3/PUBLICATION_CANDIDATE_20261014"
approved_manifest = approved / "PUBLICATION_MANIFEST.json"
approved_receipt = approved / "HUMAN_PUBLICATION_DECISION_RECEIPT_20261014.md"
assert sha(data(approved_manifest)) == "5b3b791cc2b7c3446ff69b244edacdf3ab810b0c864c5428c795f52dc6b9fb06"
assert sha(data(approved_receipt)) == "9b594df7da9c49c29ee508de6d1702fc9644341f04024e90a478619a28d42739"
manifest = json.loads(data(approved_manifest))
assert len(manifest["candidate_files"]) == 77
for item in manifest["candidate_files"]:
    content = data(ROOT / item["path"])
    assert sha(content) == item["sha256"] and len(content) == item["bytes"], item["path"]

active_names = exact_inventory(active)
history_names = exact_inventory(history)
assert len(active_names) == len(history_names) == 52
v17_history = ROOT / "docs/rector/history/TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23"
assert len(exact_inventory(v17_history)) == 51
assert data(pointer / "BASELINE_ID").decode().strip() == V19
assert data(pointer / "BASELINE_STATUS").decode().strip() == "ACTIVE"
assert data(pointer / "RECTOR_MANIFEST.sha256") == data(active / "SHA256SUMS.txt")
governance = STAGED / "proposed" if STAGING else ROOT
assert f"`MASTER_REGENT={V19}`" in (governance / "AGENTS.md").read_text()
assert f"`MASTER_REGENT={V19}`" in (governance / "docs/governance/MASTER_EXECUTION_STATUS.md").read_text().splitlines()[:5]
assert V19 in (governance / "docs/governance/CODEX_RECTOR_ENFORCEMENT.md").read_text()
assert sha(data(history / "SHA256SUMS.txt")) == "e51f6539df119775b2feb8839907c8cd690623b82707b399aa15a31d59196533"
assert sha(data(active / "SHA256SUMS.txt")) == "8466d47faaf34a6be6884ca8edf264f772c98c3b80b73d7b7b999fc4cf4b37d5"
for name in active_names - {"SHA256SUMS.txt"}:
    assert data(active / name) == data(candidate / name), name
for name in history_names:
    if STAGING:
        assert data(history / name) == data(ROOT / "docs/rector/baseline" / name), name

activation = json.loads(data(pointer / "ACTIVE_ACTIVATION.json"))
assert activation["baseline_id"] == V19 and activation["predecessor"] == V18
assert activation["manifest_sha256"] == sha(data(active / "SHA256SUMS.txt"))
assert activation["approved_candidate_manifest_sha256"] == sha(data(approved_manifest))
assert activation["approved_candidate_receipt_sha256"] == sha(data(approved_receipt))
assert activation["sog_v2"] == "DRAFT_NOT_EFFECTIVE"
if STAGING:
    assert activation["effective_at"] == "__REAL_ACTIVATION_UTC__"
    assert activation["id"] == "DR-STEP6A3-RECTOR-V19-ACTIVATION-20261014-01"
    print("V19_STATIC_STAGING=PASS")
else:
    effective = datetime.datetime.fromisoformat(activation["effective_at"].replace("Z", "+00:00"))
    assert effective.tzinfo is not None and effective <= datetime.datetime.now(datetime.timezone.utc)
    receipt = ROOT / activation["authorization_path"]
    assert sha(data(receipt)) == activation["authorization_sha256"]
    assert activation["id"] in receipt.read_text()
    print("V19_RECTOR_ACTIVATION=PASS")
print("PROTECTED_V1_8_INTEGRITY=PASS")
print("APPROVED_77_CANDIDATE_FILES=PASS")
