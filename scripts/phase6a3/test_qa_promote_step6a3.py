"""Offline release-preflight tests; never invoke Docker or a QA runtime."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import sys
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("qa_promote", Path(__file__).with_name("qa-promote-step6a3.py"))
promote = importlib.util.module_from_spec(spec)
sys.dont_write_bytecode = True
spec.loader.exec_module(promote)
ROOT = Path(__file__).resolve().parents[2]


class ReleasePreflight(unittest.TestCase):
    def setUp(self):
        self.manifest = json.loads((ROOT / "database/migrations/manifest.json").read_text())
        self.gate = {
            "environment": "qa", "release_authorized": True, "historical_fingerprints_preserved": True,
            "backend_image_id": "sha256:backend", "frontend_image_id": "sha256:frontend",
            "backend_source_sha256": "backend-source", "frontend_source_sha256": "frontend-source",
            "artifacts": {"expected_schema": {"sha256": "schema-sha"}},
            "contract_gates": {key: "PASS_CONTRACT_EFFECTIVE" for key in ("physical_publication", "executable_publication")},
            "state": {"counts": {"migrations": len(self.manifest["migrations"]),
                "active_platform_service_principals": 1, "reference_publication_audits": 132,
                "commercial_permissions": 3, "commercial_lifecycle_registry_rows": 3, "v2": 3,
                "entitlements_v2": 36, "unvalidated_fks": 0, "catalog_audits": 6, "catalog_outbox": 5},
                "migrations": [{"migration_id": e["id"], "filename": e["filename"],
                                "content_sha256": e["sha256"], "outcome": "applied"} for e in self.manifest["migrations"]],
                "c04w_lifecycle": {"exact_bindings_verified": True, "published_rows": 5,
                    "authenticated_publication_audits": 5, "unexpected_scopes_or_effects": 0},
                "schema": {"database": "tcdx-grc", "postgresql_major": 16, "mismatches": 0,
                    "unvalidated_foreign_keys": 0, "forbidden_delete_cascades": 0,
                    "expected_schema_sha256": "schema-sha"}}
        }

    def validate(self):
        promote.validate_release_gate(self.gate, self.manifest, "backend", "sha256:backend", "backend-source")

    def test_exact_current_ledger_passes(self):
        self.assertEqual(len(self.manifest["migrations"]), 34)
        self.validate()

    def test_initial_source_scope_requires_exact_audit_and_zero_replay(self):
        self.gate.update(release_id="step6a3-initial-source-20261015", initial_source_required=True,
            initial_source_review_sha256="df66515d794942c6f18e8a61fb3d398fb679c7b2111ea225571a77e605b8f19b", human_acceptance="PENDING")
        with self.assertRaisesRegex(RuntimeError, "EXACT_INITIAL_SOURCE_SCOPE_PUBLICATION_REQUIRED"):
            self.validate()
        state={"exact_binding_verified":True,"published_version":2,"authenticated_publication_audits":1,
               "unexpected_scopes_or_effects":0,"replay_created":0,"replay_audited":0}
        self.gate["state"]["initial_source_lifecycle"]=state
        self.validate()
        for field,value in [("authenticated_publication_audits",0),("replay_created",1),("replay_audited",1),("published_version",1),("unexpected_scopes_or_effects",1)]:
            before=state[field];state[field]=value
            with self.assertRaisesRegex(RuntimeError, "EXACT_INITIAL_SOURCE_SCOPE_PUBLICATION_REQUIRED"):
                self.validate()
            state[field]=before

    def test_33_or_unexpected_count_fails_against_current_manifest(self):
        for count in (33, 35):
            with self.subTest(count=count):
                self.gate["state"]["counts"]["migrations"] = count
                with self.assertRaisesRegex(RuntimeError, "EXACT_QA_MIGRATION_LEDGER_REQUIRED"):
                    self.validate()

    def test_34_count_cannot_mask_missing_or_wrong_r2(self):
        for field, value in (("migration_id", "20261015000000"), ("content_sha256", "wrong-r1"),
                             ("filename", "r1.sql"), ("outcome", "failed")):
            with self.subTest(field=field):
                row = self.gate["state"]["migrations"][-1]
                prior = row[field]
                row[field] = value
                with self.assertRaisesRegex(RuntimeError, "EXACT_QA_MIGRATION_LEDGER_REQUIRED"):
                    self.validate()
                row[field] = prior
        self.gate["state"]["migrations"].pop()
        with self.assertRaisesRegex(RuntimeError, "EXACT_QA_MIGRATION_LEDGER_REQUIRED"):
            self.validate()

    def test_duplicate_manifest_and_ledger_fail(self):
        self.manifest["migrations"].append(self.manifest["migrations"][-1])
        with self.assertRaisesRegex(RuntimeError, "REVIEWED_MIGRATION_MANIFEST_REQUIRED"):
            self.validate()

    def test_draft_contract_schema_drift_and_image_source_mismatch_fail(self):
        pristine = copy.deepcopy(self.gate)
        for key in ("physical_publication", "executable_publication"):
            self.gate = copy.deepcopy(pristine)
            self.gate["contract_gates"][key] = "DRAFT_NOT_EFFECTIVE"
            with self.assertRaisesRegex(RuntimeError, "EFFECTIVE_CONTRACT_PUBLICATION_REQUIRED"):
                self.validate()
        self.gate = copy.deepcopy(pristine)
        self.gate["state"]["schema"]["mismatches"] = 1
        with self.assertRaisesRegex(RuntimeError, "EXACT_QA_SCHEMA_REQUIRED"):
            self.validate()
        self.gate = copy.deepcopy(pristine)
        self.gate["backend_source_sha256"] = "obsolete"
        with self.assertRaisesRegex(RuntimeError, "QA_PUBLICATION_OR_PRESERVATION_GATE_FAILED"):
            self.validate()

    def test_artifacts_are_exact_and_publication_receipts_required(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            gate = {"artifacts": {}}
            for key in ("migration_manifest", "expected_schema", "physical_publication", "executable_publication"):
                data = json.dumps({"status": "PASS_CONTRACT_EFFECTIVE", "human_decision_reference": "technical-fixture",
                                   "publication_manifest_sha256": "technical-fixture-manifest",
                                   "files": [{"path": "technical-fixture", "sha256": "fixture"}]}).encode()
                (root / (key + ".json")).write_bytes(data)
                gate["artifacts"][key] = {"filename": key + ".json", "sha256": hashlib.sha256(data).hexdigest()}
            promote.read_release_artifacts(root, gate)
            entry = gate["artifacts"]["physical_publication"]
            published = (root / entry["filename"]).read_bytes()
            draft = json.dumps({"status": "DRAFT_NOT_EFFECTIVE", "human_decision_reference": "fixture", "files": ["fixture"]}).encode()
            (root / entry["filename"]).write_bytes(draft)
            entry["sha256"] = hashlib.sha256(draft).hexdigest()
            with self.assertRaisesRegex(RuntimeError, "EFFECTIVE_CONTRACT_PUBLICATION_REQUIRED"):
                promote.read_release_artifacts(root, gate)
            (root / entry["filename"]).write_bytes(published)
            entry["sha256"] = hashlib.sha256(published).hexdigest()
            (root / "migration_manifest.json").write_text("{}")
            with self.assertRaisesRegex(RuntimeError, "EXACT_RELEASE_ARTIFACT_REQUIRED"):
                promote.read_release_artifacts(root, gate)
            gate["artifacts"]["migration_manifest"]["filename"] = "../manifest.json"
            with self.assertRaisesRegex(RuntimeError, "RELEASE_ARTIFACT_BASENAME_REQUIRED"):
                promote.read_release_artifacts(root, gate)

    def test_missing_gate_data_never_reaches_docker(self):
        with tempfile.TemporaryDirectory() as directory:
            data = json.dumps({"release_id": "step6a3-technical-fixture"}).encode()
            (Path(directory) / "release-gate.json").write_bytes(data)
            with patch.object(promote.socket, "gethostname", return_value="grc-bk"), \
                 patch.object(promote.sys, "argv", ["promote", "backend", "sha256:backend", "source", directory, hashlib.sha256(data).hexdigest()]), \
                 patch.object(promote, "run") as run:
                with self.assertRaises(KeyError):
                    promote.main()
                run.assert_not_called()

    def test_missing_or_corrupt_c04w_registry_fails_closed(self):
        for field, value in (("exact_bindings_verified", False), ("published_rows", 0),
                             ("authenticated_publication_audits", 4), ("unexpected_scopes_or_effects", 1)):
            with self.subTest(field=field):
                original = self.gate["state"]["c04w_lifecycle"][field]
                self.gate["state"]["c04w_lifecycle"][field] = value
                with self.assertRaisesRegex(RuntimeError, "EXACT_AUDITED_C04W_LIFECYCLE_REQUIRED"):
                    self.validate()
                self.gate["state"]["c04w_lifecycle"][field] = original

    def test_exact_image_and_source_for_both_runtime_kinds(self):
        for kind in ("backend", "frontend"):
            image = {"Id": "sha256:" + kind, "Architecture": "amd64", "Os": "linux",
                     "Config": {"Labels": {"tcdx.source.sha256": kind + "-source"}}}
            promote.validate_candidate_image(image, "sha256:" + kind, kind + "-source")
            for field, value in (("Id", "obsolete"), ("Architecture", "arm64"), ("Os", "windows")):
                wrong = copy.deepcopy(image)
                wrong[field] = value
                with self.assertRaisesRegex(RuntimeError, "EXACT_AMD64_IMAGE_REQUIRED"):
                    promote.validate_candidate_image(wrong, "sha256:" + kind, kind + "-source")
            image["Config"]["Labels"] = None
            with self.assertRaisesRegex(RuntimeError, "EXACT_IMAGE_SOURCE_REQUIRED"):
                promote.validate_candidate_image(image, "sha256:" + kind, kind + "-source")


if __name__ == "__main__":
    unittest.main()
