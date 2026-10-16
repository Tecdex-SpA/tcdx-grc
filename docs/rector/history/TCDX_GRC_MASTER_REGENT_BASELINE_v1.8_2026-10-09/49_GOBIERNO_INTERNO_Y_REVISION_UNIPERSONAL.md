# 49 — Gobierno interno y revisión humana unipersonal

## 1. Alcance y autoridad

Versión 1.0, adoptada mediante DR-INTERNAL-REVIEW-V18-20261009 en la baseline v1.8. Vigencia efectiva: la registrada en docs/rector/ACTIVE_ACTIVATION.json, después de publicación y comprobación técnica. Esta regla modifica exclusivamente el gobierno editorial y metodológico interno de contratos técnicos, arquitectura, backend, seguridad, IAM, privacidad/datos, compliance y metodologías/reglas globales internas. No modifica permisos operacionales del producto.

El Product Owner puede acumular estas funciones y aprobar con una sola firma humana expresa, indicando las funciones ejercidas. No existe por defecto obligación de una segunda persona revisora interna ni de acreditación separada de cada función. Una persona no se representa como dos revisores independientes. Se requiere revisión humana independiente cuando el PO la ordene específicamente o cuando una obligación superior aplicable la imponga.

## 2. Autor y aprobador de metodología/regla global interna

La separación author + approve de 22 §6 no impide que el PO sea autor, revisor y aprobador del texto editorial o metodológico interno. La excepción de alcance es normativa y expresa; no habilita comandos de autoaprobación en GRC, no concede grants, no constituye excepción de ObjectPolicy ni sustituye las policies operacionales que exigen motivo y AuditEvent.

## 3. Controles compensatorios obligatorios

Cada adopción conserva identidad humana, funciones ejercidas, decisión exacta, versión, manifest con SHA-256 de los bytes UTF-8 o binarios correspondientes, fuentes, dependencias, riesgos, pruebas positivas/negativas, fecha efectiva real y registro histórico inmutable. La suficiencia de una metodología se acredita por versión con reglas oficiales y pruebas; la acumulación de funciones no acredita suficiencia matemática o semántica. Los gates técnicos no se dispensan. Codex prepara y verifica; nunca firma ni aprueba en nombre del humano.

Una aprobación macro puede comprender múltiples artefactos exactos. Si sus hashes aún no fueron presentados y aprobados, la autorización funcional general no los publica. Cambios posteriores materiales exigen nuevo delta trazable. Una aprobación de gobierno interno no autoriza operaciones de BD, IAM, QA ni despliegue.

## 4. Separaciones y controles preservados

Se conservan submit/approve de la misma Evidence, complete/verify de la misma Action, request/approve de la misma risk acceptance, execute AuditTest/approve final conclusion cuando el tenant exige independencia, y configure connector/approve privileged credential access bajo política reforzada. Se conservan controles editoriales de packs regulatorios de 41/42, fuera de esta enmienda; su revisión específica no se dispensa por arrastre.

Permanecen multi-tenant estricto, default DENY, mínimo privilegio, Platform/Tenant authority separadas, RBAC + entitlement + scope + ObjectPolicy, auditoría, procedencia, versionado e integridad histórica. No se modifica esquema canónico ni autorización runtime. Las prohibiciones SoD de comandos de producto y las policies de publicación de ConfigurationDefinition o RetentionPolicy siguen aplicables.

## 5. Obligaciones superiores

La ley, regulación, contrato externo o certificación aplicable prevalece en su ámbito. Si exige independencia, se identifica fuente exacta, cláusula, aplicabilidad y acto mínimo bloqueado; el PO no la deroga. La ausencia de una fuente externa identificada no se convierte en requisito inventado. Esta enmienda no declara cumplimiento ni certificación.

## 6. Precedencia y límites

49 prevalece únicamente sobre exigencias internas de segunda persona y sobre author + approve editorial/metodológico interno de 22 §6 y roles internos de 43 §6. No reemplaza otras prohibiciones SoD ni fuentes superiores. 45 conserva decisión humana expresa y presupuesto cero. 46 conserva la cadena de autoridad y gates. SOG v2 continúa DRAFT_NOT_EFFECTIVE. La secuencia 6A.3 → 6A.4 → ZIP normativo → 6A.5 se preserva. No se dispensa CI/revisión humana antes de integrar main.
