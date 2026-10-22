"""Read-only validation of the STEP6A4 continuation evidence; writes only its result."""
import csv
import hashlib
import json
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[5]
STEP = ROOT / "docs/phase6a/STEP_6A4"
EVIDENCE = STEP / "evidence/scenario-analysis-20261020"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def rows(name, expected):
    with (STEP / name).open(newline="") as stream:
        reader = csv.DictReader(stream)
        data = list(reader)
        assert len(data) == expected, (name, len(data), expected)
        assert len(reader.fieldnames) == len(set(reader.fieldnames)), name
        assert all(None not in row and all(value is not None for value in row.values()) for row in data), name
        return data


entry = json.loads((EVIDENCE / "ENTRY_SHA256.json").read_text())
entry_bad = [name for name, expected in entry.items() if not (ROOT / name).is_file() or digest(ROOT / name) != expected]
sealed = {}
for area in ("local-20261020", "qa-20261020"):
    lines = (STEP / "evidence" / area / "SHA256SUMS.txt").read_text().splitlines()
    pairs = [line.split("  ", 1) for line in lines]
    bad = [name for expected, name in pairs if not (ROOT / name).is_file() or digest(ROOT / name) != expected]
    sealed[area] = {"entries": len(pairs), "mismatches": bad}

forms = rows("SCENARIO_COVERAGE_20261020.csv", 42)
deps = rows("SCENARIO_DEPENDENCIES_20261020.csv", 38)
refs = rows("REFERENCE_SCENARIO_COVERAGE_20261020.csv", 95)
inventory = rows("SCENARIO_INVENTORY_20261020.csv", 18)
assert len({row["FORM_ID"] for row in forms}) == 42
assert len({row["FIELD_ID"] for row in refs}) == 95
assert {row["SOURCE"] for row in deps} <= {row["FORM_ID"] for row in forms}
assert {row["TARGET"] for row in deps} <= {row["FORM_ID"] for row in forms}

before = json.loads((EVIDENCE / "qa-readonly-inspection.json").read_text())
after = json.loads((EVIDENCE / "qa-readonly-after.json").read_text())
assert after["transaction_read_only"] == "on"
assert "READ ONLY" in after["transaction"] and "ROLLBACK" in after["transaction"]
parity = {name: before[name] == after[name] for name in ("fingerprints", "iamFingerprints", "actors", "capabilities", "edges")}

head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
branch = subprocess.check_output(["git", "branch", "--show-current"], cwd=ROOT, text=True).strip()
index = subprocess.check_output(["git", "diff", "--cached", "--binary"], cwd=ROOT)
assert head == "4a275264a7522031e62bf09f598c9d56e21d25e0"
assert branch == "fix/step6a3-v112-continuity-20261016"
assert index == (EVIDENCE / "index-entry.diff").read_bytes()

new_files = [
    STEP / "SCENARIO_COVERAGE_20261020.csv",
    STEP / "SCENARIO_DEPENDENCIES_20261020.csv",
    STEP / "SCENARIO_INVENTORY_20261020.csv",
    STEP / "REFERENCE_SCENARIO_COVERAGE_20261020.csv",
    STEP / "SCENARIO_DIAGNOSTIC_AND_ACCEPTANCE_PLAN_20261020.md",
    STEP / "FINAL_CONTINUITY_REPORT_20261020.md",
    EVIDENCE / "qa-readonly-after.json",
    EVIDENCE / "verify-continuity.py",
]
result = {
    "head": head,
    "branch": branch,
    "index_preserved": True,
    "entry_files": len(entry),
    "entry_mismatches": entry_bad,
    "sealed": sealed,
    "matrices": {"operations": len(forms), "dependencies": len(deps), "references": len(refs), "qa_records": len(inventory)},
    "qa_transaction_read_only": True,
    "qa_parity": parity,
    "artifact_sha256": {str(path.relative_to(ROOT)): digest(path) for path in new_files},
    "pass": not entry_bad and all(not item["mismatches"] for item in sealed.values()) and all(parity.values()),
}
(EVIDENCE / "INTEGRITY_RESULT.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
print(json.dumps({key: value for key, value in result.items() if key != "artifact_sha256"}, ensure_ascii=False, indent=2))
assert result["pass"]
