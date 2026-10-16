"""Read-only reconciliation of STEP 6A.3 candidates; never publishes or connects.

Prints deterministic JSON for the existing execution ledger. Candidate values
are read from the governed files, not maintained in a second catalog.
"""
import csv
import hashlib
import io
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[2]
SLICE = "docs/phase6a/STEP_6A3/"
checks = []


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def digest(data):
    return hashlib.sha256(data).hexdigest()


def file_hash(path):
    return digest((ROOT / path).read_bytes())


def check(name, condition):
    checks.append({"check": name, "result": "PASS" if condition else "FAIL"})


def rows(path):
    return list(csv.DictReader(io.StringIO(read(path))))


def table(path):
    return [(number, [x.strip() for x in line.split("|")[1:-1]])
            for number, line in enumerate(read(path).splitlines(), 1)
            if line.startswith("| ")]


def literal_inserts(path, relation):
    result = []
    # Canonical seed statements use literal VALUES, unlike later SELECT-based
    # distributions. This reader never claims to execute those distributions.
    for number, line in enumerate(read(path).splitlines(), 1):
        match = re.match(r"INSERT INTO " + re.escape(relation) + r" \(([^)]+)\) VALUES \((.*?)\) ON CONFLICT", line)
        if not match:
            continue
        tokens = re.findall(r"'(?:''|[^'])*'|[^,]+", match[2])
        values = [token.strip() for token in tokens]
        values = [None if v == "NULL" else v[1:-1].replace("''", "'") if v.startswith("'") else v for v in values]
        columns = [c.strip() for c in match[1].split(",")]
        if len(columns) != len(values):
            raise ValueError(f"Unsupported literal seed at {path}:{number}")
        result.append((number, dict(zip(columns, values))))
    return result


source_inventory = []
for path in sorted((ROOT / SLICE).rglob("*")):
    if not path.is_file() or path.suffix not in (".md", ".csv", ".json", ".sql"):
        continue
    content = path.read_text(encoding="utf-8")
    if path.suffix == ".json":
        json.loads(content)
    if path.suffix == ".csv":
        list(csv.DictReader(io.StringIO(content)))
    source_inventory.append({"path": path.relative_to(ROOT).as_posix(), "sha256": digest(path.read_bytes()), "lines": len(content.splitlines())})

batch = SLICE + "SOLO_OWNER_GOVERNANCE_PROPOSAL_20261009_V2/06_NEXT_EXECUTABLE_BATCH.md"
source = read(batch)
start = source.index("### EC-DETAIL-READ-v1-L03-R1 —")
end = source.index("\n```\n", source.index("```json\n", start)) + len("\n```\n")
ec_hash = digest(source[start:end].encode())
check("EC R1 adopted bytes", ec_hash == "159c2fac9a5d2006900f49ee020521146f2e85baeec9233c8a8f07429bc28163")
check("EC specific approval provenance", "DR-STEP6A3-EC-DETAIL-R1-20261009" in read(SLICE + "26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md"))

seed = "database/migrations/20260916000900_canonical_seeds.sql"
roles = {row["role_code"]: (line, row) for line, row in literal_inserts(seed, "iam.roles")}
permissions = {row["permission_code"]: row for _, row in literal_inserts(seed, "iam.permissions")}
role_by_id = {r["role_id"]: code for code, (_, r) in roles.items()}
literal_grants = [r for _, r in literal_inserts(seed, "iam.role_permissions")]
check("24 canonical role templates", len(roles) == 24)
candidate = SLICE + "27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md"
specs = [
    ("compliance.framework.read", "ISO_COMPLIANCE", "tenant"),
    ("platform.membership_reference.read", "CORE_PLATFORM + purpose capability", "tenant,assigned_object,owned_object,audit_engagement; exact parent only"),
    ("privacy.retention_policy_reference.read", "EVIDENCE_DOCUMENTS", "tenant,assigned_object,owned_object; exact parent/command only")]
