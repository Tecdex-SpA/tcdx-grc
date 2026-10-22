# E04 — P01 cerrado

Reutilizado el contrato de importación preparado. Contraste concreto: regulatory/model.ts sólo admite licensed_file|official_source; validator.ts trata todas las fuentes distintas de Ley21.719 como standard y fija la fecha legal de ésta. Ninguna de esas dos procedencias describe verazmente un archivo preliminar recibido.

CANONICAL_IMPORT_CONTRACT.json amplía únicamente la procedencia de entrada con received_preliminary_file, bajo NON_AUTHORITATIVE_TEST_PACK, authorized=false y elegibilidad interna. No crea tabla/columna/autoridad ni licencia. Conserva origen, ZIP/member/row/hash, fuente declarada, edición, derechos reales por acto, review y acceso de validación. Metadatos o identidad auténtica no resueltos impiden sólo el import canónico afectado; no se fabrican.

La adaptación futura separa las dos leyes de ISO: Ley21.663 law con temporalidad auténtica; Ley21.719 conserva fecha/fuente/historia. Derechos, cobertura y publicación oficial son gates independientes por paquete. Los 211 candidatos, 104 propuestas y seis correspondencias siguen preliminares. No se ejecutó importador ni se modificaron datos QA.
