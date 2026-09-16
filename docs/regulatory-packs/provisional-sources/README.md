# Provisional public-source regulatory references

This directory stores **non-authoritative, non-runtime-importable public reference manifests** for Phase 4 Regulatory Packs.

The Phase 4 runtime pipeline does **not** ingest arbitrary files from this directory. Runtime import requires a `RegulatoryPackImportInput` with an authorized source and, for ISO packs, `source.origin=licensed_file`. These provisional manifests therefore exist only to preserve verified public metadata, official URLs, lifecycle status and replacement requirements until Tecdex provides the licensed definitive source artifact.

Rules:

- Do not treat these files as licensed normative content.
- Do not populate `licensedContent` or `licensedStatement` from these manifests.
- Do not synthesize missing ISO text from public previews, blogs, checklists or secondary material.
- Do not set `authorized_source_available=true` solely because a provisional ISO manifest exists.
- When the licensed PDF/ePub is acquired, create the governed `RegulatoryPackImportInput` from that artifact, preserving its checksum and provenance, and run the existing generic Phase 4 pipeline.
- These files may be replaced or supplemented by licensed-source manifests without changing the 229-table schema.

Current provisional ISO references:

- `ISO_9001_2015` — public ISO metadata for ISO 9001:2015 and Amd 1:2024; both are now withdrawn/superseded by ISO 9001:2026.
- `ISO_9001_2026` — definitive edition 6 publication confirmed by ISO on 2026-09-16; licensed full text still required.
- `ISO_IEC_27001_2022` — public ISO metadata for ISO/IEC 27001:2022 plus Amd 1:2024; licensed full text still required for runtime import even though a working/source copy may exist outside this governed branch.
- `ISO_IEC_42001_2023` — edition 1 public ISO metadata; licensed full text still required.

Machine-readable ISO metadata is in `provisional-public-reference-packs.json`.

`CL_LEY_21719` is **not provisional**. Its official BCN/LeyChile source registration is maintained separately under:

`docs/regulatory-packs/official-sources/CL_LEY_21719/source-manifest.json`

That source is classified as `official_source` and is eligible for structured Phase 4 import without an ISO-style licensed-file requirement.
