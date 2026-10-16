#!/usr/bin/env python3
"""Build or verify a non-effective v1.9 activation staging tree."""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

if not __debug__:
    raise RuntimeError("Activation package verification requires assertions")

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
STAGED = HERE / "staged"
ACTIVE = ROOT / "docs/rector/baseline"
CANDIDATE = ROOT / "docs/rector/candidates/TCDX_GRC_MASTER_REGENT_BASELINE_v1.9_2026-10-14"
APPROVED = ROOT / "docs/phase6a/STEP_6A3/PUBLICATION_CANDIDATE_20261014"
V18 = "TCDX_GRC_MASTER_REGENT_BASELINE_v1.8_2026-10-09"
V19 = "TCDX_GRC_MASTER_REGENT_BASELINE_v1.9_2026-10-14"
ACTIVATION_DECISION = "DR-STEP6A3-RECTOR-V19-ACTIVATION-20261014-01"
VERIFY = "--verify" in sys.argv


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def source(path: str) -> bytes:
    return (ROOT / path).read_bytes()


def stage(path: str, content: bytes) -> None:
    target = STAGED / path
    if VERIFY:
        assert target.read_bytes() == content, f"staged bytes differ: {path}"
    else:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)


manifest_path = APPROVED / "PUBLICATION_MANIFEST.json"
assert digest(manifest_path.read_bytes()) == "5b3b791cc2b7c3446ff69b244edacdf3ab810b0c864c5428c795f52dc6b9fb06"
manifest = json.loads(manifest_path.read_text())
assert len(manifest["candidate_files"]) == 77
for row in manifest["candidate_files"]:
    data = source(row["path"])
    assert digest(data) == row["sha256"] and len(data) == row["bytes"], row["path"]
assert digest((APPROVED / "HUMAN_PUBLICATION_DECISION_RECEIPT_20261014.md").read_bytes()) == "9b594df7da9c49c29ee508de6d1702fc9644341f04024e90a478619a28d42739"
assert source("docs/rector/BASELINE_ID").decode().strip() == V18
assert source("docs/rector/BASELINE_STATUS").decode().strip() == "ACTIVE"
assert source("docs/rector/RECTOR_MANIFEST.sha256") == (ACTIVE / "SHA256SUMS.txt").read_bytes()

active_files = sorted(p.name for p in ACTIVE.iterdir() if p.is_file())
assert len(active_files) == 52
assert active_files == sorted([p.name for p in CANDIDATE.glob("*.md") if p.name not in {"00_CANDIDATE_README.md", "CANDIDATE_GATE_REPORT.md"}] + ["SHA256SUMS.txt"])
for name in active_files:
    stage(f"history/{V18}/{name}", (ACTIVE / name).read_bytes())
    stage(f"proposed/docs/rector/baseline/{name}", (CANDIDATE / name).read_bytes())

stage("proposed/docs/rector/BASELINE_ID", (V19 + "\n").encode())
stage("proposed/docs/rector/BASELINE_STATUS", b"ACTIVE\n")
stage("proposed/docs/rector/RECTOR_MANIFEST.sha256", (CANDIDATE / "SHA256SUMS.txt").read_bytes())

agents = source("AGENTS.md").decode()
assert agents.count(V18) == 2
stage("proposed/AGENTS.md", agents.replace(V18, V19).encode())

