#!/usr/bin/env python3
"""Produce bounded analysis receipts; never approves or writes domain state.

Literal matches assist review and do not resolve subjects, exceptions, legal
interpretation, exhaustive atomization or semantic equivalence. Published output
contains locators/hashes, never received normative bodies or license identities.
"""
import argparse
import collections
import csv
import io
import json
from pathlib import Path
import re

from source_inventory import inspect_zip, digest
from source_structure import MODAL


def review(report, selected_requirements=()):
    units = {unit['source_locator']: unit for unit in report['units']}
    by_code = {unit['code']: unit for unit in report['units']}
    records = []
    for unit in report['units']:
        body = unit['source_text']
        # Candidates only: ISO numeric references and explicit Spanish legal
        # article citations. Unresolved references remain visible, never linked
        # automatically to a different edition, law or external standard.
        references = sorted(set(re.findall(r'\b(?:[A-D]\.)?\d+\.\d+(?:\.\d+)*\b', body)))
        references = [code for code in references if code != unit['code']]
        records.append({key: unit[key] for key in ['code', 'source_locator', 'parent_source_locator', 'unit_type', 'display_order', 'page_from', 'page_to', 'content_hash']} | {
            'hierarchy_integrity': unit['parent_source_locator'] is None or unit['parent_source_locator'] in units,
            'source_reference_candidates': [{'code': code, 'same_source_candidate_locator': by_code.get(code, {}).get('source_locator'),
                'state': 'UNRESOLVED_REFERENCE_SCOPE_NOT_INFERRED'} for code in references],
            'enumeration_markers_observed': re.findall(r'^\s*([a-z]\)|[ivx]+\.|\d+\))\s+', body, re.M),
            'contains_explicit_modal': bool(MODAL.search(body)),
            'contains_condition_wording': bool(re.search(r'\b(?:cuando|siempre que|salvo|según corresponda|when|where|unless|if)\b', body, re.I)),
            'contains_temporal_wording': bool(re.search(r'\b(?:días|horas|años|meses|plazo|vigencia|days|hours|years|intervals|periodic)\b', body, re.I)),
            'semantic_state': 'LITERAL_SOURCE_CHECKED; SUBJECT_APPLICABILITY_TEMPORAL_INTERPRETATION_PENDING',
            'human_reviewed': False})
    statements = []
    hashes = collections.defaultdict(list)
    for candidate in report['requirement_candidates']:
        hashes[candidate['content_hash']].append(candidate['source_locator'])
        selection = next((r for r in selected_requirements if r['source_locator'] == candidate['source_locator']), None)
        if selection and (selection['statement_sha256'] != candidate['content_hash'] or selection['source_sha256'] != report['source_sha256']):
            raise ValueError('Atomic review source evidence mismatch')
        statements.append({key: candidate[key] for key in ['normative_unit_source_locator', 'unit_code', 'source_locator', 'statement_ordinal', 'content_hash', 'semantic_status', 'atomization']} | {
            'exact_modal_occurrences': len(MODAL.findall(candidate['source_text'])), 'human_reviewed': False,
            'canonical_draft_selection': {'state': 'BOUNDED_ACTION_AND_SCOPE_REVIEW_BY_AI; HUMAN_PENDING',
                'action': selection['single_evaluable_action'], 'subject_scope': selection['subject_and_scope'],
                'conditions_temporality': selection['conditions_and_temporality']} if selection else None})
    return {'pack_code': report['pack_code'], 'source_sha256': report['source_sha256'],
            'units': records, 'requirement_candidates': statements,
            'duplicate_candidate_groups': [locators for locators in hashes.values() if len(locators) > 1],
            'unresolved_source_headings': report['findings'], 'human_approvals': 0,
            'semantic_homologation': 'NOT_COMPLETE; LITERAL_SCAN_IS_NOT_EXHAUSTIVE_SEMANTIC_VALIDATION'}


