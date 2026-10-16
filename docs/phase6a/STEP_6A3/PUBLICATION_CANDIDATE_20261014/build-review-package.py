"""Build or verify the read-only STEP 6A.3 publication review package.

No active contract, migration, status, database, IAM or deployment file is written.
"""

from __future__ import annotations

import difflib
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path.cwd()
OUT = ROOT / "docs/phase6a/STEP_6A3/PUBLICATION_CANDIDATE_20261014"
ACTIVE = ROOT / "docs/rector/baseline"
CANDIDATE = ROOT / "docs/rector/candidates/TCDX_GRC_MASTER_REGENT_BASELINE_v1.9_2026-10-14"
PHYSICAL = ROOT / "docs/physical-data-model/amendments/STEP_6A3_COMMERCIAL_v1.9_CANDIDATE"
EXECUTABLE = ROOT / "docs/executable-contracts/candidates/STEP_6A3_COMMERCIAL_v1.9_CANDIDATE"
SOURCE = ROOT / "docs/phase6a/STEP_6A3/FINAL_CONTRACT_RECONCILIATION_20261013"
RECEIPT = SOURCE / "HUMAN_DECISION_RECEIPT_20261013.md"
PACKAGE = ROOT / "docs/phase6a/STEP_6A3/STEP_6A3_COMMERCIAL_GOVERNANCE_APPROVAL_PACKAGE_V2.md"
VERIFY = "--verify" in sys.argv


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def write_or_check(path: Path, content: str) -> None:
    if VERIFY:
        if path.read_text() != content:
            raise SystemExit(f"Generated file differs: {rel(path)}")
    else:
        path.write_text(content)


assert sha(PACKAGE) == "489e8cec4b72c2cf464d0315e5ba4f2f5664012b60df2327a07f82882943ba55"
assert sha(SOURCE / "ARTIFACT_MANIFEST.json") == "b454e3e2475ece966f87a4da1f89c1640f5cf9baf48d7b7d146935edc4db5cc3"
assert sha(RECEIPT) == "78e1216e018a3c7d5f8efb8905e415aeb9b741aa40edc1c6addb91a39a3eab8f"
assert "SIGNED_AT_UTC=2026-10-13T23:45:00Z" in RECEIPT.read_text()
source_manifest = json.loads((SOURCE / "ARTIFACT_MANIFEST.json").read_text())
for item in source_manifest["artifacts"]:
    assert sha(ROOT / item["path"]) == item["sha256"], item["path"]

active_names = {p.name for p in ACTIVE.glob("*.md")}
candidate_names = {p.name for p in CANDIDATE.glob("*.md")} - {"00_CANDIDATE_README.md", "CANDIDATE_GATE_REPORT.md"}
assert len(active_names) == 51 and candidate_names == active_names
normative = sorted(CANDIDATE / name for name in active_names)
sha_lines = "".join(f"{sha(path)}  ./{path.name}\n" for path in normative)
write_or_check(CANDIDATE / "SHA256SUMS.txt", sha_lines)

changed = []
patch_lines: list[str] = []
normative_entries = []
for candidate in normative:
    active = ACTIVE / candidate.name
    is_changed = sha(active) != sha(candidate)
    normative_entries.append({"path": rel(candidate), "sha256": sha(candidate), "active_sha256": sha(active), "changed": is_changed})
    if is_changed:
        changed.append(candidate.name)
        patch_lines.extend(difflib.unified_diff(
            active.read_text().splitlines(keepends=True),
            candidate.read_text().splitlines(keepends=True),
            fromfile=rel(active), tofile=rel(candidate),
        ))
