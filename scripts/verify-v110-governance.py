#!/usr/bin/env python3
"""Verify the exact authorized v1.10 publication and protected v1.9 history."""

import datetime
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
V19 = "TCDX_GRC_MASTER_REGENT_BASELINE_v1.9_2026-10-14"
V110 = "TCDX_GRC_MASTER_REGENT_BASELINE_v1.10_2026-10-15"
APPROVED_MANIFEST = "b9b6bf6930931af5eb32ca1b4027212ad3a82f247fef677b919af24d30ac9060"
PREDECESSOR_MANIFEST = "8466d47faaf34a6be6884ca8edf264f772c98c3b80b73d7b7b999fc4cf4b37d5"


def digest(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def inventory(directory: Path) -> dict[str, str]:
    assert directory.is_dir() and not any(path.is_symlink() for path in directory.iterdir())
    manifest = (directory / "SHA256SUMS.txt").read_text().splitlines()
    entries = {}
    for line in manifest:
        expected, name = line.split("  ", 1)
        name = name.removeprefix("./")
        assert name not in entries and "/" not in name and name != "SHA256SUMS.txt"
        assert digest((directory / name).read_bytes()) == expected, name
        entries[name] = expected
    assert set(entries) | {"SHA256SUMS.txt"} == {p.name for p in directory.iterdir() if p.is_file()}
    return entries


active = ROOT / "docs/rector/baseline"
candidate = ROOT / "docs/rector/candidates" / V110
history = ROOT / "docs/rector/history" / V19
pointer = ROOT / "docs/rector"
assert digest((active / "SHA256SUMS.txt").read_bytes()) == APPROVED_MANIFEST
assert digest((candidate / "SHA256SUMS.txt").read_bytes()) == APPROVED_MANIFEST
assert digest((history / "SHA256SUMS.txt").read_bytes()) == PREDECESSOR_MANIFEST
assert inventory(active) == inventory(candidate) and len(inventory(active)) == 51
assert len(inventory(history)) == 51
for name in inventory(active):
    assert (active / name).read_bytes() == (candidate / name).read_bytes(), name
assert (pointer / "RECTOR_MANIFEST.sha256").read_bytes() == (active / "SHA256SUMS.txt").read_bytes()
assert (pointer / "BASELINE_ID").read_text().strip() == V110
assert (pointer / "BASELINE_STATUS").read_text().strip() == "ACTIVE"
activation = json.loads((pointer / "ACTIVE_ACTIVATION.json").read_text())
assert activation["baseline_id"] == V110 and activation["predecessor"] == V19
assert activation["manifest_sha256"] == APPROVED_MANIFEST
assert activation["approved_candidate_manifest_sha256"] == APPROVED_MANIFEST
assert activation["sog_v2"] == "DRAFT_NOT_EFFECTIVE"
effective = datetime.datetime.fromisoformat(activation["effective_at"].replace("Z", "+00:00"))
assert effective.tzinfo is not None and effective <= datetime.datetime.now(datetime.timezone.utc)
receipt = ROOT / activation["authorization_path"]
assert digest(receipt.read_bytes()) == activation["authorization_sha256"]
assert "Andrés Barouh" in receipt.read_text() and APPROVED_MANIFEST in receipt.read_text()
assert f"`MASTER_REGENT={V110}`" in (ROOT / "AGENTS.md").read_text()
assert f"`MASTER_REGENT={V110}`" in (ROOT / "docs/governance/MASTER_EXECUTION_STATUS.md").read_text().splitlines()[:5]
assert V110 in (ROOT / "docs/governance/CODEX_RECTOR_ENFORCEMENT.md").read_text()
print("V110_RECTOR_ACTIVATION=PASS")
print("PROTECTED_V1_9_INTEGRITY=PASS")
print("APPROVED_51_CANDIDATE_FILES=PASS")
