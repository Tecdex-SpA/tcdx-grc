#!/usr/bin/env python3
"""Preserve the signed STEP 6A.3 macro while allowing a rector version checkpoint."""

import hashlib
import json
import sys
from pathlib import Path

here = Path(__file__).resolve()
staging = "--staging" in sys.argv
root = here.parents[4] if staging else here.parents[1]
proposal = root / "docs/phase6a/STEP_6A3/ACTIVATION_PACKAGE_20261014/staged/proposed" if staging else root
ledger_path = "docs/phase6a/STEP_6A3/SOLO_OWNER_GOVERNANCE_PROPOSAL_20261009_V2/07_RESULT.json"
ledger = json.loads((proposal / ledger_path).read_text())
macro = ledger["macro_implementation_20261009"]
macro_hash = hashlib.sha256(json.dumps(macro, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()).hexdigest()
if macro_hash != "f5327ed1f4164c1461c2cc08dc41fb5bec654a45d3c014c439b7605a7789c356":
    raise SystemExit("STEP6A3 signed macro checkpoint changed")
ids = [c["clause_id"] for c in macro["clauses_48"]]
if len(ids) != 48 or len(set(ids)) != 48:
    raise SystemExit("STEP6A3 missing/duplicate traceability clauses")
for approval in macro["approvals"]:
    manifest = root / approval["manifest_path"]
    if hashlib.sha256(manifest.read_bytes()).hexdigest() != approval["manifest_sha256"]:
        raise SystemExit("STEP6A3 signed macro bytes differ")
    receipt = json.loads((root / approval["receipt_path"]).read_text())
    if receipt["manifest_sha256"] != approval["manifest_sha256"] or not receipt["status"].startswith("APPROVED_EXACT_MACRO_"):
        raise SystemExit("STEP6A3 macro approval receipt mismatch")
if macro["STEP_6A3"] == "PASS" and any(c["status"] != "DONE" for c in macro["clauses_48"]):
    raise SystemExit("STEP6A3 false closure")
for gate in ["QA", "IAM_REAL", "E2E_EXTERNAL"]:
    if macro["gates"][gate] == "PASS" and not macro.get("external_execution_evidence"):
        raise SystemExit("STEP6A3 external gate lacks evidence")

key = ledger["CURRENT_EXECUTION_REPORT"]
current = ledger[key]
if key != "macro_implementation_20261009":
    if current.get("source_checkpoint") != "macro_implementation_20261009":
        raise SystemExit("STEP6A3 current checkpoint detached from macro")
    for field in ["STEP_6A3", "STEP_6A4", "SOG_V2", "RECTOR_GATE"]:
        if current.get(field) != macro.get(field):
            raise SystemExit("STEP6A3 unauthorized gate promotion: " + field)
# STEP6A3 is an immutable historical execution checkpoint.
# A later documentary rector activation must not rewrite its recorded version.
active_version = (proposal / "docs/rector/BASELINE_ID").read_text().strip()
checkpoint_version = current["RECTOR_ACTIVE_VERSION"]
v112 = "TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16"
v111 = "TCDX_GRC_MASTER_REGENT_BASELINE_v1.11_2026-10-15"

if active_version != checkpoint_version:
    if not (
        active_version == v112
        and checkpoint_version == v111
        and key == "v111_initial_source_publication_checkpoint_20261015"
    ):
        raise SystemExit("STEP6A3 current ledger baseline mismatch")
    # The new activation and the immutable predecessor are verified separately.
    from subprocess import run
    result = run(
        ["python3", "scripts/verify-v112-governance.py"],
        cwd=root,
        capture_output=True,
        text=True,
    )
    if result.returncode:
        raise SystemExit("STEP6A3 successor rector activation invalid")
if key == "v110_activation_checkpoint_20261015":
    predecessor = ledger.get(current.get("predecessor_checkpoint"))
    if predecessor is None or predecessor.get("RECTOR_ACTIVE_VERSION") != "TCDX_GRC_MASTER_REGENT_BASELINE_v1.9_2026-10-14":
        raise SystemExit("STEP6A3 v1.10 checkpoint predecessor mismatch")
    receipt_path = root / current["approval_receipt_path"]
    if hashlib.sha256(receipt_path.read_bytes()).hexdigest() != current["approval_receipt_sha256"]:
        raise SystemExit("STEP6A3 v1.10 approval receipt mismatch")
    manifest = root / "docs/rector/baseline/SHA256SUMS.txt"
    if hashlib.sha256(manifest.read_bytes()).hexdigest() != current["successor_manifest_sha256"]:
        raise SystemExit("STEP6A3 v1.10 manifest mismatch")
    reference = predecessor.get("external_execution_evidence", {})
    evidence_path = root / reference.get("path", "")
    if not evidence_path.is_file() or hashlib.sha256(evidence_path.read_bytes()).hexdigest() != reference.get("sha256"):
        raise SystemExit("STEP6A3 predecessor QA evidence checksum mismatch")
if key == "v111_initial_source_publication_checkpoint_20261015":
    predecessor = ledger[current["predecessor_checkpoint"]]
    if predecessor["RECTOR_ACTIVE_VERSION"] != "TCDX_GRC_MASTER_REGENT_BASELINE_v1.10_2026-10-15":
        raise SystemExit("STEP6A3 v1.11 predecessor mismatch")
    if hashlib.sha256((root / current["approval_receipt_path"]).read_bytes()).hexdigest() != current["approval_receipt_sha256"]:
        raise SystemExit("STEP6A3 v1.11 approval mismatch")
    v111_manifest = (
        root / "docs/rector/history/TCDX_GRC_MASTER_REGENT_BASELINE_v1.11_2026-10-15/SHA256SUMS.txt"
        if active_version == v112
        else root / "docs/rector/baseline/SHA256SUMS.txt"
    )
    if hashlib.sha256(v111_manifest.read_bytes()).hexdigest() != current["successor_manifest_sha256"]:
        raise SystemExit("STEP6A3 v1.11 manifest mismatch")
if current["STEP_6A4"] != "NOT_STARTED" or current["SOG_V2"] != "DRAFT_NOT_EFFECTIVE":
    raise SystemExit("Unauthorized downstream promotion")
reported_gates = predecessor["gates"] if key == "v110_activation_checkpoint_20261015" else macro["gates"]
if current.get("runtime_scope") == "STEP6A3_IAM_COMMERCIAL_RELEASE_QA":
    reference = current.get("external_execution_evidence", {})
    evidence_path = root / reference.get("path", "")
    if not evidence_path.is_file() or hashlib.sha256(evidence_path.read_bytes()).hexdigest() != reference.get("sha256"):
        raise SystemExit("STEP6A3 QA runtime evidence checksum mismatch")
    evidence = json.loads(evidence_path.read_text())
    if evidence.get("profile") != "STEP6A3_QA_RUNTIME_EVIDENCE_V1" or evidence.get("environment") != "qa" \
            or evidence.get("MASTER_REGENT") != current["RECTOR_ACTIVE_VERSION"] \
            or evidence.get("qa_runtime_acceptance") != "PASS_QA" \
            or any(evidence.get(gate) != "PASS_QA" for gate in ["QA_AUTHENTICATED", "CHANGE_PLAN_QA", "SESSION_RELOAD_QA", "TENANT_ISOLATION_QA"]) \
            or evidence.get("HUMAN_UI_REVIEW") != "PASS" \
            or not evidence.get("human_acceptance") \
            or evidence.get("iam", {}).get("status") != "PASS_QA" \
            or evidence.get("commercial_publication", {}).get("status") != "PASS_QA" \
            or evidence.get("backend_final_activation", {}).get("status") != "PASS_QA" \
            or evidence.get("frontend_activation", {}).get("status") != "PASS_QA":
        raise SystemExit("STEP6A3 QA acceptance lacks required runtime evidence")
    reported_gates = current.get("gates", {})
    if any(reported_gates.get(gate) != "PASS_QA" for gate in ["QA", "IAM_REAL", "E2E_EXTERNAL"]):
        raise SystemExit("STEP6A3 QA runtime gate mismatch")
for gate in ["QA", "IAM_REAL", "E2E_EXTERNAL"]:
    print("STEP6A3_" + gate + "=" + reported_gates[gate])
print("STEP6A3_EXECUTION_STATUS_SOURCE=" + ledger_path + "#" + key)
print("STEP6A3_ACTIVE_BASELINE=" + current["RECTOR_ACTIVE_VERSION"])
print("STEP6A3_CURRENT_GATE=" + current["RECTOR_GATE"])
print("STEP6A3_CURRENT_STATUS=" + current["STEP_6A3"])
print("STEP6A3_CURRENT_LEDGER=PASS")