enforcement = source("docs/governance/CODEX_RECTOR_ENFORCEMENT.md").decode()
assert enforcement.count(V18) == 1
enforcement = enforcement.replace(V18, V19)
enforcement = enforcement.replace(
    "The express Product Owner mandate of 2026-10-09 authorizes the precise internal editorial/methodological governance amendment recorded in `docs/rector/ACTIVE_ACTIVATION.json` and contract 49. It does not adopt pending STEP 6A.3 macro hashes, activate SOG v2, change operational SoD or authorize QA, external IAM, non-disposable DDL, push, PR, merge or deployment.",
    "The human approval DR-STEP6A3-PUBLICATION-CANDIDATE-20261014-01 covers the exact 77 candidate files in its SHA-256 manifest; activation requires its own exact-byte ceremony. It does not close STEP 6A.3, activate SOG v2, change operational SoD or authorize QA, external IAM, DDL, push, merge or deployment."
)
enforcement = enforcement.replace(
    "Historical baselines v1.4–v1.7 remain immutable under `docs/rector/history/`. The v1.8 verifier checks the active and root manifests, protected v1.7 bytes, the exact delta and the human authorization record. The frozen v1.7 lineage of previously published data/contract artifacts remains valid.",
    "Historical baselines v1.4–v1.8 remain immutable under `docs/rector/history/`. The v1.9 verifier checks the active and root manifests, protected v1.8 bytes, the exact 15-document delta and both human decision receipts. Previously published physical and executable contracts retain their separate gates."
)
stage("proposed/docs/governance/CODEX_RECTOR_ENFORCEMENT.md", enforcement.encode())

status = source("docs/governance/MASTER_EXECUTION_STATUS.md").decode()
assert status.startswith(f"# TCDX GRC — Master Execution Status\n\n`MASTER_REGENT={V18}`")
status = status.replace(f"`MASTER_REGENT={V18}`", f"`MASTER_REGENT={V19}`", 1)
status += ("\n## Rector v1.9 activation checkpoint\n\n"
           f"`RECTOR_ACTIVE_VERSION={V19}`\n"
           "`STEP6A3_CURRENT_STATUS=PARTIAL_BLOCKED`\n"
           "`STEP6A4_CURRENT_STATUS=NOT_STARTED`\n"
           "`PHYSICAL_DATA_MODEL_REVIEW_COMMERCIAL=PENDING`\n"
           "`EXECUTABLE_CONTRACTS_COMMERCIAL=PENDING`\n"
           "`EXPECTED_SCHEMA_COMMERCIAL=PENDING`\n"
           "`COMMERCIAL_IMPLEMENTATION=NOT_STARTED_DEPENDENT_GATES`\n"
           "\nThe activation of rector v1.9 does not close the separate physical, executable, QA, IAM or commercial gates. Historical v1.8 statements above remain historical evidence.\n")
stage("proposed/docs/governance/MASTER_EXECUTION_STATUS.md", status.encode())

ledger_path = "docs/phase6a/STEP_6A3/SOLO_OWNER_GOVERNANCE_PROPOSAL_20261009_V2/07_RESULT.json"
ledger = json.loads(source(ledger_path))
assert ledger["CURRENT_EXECUTION_REPORT"] == "macro_implementation_20261009"
macro = ledger["macro_implementation_20261009"]
assert macro["RECTOR_ACTIVE_VERSION"] == V18 and macro["STEP_6A3"] == "PARTIAL_BLOCKED"
checkpoint = "rector_v19_activation_checkpoint_20261014"
ledger[checkpoint] = {
    "RECTOR_ACTIVE_VERSION": V19,
    "STEP_6A3": macro["STEP_6A3"],
    "STEP_6A4": macro["STEP_6A4"],
    "SOG_V2": macro["SOG_V2"],
    "RECTOR_GATE": macro["RECTOR_GATE"],
    "source_checkpoint": "macro_implementation_20261009",
    "activation_decision_id": ACTIVATION_DECISION
}
ledger["CURRENT_EXECUTION_REPORT"] = checkpoint
stage("proposed/" + ledger_path, (json.dumps(ledger, ensure_ascii=False, indent=2) + "\n").encode())

shell = source("scripts/verify-rector-governance.sh").decode()
assert shell.count(f'MASTER_ID="{V18}"') == 1
shell = shell.replace(f'MASTER_ID="{V18}"', f'MASTER_ID="{V19}"')
assert "python3 scripts/verify-internal-governance.py" in shell
shell = shell.replace("python3 scripts/verify-internal-governance.py", "python3 scripts/verify-v19-governance.py")
shell = shell.replace("v1.8 activation/history/scope validation failed", "v1.9 activation/history/scope validation failed")
stage("proposed/scripts/verify-rector-governance.sh", shell.encode())

test = source("scripts/test-rector-governance-status.sh").decode()
assert test.count(f"BASELINE_ID={V18}") == 1
test = test.replace(f"BASELINE_ID={V18}", f"BASELINE_ID={V19}")
stage("proposed/scripts/test-rector-governance-status.sh", test.encode())

