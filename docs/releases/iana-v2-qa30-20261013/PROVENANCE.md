# IANA/API v2 QA30 release

Derived from QA30-compatible phase5 HEAD `6af66387aa03fa185ef139584de07700f247b903` using 24 reviewed source deltas. All 183 inputs match the final manifest. Full development preserved on `rescue/step6a3-integral-20261013`, commit `57a6c2905031f6d15e19dc13ec82574cd708b812`. This branch does not authorize or carry the QA32 selectors, migrations or grants. IANA semantic contract SHA256: `6205faaafa3cb0cbd4d0cf34cd9c8343ccca64392e638a833e10fa7db8c73375`.

Only GET /api/v1/auth/me/authorization retires (404); its successor is GET /api/v2/auth/me/authorization. Other route method/path registrations remain equivalent. Image and source fingerprints are separate, immutable records. Application/configuration publication and human runtime gates remain pending. This branch preserves the original phase5 governance files unchanged; current governing v1.8 activation and approvals are on the rescue branch.

Future integration consumes this increment from the full preserved lineage after its own gates; no release tree replaces the full development tree.
