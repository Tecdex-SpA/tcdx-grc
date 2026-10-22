#!/usr/bin/env python3
"""Verify new QA receipts and old seals without changing any sealed artifact."""
import csv
import hashlib
import json
import pathlib
import subprocess

root = pathlib.Path(__file__).resolve().parents[5]
step = root / "docs/phase6a/STEP_6A4"
evidence = pathlib.Path(__file__).resolve().parent
older = step / "evidence/scenario-analysis-20261020"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


entry = json.loads((older / "ENTRY_SHA256.json").read_text())
entry_bad = [name for name, sha in entry.items() if not (root / name).is_file() or digest(root / name) != sha]
sealed = {}
for area in ("local-20261020", "qa-20261020"):
    lines = (step / "evidence" / area / "SHA256SUMS.txt").read_text().splitlines()
    bad = []
    for line in lines:
        sha, name = line.split("  ", 1)
        if not (root / name).is_file() or digest(root / name) != sha:
            bad.append(name)
    sealed[area] = {"entries": len(lines), "mismatches": bad}

with (evidence / "OPERATION_EXECUTION_MATRIX.csv").open(newline="") as handle:
    reader = csv.DictReader(handle)
    operations = list(reader)
    matrix_valid = (len(operations) == 42 and len({x["FORM_ID"] for x in operations}) == 42
                    and all(None not in x and all(v is not None for v in x.values()) for x in operations))
counts = {result: sum(x["RESULT"] == result for x in operations) for result in ("PASS", "FAIL", "BLOCKED", "NOT_APPLICABLE")}
before = json.loads((evidence / "FORM-05-before-db.json").read_text())
after_401 = json.loads((evidence / "FORM-05-after-401-db.json").read_text())
after_202 = json.loads((evidence / "FORM-05-after-202-db.json").read_text())
no_commit_401 = before["state"] == after_401["state"] and before["audit"] == after_401["audit"]
commit_202 = (len(after_202["state"]) == 1
              and after_202["state"][0]["lifecycle_state"] == "in_progress"
              and after_202["state"][0]["row_version"] == "2"
              and len(after_202["audit"]) == len(before["audit"]) + 1
              and after_202["audit"][0]["command_code"] == "requirementAssessmentStart"
              and after_202["audit"][0]["outcome"] == "success")
head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root, text=True).strip()
branch = subprocess.check_output(["git", "branch", "--show-current"], cwd=root, text=True).strip()
index = subprocess.check_output(["git", "diff", "--cached", "--binary"], cwd=root)
gate = (evidence / "rector-final.log").read_text()
artifacts = {str(p.relative_to(root)): digest(p) for p in sorted(evidence.iterdir()) if p.is_file() and p.name != "INTEGRITY_RESULT.json"}
result = {
    "head": head,
    "branch": branch,
    "index_preserved": index == (older / "index-entry.diff").read_bytes(),
    "entry_files": len(entry),
    "entry_mismatches": entry_bad,
    "sealed": sealed,
    "operation_matrix_valid": matrix_valid,
    "operation_counts": counts,
    "failed_401_no_commit": no_commit_401,
    "successful_202_persistence_and_audit": commit_202,
    "rector_gate_pass": "RECTOR_GATE=PASS" in gate,
    "artifact_sha256": artifacts,
}
result["pass"] = (head == "4a275264a7522031e62bf09f598c9d56e21d25e0"
                  and branch == "fix/step6a3-v112-continuity-20261016"
                  and result["index_preserved"] and not entry_bad
                  and all(not x["mismatches"] for x in sealed.values())
                  and matrix_valid and counts == {"PASS": 1, "FAIL": 0, "BLOCKED": 41, "NOT_APPLICABLE": 0}
                  and no_commit_401 and commit_202 and result["rector_gate_pass"])
(evidence / "INTEGRITY_RESULT.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
print(json.dumps({k: v for k, v in result.items() if k != "artifact_sha256"}, ensure_ascii=False, indent=2))
assert result["pass"]
