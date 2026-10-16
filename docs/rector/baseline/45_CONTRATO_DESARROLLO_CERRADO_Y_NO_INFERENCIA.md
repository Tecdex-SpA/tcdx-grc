# 45 — Contrato de desarrollo autorizado y no ampliación — candidata v1.12

## 1. Fuente y alcance

DR-GRC-20261016-001/002/003 son decisiones expresas PO. Este texto candidato formaliza la gobernanza interna sucesora; no activa una baseline ni altera evidencia previa.

## 2. Autoridad y autorización integral

La instrucción expresa del Product Owner constituye autorización suficiente para las actividades comprendidas en su alcance. No se exige segunda firma, segundo aprobador, comité, revisor humano independiente ni ratificación administrativa interna. La autorización funcional comprende análisis, diseño, contratos ejecutables, backend/frontend necesarios, pruebas, corrección y validación técnica dentro del alcance; Codex mantiene continuidad autónoma. Una contradicción con una directiva interna anterior se reconcilia documentalmente, sin veto administrativo permanente. Se mantienen integridad, hashes, trazabilidad, verificación técnica y límites expresos; registrar la instrucción y los bytes producidos no significa atribuir una firma humana a bytes futuros. Sólo se detiene la operación afectada por un impedimento técnico/de seguridad no resoluble en alcance, una restricción externa con fuente y aplicabilidad concreta, o una exclusión expresa. No se inventan obligaciones, revisores ni responsables. Esta regla no amplía alcance ni autoriza arquitectura arbitraria, deuda o despliegues excluidos.

## 3. Presupuesto de variación cero

`CODEX_VARIATION_BUDGET=ZERO`. No se añaden funcionalidades, entidades, roles, permisos, estados, dependencias, arquitectura arbitraria ni deuda. Codex puede completar las actividades técnicas incluidas en la instrucción, ajustar contratos y documentación trazablemente y corregir fallos dentro de alcance sin volver a pedir permiso. Una instrucción limitada a documentación no autoriza implementación. Una exclusión expresa prevalece sobre la regla general de autorización integral.

## 4. Trazabilidad del trabajo

El task packet registra instrucción, fuente, alcance, baseline, archivos, invariantes, verificaciones, acciones permitidas/excluidas y resultado. No es una solicitud adicional de firma. Se registran hashes exactos y deltas de los artefactos producidos, sin atribuir al PO firma de bytes que no firmó. El registro de autorización basta para ejecutar lo comprendido; revisión documental de la entrega no es un veto administrativo a esa continuidad.

## 5. Reconciliación de autoridad

Una directiva interna anterior contradictoria se identifica con cláusula y se prepara su actualización formal. La contradicción no bloquea la preparación ni obliga a reemitir la decisión conceptual. La baseline activa no se reinterpreta ni reescribe silenciosamente; se preserva hasta que una instrucción permita la operación de activación. No se confunde esta precedencia de gobierno con SourcePrecedencePolicy de datos GRC. Cambios fuera del alcance no se legitiman por un ADR inventado.

## 6. Invariantes y separación operacional

Se preservan el modelo canónico y físico aprobado, contratos de backend/frontend y su evolución trazable autorizada, IAM/RBAC, mínimo privilegio, aislamiento multi-tenant, integridad transaccional, auditoría, seguridad, privacidad e historia. La gobernanza interna del desarrollo es distinta de la SoD operacional que ofrece GRC a los clientes: Evidence submit/approve, Action complete/verify, risk acceptance, Audit y credenciales conservan sus policies y actores cuando correspondan. No hay permiso, grant, estado, tabla ni excepción operacional nueva por esta regla.

No se presume obligación externa por el nombre de un rol. Una restricción externa debe citar fuente exacta, cláusula/aplicabilidad, objeto afectado y consecuencia. Si no está demostrada, no se convierte en requisito universal ni se declara dispensada una obligación real.

## 7. Detención excepcional acotada

Sólo se detiene la operación afectada cuando está expresamente excluida, existe impedimento técnico/de seguridad no resoluble en alcance, o restricción externa concretamente aplicable. Se informa fuente, consecuencia y alternativa compatible y se continúa el trabajo independiente. Falta de segundo firmante interno, comité, ratificación de bytes derivados o declaración administrativa de funciones no son impedimentos. Codex no inventa identidad/consentimiento, fuentes, datos, PASS de usuario ni actos de release.

## 8. Entrega

Informar gate técnico y alcance, baseline activa/candidata, hashes/deltas, pruebas efectivamente ejecutadas, preservación, conflictos reales, límites y operaciones no ejecutadas. Supuestos no autorizados y archivos fuera de alcance: NONE. Gates humanos históricos se registran literalmente; no se fabrican ni se vuelven a exigir como ratificación para desarrollar lo ya autorizado. La presente entrega no hace commit/push/merge, DB, runtime, despliegue, activación, cierre6A3 ni inicio6A4.
