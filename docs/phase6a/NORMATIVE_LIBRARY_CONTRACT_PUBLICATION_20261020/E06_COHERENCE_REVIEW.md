# E06 — P03 revisión técnica

Reutilizados los candidatos y las evidencias históricas. Verificador final enlaza 30 operaciones nuevas (205 operationIds totales), OpenAPI, ocho permisos, grants candidatos/policies, 13 bindings, schemas y audit/eventos. Las operaciones heredadas se comparan literalmente salvo especialización control_version de create y anotación aditiva explícita del perfil de auditoría de aplicabilidad.

Defectos corregidos en esta cuenta: representación de procedencia preliminar insuficiente; binding contextual audit faltante; ausencia de notification_policy/recalculation_policy explícitas en 13 bindings. Ambas policies se fijan NONE: no notificación ni recálculo nuevos. contract_binding_version=1 no es una versión del registry runtime; éste permanece UNASSIGNED_NOT_ACTIVATED. No se alteraron los siete cuerpos SQL ni las especificaciones físicas transferidas.

Revisados targets y columnas reales, FK contra PK/UQ, derivación 242→243 tablas contractuales, cuatro columnas nullable, once FKs del delta, XOR/ownership/tenant/inmutabilidad y corrección UQ KnowledgeVersion item+version. Matrices usan seis relaciones canónicas y permiso de entrada interseccionado con orígenes. Custodia mantiene content_ref/hash y revisión del manifiesto exacto, derechos por acto y SoD. No se pretende resolver autorización mediante FK ni acreditar triggers sin ejecución.

Sin conflicto rector pendiente dentro del alcance contractual. La identidad IA declarada futura y la histórica siguen sin equivalencia técnica acreditada; es frontera de integración futura, no bloqueo de estos contratos.
