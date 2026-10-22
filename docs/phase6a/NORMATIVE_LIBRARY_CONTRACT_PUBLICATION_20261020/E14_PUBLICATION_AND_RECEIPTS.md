# E14 — Procedimiento de publicación

1. Transferencia e integridad confirmadas; autorización PO actual y baseline activa registradas.
2. Correcciones limitadas P01/P02/P03 y batería final contractual PASS, con límites explícitos.
3. REVIEW_MANIFEST.json contiene bytes finales contractuales, fuentes/dependencias y revisión técnica E06/E07; sin firma humana inventada.
4. PUBLICATION_MANIFEST.json enumera todos los archivos del expediente/amendments, hashes y exclusiones de sellado sin circularidad.
5. CONTRACT_PUBLICATION_RECEIPT.json, escrito después de verificar manifiestos, registra el acto real de publicación local y su fecha UTC. CONTRACT_ACTIVATION.json referencia ese recibo/manifiesto, alcance B01–B09 y no activación runtime.
6. verify-publication.py verifica recibo/manifiestos/activación, inventario sin extras, fuentes, baseline/preservación y resultados técnicos; publication-verification-final.json registra el resultado posterior.

La efectividad es contractual local por amendment y sus punteros hash-bound. No se sobrescribe baseline ni contratos históricos. No equivale a commit/push, integración main, registry IAM/runtime, migración, importación, despliegue, pack oficial o aceptación de UI. Un fallo del verificador impide declarar publicación PASS y detiene sólo el alcance afectado.