def candidate_review(members, structures):
    name = 'CATALOGOS_Y_METODOLOGIA/07_TRANSVERSAL/CATALOGO_MAESTRO_CONTROLES_Y_OBLIGACIONES.csv'
    frameworks = {'ISO9001': 'ISO_9001_2015', 'ISO27001': 'ISO_IEC_27001_2022', 'ISO42001': 'ISO_IEC_42001_2023', 'LEY21663': 'CL_LEY_21663', 'LEY21719': 'CL_LEY_21719'}
    result = []
    for row in csv.DictReader(io.StringIO(members[name].decode('utf-8-sig'))):
        pack = frameworks[row['marco']]
        report = structures[pack]
        reference = row['referencia']
        # Strict equality only. Area, range and thematic references are never
        # guessed into clause-level or legal-equivalence assertions.
        exact = next((u for u in report['units'] if u['code'] == reference), None)
        result.append({'candidate_id': row['id'], 'pack_code': pack, 'edition': row['edicion'],
            'original_reference': reference, 'source_member': name, 'source_member_sha256': digest(members[name]),
            'exact_source_locator': exact['source_locator'] if exact else None,
            'source_sha256': report['source_sha256'],
            'state': 'EXACT_REFERENCE_FOUND_CONTENT_PROPOSAL_NOT_VALIDATED' if exact else 'REFERENCE_REQUIRES_SCOPE_RECONCILIATION',
            'normative_obligation_asserted': False, 'operational_attributes_authority': 'TCDX_EDITORIAL_PROPOSAL', 'human_reviewed': False})
    name2026 = 'CATALOGOS_Y_METODOLOGIA/01_ISO_9001_2026/catalogos/catalogo_controles_operativos.csv'
    rows2026 = list(csv.DictReader(io.StringIO(members[name2026].decode('utf-8-sig'))))
    return {'received_211': result, 'iso9001_2026': {'count': len(rows2026), 'source_member': name2026,
        'source_member_sha256': digest(members[name2026]), 'original_candidate_ids': [r['control_id'] for r in rows2026],
        'state': 'PREPARATORY_EDITORIAL_CANDIDATES; DEFINITIVE_NORMATIVE_SOURCE_ABSENT', 'human_reviewed': False}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--structure', type=Path, required=True)
    parser.add_argument('--zip', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--atomic-review', type=Path)
    args = parser.parse_args()
    inventory, members = inspect_zip(args.zip)
    structures = {p.stem.removesuffix('.structure'): json.loads(p.read_text()) for p in args.structure.glob('*.structure.json')}
    if len(structures) != 5:
        raise ValueError('Exactly the five received source structures required')
    args.output.mkdir(parents=True, exist_ok=True)
    selections = json.loads(args.atomic_review.read_text())['selected_requirements'] if args.atomic_review else []
    reports = []
    for pack, structure in sorted(structures.items()):
        result = review(structure, selections)
        (args.output / (pack + '.json')).write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
        reports.append({'pack_code': pack, 'units': len(result['units']), 'requirement_candidates': len(result['requirement_candidates']),
            'exact_duplicate_groups': len(result['duplicate_candidate_groups']), 'source_findings': result['unresolved_source_headings'],
            'hierarchy_integrity': all(u['hierarchy_integrity'] for u in result['units']),
            'units_with_conditional_wording': sum(u['contains_condition_wording'] for u in result['units']),
            'units_with_temporal_wording': sum(u['contains_temporal_wording'] for u in result['units']),
            'homologated_requirements': 0, 'human_approvals': 0})
    (args.output / 'summary.json').write_text(json.dumps(reports, indent=2)+'\n')
    (args.output / 'incoming-candidates.json').write_text(json.dumps(candidate_review(members, structures), ensure_ascii=False, indent=2)+'\n')
    print(json.dumps(reports))


if __name__ == '__main__':
    main()