grants = []
for line, cells in table(candidate):
    if len(cells) != 4 or cells[0] not in roles:
        continue
    before = cells[1].split("/")
    after = cells[2].split("/")
    check("grant before/after shape " + cells[0], before == ["0"] * 3 and len(after) == 3 and set(after) <= {"0", "1"})
    for index, inclusion in enumerate(after):
        if inclusion != "1":
            continue
        permission, capability, scopes = specs[index]
        role_line, role = roles[cells[0]]
        grants.append({"role_code": cells[0], "permission": permission, "before": 0, "after_candidate": 1,
                       "publication_state": "NOT_PUBLISHED", "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
                       "template_ownership": role["ownership_class"], "scopes": scopes, "capability": capability,
                       "purpose_and_justification": cells[3], "source": f"{candidate}:{line}", "role_source": f"{seed}:{role_line}",
                       "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
                       "risk": "History must not permit enumeration or selection; no structural scope inferred"})
check("44 unique candidate pairs", len(grants) == len({(g["role_code"], g["permission"]) for g in grants}) == 44)
check("13/17/14 grant counts", [sum(g["permission"] == s[0] for g in grants) for s in specs] == [13, 17, 14])
check("no Platform/Tenant Admin candidate escalation", not any(g["role_code"] in {"PLATFORM_ADMIN", "PLATFORM_SUPPORT", "TENANT_ADMIN"} for g in grants))
manifest = json.loads(read("database/migrations/manifest.json"))
all_sql = "\n".join(read("database/migrations/" + m["filename"]) for m in manifest["migrations"])
catalog = read("docs/executable-contracts/05_PERMISSION_CATALOG.md")
catalog_roles = {}
catalog_sources = {}
for line, cells in table("docs/executable-contracts/05_PERMISSION_CATALOG.md"):
    if len(cells) != 8:
        continue
    code = re.sub(r"</?code>|`", "", cells[0])
    if "." not in code:
        continue
    if cells[5].startswith("same as"):
        continue
    labels = cells[5].split(", ")
    codes = {re.sub(r"[^A-Z0-9]+", "_", label.upper()).strip("_") for label in labels}
    if codes <= set(roles):
        catalog_roles[code] = codes
        catalog_sources[code] = f"docs/executable-contracts/05_PERMISSION_CATALOG.md:{line}"
unions = [
    ["compliance.normative_unit.read", "compliance.soa.read"],
    ["evidence.evidence_request.read", "remediation.action.read", "controls.assurance_test.read"],
    ["evidence.evidence.read", "evidence.document.create", "evidence.evidence.create"]]
for index, sources in enumerate(unions):
    check("published reader/creator sources resolved " + str(index), all(code in catalog_roles for code in sources))
    if not all(code in catalog_roles for code in sources):
        continue
    expected = set().union(*(catalog_roles[code] for code in sources))
    actual = {g["role_code"] for g in grants if g["permission"] == specs[index][0]}
    check("candidate exactly matches authorized-purpose union " + specs[index][0], actual == expected)
    for grant in grants:
        if grant["permission"] == specs[index][0]:
            grant["published_purpose_sources"] = [catalog_sources[code] for code in sources if grant["role_code"] in catalog_roles[code]]
            grant["broader_than_purpose_union"] = grant["role_code"] not in expected
receipt_path = SLICE + "CONSOLIDATED_APPROVAL_20261009/MACRO_APPROVAL_RECEIPT_R1.json"
receipt = json.loads(read(receipt_path)) if (ROOT / receipt_path).exists() else None
if receipt is not None:
    check("exact later macro approval", receipt["status"] == "APPROVED_EXACT_MACRO_R1" and receipt["manifest_sha256"] == file_hash(SLICE + "CONSOLIDATED_APPROVAL_20261009/MACRO_MANIFEST_R1.json") and receipt["exact_human_response"] == "Apruebo el manifiesto y su texto exacto")
    published = json.loads(read("docs/executable-contracts/29_PHASE6A3_RBAC_MANIFEST.json"))
    check("published bounded pairs preserve approved candidate", {(g["role_code"], g["permission"]) for g in published["pairs"]} == {(g["role_code"], g["permission"]) for g in grants})
for permission, _, _ in specs:
    if receipt is None:
        check("candidate absent from published Permission catalog and active migrations " + permission, permission not in catalog and permission not in all_sql)
    else:
        check("specifically approved local Permission publication " + permission, sum(re.sub(r"</?code>|`", "", cells[0]) == permission for _, cells in table("docs/executable-contracts/05_PERMISSION_CATALOG.md")) == 1 and permission in all_sql and published["status"] == "PUBLISHED_LOCAL_V1")
