# Received-source preparation for execution 2/3

These tools prepare private inputs to the existing `RegulatoryPackPipeline`.
They do not define a domain model, grant rights, approve, publish or access an
external environment. Source reports are evidence artifacts; canonical draft
state is verified in disposable PostgreSQL. Never use a report JSON as a database.

Use the repository's Node 22.23.2/pnpm 12.4.1 and Python 3 with
`pypdfium2==5.14.0`. PDFium reads the received ISO42001 PDF without repairing or
changing it. Original ZIP bytes, PDF hashes, derivative/page hashes, source
selection, atomic selections and crosswalk fragments are checked separately.
Full PDF text stays under ignored private `.release-custody`.

```sh
TCDX_DOSSIER=docs/phase6a/NORMATIVE_LIBRARY_IMPLEMENTATION_20261020/phase6a-normative-library-structuring-20261023
TCDX_PREPARATION=.release-custody/phase6a-normative-library-structuring-20261023
python3 scripts/regulatory/normative-library/source_inventory.py \
  --source-zip docs/normative-sources/incoming/GRC_Tecdex_Paquete_Normativo_Revision_Producto_2026-10-20.zip \
  --expected-sha256 4b7d7374fc0a09be9697ff9784f093c2b737edbaabe82460c3aa7c64659f9aee \
  --output "$TCDX_PREPARATION/extraction"
python3 scripts/regulatory/normative-library/source_structure.py \
  --extractions "$TCDX_PREPARATION/extraction" \
  --selection "$TCDX_DOSSIER/SOURCE_SELECTION.json" \
  --output "$TCDX_PREPARATION/structure"
python3 scripts/regulatory/normative-library/review_sources.py \
  --structure "$TCDX_PREPARATION/structure" \
  --zip docs/normative-sources/incoming/GRC_Tecdex_Paquete_Normativo_Revision_Producto_2026-10-20.zip \
  --atomic-review "$TCDX_DOSSIER/ATOMIC_REQUIREMENT_PROPOSALS.json" \
  --output "$TCDX_PREPARATION/source-review"
pnpm --filter @tcdx-grc/contracts build
pnpm --filter @tcdx-grc/backend build
node scripts/regulatory/normative-library/prepare-source-packs.mjs \
  "$TCDX_PREPARATION/structure" "$TCDX_PREPARATION/packages" \
  "$TCDX_DOSSIER/SOURCE_IDENTIFIER_RECONCILIATION.json" \
  "$TCDX_DOSSIER/SOURCE_CROSSWALK_PROPOSALS.json" \
  "$TCDX_DOSSIER/ATOMIC_REQUIREMENT_PROPOSALS.json"
python3 -m unittest discover -s scripts/regulatory/normative-library -p test_sources.py -v
TCDX_SOURCE_PREPARATION_DIRECTORY="$PWD/$TCDX_PREPARATION/packages" \
  bash scripts/regulatory/run-binding-postgres-tests.sh structuring
```

The last command uses only a task-owned PG16 cluster on 127.0.0.1:55561,
attests its data directory and version, builds the actual 36-migration predecessor
and the already approved runtime-binding candidate, and stops the cluster on exit.
It materializes the existing v1.1 catalog **from its own sealed directory** as a
historical test fixture; the incoming ZIP is not passed to that importer.
The five new source-bound payloads use the canonical pipeline. Actual technical
actor/checksum binding happens in that caller, with no operational approval.

501 modal candidates remain source evidence. Seven expressly selected duties
have a single evaluable action plus retained scope/criteria. This is a bounded
technical review, not exhaustive atomization or human review. The adapter never
automatically turns all modal sentences or 211/104 editorial candidates into
Requirements. An absent atomic review file results in no Requirements.

The nine A.6 source identifier corrections use separate control identities and
explicit **draft** supersession proposals to historical version1, not edits to
existing control identities. Seven other draft source comparisons refine the six
received themes. They assert neither full equivalence nor compliance. Confidence
zero means no calibrated/human validation; reviewed remains false. The partial
records-to-document-control mapping claims no numerical coverage contribution.

The source-selection metadata in this task adapter is bounded preparation data,
not runtime product policy. Version2 is a proposed source-bound revision; a
conflicting pre-existing version fails closed. Dates in proposals identify their
technical revision; law disposition dates stay NULL until established. Do not
reinterpret the pack-level Law21663 source-version date as universal commencement.

No ISO9001:2026 definitive payload or 2015/Amd1:2024 content is synthesized.
Raw copyright bodies, license identities and private operational receipts are
excluded from Git. Source availability and metadata do not authorize commercial
reproduction. No external import, QA grant, human gate or publication is executed.
