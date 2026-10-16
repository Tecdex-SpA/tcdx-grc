# Propuesta única de autorización de activación — sin firma

```text
DECISION_ID=DR-STEP6A3-RECTOR-V19-ACTIVATION-20261014-01
ACTIVATION_PACKAGE_ID=GP-STEP6A3-V19-ACTIVATION-STAGING-20261014-01
ACTIVATION_STAGING_MANIFEST_FILE=docs/phase6a/STEP_6A3/ACTIVATION_PACKAGE_20261014/ACTIVATION_STAGING_MANIFEST.json
ACTIVATION_STAGING_MANIFEST_SHA256=6f08a7522ef39760168380b823cedb75a088f1a17fa25c0c3161d96cc7f26cc8
SOURCE_PUBLICATION_DECISION=DR-STEP6A3-PUBLICATION-CANDIDATE-20261014-01
SOURCE_PUBLICATION_MANIFEST_SHA256=5b3b791cc2b7c3446ff69b244edacdf3ab810b0c864c5428c795f52dc6b9fb06
PREDECESSOR=TCDX_GRC_MASTER_REGENT_BASELINE_v1.8_2026-10-09
SUCCESSOR=TCDX_GRC_MASTER_REGENT_BASELINE_v1.9_2026-10-14
HUMAN_IDENTITY=Andrés Barouh
HUMAN_FUNCTIONS=Producto; Arquitectura; Modelo de Datos; Backend; Seguridad; Privacidad/Legal; Metodología; QA/Release
SIGNED_AT_UTC=[fecha y hora UTC real de ESTA decisión]

Apruebo conjuntamente los 116 archivos staged y los cinco archivos de
preparación/verificación, con sus hashes exactos enumerados en
ACTIVATION_STAGING_MANIFEST.json, como paquete único para la ceremonia
rectora v1.9. Confirmo que los 52 archivos staged de historia v1.8 son
byte idénticos a la baseline activa actual y que los 52 archivos staged
de baseline v1.9 reproducen los 51 documentos normativos y SHA256SUMS.txt
de la candidata ya aprobada.

Autorizo la aplicación local gobernada de esos archivos, punteros,
estado, checkpoint y verificadores únicamente si el preflight exacto,
la preservación histórica, las pruebas positivas/negativas y el
verificador rector concluyen PASS. Autorizo completar mecánicamente
en ACTIVE_ACTIVATION.json sólo el effective_at UTC real del acto y el
SHA-256 de esta constancia humana ya registrada, sin alterar los demás
campos. Ambos valores y el SHA-256 final del archivo deberán registrarse
en la evidencia de activación. Cualquier otro cambio de bytes, referencia,
estado o alcance requiere nueva revisión y produce NO_GO.

Esta decisión no reabre ni repite la aprobación comercial v2 ni la
aprobación de los 77 bytes candidatos. La activación rectora no declara
PHYSICAL_DATA_MODEL_REVIEW=PASS, EXECUTABLE_CONTRACTS=PASS, expected-schema
aprobado, compatibilidad PostgreSQL real, implementación, pruebas runtime,
cierre H-01..H-12, STEP 6A.3 PASS, STEP 6A.4 iniciado ni release.

No autorizo DDL/DML en QA compartido, IAM real, grants, commit, push,
merge, deploy, publicación de datos/seed comerciales o imágenes futuras.
Los gates físicos/ejecutables y los mandatos operacionales se resolverán
por sus expedientes específicos. Se conservan SoD, multi-tenant,
default DENY, historia íntegra y el dominio https://grc.tecdex.net/.
```

Esta plantilla no es una aprobación. Su `SIGNED_AT_UTC` pertenece a la eventual decisión de activación y no reutiliza las horas de las decisiones anteriores. La autorización propuesta permite completar sólo dos campos dinámicos después de la firma; si la autoridad exige SHA-256 previo también de esos bytes finales, la activación queda bloqueada hasta presentar el receipt y `ACTIVE_ACTIVATION.json` finales. No se sustituyen esos hashes por una suposición.
