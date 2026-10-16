#!/usr/bin/env python3
"""Prove staged rector verification rejects one tampered successor byte."""

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

here = Path(__file__).resolve().parent
source = here / "staged"
with tempfile.TemporaryDirectory(prefix="tcdx-v19-negative-") as scratch:
    copied = Path(scratch) / "staged"
    shutil.copytree(source, copied)
    target = copied / "proposed/docs/rector/baseline/22_RBAC_PERMISSION_SCOPE_MATRIX.md"
    target.write_bytes(target.read_bytes() + b"\nTAMPER_TEST_ONLY\n")
    run = subprocess.run(
        [sys.executable, str(here / "verify-v19-governance.py"), "--staging", f"--staging-root={copied}"],
        capture_output=True, text=True, check=False,
    )
    if run.returncode == 0:
        raise SystemExit("V19_NEGATIVE_STAGING=FAIL accepted tampered rector file")
    if "22_RBAC_PERMISSION_SCOPE_MATRIX.md" not in run.stderr:
        raise SystemExit("V19_NEGATIVE_STAGING=FAIL rejection reason differs: " + run.stderr[-500:])
print("V19_NEGATIVE_STAGING=PASS_TAMPER_REJECTED")