write_or_check(OUT / "RECTOR_DELTA.patch", "".join(patch_lines))
candidate_manifest = {
    "candidate_id": "TCDX_GRC_MASTER_REGENT_BASELINE_v1.9_2026-10-14",
    "status": "PENDING_HUMAN_APPROVAL_NOT_EFFECTIVE",
    "predecessor": "TCDX_GRC_MASTER_REGENT_BASELINE_v1.8_2026-10-09",
    "design_decision": "DR-STEP6A3-COMMERCIAL-GOVERNANCE-20261013-02",
    "signed_at_utc": "2026-10-13T23:45:00Z",
    "source_package_sha256": sha(PACKAGE),
    "source_artifact_manifest_sha256": sha(SOURCE / "ARTIFACT_MANIFEST.json"),
    "normative_count": len(normative_entries),
    "changed_files": changed,
    "normative_files": normative_entries,
}
write_or_check(CANDIDATE / "CANDIDATE_MANIFEST.json", json.dumps(candidate_manifest, ensure_ascii=False, indent=2) + "\n")

approved_physical = [
    "02_PHYSICAL_MODEL_CANDIDATE.md", "05_HISTORICAL_READONLY_INVENTORY.sql",
    "09_MIGRATION_EXECUTION_CONTRACT.md", "09_MIGRATION_MANIFEST_CANDIDATE.json",
    "20261013000100_commercial_contract_reconciliation.sql",
]
approved_executable = [
    "03_SECURITY_TRANSACTION_REPLAY_CONTRACT.md", "07_OPENAPI_COMMERCIAL_CANDIDATE.json",
    "08_COMMAND_PERMISSION_LIFECYCLE_AUDIT_BINDINGS.json", "12_AUDIT_EVENT_PAYLOAD_SCHEMAS.json",
    "17_PUBLICATION_MANIFEST_SCHEMA.json", "18_CATALOG_PUBLICATION_RESULT_SCHEMA.json",
]
for directory, names in [(PHYSICAL, approved_physical), (EXECUTABLE, approved_executable)]:
    for name in names:
        assert sha(directory / name) == sha(SOURCE / name), name

listed = normative + [
    CANDIDATE / "BASELINE_ID", CANDIDATE / "BASELINE_STATUS",
    CANDIDATE / "00_CANDIDATE_README.md", CANDIDATE / "CANDIDATE_GATE_REPORT.md",
    CANDIDATE / "SHA256SUMS.txt", CANDIDATE / "CANDIDATE_MANIFEST.json",
]
listed += sorted(p for p in PHYSICAL.iterdir() if p.is_file())
listed += sorted(p for p in EXECUTABLE.iterdir() if p.is_file())
listed += [OUT / "PUBLICATION_RECONCILIATION_REPORT.md", OUT / "VALIDATION_RESULTS.json", OUT / "RECTOR_DELTA.patch", OUT / "build-review-package.py"]
assert all(p.is_file() for p in listed)
entries = [{"path": rel(p), "sha256": sha(p), "bytes": p.stat().st_size} for p in sorted(listed)]
manifest = {
    "package_id": "GP-STEP6A3-PUBLICATION-CANDIDATE-20261014-01",
    "status": "REVIEW_ONLY_NOT_EFFECTIVE",
    "active_baseline": "TCDX_GRC_MASTER_REGENT_BASELINE_v1.8_2026-10-09",
    "candidate_baseline": "TCDX_GRC_MASTER_REGENT_BASELINE_v1.9_2026-10-14",
    "approved_design_decision": "DR-STEP6A3-COMMERCIAL-GOVERNANCE-20261013-02",
    "approved_design_package_sha256": sha(PACKAGE),
    "approved_artifact_manifest_sha256": sha(SOURCE / "ARTIFACT_MANIFEST.json"),
    "approval_receipt_sha256": sha(RECEIPT),
    "signed_at_utc": "2026-10-13T23:45:00Z",
    "candidate_files": entries,
    "excluded_future_bytes": ["active expected-schema successor", "commercial data/seed manifest", "implementation artifacts", "image digests"],
}
write_or_check(OUT / "PUBLICATION_MANIFEST.json", json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
print(json.dumps({"status": "PASS", "verify": VERIFY, "normative_files": len(normative), "changed_normative": len(changed), "candidate_files": len(entries), "manifest_sha256": sha(OUT / "PUBLICATION_MANIFEST.json")}, ensure_ascii=False))
