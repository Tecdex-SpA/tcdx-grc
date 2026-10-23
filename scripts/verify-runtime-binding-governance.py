#!/usr/bin/env python3
"""Verify append-only P1/P2/T1 and internal H04 authority without private custody or dependencies."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASELINE = "TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16"

def read(path):
    return json.loads((ROOT / path).read_text())

def digest(path):
    return hashlib.sha256((ROOT / path).read_bytes()).hexdigest()

def verify(ref):
    path = ref["path"]
    assert path.startswith(("docs/", "database/")) and ".." not in Path(path).parts, path
    assert digest(path) == ref["sha256"], path

assert (ROOT / "docs/rector/BASELINE_ID").read_text().strip() == BASELINE
assert (ROOT / "docs/rector/BASELINE_STATUS").read_text().strip() == "ACTIVE"
for name in ["NORMATIVE_LIBRARY_INTERNAL_DEV_QA_20261023", "PHASE6A_RUNTIME_BINDINGS_20261023", "PHASE6A_PUBLICATION_CLOSURE_20261023"]:
    directory = f"docs/executable-contracts/amendments/{name}/"
    receipt = read(directory + "CONTRACT_PUBLICATION_RECEIPT.json")
    assert receipt["status"] == "PASS_CONTRACT_EFFECTIVE_LOCAL"
    assert receipt["baseline_id"] == BASELINE
    assert receipt["human_signature_of_derived_bytes"] is False
    for key in ["publication_manifest", "authorization", "review"]:
        if key in receipt:
            verify(receipt[key])
    manifest = read(receipt["publication_manifest"]["path"])
    assert manifest["baseline_id"] == BASELINE
    for ref in manifest["files"] + manifest["predecessor"]:
        verify(ref)
    covered = {ref["path"] for ref in manifest["files"] if ref["path"].startswith(directory)}
    actual = {str(p.relative_to(ROOT)) for p in (ROOT / directory).iterdir() if p.is_file()}
    assert actual == covered | {directory + "PUBLICATION_MANIFEST.json", directory + "CONTRACT_PUBLICATION_RECEIPT.json"}

directory = "docs/executable-contracts/amendments/PHASE6A_RUNTIME_BINDINGS_20261023/"
contract = read(directory + "CONTRACT.json")
successor_directory = "docs/executable-contracts/amendments/PHASE6A_PUBLICATION_CLOSURE_20261023/"
successor = read(successor_directory + "CONTRACT.json")
contract["publication"]["atomic_states"] = successor["atomic_states"]
contract["publication"]["unchanged_states"] = successor["unchanged_states"]
contract["concurrency"]["population_hash"] = successor["population_hash"]
contract["concurrency"]["etag"] = successor["etag"]
contract["reference_publication"] = successor
api = read(directory + "OPENAPI.json")
generated = read("apps/backend/src/regulatory/runtime-bindings-contract.generated.json")
assert generated["contract"] == contract and generated["api"] == api
assert generated["receipt_sha256"] == digest(directory + "CONTRACT_PUBLICATION_RECEIPT.json")
assert generated["successor_receipt_sha256"] == digest(successor_directory + "CONTRACT_PUBLICATION_RECEIPT.json")
assert generated["physicalMigration"]["sha256"] == digest("docs/physical-data-model/amendments/PHASE6A_RUNTIME_BINDINGS_20261023/DDL_SPEC.sql")
assert len(contract["pack_coapprovals"]) == 6
assert contract["pack_coapprovals"]["CL_LEY_21663"] == ["COMPLIANCE_MANAGER", "CISO_SECURITY_MANAGER", "LEGAL_REVIEWER"]
assert contract["ticket"]["emission"] == "EXTERNAL_GERENCIA"
assert contract["ticket"]["platform_pdf_access"] == "NONE_GRANTED"
assert len(api["paths"]) == 9 and sum(len(v) for v in api["paths"].values()) == 9
assert sum(op["operationId"] == "regulatoryPackPublish" for methods in api["paths"].values() for op in methods.values()) == 1
assert len(read("database/migrations/manifest.json")["migrations"]) == 36
assert read("database/expected-schema.json")["tableCount"] == 244
assert read("docs/physical-data-model/amendments/PHASE6A_RUNTIME_BINDINGS_20261023/EXPECTED_SCHEMA_CONTRACT.json")["tableCount"] == 245
internal = read("docs/executable-contracts/amendments/NORMATIVE_LIBRARY_INTERNAL_DEV_QA_20261023/CONTRACT.json")
assert internal["internal_environments"] == ["development", "test", "qa"]
assert "export" not in internal["knowledge_internal_acts"]
derived = read("apps/backend/src/normative-library/rights-contract.generated.json")
assert derived["internalPolicy"] == internal
print("RUNTIME_BINDING_AUTHORITY_INTEGRITY=PASS")
print("INTERNAL_DEV_QA_AUTHORITY_INTEGRITY=PASS")
print("OPERATIONAL_OR_HUMAN_GATES=NOT_ASSERTED")
