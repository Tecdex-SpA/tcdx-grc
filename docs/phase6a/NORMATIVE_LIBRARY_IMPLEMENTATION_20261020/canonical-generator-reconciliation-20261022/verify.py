#!/usr/bin/env python3
"""Read-only verifier for the canonical-generator reconciliation successor."""
from __future__ import annotations

import hashlib
import json
import pathlib
import subprocess

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[3]
PREFIX = str(HERE.relative_to(ROOT)) + "/"
PREVIOUS_PREFIX = "docs/phase6a/NORMATIVE_LIBRARY_IMPLEMENTATION_20261020/operational-readiness-assessment-20261022/"
EXPECTED_FILES = {
    "DELTAS.json", "EVIDENCE.json", "FINAL_INTEGRITY.json", "GENERATOR.diff",
    "HANDOFF.md", "REPORT.md", "SHA256SUMS.txt", "verify.py",
}
GENERATOR = "scripts/foundations/generate-contract-assets.mjs"
GENERATOR_BEFORE = "d5f655067eaab090d15a038b1afc79e320d461873769cd10a7699832d68a934e"
GENERATOR_AFTER = "f91d67ca5a5e64169a0964a81439137c22f842888e323dd48e671098c5856209"
PREVIOUS_COUNT = 4993
PREVIOUS_AGGREGATE = "ddf91dfe406efad4982665ce0591b8310f3fb9da67897ec28d59cdbc8d605db1"


def sha(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def git(*args: str) -> bytes:
    return subprocess.check_output(["git", "-C", str(ROOT), *args])


def migration_history() -> tuple[int, str]:
    manifest = json.loads((ROOT / "database/migrations/manifest.json").read_text())
    digest = hashlib.sha256()
    for row in manifest["migrations"][:34]:
        path = ROOT / "database/migrations" / row["filename"]
        assert sha(path) == row["sha256"], row["filename"]
        digest.update(row["filename"].encode() + b"\0" + path.read_bytes() + b"\0")
    assert len(manifest["migrations"]) == 35
    assert manifest["migrations"][34]["sha256"] == "9279159e88c60fff03f998e33008fb0d675f53e4423df638c9e54f709a773798"
    return 34, digest.hexdigest()


def main() -> dict[str, object]:
    assert {p.name for p in HERE.iterdir() if p.is_file()} == EXPECTED_FILES
    manifest = HERE / "SHA256SUMS.txt"
    for line in manifest.read_text().splitlines():
        digest, name = line.split("  ", 1)
        assert sha(HERE / name) == digest, name
    final = json.loads((HERE / "FINAL_INTEGRITY.json").read_text())
    assert final["sha256_manifest"] == sha(manifest)

    raw = git("-c", "core.quotepath=false", "ls-files", "--cached", "--others", "--exclude-standard", "-z")
    paths = [part.decode() for part in raw.split(b"\0") if part]
    prior = [path for path in paths if not path.startswith(PREFIX) and not path.startswith(PREVIOUS_PREFIX)]
    rows = []
    for path in sorted(prior):
        digest = GENERATOR_BEFORE if path == GENERATOR else sha(ROOT / path)
        rows.append(f"{digest}  {path}")
    aggregate = hashlib.sha256(("\n".join(rows) + "\n").encode()).hexdigest()
    assert len(rows) == PREVIOUS_COUNT
    assert aggregate == PREVIOUS_AGGREGATE
    assert sha(ROOT / GENERATOR) == GENERATOR_AFTER
    assert sha(ROOT / "database/migrations/manifest.json") == "70ecaa0f4bbf168a1f5e4c3cefbd734036217dc7b09ac3d4a11b65f9cbc66152"
    assert sha(ROOT / "database/expected-schema.json") == "c2fc38768ee6c7b3760346ec862304204e4f94abd18a2d8150745bbaf6953207"
    assert sha(ROOT / "database/migrations/20261021221204_normative_library_b01_b09_h04_pv01.sql") == "9279159e88c60fff03f998e33008fb0d675f53e4423df638c9e54f709a773798"
    count, history = migration_history()
    assert history == "12a234fe50ba389a8523cac90445990319ab533d6c017c0085689732600424b5"
    assert git("branch", "--show-current").decode().strip() == "fix/step6a3-v112-continuity-20261016"
    assert git("rev-parse", "HEAD").decode().strip() == "4a275264a7522031e62bf09f598c9d56e21d25e0"
    assert git("diff", "--cached", "--name-only") == b""
    return {
        "integrity": "PASS",
        "files_created": len(EXPECTED_FILES),
        "files_modified": 1,
        "authorized_modified_file": GENERATOR,
        "all_other_preexisting_bytes": "PRESERVED",
        "migrations_1_34": f"{count}_HASH_MATCH",
        "migration_35": "HASH_MATCH",
        "manifest_expected_schema": "HASH_MATCH",
        "branch_head_index": "PRESERVED",
        "qa_operations": "NONE",
    }


if __name__ == "__main__":
    print(json.dumps(main(), indent=2, sort_keys=True))

