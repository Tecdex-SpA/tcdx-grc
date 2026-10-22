# Dependencias y preguntas para el siguiente desbloqueo

No quedan preguntas conceptuales D01–D09/B01–B09/H01–H04 pendientes ni se solicita nueva ratificación de sus decisiones.

1. Adopción física: DDL candidato B02/B04/B07 previo y DDL efectivo H04 del recibo corrector. Validar catálogo/FKs, constraints, inmutabilidad, tenant/global, privilegios/RLS aplicables y rollback en entorno aislado autorizado. No es lícito inferir existencia/ausencia de tablas QA sin preflight autorizado. Ninguna migración activa o DDL de arranque nuevo.
2. Datos/grants: materializar cuatro Definitions y binding de reglas, permisos/grants exactos y trece aristas B06 con versiones reales sólo por orden PO específica. Actualmente no activados por esta ejecución. DENY sin datos/policy/grant vigentes. No Platform por analogía ni SoD rebajada.
3. Derechos: aportar evidencia real del titular/autoridad que cubra fuente, edición/paquete, contenido exacto, actos y entorno. La fila/atestación sólo podrá registrarse por procedimiento futuro autorizado con actor/audit reales. No hay licencias acreditadas ni fixtures de derechos en QA. Preliminar no significa licencia ni fuente oficial.
4. Runtime: server.ts no suministra la composición y el shell no monta componentes. Su adopción exige orden operacional y gates anteriores; luego validación física/QA, E2E real, accesibilidad/aceptación humana aplicable y recibos. GET EC no se convierte en materialización; los consumidores canónicos de resoluciones deben validarse sin inventar una API/job nuevo.

Pregunta operacional propuesta, sin ejecutarla: ¿autorizas una validación física de los DDL candidatos en un entorno PostgreSQL16 aislado que identifiques, con preflight y recuperación, sin tocar QA/producción? Es distinta de autorizar importación, materialización de derechos/grants/registry o despliegue; éstos necesitan sus propias órdenes y evidencia. No se requieren esas autorizaciones para leer/verificar este checkpoint.
