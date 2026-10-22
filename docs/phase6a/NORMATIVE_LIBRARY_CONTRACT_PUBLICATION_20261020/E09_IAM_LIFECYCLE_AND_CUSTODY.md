# E09 — Seguridad, ciclo y custodia

PERMISSIONS_AND_GRANTS.json/OBJECT_POLICIES.json publican ocho permisos contractuales y concesiones futuras separadas. Platform Admin/Support usan autoridad Platform real; Support sólo metadata global no sensible. Ningún rol tenant recibe facultades Platform; ninguna concesión operacional cambia.

GRC Manager approve se restringe a las cuatro Definitions, tenant/control exactos y SoD autor distinto. Reviewer puede decidir la misma versión de otro autor, preservando cualquier policy más estricta. El registry contractual incluye 13 bindings, no filas runtime; registry_version se resolverá al activar con autorización separada.

ETag fuerte/hash+auditorías materiales y locks evita ABA en agregados sin row_version; Applicability conserva su CAS real. Mutación, audit, eventos exigidos e idempotencia son atómicos. No se exige un evento nuevo a applicabilityCreate. Custodia Knowledge en adaptador privado existente, artefacto inmutable/citas/vínculos/hash, acceso y derechos por acto; no tabla de contenido paralela ni conectividad nueva.
