"""Read-only repository checks; writes receipts inside this new expediente only."""
from pathlib import Path
import difflib
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent / "evidence"
ENTRY = json.loads((OUT / "ENTRY_PRESERVATION.json").read_text())
ALLOWED = {
    "apps/frontend/src/business-form-fields.tsx",
    "apps/frontend/src/business-forms.ts",
    "apps/frontend/src/core-grc.tsx",
    "e2e/step6a4-business-forms.spec.ts",
    "docs/governance/MASTER_EXECUTION_STATUS.md",
}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT).decode()


changed, unexpected, missing = [], [], []
sealed_count = 0
for name, expected in ENTRY["files"].items():
    path = ROOT / name
    if not path.is_file():
        missing.append(name)
    elif digest(path) != expected:
        changed.append(name)
        if name not in ALLOWED:
            unexpected.append(name)
    if name.startswith("docs/phase6a/STEP_6A4/evidence/"):
        sealed_count += 1

status_name = "docs/governance/MASTER_EXECUTION_STATUS.md"
current = (ROOT / status_name).read_text()
marker = "\n\n## STEP6A4 — corrección focalizada de referencias P3/P5, 2026-10-20\n"
assert current.count(marker) == 1
before = current.split(marker)[0]
assert hashlib.sha256(before.encode()).hexdigest() == ENTRY["files"][status_name]
(OUT / "deltas" / "MASTER_EXECUTION_STATUS.patch").write_text("".join(
    difflib.unified_diff(before.splitlines(True), current.splitlines(True),
                         fromfile="entry/" + status_name, tofile="current/" + status_name)))

for name in ALLOWED - {status_name}:
    assert digest(OUT / "entry-sources" / name) == ENTRY["files"][name]

result = {
    "status": "PASS",
    "entry_files": len(ENTRY["files"]),
    "preserved_files": len(ENTRY["files"]) - len(changed) - len(missing),
    "authorized_changed_files": sorted(changed),
    "unexpected_changes": unexpected,
    "missing_files": missing,
    "prior_step6a4_evidence_files_preserved": sealed_count,
    "head_unchanged": git("rev-parse", "HEAD").strip() == ENTRY["head"],
    "branch_unchanged": git("branch", "--show-current").strip() == ENTRY["branch"],
    "index_unchanged": git("diff", "--cached", "--binary") == ENTRY["index"],
    "master_status_append_only": True,
    "qa_business_writes": "NOT_PERFORMED",
    "deployment": "NOT_PERFORMED",
    "browser_after_po_stop": "NOT_PERFORMED",
}
assert not unexpected and not missing
assert set(changed) == ALLOWED
assert all(result[key] for key in ("head_unchanged", "branch_unchanged", "index_unchanged"))
(OUT / "INTEGRITY_RESULT.json").write_text(json.dumps(result, indent=2) + "\n")

artifacts = {str(path.relative_to(ROOT)): digest(path)
             for path in Path(__file__).resolve().parent.rglob("*")
             if path.is_file() and path.name != "ARTIFACT_SHA256.json"}
for name in sorted(ALLOWED | {
    "apps/frontend/src/business-origin-fields.tsx",
    "apps/frontend/src/business-origin-fields.test.tsx",
    "e2e/step6a4-reference-correction.spec.ts",
}):
    artifacts[name] = digest(ROOT / name)
(OUT / "ARTIFACT_SHA256.json").write_text(json.dumps(artifacts, indent=2) + "\n")
print(json.dumps(result, indent=2))