stage("proposed/scripts/verify-v19-governance.py", (HERE / "verify-v19-governance.py").read_bytes())
stage("proposed/scripts/verify-phase6a3-current.py", (HERE / "verify-phase6a3-current-v19.py").read_bytes())

activation = {
    "id": ACTIVATION_DECISION,
    "baseline_id": V19,
    "predecessor": V18,
    "effective_at": "__REAL_ACTIVATION_UTC__",
    "manifest_sha256": digest((CANDIDATE / "SHA256SUMS.txt").read_bytes()),
    "authorization_path": "docs/phase6a/STEP_6A3/ACTIVATION_PACKAGE_20261014/HUMAN_ACTIVATION_DECISION_RECEIPT_20261014.md",
    "authorization_sha256": "__NEW_ACTIVATION_DECISION_RECEIPT_SHA256__",
    "approved_candidate_manifest_sha256": digest(manifest_path.read_bytes()),
    "approved_candidate_receipt_sha256": digest((APPROVED / "HUMAN_PUBLICATION_DECISION_RECEIPT_20261014.md").read_bytes()),
    "scope": "STEP6A3_COMMERCIAL_RECTOR_V19_ONLY",
    "sog_v2": "DRAFT_NOT_EFFECTIVE",
    "main_integration": "NOT_PERFORMED"
}
stage("proposed/docs/rector/ACTIVE_ACTIVATION.json", (json.dumps(activation, ensure_ascii=False, indent=2) + "\n").encode())

files = sorted(p for p in STAGED.rglob("*") if p.is_file())
def target_for(path: Path) -> str:
    staged_path = path.relative_to(STAGED).as_posix()
    if staged_path.startswith("history/"):
        return "docs/rector/history/" + staged_path.removeprefix("history/")
    assert staged_path.startswith("proposed/")
    return staged_path.removeprefix("proposed/")


rows = [{"path": p.relative_to(HERE).as_posix(), "target_path": target_for(p), "sha256": digest(p.read_bytes()), "bytes": p.stat().st_size} for p in files]
assert len({row["target_path"] for row in rows}) == len(rows)
tool_files = [HERE / name for name in ["prepare-activation-package.py", "verify-v19-governance.py", "verify-phase6a3-current-v19.py", "negative-staging-check.py", "ACTIVATION_SCOPE_AND_GATES.md"]]
tool_rows = [{"path": p.relative_to(HERE).as_posix(), "sha256": digest(p.read_bytes()), "bytes": p.stat().st_size} for p in tool_files]
package = {
    "package_id": "GP-STEP6A3-V19-ACTIVATION-STAGING-20261014-01",
    "status": "PREPARED_NOT_EFFECTIVE_DYNAMIC_FIELDS_PENDING",
    "approved_candidate_manifest_sha256": digest(manifest_path.read_bytes()),
    "approved_candidate_receipt_sha256": digest((APPROVED / "HUMAN_PUBLICATION_DECISION_RECEIPT_20261014.md").read_bytes()),
    "active_predecessor_manifest_sha256": digest((ACTIVE / "SHA256SUMS.txt").read_bytes()),
    "proposed_successor_manifest_sha256": digest((CANDIDATE / "SHA256SUMS.txt").read_bytes()),
    "staged_files": rows,
    "tool_files": tool_rows,
    "unresolved_dynamic_fields": ["activation decision receipt/hash", "actual effective_at UTC"]
}
target = HERE / "ACTIVATION_STAGING_MANIFEST.json"
content = (json.dumps(package, ensure_ascii=False, indent=2) + "\n").encode()
if VERIFY:
    assert target.read_bytes() == content, "staging manifest differs"
    assert {p.relative_to(HERE).as_posix() for p in files} == {r["path"] for r in package["staged_files"]}
else:
    target.write_bytes(content)
print(json.dumps({"status": "PASS", "verify": VERIFY, "staged_files": len(files), "manifest_sha256": digest(content), "history_files": len(active_files), "successor_files": len(active_files)}))
