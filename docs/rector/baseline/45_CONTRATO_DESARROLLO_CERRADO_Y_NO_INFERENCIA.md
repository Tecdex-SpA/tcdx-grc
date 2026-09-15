# 45 — Contrato de desarrollo cerrado y no inferencia

## 1. Propósito

Impedir que Codex, otro agente automático o una práctica técnica implícita amplíe, complete o reinterprete TCDX GRC. El producto se desarrolla desde un contrato cerrado. La automatización ejecuta decisiones aprobadas; no sustituye a Product Owner, Architecture Owner, Data Model Owner, Security Reviewer ni QA Release Owner.

## 2. Presupuesto de variación cero

`CODEX_VARIATION_BUDGET=ZERO`.

Codex puede:

- leer y verificar fuentes autorizadas;
- derivar mecánicamente artefactos cuando existe una única correspondencia trazable;
- detectar inconsistencias, impactos y datos faltantes;
- preparar una propuesta marcada DRAFT cuando el task packet lo autorice;
- ejecutar verificaciones expresamente permitidas por el gate.

Codex no puede:

- elegir entre dos o más alternativas materialmente válidas;
- llenar vacíos con buenas prácticas, experiencia previa, convenciones de framework o preferencia propia;
- añadir alcance, UX, estados, entidades, campos, endpoints, eventos, permisos, capabilities, dependencias o abstracciones no solicitadas;
- convertir ejemplos, código existente, mocks, tests, comentarios o documentación histórica en autoridad;
- crear un ADR, excepción o supuesto para desbloquear su propia tarea;
- aprobar su propio diseño, gate, excepción, seguridad o release;
- modificar archivos fuera del conjunto permitido por el task packet;
- ejecutar commit, push, merge, migración, deploy o acción destructiva sin autorización específica y gate aplicable.

## 3. Regla de no inferencia

Toda decisión material debe tener una cita a cláusula rectora o un Decision Record humano aprobado. Si la fuente permite varias interpretaciones, no existe una interpretación por defecto. El estado obligatorio es:

`RECTOR_GATE=BLOCKED`

El reporte debe indicar exactamente: decisión ausente, artefactos afectados, alternativas detectadas sin recomendar una como decisión oficial, owner requerido y gate bloqueado.

Una inferencia puramente mecánica es admisible sólo cuando todos los siguientes puntos son verdaderos:

1. existe una única salida compatible con el contrato;
2. no cambia comportamiento, semántica, seguridad, datos, alcance comercial ni operación;
3. conserva nombres, tipos, cardinalidades, estados y restricciones aprobados;
4. es reversible antes de ejecutar una acción bloqueada;
5. queda trazada a la fuente y a una prueba de aceptación.

Si algún punto no puede demostrarse, la acción no es mecánica y queda bloqueada.

## 4. Task packet obligatorio

Antes de un cambio material debe existir un task packet con:

- `TASK_ID` y objetivo verificable;
- baseline y gate vigentes;
- requisitos y cláusulas rectoras;
- archivos/rutas autorizados y archivos prohibidos;
- entidades, contratos, permissions, scopes y tenants afectados;
- comportamiento exacto esperado, incluidos errores y estados insuficientes;
- no objetivos y límites de alcance;
- dependencias y versiones ya aprobadas;
- criterios de aceptación y pruebas obligatorias;
- acciones operativas expresamente autorizadas o prohibidas;
- owners humanos de decisión, revisión y aprobación.

Los campos no aplicables se marcan `NOT_APPLICABLE` con razón. No se aceptan valores implícitos, `TODO`, `TBD`, “según corresponda”, “mejor práctica” o “similar a” cuando afecten una decisión material.

## 5. Decision Record humano

Cuando aparece una decisión no cerrada, el owner competente emite un Decision Record antes de continuar. Debe contener ID, problema, alcance, alternativas consideradas, decisión exacta, consecuencias, contratos afectados, owner, fecha, aprobadores y gate que desbloquea.

Un ADR o Decision Record:

- no puede ser inventado ni autoaprobado por Codex;
- no puede contradecir una fuente rectora superior;
- no puede autorizar una vía legacy/paralela o deuda contractual silenciosa;
- requiere actualización de las fuentes y manifestaciones afectadas antes del código.

## 6. Aprobación humana y gates

Codex puede calcular evidencia y estado propuesto, pero los siguientes PASS requieren aprobación humana registrada: baseline rector, modelo físico, contratos ejecutables, seguridad/privacidad, gates runtime y release.

Sin identidad del aprobador, rol ejercido, fecha y evidencia, el estado permanece `PENDING_REVIEW` aunque las pruebas estén verdes.

## 7. Reglas específicas por fase

- Fase 1: ante más de una representación física válida, Codex no elige. El diseño permanece DRAFT hasta decisión del Data Model Owner y Architecture Owner.
- Fase 2: no se seleccionan librerías, versiones, convenciones, contratos API/eventos ni códigos por defecto. Todo queda congelado en artefactos aprobados.
- Fases 3–9: cada slice implementa únicamente task packets aprobados; no hay refactor oportunista ni dependencia nueva implícita.
- Fase 10: Codex no declara release; prepara evidencia para QA Release Owner y los aprobadores definidos.

## 8. Cierre y evidencia

Todo reporte de ejecución incluye:

- `CODEX_VARIATION_BUDGET=ZERO`;
- `TASK_PACKET_STATUS=COMPLETE|BLOCKED`;
- decisiones mecánicamente derivadas;
- decisiones humanas citadas;
- supuestos introducidos: `NONE`;
- archivos fuera de alcance modificados: `NONE`;
- alternativas no resueltas;
- aprobaciones humanas pendientes;
- acciones bloqueadas confirmadas como no ejecutadas.

Un reporte que omita estos campos no puede concluir PASS.
