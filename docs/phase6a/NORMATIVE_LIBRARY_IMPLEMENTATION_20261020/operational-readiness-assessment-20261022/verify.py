#!/usr/bin/env python3
"""Read-only verifier for the operational readiness dossier."""
from __future__ import annotations

import hashlib
import json
import pathlib
import subprocess

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[3]
PREFIX = str(HERE.relative_to(ROOT)) + "/"
EXPECTED_PREEXISTING_COUNT = 4993
EXPECTED_PREEXISTING_HASH = "ddf91dfe406efad4982665ce0591b8310f3fb9da67897ec28d59cdbc8d605db1"
EXPECTED_FILES = {
    "DELTAS.json", "EVIDENCE.json", "FINAL_INTEGRITY.json", "GAP_REGISTER.md",
    "HANDOFF.md", "OPERATIONAL_ENABLEMENT_PLAN.md", "REPORT.md",
    "SHA256SUMS.txt", "TRACEABILITY.md", "verify.py",
}


def sha(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def git(*args: str) -> bytes:
    return subprocess.check_output(["git", "-C", str(ROOT), *args])


def main() -> dict[str, object]:
    assert {p.name for p in HERE.iterdir() if p.is_file()} == EXPECTED_FILES
    manifest = HERE / "SHA256SUMS.txt"
    for line in manifest.read_text(encoding="utf-8").splitlines():
        digest, name = line.split("  ", 1)
        assert sha(HERE / name) == digest, name
    final = json.loads((HERE / "FINAL_INTEGRITY.json").read_text(encoding="utf-8"))
    assert final["sha256_manifest"] == sha(manifest)
    raw = git("-c", "core.quotepath=false", "ls-files", "--cached", "--others", "--exclude-standard", "-z")
    paths = [part.decode() for part in raw.split(b"\0") if part and not part.decode().startswith(PREFIX)]
    rows = [f"{sha(ROOT / path)}  {path}" for path in sorted(paths)]
    aggregate = hashlib.sha256(("\n".join(rows) + "\n").encode()).hexdigest()
    assert len(rows) == EXPECTED_PREEXISTING_COUNT
    assert aggregate == EXPECTED_PREEXISTING_HASH
    assert git("branch", "--show-current").decode().strip() == "fix/step6a3-v112-continuity-20261016"
    assert git("rev-parse", "HEAD").decode().strip() == "4a275264a7522031e62bf09f598c9d56e21d25e0"
    assert git("diff", "--cached", "--name-only") == b""
    assert sha(ROOT / "database/migrations/20261021221204_normative_library_b01_b09_h04_pv01.sql") == "9279159e88c60fff03f998e33008fb0d675f53e4423df638c9e54f709a773798"
    return {
        "integrity": "PASS",
        "files_created": len(EXPECTED_FILES),
        "files_modified": 0,
        "preexisting_visible_files": len(rows),
        "preexisting_aggregate_sha256": aggregate,
        "branch_head_index": "PRESERVED",
        "migration_20261021221204": "HASH_MATCH",
        "qa_operations": "NONE",
    }


if __name__ == "__main__":
    print(json.dumps(main(), indent=2, sort_keys=True))
