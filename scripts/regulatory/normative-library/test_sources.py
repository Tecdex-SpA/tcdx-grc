import hashlib
import io
import json
from pathlib import Path
import tempfile
import unittest
import zipfile
from unittest.mock import patch

from source_inventory import inspect_zip, verify_internal_manifests
from source_structure import document_lines, iso_headers, law_headers, structure, sha, verified_extraction
from review_sources import review


class SourceContracts(unittest.TestCase):
    def lines(self, text):
        return document_lines({'pages': [{'page_pdf': 1, 'text': text}]}, 1, 1)

    def test_zip_path_traversal_is_rejected(self):
        for member in ['../secret', '/absolute', 'safe/../secret', 'safe\\secret']:
            with self.subTest(member=member), tempfile.TemporaryDirectory() as directory:
                path = Path(directory) / 'test.zip'
                with zipfile.ZipFile(path, 'w') as archive:
                    archive.writestr(member, 'fixture')
                with self.assertRaisesRegex(ValueError, 'Unsafe ZIP member'):
                    inspect_zip(path)

    def test_duplicate_member_is_not_silently_replaced(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'test.zip'
            with zipfile.ZipFile(path, 'w') as archive:
                archive.writestr('same', 'first')
                archive.writestr('same', 'changed')
            with self.assertRaisesRegex(ValueError, 'Duplicate'):
                inspect_zip(path)

    def test_manifest_distinguishes_relocation_absence_and_corruption(self):
        h = hashlib.sha256(b'original').hexdigest()
        data = {'SHA256SUMS.txt': f'{h} old.pdf\n{h} missing.pdf\n{h} corrupt.pdf\n'.encode(),
                'ORIGINALES/new.pdf': b'original', 'corrupt.pdf': b'changed'}
        results = verify_internal_manifests(data)
        self.assertEqual([r['status'] for r in results], ['STALE_PATH_SAME_BYTES_ELSEWHERE', 'STALE_PATH_SAME_BYTES_ELSEWHERE', 'MISMATCH'])
        del data['ORIGINALES/new.pdf']
        self.assertEqual(verify_internal_manifests(data)[0]['status'], 'MISSING_MEMBER')

    def test_source_offsets_survive_excluded_furniture(self):
        text = '© publisher\n4 Context\n4.1 Organization\nThe organization shall determine context.\n'
        lines = self.lines(text)
        self.assertTrue(lines[0]['furniture'])
        self.assertEqual(text[lines[2]['offset']:].splitlines()[0], '4.1 Organization')
        source = {'pages': [{'page_pdf': 1, 'text': text}], 'source_sha256': 'a'*64, 'source_member': 'source.pdf'}
        result = structure(source, {'pack_code': 'fixture', 'edition': 'test', 'kind': 'standard', 'body_first_page': 1, 'body_last_page': 1})
        self.assertEqual(result['units'][1]['parent_source_locator'], result['units'][0]['source_locator'])
        self.assertIn('&char='+str(text.index('4.1')), result['units'][1]['source_locator'])
        self.assertEqual(result['units'][1]['content_hash'], sha(result['units'][1]['source_text']))
        self.assertEqual(result['human_approvals'], 0)
        self.assertFalse(result['requirement_candidates'][0]['human_reviewed'])

    def test_cross_reference_is_not_new_heading_or_parent(self):
        headers, findings = iso_headers(self.lines('4 Context\n4.1 Organization\n6 Planning\n6.1 Actions\n4.1 and other issues\n6.2 Objectives\n'))
        self.assertEqual([h['code'] for h in headers], ['4', '4.1', '6', '6.1', '6.2'])
        self.assertEqual(findings[0]['kind'], 'CROSS_REFERENCE_OR_REPEATED_HEADER_EXCLUDED')

    def test_annex_control_is_not_requirement(self):
        source = {'pages': [{'page_pdf': 1, 'text': '4 Context\n4.1 Organization\nThe organization shall determine context.\nAnnex A\n(normative)\nControls\nA.1 General\nA.1.1 Control\nThe organization shall protect information.\n'}], 'source_sha256': 'a'*64, 'source_member': 'source.pdf'}
        result = structure(source, {'pack_code': 'fixture', 'edition': 'test', 'kind': 'standard', 'body_first_page': 1, 'body_last_page': 1})
        self.assertEqual([r['unit_code'] for r in result['requirement_candidates']], ['4.1'])
        self.assertEqual(result['units'][-1]['code'], 'A.1.1')
        self.assertEqual(result['units'][-1]['parent_source_locator'], result['units'][-2]['source_locator'])

    def test_chilean_adoption_retains_annex_namespace(self):
        headers, _ = iso_headers(self.lines('Annex A\n(normative)\nControls\n5 Organization\n5.1 Policy\n'))
        self.assertEqual([h['code'] for h in headers], ['A', 'A.5', 'A.5.1'])

    def test_bis_and_transitory_do_not_become_iso_clauses(self):
        headers, _ = law_headers(self.lines('Artículo primero.- Modifica\n"Artículo 1° bis.- Scope\nArtículo 8 bis.- Duty\nDISPOSICIONES TRANSITORIAS\nArtículo primero.- Commencement\n'), True)
        self.assertEqual([h['code'] for h in headers], ['amending/primero', 'amending/primero/quoted-article-1-bis', 'amending/primero/quoted-article-8-bis', 'transitory', 'transitory/primero'])
        self.assertEqual(headers[1]['parent'], 'amending/primero')
        self.assertEqual(headers[-1]['type'], 'transitory_provision')

    def test_copy_watermark_is_not_legal_or_normative_body(self):
        lines = self.lines('Copia para uso exclusivo - fixture\nImpreso por: fixture\nUSO EXCLUSIVO - fixture\n4.1 Context\n')
        self.assertEqual([line['furniture'] for line in lines], [True, True, True, False])

    def test_source_structure_is_deterministic(self):
        source = {'pages': [{'page_pdf': 1, 'text': '4 Context\n4.1 Organization\nThe organization shall determine context.\n'}], 'source_sha256': 'a'*64, 'source_member': 'source.pdf'}
        profile = {'pack_code': 'fixture', 'edition': 'test', 'kind': 'standard', 'body_first_page': 1, 'body_last_page': 1}
        self.assertEqual(structure(source, profile), structure(json.loads(json.dumps(source)), profile))

    def test_public_review_contains_only_evidence_references_not_bodies(self):
        source = {'pages': [{'page_pdf': 1, 'text': '4 Context\n4.1 Organization\nThe organization shall determine when context changes.\n'}], 'source_sha256': 'a'*64, 'source_member': 'source.pdf'}
        report = structure(source, {'pack_code': 'fixture', 'edition': 'test', 'kind': 'standard', 'body_first_page': 1, 'body_last_page': 1})
        result = review(report)
        self.assertNotIn('The organization shall determine', json.dumps(result))
        self.assertEqual(result['requirement_candidates'][0]['content_hash'], report['requirement_candidates'][0]['content_hash'])
        self.assertTrue(result['units'][-1]['contains_condition_wording'])
        self.assertFalse(result['units'][-1]['human_reviewed'])

    def test_original_zip_hash_rejects_before_extraction(self):
        from source_inventory import main
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'source.zip'
            path.write_bytes(b'changed source')
            with patch('sys.argv', ['source_inventory', '--source-zip', str(path), '--expected-sha256', '0'*64, '--output', directory]):
                with self.assertRaisesRegex(ValueError, 'Original package checksum mismatch'):
                    main()

    def test_altered_extraction_is_rejected_even_with_unchanged_original_hash(self):
        with tempfile.TemporaryDirectory() as directory:
            p = Path(directory)
            profile = {'document_key': 'fixture', 'source_sha256': 'a'*64}
            raw = json.dumps({'source_sha256': 'a'*64, 'pages': [{'text': 'source', 'sha256': sha('source')}]}).encode()
            (p/'fixture.pages.json').write_bytes(raw)
            (p/'inventory.json').write_text(json.dumps({'documents': [{'document_key': 'fixture', 'source_sha256': 'a'*64,
                'extraction_filename': 'fixture.pages.json', 'extraction_sha256': hashlib.sha256(raw).hexdigest()}]}))
            self.assertEqual(verified_extraction(p, profile)['pages'][0]['text'], 'source')
            (p/'fixture.pages.json').write_bytes(raw.replace(b'source"', b'altered"'))
            with self.assertRaisesRegex(ValueError, 'Derived extraction checksum mismatch'):
                verified_extraction(p, profile)


if __name__ == '__main__':
    unittest.main()
