# E07 — P04 resultados finales

contract-checks-final.json: 17 checks PASS sobre candidato contractual final, 2835 referencias resueltas, 44 componentes compilados AJV8.20.0 más esquema cerrado del perfil audit contextual. Casos de forma no prueban FK, actor ni negocio runtime. Node22.23.2 y yaml2.9.1, sin cambiar dependencias.

FINAL_GATE_RUNS.json/logs: verify-rector-governance.sh PASS; test-rector-governance-status.sh PASS; generate-contract-assets.mjs --check PASS. Logs conservan alcance/historia del mecanismo existente; sus secciones antiguas no sustituyen los cierres actuales del estado maestro.

sql-pg16-parse-final.json: PASS exclusivamente gramática offline PostgreSQL16.1/pglast6.17, Python3.9.6, 41 sentencias y siete funciones. SQL SHA256 33d444c2e5394f1a027d3d81230b77335487e768d2a130578a5f119c559f72e7, igual al checkpoint. Resolución catálogo/enforcement/tenant/concurrencia runtime NOT_TESTED; DDL no ejecutado.

verify-publication.py comprueba después el manifiesto, recibo, activación documental, inventario exacto, preservación y fuentes enlazadas. Su resultado se registra en publication-verification-final.json. Ningún PASS documental se extrapola a QA, runtime, migraciones o grants.
