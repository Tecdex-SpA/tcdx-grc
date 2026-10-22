# Fuentes, homologación y publicación para pruebas

B01 incorpora contractualmente CL_LEY_21663 como sexto código independiente mediante REGULATORY_SCOPE.json. No cambia datos ni familias comerciales. ISO 9001:2015 y 2026 conservan versiones independientes. Las fuentes y leyes mantienen edición, jurisdicción, disposiciones, vigencias y condiciones auténticas; no se atribuye aplicabilidad universal ni se exige reaprobar conceptualmente Ley21.663.

## Representación sin un lifecycle combinado nuevo

| Situación solicitada | Representación canónica/evidencia que la acredita | Lo que no acredita |
| --- | --- | --- |
| Recibido | Archivo original + inventario/checksum/procedencia de recepción | Autenticidad o derecho de uso |
| Extraído | Artefacto de extracción y hash de fuente/locator + RegulatoryImportManifest correspondiente cuando se importe | Extracción correcta o cobertura completa |
| Estructurado | FrameworkVersion/NormativeUnit/Requirement/mappings y outcomes del import, jerarquía válida | Requisito atómico homologado por sólo existir fila |
| Pendiente de revisión | reviewed=false / candidateState / lifecycle y cobertura revisada incompleta existentes | Obligación verificada |
| Homologado | Cotejo/review/provenance por objeto y edición, coverage revisada y correspondencia aprobada | Publicación oficial/licencia de distribución automáticamente |
| Publicado para pruebas | NON_AUTHORITATIVE_TEST_PACK, provenance de validación y RegulatoryPackValidationAccess exacto, cuenta/entorno/purpose elegibles; Knowledge publicado indica sólo guía/contexto revisados | REGULATORY_PACK_<CODE>=PASS ni resultado oficial |
| Publicado oficialmente | Fuente definitiva/autorizada y derechos aplicables, cobertura100% separada, aprobaciones operacionales y gate individual de pack | Aplicabilidad universal o sustitución del gate comercial |

Las filas son estados de proyección compuestos de evidencias existentes, no enum persistido recibido/extraído/etc. Ningún flag cliente decide autoridad. El importador no puede crear una nueva obligation porque una fila del ZIP diga control, capítulo o SHALL. Los outcomes y row-level errors son reales, auditados y versionados cuando la importación sea autorizada.

## Desarrollo/QA y publicación independiente

Metadatos, navegación, guía propia, candidatos, configuración, matrices y pruebas humanas internas no exigen publicación comercial de todos los paquetes. Para contenido no autoritativo se reutilizan provenance/accesos de validación, tenant_account_classification demo/test y entornos development/test/qa de los contratos actuales. Se publica aquí que su uso interno funcional puede recorrer los flujos completos autorizados, sin afirmar autenticidad/obligación/certificación oficial. No se bloquea toda la biblioteca por una licencia comercial ausente.

Cada operación sigue verificando derecho por acto: lectura individual, copia/uso compartido, distribución o procesamiento externo. Unknown no pasa a autorizado. Si falta derecho para un cuerpo protegido, restringir sólo esa reproducción/consulta, ofreciendo referencias/metadata/editorial independientes. No se copian PDF protegidos a Knowledge ni se usa un test pack para eludir licencia, metodología, retención, SoD o tenant. IA runtime no está autorizado. Un resultado puede conservar su result_status técnico/metodológico real y seguir siendo no oficial por la autoridad de la fuente: no se convierte licencia en result_status.

Los 211 candidatos, 104 propuestas independientes y seis cruces conservan IDs, fuentes, estado y hashes del expediente sellado. No hay nuevas importaciones o homologación ejecutada. No se ejecutan scripts ZIP. La autorización de importar, poblar accesos/grants y desplegar sigue reservada al PO.

## Gate oficial y release

Cada fuente/edición/pack/cobertura/publicación mantiene su gate. REGULATORY_PACK_CL_LEY_21663 queda independiente; no está PASS por este amendment. La publicación oficial de los paquetes requeridos debe completarse antes de la salida comercial conforme al RELEASE_DEPENDENCY_MANIFEST y el mandato PO. La aceptación funcional de biblioteca usa criterios propios y no se confunde con ese release.

## Compatibilidad de importación cerrada

CANONICAL_IMPORT_CONTRACT.json publica received_preliminary_file únicamente como origen de entrada/procedencia: licensed_file y official_source no describen verazmente un ZIP preliminar recibido. No agrega columna ni autoridad normativa. Impone clase NON_AUTHORITATIVE_TEST_PACK, fuente no autorizada y derechos reales por acto, procedencia/edición/hash y acceso de validación existentes. Ley21.663 usa sourceType=law y temporalidad por disposición auténtica; no hereda la fecha fija de Ley21.719. Los metadatos fuente no resueltos mantienen el candidato en artefactos de recepción. Nada se importa, homologa o activa.
