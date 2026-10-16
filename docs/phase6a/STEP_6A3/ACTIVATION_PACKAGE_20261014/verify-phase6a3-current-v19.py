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
if current["RECTOR_ACTIVE_VERSION"] != (proposal / "docs/rector/BASELINE_ID").read_text().strip():
    raise SystemExit("STEP6A3 current ledger baseline mismatch")
if current["STEP_6A4"] != "NOT_STARTED" or current["SOG_V2"] != "DRAFT_NOT_EFFECTIVE":
    raise SystemExit("Unauthorized downstream promotion")
for gate in ["QA", "IAM_REAL", "E2E_EXTERNAL"]:
    print("STEP6A3_" + gate + "=" + macro["gates"][gate])
print("STEP6A3_EXECUTION_STATUS_SOURCE=" + ledger_path + "#" + key)
print("STEP6A3_ACTIVE_BASELINE=" + current["RECTOR_ACTIVE_VERSION"])
print("STEP6A3_CURRENT_GATE=" + current["RECTOR_GATE"])
print("STEP6A3_CURRENT_STATUS=" + current["STEP_6A3"])
print("STEP6A3_CURRENT_LEDGER=PASS")
