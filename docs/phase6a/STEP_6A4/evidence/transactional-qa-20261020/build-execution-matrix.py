#!/usr/bin/env python3
"""Derive the 42-row execution ledger from the sealed scenario diagnosis."""
import csv
from pathlib import Path

root = Path(__file__).resolve().parents[2]
source = root / "SCENARIO_COVERAGE_20261020.csv"
target = Path(__file__).with_name("OPERATION_EXECUTION_MATRIX.csv")
fields = [
    "FORM_ID", "OPERATION_ID", "JOURNEY", "ACTOR", "TENANT", "OBJECT_ID",
    "INITIAL_STATE_OBSERVED", "FINAL_STATE_OBSERVED", "HTTP_STATUS", "RESULT",
    "EVIDENCE", "CURRENT_BLOCKER", "BLOCK_OWNER", "MINIMUM_NEXT_ACTION",
]
with source.open(newline="", encoding="utf-8") as handle:
    rows = list(csv.DictReader(handle))
assert len(rows) == 42 and len({row["FORM_ID"] for row in rows}) == 42
out = []
for row in rows:
    form = row["FORM_ID"]
    item = {
        "FORM_ID": form,
        "OPERATION_ID": row["OPERATION_ID"],
        "JOURNEY": row["JOURNEY"],
        "ACTOR": "no transactional actor verified",
        "TENANT": row["TENANT"],
        "OBJECT_ID": row["CURRENT_MATCHING_RECORD_IDS"],
        "INITIAL_STATE_OBSERVED": "",
        "FINAL_STATE_OBSERVED": "",
        "HTTP_STATUS": "",
        "RESULT": "BLOCKED",
        "EVIDENCE": "SCENARIO_COVERAGE_20261020.csv; preexecution-qa-readonly.json",
        "CURRENT_BLOCKER": row["CLASSIFICATION"] + ": " + row["EXACT_REASON"],
        "BLOCK_OWNER": row["RESPONSIBLE"],
        "MINIMUM_NEXT_ACTION": row["MINIMUM_UNBLOCKING_ACTION"],
    }
    if form == "FORM-05":
        item.update(
            ACTOR="andres.barouh@tecdex.net / 01a0cfae-d860-730d-88b8-d8b1b3f5d7dc",
            OBJECT_ID="01a15942-6048-7405-b0a8-6253ff64f9bb",
            INITIAL_STATE_OBSERVED="not_assessed; row_version=1",
            FINAL_STATE_OBSERVED="in_progress; row_version=2",
            HTTP_STATUS="202 (prior 401, no commit)",
            RESULT="PASS",
            EVIDENCE="PREEXECUTION_GATE.json; FORM-05-before-db.json; FORM-05-after-401-db.json; FORM-05-after-202-db.json; FORM-05-transaction-receipt.json",
            CURRENT_BLOCKER="",
            BLOCK_OWNER="",
            MINIMUM_NEXT_ACTION="No retry. Preserve audit receipt; obtain genuine assessment conclusion before FORM-06.",
        )
    elif form == "FORM-06":
        item.update(
            OBJECT_ID="01a15942-6048-7405-b0a8-6253ff64f9bb",
            INITIAL_STATE_OBSERVED="in_progress; row_version=2",
            FINAL_STATE_OBSERVED="in_progress; row_version=2",
            EVIDENCE="FORM-05-after-202-db.json; SCENARIO_COVERAGE_20261020.csv",
            CURRENT_BLOCKER="BLOCKED_UNATTESTED_RESULT: assessed transition requires a real assessor's result_status; session also expired before operation-specific authorization could be proven",
            BLOCK_OWNER="Authorized compliance assessor; QA session owner",
            MINIMUM_NEXT_ACTION="Assessor supplies authentic evaluation result and renews official session; verify permission, state and version immediately before command.",
        )
    elif form == "FORM-13":
        item.update(
            INITIAL_STATE_OBSERVED="in_progress (prior read-only QA snapshot)",
            CURRENT_BLOCKER="BLOCKED_UNATTESTED_RESULT: no genuine control assessment result was supplied or verified; operation-specific authorization pending",
            BLOCK_OWNER="Authorized control assessor",
            MINIMUM_NEXT_ACTION="Assessor supplies real result and revalidates state, scope and session before submit.",
        )
    out.append(item)
assert sum(x["RESULT"] == "PASS" for x in out) == 1
assert sum(x["RESULT"] == "BLOCKED" for x in out) == 41
with target.open("x", newline="", encoding="utf-8") as handle:
    writer = csv.DictWriter(handle, fieldnames=fields)
    writer.writeheader()
    writer.writerows(out)
print(f"{target}: {len(out)} operations; PASS=1 BLOCKED=41")
