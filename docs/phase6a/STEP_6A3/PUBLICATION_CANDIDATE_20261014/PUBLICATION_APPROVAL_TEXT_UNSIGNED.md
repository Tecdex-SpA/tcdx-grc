# Texto único para revisión humana de los bytes nuevos — sin firma

```text
DECISION_ID=DR-STEP6A3-PUBLICATION-CANDIDATE-20261014-01
PUBLICATION_PACKAGE_ID=GP-STEP6A3-PUBLICATION-CANDIDATE-20261014-01
PUBLICATION_MANIFEST_FILE=docs/phase6a/STEP_6A3/PUBLICATION_CANDIDATE_20261014/PUBLICATION_MANIFEST.json
PUBLICATION_MANIFEST_SHA256=5b3b791cc2b7c3446ff69b244edacdf3ab810b0c864c5428c795f52dc6b9fb06
PREDECESSOR=TCDX_GRC_MASTER_REGENT_BASELINE_v1.8_2026-10-09
SUCCESSOR_CANDIDATE=TCDX_GRC_MASTER_REGENT_BASELINE_v1.9_2026-10-14
SOURCE_DESIGN_DECISION=DR-STEP6A3-COMMERCIAL-GOVERNANCE-20261013-02
SOURCE_DESIGN_PACKAGE_SHA256=489e8cec4b72c2cf464d0315e5ba4f2f5664012b60df2327a07f82882943ba55
SOURCE_DESIGN_ARTIFACT_MANIFEST_SHA256=b454e3e2475ece966f87a4da1f89c1640f5cf9baf48d7b7d146935edc4db5cc3
SOURCE_SIGNED_AT_UTC=2026-10-13T23:45:00Z
HUMAN_IDENTITY=Andrés Barouh
HUMAN_FUNCTIONS=Producto; Arquitectura; Modelo de Datos; Backend; Seguridad; Privacidad/Legal; Metodología; QA/Release
SIGNED_AT_UTC=[fecha y hora UTC real de esta NUEVA decisión]

Apruebo exclusivamente los 77 archivos y hashes nuevos enumerados en
PUBLICATION_MANIFEST.json, incluidas la copia completa candidata de la
baseline v1.9, sus 15 diferencias rectoras frente a v1.8, las copias
físicas y ejecutables del paquete v2 y la derivación OpenAPI completa.
Apruebo esos bytes como contenido candidato para publicación gobernada
en la cadena rector -> físico -> ejecutable, sujeto a las verificaciones
y manifestaciones de activación aplicables.

Esta decisión NO reabre ni solicita nuevamente aprobación del diseño
G-01..G-06, C-01..C-12, H-01..H-12 y F-01..F-10 ya aprobado por
DR-STEP6A3-COMMERCIAL-GOVERNANCE-20261013-02. Conservo exactamente
sus límites y dependencias residuales. R-A sigue sin autorización.

La aprobación de estos bytes candidatos NO declara publicada o activa
la baseline v1.9, NO declara PHYSICAL_DATA_MODEL_REVIEW=PASS ni
EXECUTABLE_CONTRACTS=PASS, y NO aprueba el expected-schema completo,
manifest de datos comerciales/seed, cantidades, IDs, fuentes legales,
suficiencia metodológica, compatibilidad activa, pruebas futuras,
artefactos de implementación, imágenes ni manifestaciones de activación
que aún no tienen bytes y hashes presentados.

No autorizo por esta decisión DDL/DML en QA compartido, IAM real,
grants, cambios de estado, commit, push, merge, deploy, inicio de
STEP 6A.4/ZIP normativo/STEP 6A.5 ni cierre de STEP 6A.3 o release.
Los actos dependientes requieren gates y mandato operacional propios.
La acumulación de funciones internas no dispensa SoD operacional ni
obligaciones superiores bajo rector 45 §6 y 49 §3.
```

El campo `SIGNED_AT_UTC` pertenece sólo a esta eventual decisión nueva. No sustituirlo por `SOURCE_SIGNED_AT_UTC` ni por la hora de generación del paquete. Esta plantilla no es una aprobación y no integra el manifest de 77 archivos.
