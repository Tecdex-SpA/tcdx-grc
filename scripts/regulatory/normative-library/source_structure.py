#!/usr/bin/env python3
"""Source-bound structural preparation for the existing regulatory importer.

No source is reconstructed and no review/publication decision is produced.
Every candidate retains its exact PDF-text location and unresolved semantics.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
import unicodedata


def sha(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def plain(text: str) -> str:
    return " ".join(unicodedata.normalize("NFKC", text).replace("\ufffe", "").split())


def document_lines(extraction: dict, first: int, last: int) -> list[dict]:
    lines = []
    for page in extraction["pages"]:
        if not first <= page["page_pdf"] <= last:
            continue
        offset = 0
        for raw in page["text"].splitlines(keepends=True):
            text = raw.strip()
            # Exclude only explicit document furniture, preserving source offsets.
            furniture = (not text or text.startswith(("©", "Biblioteca del Congreso", "ISO 9001:2015 (", "NCh-ISO/IEC 27001:", "ISO/IEC 42001:2023(", "Traducción oficial/",
                         "Copia para uso exclusivo -", "Impreso por:", "USO EXCLUSIVO -"))
                         or text in {"Ley 21663", "Ley 21719"} or re.fullmatch(r"[ivxlcdm]+|\d+", text, re.I))
            lines.append({"page": page["page_pdf"], "offset": offset, "text": text,
                          "furniture": bool(furniture), "raw_length": len(raw)})
            offset += len(raw)
    return lines


def citation(extraction: dict, line: dict) -> str:
    return ("sha256:" + extraction["source_sha256"] + ":" + extraction["source_member"]
            + "#page=" + str(line["page"]) + "&char=" + str(line["offset"]))


def iso_headers(lines: list[dict]) -> tuple[list[dict], list[dict]]:
    headers, findings = [], []
    annex = None
    seen = set()
    previous: dict[str, tuple[int, ...]] = {}
    for index, line in enumerate(lines):
        if line["furniture"]:
            continue
        text = line["text"]
        root = re.fullmatch(r"(?:Annex|Anexo)\s+([A-D])", text, re.I)
        if root:
            annex = root[1].upper()
            next_lines = [v["text"] for v in lines[index + 1:index + 6] if not v["furniture"]]
            title = next((v for v in next_lines if not v.startswith("(")), text)
            headers.append({"index": index, "code": annex, "title": title, "type": "annex", "parent": None})
            seen.add(annex)
            continue
        match = re.match(r"^([A-D]\.\d+(?:\.\d+)*|\d+(?:\.\d+)*)(?:\s*([A-Za-zÁÉÍÓÚÑáéíóúñ].*))?$", text)
        if not match:
            continue
        code, title = match[1], match[2]
        if title is None:
            # Standalone definition numbers have source text on the next line.
            title = next((v["text"] for v in lines[index + 1:index + 4] if not v["furniture"]), "")
        if not title or not re.match(r"[A-Za-zÁÉÍÓÚÑáéíóúñ]", title) or "........" in title:
            continue
        if annex and code[0].isdigit():
            # Annex A of the Chilean adoption prints controls as 5.1 rather
            # than A.5.1. Annex identity is sourced from its enclosing heading.
            if annex != "A":
                continue
            code = annex + "." + code
        if not annex and code[0].isalpha():
            continue
        namespace = code[0] if code[0].isalpha() else "main"
        numeric = tuple(map(int, code.split(".")[1:] if namespace != "main" else code.split(".")))
        if namespace == "main" and (not numeric or numeric[0] > 10 or numeric[0] < 1):
            continue
        if code in seen or numeric <= previous.get(namespace, ()):
            findings.append({"kind": "CROSS_REFERENCE_OR_REPEATED_HEADER_EXCLUDED", "page": line["page"], "code": code})
            continue
        parent = code.rsplit(".", 1)[0] if "." in code else None
        if parent is not None and parent not in seen:
            findings.append({"kind": "UNRESOLVED_SOURCE_PARENT", "page": line["page"], "code": code, "parent": parent})
            continue
        previous[namespace] = numeric
        seen.add(code)
        headers.append({"index": index, "code": code, "title": title, "type": "subclause" if "." in code else "clause", "parent": parent})
    return headers, findings


ORDINALS = "primero segundo tercero cuarto quinto sexto séptimo octavo noveno décimo".split()


def law_headers(lines: list[dict], amending_law: bool) -> tuple[list[dict], list[dict]]:
    headers, findings = [], []
    chapter = None
    main_article = None
    transition = False
    seen = set()
    last_main_number = 0
    for index, line in enumerate(lines):
        if line["furniture"]:
            continue
        text = line["text"]
        if text == "DISPOSICIONES TRANSITORIAS" or text.casefold() == "artículos transitorios":
            transition, chapter, main_article = True, "transitory", None
            headers.append({"index": index, "code": chapter, "title": text, "type": "section", "parent": None})
            seen.add(chapter)
            continue
        title = re.fullmatch(r'["“]?T[ÍI]TULO\s+([IVXLCDM]+)', text)
        if title:
            # A title inserted by Law21719 belongs to its amending article,
            # never to an invented consolidated Law19628 edition.
            chapter = (main_article + "/" if amending_law and main_article else "") + "title-" + title[1]
            if chapter not in seen:
                headers.append({"index": index, "code": chapter, "title": text.lstrip('"“'), "type": "chapter", "parent": main_article if amending_law else None})
                seen.add(chapter)
            continue
        match = re.match(r'^["“]?(?:Artículo|ARTÍCULO)\s+([0-9]+[°ºo]?(?:\s+(?:bis|ter|qu[áa]ter|quinquies|sexies|septies|octies))?|[A-Za-záéíóúñ]+)[.\-\s]+(.*)', text)
        if not match:
            continue
        number, title_text = re.sub(r"(?<=\d)[°ºo]", "", plain(match[1])), match[2]
        if number.isdigit() and int(number) > 100:
            continue
        ordinal = number.casefold() in ORDINALS
        if ordinal and (transition or amending_law):
            code = ("transitory/" if transition else "amending/") + number.casefold()
            parent = "transitory" if transition else None
            if not transition:
                main_article = code
        elif not amending_law and number.isdigit() and int(number) == last_main_number + 1:
            code, parent = "article-" + number, chapter
            main_article, last_main_number = code, int(number)
        elif main_article:
            code, parent = main_article + "/quoted-article-" + number.replace(" ", "-"), main_article
        else:
            findings.append({"kind": "UNRESOLVED_ARTICLE_CONTEXT", "page": line["page"], "reference": number})
            continue
        if code in seen:
            findings.append({"kind": "REPEATED_QUOTED_REFERENCE_NOT_NEW_ARTICLE", "page": line["page"], "reference": code})
            continue
        seen.add(code)
        headers.append({"index": index, "code": code, "title": "Artículo " + number + (". " + title_text if title_text else ""),
                        "type": "transitory_provision" if transition else "article", "parent": parent})
    return headers, findings


MODAL = re.compile(r"\b(?:shall(?:\s+not)?|debe(?:n|rá|rán|ría|rían)?|proh[íi]bese|no\s+podrá(?:n)?)\b", re.I)


def verified_extraction(directory: Path, profile: dict) -> dict:
    inventory = json.loads((directory / 'inventory.json').read_text())
    entry = next(row for row in inventory['documents'] if row['document_key'] == profile['document_key'])
    filename = profile['document_key'] + '.pages.json'
    raw = (directory / filename).read_bytes()
    if entry['extraction_filename'] != filename or hashlib.sha256(raw).hexdigest() != entry['extraction_sha256']:
        raise ValueError('Derived extraction checksum mismatch')
    extraction = json.loads(raw)
    if extraction['source_sha256'] != profile['source_sha256'] or entry['source_sha256'] != profile['source_sha256']:
        raise ValueError('Selected source checksum mismatch')
    for page in extraction['pages']:
        if sha(page['text']) != page['sha256']:
            raise ValueError('Page text checksum mismatch')
    return extraction


def structure(extraction: dict, profile: dict) -> dict:
    lines = document_lines(extraction, profile["body_first_page"], profile["body_last_page"])
    headers, findings = (iso_headers(lines) if profile["kind"] == "standard"
                         else law_headers(lines, profile.get("amending_law", False)))
    units, requirements = [], []
    by_code = {}
    for position, header in enumerate(headers):
        start = header["index"]
        stop = headers[position + 1]["index"] if position + 1 < len(headers) else len(lines)
        content = "\n".join(v["text"] for v in lines[start:stop] if not v["furniture"])
        source = citation(extraction, lines[start])
        parent = by_code.get(header["parent"])
        if header["parent"] and not parent:
            raise ValueError("Unresolved canonical parent: " + header["code"])
        unit = {"code": header["code"], "source_locator": source,
                "parent_source_locator": parent, "unit_type": header["type"],
                "title": plain(header["title"]), "display_order": position + 1,
                "page_from": lines[start]["page"], "page_to": lines[stop - 1]["page"],
                "content_hash": sha(content), "source_text": content,
                "technical_status": "SOURCE_LOCATED_HUMAN_REVIEW_PENDING"}
        units.append(unit)
        by_code[header["code"]] = source
        # Annex controls/guidance and definitions are not manufactured Requirements.
        normative = (profile["kind"] == "law" or bool(re.match(r"^(?:[4-9]|10)(?:\.|$)", header["code"])))
        if not normative:
            continue
        # Sentence locations are explicit proposals. Lists/subjects/conditions
        # remain attached and are never silently declared atomically homologated.
        sentence_pattern = re.compile(r".+?(?:[.!?](?=\s+[A-ZÁÉÍÓÚÑ“\"])|\Z)", re.S)
        ordinal = 0
        for sentence in sentence_pattern.finditer(content):
            text = plain(sentence.group())
            if not MODAL.search(text) or text.startswith(("NOTA", "NOTE")):
                continue
            ordinal += 1
            locator = source + "&statement=" + str(ordinal)
            requirements.append({"normative_unit_source_locator": source, "unit_code": header["code"],
                                 "source_locator": locator, "statement_ordinal": ordinal,
                                 "content_hash": sha(text), "source_text": text,
                                 "semantic_status": "EXPLICIT_MODAL_SOURCE_CANDIDATE_NOT_HOMOLOGATED",
                                 "atomization": "SUBJECT_CONDITION_AND_ENUMERATION_REVIEW_PENDING",
                                 "human_reviewed": False})
    return {"pack_code": profile["pack_code"], "source_member": extraction["source_member"],
            "source_sha256": extraction["source_sha256"], "edition": profile["edition"],
            "units": units, "requirement_candidates": requirements, "findings": findings,
            "source_body_pages": [profile["body_first_page"], profile["body_last_page"]],
            "human_approvals": 0, "homologated_requirements": 0,
            "completeness": "SOURCE_BOUND_STRUCTURE_WITH_SEMANTIC_REVIEW_PENDING"}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--extractions", type=Path, required=True)
    parser.add_argument("--selection", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    output = args.output.resolve()
    if ".release-custody" not in output.parts:
        raise ValueError("Source bodies must remain in private custody")
    output.mkdir(parents=True, exist_ok=True)
    selection = json.loads(args.selection.read_text())
    reports = []
    for profile in selection["documents"]:
        extraction = verified_extraction(args.extractions, profile)
        report = structure(extraction, profile)
        body = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
        (output / (profile["pack_code"] + ".structure.json")).write_text(body)
        reports.append({"pack_code": profile["pack_code"], "units": len(report["units"]),
                        "requirement_candidates": len(report["requirement_candidates"]),
                        "findings": len(report["findings"]), "sha256": sha(body),
                        "completeness": report["completeness"]})
    (output / "summary.json").write_text(json.dumps(reports, indent=2) + "\n")
    print(json.dumps(reports))


if __name__ == "__main__":
    main()
