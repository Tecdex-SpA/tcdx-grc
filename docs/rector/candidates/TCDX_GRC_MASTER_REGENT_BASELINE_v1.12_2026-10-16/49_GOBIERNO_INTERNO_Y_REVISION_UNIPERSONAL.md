# 49 — Autoridad única interna y separación de controles del producto

## 1. Decisión expresa definitiva

DR-GRC-20261016-003 actualiza el gobierno interno del desarrollo de GRC Tecdex. El creador/Product Owner declara ser el único responsable de sus decisiones internas. Las decisiones DR001/002 se integran con esta adenda sin reemitirlas ni solicitar otra aprobación conceptual. Este documento es candidato y no activa por sí mismo la sucesora.

## 2. Suficiencia y continuidad de la instrucción

La instrucción expresa del Product Owner constituye autorización suficiente para las actividades comprendidas en su alcance. No se exige segunda firma, segundo aprobador, comité, revisor humano independiente ni ratificación administrativa interna. La autorización funcional comprende análisis, diseño, contratos ejecutables, backend/frontend necesarios, pruebas, corrección y validación técnica dentro del alcance; Codex mantiene continuidad autónoma. Una contradicción con una directiva interna anterior se reconcilia documentalmente, sin veto administrativo permanente. Se mantienen integridad, hashes, trazabilidad, verificación técnica y límites expresos; registrar la instrucción y los bytes producidos no significa atribuir una firma humana a bytes futuros. Sólo se detiene la operación afectada por un impedimento técnico/de seguridad no resoluble en alcance, una restricción externa con fuente y aplicabilidad concreta, o una exclusión expresa. No se inventan obligaciones, revisores ni responsables. Esta regla no amplía alcance ni autoriza arquitectura arbitraria, deuda o despliegues excluidos.

La acumulación de funciones internas no requiere declaraciones administrativas adicionales para autorizar el alcance ya instruido. No se representa una persona como dos revisores independientes ni se crean firmas. La revisión técnica puede ser automatizada y Codex informa resultados reales; no transforma la ausencia de otro humano en veto. El PO puede revisar el resultado concreto sin que esa lectura se imponga como ratificación rutinaria para desarrollar lo autorizado.

## 3. Integridad y trazabilidad

Toda entrega material conserva instrucción/decisión fuente, alcance, versiones, SHA-256, fuentes, dependencias, delta, riesgos y evidencia de verificaciones. No se exige aprobación separada de cada byte derivado dentro de la autorización integral. No se atribuye firma PO a bytes futuros o no firmados: se registra la autorización de la actividad y los hashes resultantes. Activación/efectividad sólo se registra cuando el acto está incluido, se ejecutó realmente y sus punteros/manifiestos concuerdan. Una exclusión expresa impide ese acto, sin bloquear la preparación independiente.

## 4. Separaciones operacionales preservadas

Se preservan el modelo canónico y físico aprobado, contratos de backend/frontend y su evolución trazable autorizada, IAM/RBAC, mínimo privilegio, aislamiento multi-tenant, integridad transaccional, auditoría, seguridad, privacidad e historia. La gobernanza interna del desarrollo es distinta de la SoD operacional que ofrece GRC a los clientes: Evidence submit/approve, Action complete/verify, risk acceptance, Audit y credenciales conservan sus policies y actores cuando correspondan. No hay permiso, grant, estado, tabla ni excepción operacional nueva por esta regla.

Se mantienen las revisiones de Evidence crítica, verificación de acciones, aceptación de riesgos, independencia Audit cuando la policy la exige y acceso reforzado a credenciales. Las publicaciones y revisiones de contenido regulatorio del producto conservan sus controles; no se atribuye permiso operacional al PO por esta decisión interna. La configuración SaaS ordinaria no se confunde con esos actos ni exige universalmente acreditación jurídica.

## 5. Obligaciones externas demostradas

Sólo una restricción externa efectivamente aplicable, con fuente/cláusula y objeto concretos, puede restringir el acto correspondiente. No se inventa ley, contrato externo, certificación, revisor o responsable. No se declara cumplimiento ni se dispensa una obligación externa real. Se documentan consecuencia y alternativa compatibles y se continúa el trabajo no dependiente.

## 6. Precedencia documental y proporcionalidad

Tras su activación formal, esta regla sucede las directivas administrativas internas anteriores contradictorias de06/43/45/46/47 y sus contratos. Mientras es candidata, la instrucción PO autoriza preparar esa modificación y la v1.11 permanece intacta. No se convierte una contradicción interna en bloqueo permanente. La precedencia se limita al gobierno de desarrollo; no cambia la selección de observaciones por SourcePrecedencePolicy ni reglas de retención/suficiencia de los clientes.

## 7. Límite de la presente tarea

Sólo documentos y contratos candidatos, sin backend/frontend, DB/migración, runtime, QA/PROD, activación, commit/push/merge ni despliegues. STEP_6A3=PARTIAL_BLOCKED; H01–H10 suspendidas como tarea actual sin PASS retroactivo; STEP_6A4=NOT_STARTED. No se autoriza ampliación funcional, deuda, cambio arbitrario de arquitectura ni self-service previo a completar Fase10.
