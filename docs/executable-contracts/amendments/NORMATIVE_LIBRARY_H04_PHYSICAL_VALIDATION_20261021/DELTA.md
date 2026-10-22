# Corrector físico H04 — candidato sucesor

Estado: `CANDIDATE_PHYSICAL_VALIDATION`; sin publicación ni activación. No sustituye por sí mismo el recibo efectivo.

Hallazgo PV-H04-01: PostgreSQL 16.15 rechaza toda inserción con paquete no NULL, SQLSTATE 42703. `knowledge.enforce_source_usage_rights()` consulta `tenant_id` inexistente en `regulatory.regulatory_pack_versions`. Evidencia inicial: physical-validation-20261021/attempt-02/103-rights_pack_exact_positive.log y 104-rights_pack_unknown_fk.log dentro del expediente de implementación.

La tabla canónica global de packs/versiones no tiene tenant ni ownership, conforme a database/migrations/20260916000300_normative_control_evidence.sql y sus sucesoras estructurales. No se añade una columna ni se inventa ownership. Se reemplaza solamente esa consulta por PERFORM del ID exacto FOR SHARE; el FK ya publicado rechaza un paquete inexistente con 23503. La referencia sigue siendo exacta, opcional, tipada y global. El ownership/audiencia se comprueba contra KnowledgeSource y tenant, como antes.

Se preservan íntegramente términos, actos, entornos, contenido, intervalos, auditoría, revocación única e inmutabilidad. No hay API, permiso, grant, estado, registry o tabla nuevos. El código de aplicación y las policies no se modifican. El trigger existente continúa invocando la misma función. No se edita el DDL sellado ni sus recibos.

Autoridad de preparación/prueba: orden PO «VALIDACIÓN FÍSICA AISLADA POSTGRESQL 16», que autoriza preparar amendments sucesores verificables ante defectos. Su publicación contractual y cualquier adopción QA/producción siguen separadas. Esta propuesta no acredita licencias ni derechos reales.
