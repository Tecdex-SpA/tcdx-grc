#!/usr/bin/env python3
"""Read-only source inspection. Outputs are extraction evidence, never GRC state.

PDF text stays in the explicitly selected private output directory. Relational
materialization is performed separately by the existing RegulatoryPackPipeline.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import zipfile


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def inspect_zip(path: Path) -> tuple[dict, dict[str, bytes]]:
    raw = path.read_bytes()
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        entries = archive.infolist()
        names = [entry.filename for entry in entries]
        if len(names) != len(set(names)):
            raise ValueError("Duplicate ZIP member names")
        for name in names:
            member = PurePosixPath(name)
            if member.is_absolute() or ".." in member.parts or "\\" in name:
                raise ValueError("Unsafe ZIP member")
        if archive.testzip() is not None:
            raise ValueError("ZIP CRC failure")
        data = {entry.filename: archive.read(entry) for entry in entries if not entry.is_dir()}
    return {
        "filename": path.name, "sha256": digest(raw), "bytes": len(raw),
        "crc": "PASS", "members": [
            {"path": name, "bytes": len(body), "sha256": digest(body),
             "classification": classify(name)} for name, body in sorted(data.items())
        ],
    }, data


def classify(name: str) -> str:
    if name.startswith("ORIGINALES/") and name.lower().endswith(".pdf"):
        return "ORIGINAL_RECEIVED_AUTHENTICITY_SEPARATE"
    if name.startswith("EXTRACCION_ESTRUCTURADA/"):
        return "DERIVED_EXTRACTION_NOT_HOMOLOGATED"
    if "MAPEO" in name or "matriz_cambios" in name:
        return "PROPOSED_CORRESPONDENCE"
    if "CATALOGO" in name or "catalogos/" in name:
        return "CANDIDATE_CATALOG"
    if name.endswith((".md", ".docx")):
        return "EDITORIAL_SOURCE_NOT_NORMATIVE_AUTHORITY"
    return "SUPPORTING_EVIDENCE_TO_VALIDATE"


def verify_internal_manifests(data: dict[str, bytes]) -> list[dict]:
    results = []
    for name, body in data.items():
        if not name.endswith("SHA256SUMS.txt") and not name.endswith("SHA256SUMS_UNIFICADO.txt"):
            continue
        base = PurePosixPath(name).parent
        for line in body.decode("utf-8-sig").splitlines():
            if not line.strip():
                continue
            expected, relative = line.split(maxsplit=1)
            relative = relative.lstrip("*").strip()
            choices = [relative, str(base / relative)]
            target = next((candidate for candidate in choices if candidate in data), None)
            relocated = [candidate for candidate, content in data.items() if digest(content) == expected] if target is None else []
            results.append({"manifest": name, "member": relative, "expected_sha256": expected,
                            "resolved_member": target,
                            "same_bytes_elsewhere": relocated,
                            "status": ("PASS" if target and digest(data[target]) == expected else
                                       "MISMATCH" if target else
                                       "STALE_PATH_SAME_BYTES_ELSEWHERE" if relocated else "MISSING_MEMBER")})
    return results


def extract_pages(raw: bytes) -> list[dict]:
    # PDFium also reads the received 42001 PDF whose EOF Pypdf rejects. No
    # document repair or alteration of original bytes is performed.
    import pypdfium2 as pdfium
    document = pdfium.PdfDocument(raw)
    pages = []
    try:
        for index in range(len(document)):
            page = document[index]
            text_page = page.get_textpage()
            try:
                text = text_page.get_text_range().replace("\r\n", "\n").replace("\r", "\n")
                pages.append({"page_pdf": index + 1, "text": text,
                              "sha256": digest(text.encode("utf-8")),
                              "characters": len(text)})
            finally:
                text_page.close()
                page.close()
    finally:
        document.close()
    return pages


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-zip", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--expected-sha256", required=True)
    args = parser.parse_args()
    if digest(args.source_zip.read_bytes()) != args.expected_sha256:
        raise ValueError("Original package checksum mismatch")
    output = args.output.resolve()
    if ".release-custody" not in output.parts:
        raise ValueError("Full extraction must remain in private release custody")
    output.mkdir(parents=True, exist_ok=True)
    inventory, members = inspect_zip(args.source_zip)
    inventory["internal_manifests"] = verify_internal_manifests(members)
    expected = {row["document_key"]: row for row in csv.DictReader(io.StringIO(
        members["EXTRACCION_ESTRUCTURADA/document_manifest.csv"].decode("utf-8-sig")))}
    documents = []
    for name, raw in members.items():
        if not name.startswith("ORIGINALES/") or not name.lower().endswith(".pdf"):
            continue
        code = PurePosixPath(name).parts[1]
        pages = extract_pages(raw)
        declared = expected[code]
        if digest(raw) != declared["pdf_sha256"] or len(pages) != int(declared["pdf_pages"]):
            raise ValueError("Original/extraction manifest identity mismatch: " + code)
        extraction = {"document_key": code, "source_member": name, "source_sha256": digest(raw),
                      "source_zip_sha256": inventory["sha256"], "extractor": "PDFIUM_TEXT_UNALTERED_PDF",
                      "pages": pages, "human_reviewed": False}
        filename = code + ".pages.json"
        content = (json.dumps(extraction, ensure_ascii=False, indent=2) + "\n").encode()
        (output / filename).write_bytes(content)
        documents.append({"document_key": code, "source_member": name, "source_sha256": digest(raw),
                          "pages": len(pages), "empty_pages": [p["page_pdf"] for p in pages if not p["text"].strip()],
                          "characters": sum(p["characters"] for p in pages),
                          "extraction_filename": filename, "extraction_sha256": digest(content),
                          "declared_old_extraction_characters": int(declared["extracted_chars"]),
                          "status": "EXTRACTED_NOT_SEMANTICALLY_APPROVED"})
    inventory["documents"] = documents
    inventory["human_approvals"] = 0
    inventory["h04_general_gate"] = "NOT_REQUIRED_INTERNAL_STRUCTURING"
    (output / "inventory.json").write_text(json.dumps(inventory, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"documents": len(documents), "pages": sum(d["pages"] for d in documents),
                      "internal_manifest_failures": sum(r["status"] != "PASS" for r in inventory["internal_manifests"]),
                      "original_zip_sha256": inventory["sha256"], "business_state_written": False}))


if __name__ == "__main__":
    main()