action_id = permissions["remediation.action.create"]["permission_id"]
action_roles = sorted(role_by_id[g["role_id"]] for g in literal_grants if g["permission_id"] == action_id)
check("D01 extra AUDITOR seed identified", "AUDITOR" in action_roles)
requirement_id = permissions["compliance.requirement.read"]["permission_id"]
check("D02 Requirement seed definition without literal grants", not any(g["permission_id"] == requirement_id for g in literal_grants))
later_grant_statements = []
for migration in manifest["migrations"]:
    path = "database/migrations/" + migration["filename"]
    for match in re.finditer(r"INSERT INTO (?:\"iam\"\.\"role_permissions\"|iam\.role_permissions)\s*\(.*?;", read(path), re.S):
        statement = match.group()
        if "SELECT" in statement:
            later_grant_statements.append({"source": f"{path}:{read(path)[:match.start()].count(chr(10)) + 1}",
                                           "sha256": digest(statement.encode()),
                                           "direct_requirement_reference": requirement_id in statement or "compliance.requirement.read" in statement})
check("D02 no later direct Requirement grant publication", not any(s["direct_requirement_reference"] for s in later_grant_statements))

proposals_path = SLICE + "22_P_VOC_CANONICAL_VALUE_PROPOSALS.csv"
manifest_path = SLICE + "29_VOC_PUBLICATION_MANIFEST_CANDIDATE.csv"
proposals, vocabulary_manifest = rows(proposals_path), rows(manifest_path)
source_hash = file_hash(proposals_path)
check("52 adopted proposal bytes", source_hash == "8a9669d3389eba33be3640756777c35642a5d910567082cdd1fc12bf91c66239")
check("52 rows / 14 families", len(proposals) == len(vocabulary_manifest) == 52 and len({p["decision_id"] for p in proposals}) == 14)
check("unique family/code namespace", len({(p["decision_id"], p["value"]) for p in proposals}) == 52)
occurrences = {}
for i, (proposal, entry) in enumerate(zip(proposals, vocabulary_manifest), 2):
    check(f"vocabulary {i} exact source payload", all(proposal[k] == entry[k] for k in proposal if k != "state") and proposal["state"] == entry["source_state"])
    family = [p for p in proposals if p["decision_id"] == proposal["decision_id"]]
    payload_hash = digest(json.dumps(family, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode())
    check(f"vocabulary {i} checksum and signed-date absence", entry["family_payload_sha256"] == payload_hash and entry["source_csv_sha256"] == source_hash
          and not entry["effective_from"] and not entry["effective_to"] and entry["published"].lower() in {"false", "no", "0"}
          and entry["selectable"].lower() in {"false", "no", "0"} and entry["state"] == "PROPOSED_NOT_PUBLISHED")
    check(f"vocabulary {i} string bounds and owner", entry["proposed_type"] == "string" and int(entry["min_length"]) <= len(proposal["value"]) <= int(entry["max_length"])
          and bool(proposal["owner"]) and bool(proposal["candidate_contract_version"]) and bool(proposal["candidate_presentation_version"]))
    for field in proposal["field_ids"].split(";"):
        record = {"field_id": field, "family": proposal["decision_id"], "vocabulary_source": manifest_path, "schema_candidate": entry["openapi_schema_proposed"],
                  "contract_kind": proposal["classification"], "publication_state": "NOT_PUBLISHED"}
        if field in occurrences:
            check("unambiguous occurrence family " + field, occurrences[field] == record)
        occurrences[field] = record
check("26 occurrences, 4 mappings / 22 new contracts", len(occurrences) == 26 and sum(o["contract_kind"] == "EXISTENTE_PERO_REQUIERE_MAPEO_AUTORIZADO" for o in occurrences.values()) == 4)
for line, cells in table(SLICE + "30_VOC_TECHNICAL_SIGNOFF_AND_COMPATIBILITY.md"):
    match = re.match(r"(F-\d+) / (CV-\d+)$", cells[0])
    if not match:
        continue
    field, family = match.groups()
    check("consumer provenance " + field, field in occurrences and occurrences[field]["family"] == family)
    occurrences[field].update(consumer=cells[1], bounds=cells[2], requiredness=cells[3], consumer_source=f"{SLICE}30_VOC_TECHNICAL_SIGNOFF_AND_COMPATIBILITY.md:{line}")
check("all consumers mapped", all("consumer" in o for o in occurrences.values()))

ledger_path = SLICE + "26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md"
ledger = {c[0]: (n, c) for n, c in table(ledger_path) if len(c) == 8 and c[-1] == "PENDING_REVIEW"}
classification = rows(SLICE + "AUTHORITY_AUDIT_20261008/02_48_CLAUSE_CLASSIFICATION.csv")
check("48 unique clauses match ledger", len(ledger) == len(classification) == 48 and set(ledger) == {c["clause_id"] for c in classification})
clauses = []
for original in classification:
    clause = original["clause_id"]
    number, cells = ledger[clause]
    status = "DONE" if clause == "CFG-HANDLER" else "REQUIRES_DDL_AUTH" if clause in {"CFG-UQ1", "CFG-UQ2", "CFG-DEFAULT"} else "REQUIRES_EXTERNAL_RUNTIME" if clause in {"C-08", "CFG-QA", "VOC-QA"} else "REQUIRES_COMPETENT_REVIEW" if clause.startswith("CFG-D") or clause.startswith("RBAC-D") or clause in {"C-04G-3", "C-04W"} else "REQUIRES_CONTRACT_PUBLICATION"
    clauses.append({"clause_id": clause, "status": status, "ledger_state_preserved": cells[-1], "literal_ledger_requirement": cells[1],
                    "source": f"{ledger_path}:{number}", "owner": cells[3], "acceptance": cells[6],
                    "approval": "DR-STEP6A3-EC-DETAIL-R1-20261009" if clause == "CFG-HANDLER" else "SPECIFIC_COMPETENT_DECISION_NOT_RECORDED",
                    "evidence": "Current EC HTTP regression required; local publication only" if clause == "CFG-HANDLER" else cells[2]})

published_migrations = []
for migration in manifest["migrations"]:
    path = "database/migrations/" + migration["filename"]
    check("immutable active migration checksum " + migration["id"], file_hash(path) == migration["sha256"])
    published_migrations.append({"id": migration["id"], "sha256": migration["sha256"]})

current = json.loads(read(SLICE + "SOLO_OWNER_GOVERNANCE_PROPOSAL_20261009_V2/07_RESULT.json")).get("residual_closure_20261009", {})
packets = current.get("decision_packets", [])
check("five independent current packets remain pending", len(packets) == 5 and len({p["decision_id"] for p in packets}) == 5
      and all(p["status"] == "PENDING_REVIEW" for p in packets))
for packet in packets:
    check("exact adoptable UTF-8 hash " + packet["decision_id"], digest(packet["text_utf8"].encode()) == packet["sha256"])
    for source in packet["sources"]:
        data = (ROOT / source["path"]).read_bytes()
        if source.get("hash_scope") == "SEALED_PREFIX_BYTES":
            data = data[:source["byte_length"]]
        check("sealed packet source " + source["path"], digest(data) == source["sha256"])
    for clause, literal in packet.get("literal_methodology_clauses", {}).items():
        check("literal methodology decision hash " + clause, digest(literal["text_utf8"].encode()) == literal["sha256"])

report = {"scope": "OFFLINE_APPROVED_LOCAL_PUBLICATION_RECONCILIATION_NO_SQL_EXECUTION" if receipt else "OFFLINE_CANDIDATE_RECONCILIATION_NO_PUBLICATION_NO_SQL_EXECUTION", "checks": checks,
          "passed": sum(c["result"] == "PASS" for c in checks), "failed": sum(c["result"] == "FAIL" for c in checks),
          "ec_adopted_sha256": ec_hash, "candidate_grants": grants,
          "rbac_discrepancies": {"D01_literal_action_create_seed_roles": action_roles, "D02_requirement_literal_seed_grants": 0,
                                 "later_select_distributions": later_grant_statements,
                                 "limitation": "Source reconciliation including SELECT publications; no claim about QA/custom/runtime grants"},
          "vocabulary_source_sha256": source_hash, "vocabulary_manifest_sha256": file_hash(manifest_path),
          "consumer_map": sorted(occurrences.values(), key=lambda x: x["field_id"]), "clauses": clauses,
          "active_migrations": published_migrations, "source_inventory": source_inventory}
print(json.dumps(report, ensure_ascii=False, indent=2))
raise SystemExit(1 if report["failed"] else 0)
