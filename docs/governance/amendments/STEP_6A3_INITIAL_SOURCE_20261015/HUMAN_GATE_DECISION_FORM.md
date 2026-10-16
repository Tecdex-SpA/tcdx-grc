# Decisiones humanas sobre nuevos bytes — formulario sin firmar

`PO_DESIGN=APPROVED_RECORDED; EXACT_SUCCESSOR_BYTES=PENDING; SIGNATURE=NOT_PROVIDED`

El PO ya aprobó la propuestaSHA1a133d60e576208eefc90d68ff39df903df829f3c9ab1b3c51fa06d8c826913b; no se le pide reiterarla. Las aprobaciones A01–A13/cuatro/seis anteriores conservan su efecto. Esta revisión solicita sólo los bytes **nuevos** del manifest NEW_BYTES_REVIEW_MANIFEST.json, su candidata v1.11/manifest rector y dictamen físico técnico adjunto.

| Gate | Quién debe decidir realmente | Artefacto exacto / acto |
|---|---|---|
| Activación sucesora y arquitectura | Architecture Owner / autoridad rectora competente |51archivos de candidata v1.11, SHA256SUMS y delta exacto. Autorizar activación por hashes y alcance INITIAL_SOURCE conforme47, sin alterar historia. |
| Compatibilidad física | Data Model Owner | PHYSICAL_COMPATIBILITY_REVIEW_CANDIDATE.md y evidencia PG16 READ_ONLY. Dictamen sobre consumo del esquema existente sin DDL previsto, condicionado a pruebas aisladas del flujo antes de afirmar ausencia final de migración. |
| Seguridad/privacidad técnica y contratos | Security & Privacy Reviewer, Architecture/Backend y owners técnicos competentes | Nuevo ObjectPolicy, draft source-only, per-object SoD, bloqueo de consumo y un comando/audit, OpenAPI/matriz/storage/referencias/UI. Aprobar nuevos bytes para publicación; no concede permisos. |
| Release QA | QA/Release Owner | Acto posterior por source SHA/imágenes/gate manifest y resultados reales que aún no existen. No se firma un hash futuro ni se autoriza por el deseo PO de avanzar. Estado actual BLOCKED_DEPLOY_AUTHORITY. |
| Operación legal y aceptación | Privacy/Legal tenant, revisores independientes y autoridad QA | Documento auténtico/actos H01–H10 y UI de la versión efectivamente desplegada. No sustituibles por aprobación editorial. |

Rector49 permite que el PO ejerza varias funciones editoriales internas si **las declara expresamente** en un acto real. No se exige inventar otras personas o acreditaciones, pero tampoco se atribuyen funciones no declaradas. La decisión PO recibida sólo registra Product Owner. SoD operacional sigue por objeto y usuarios reales.

Plantilla de acto inmediato, sin completar por Codex:

```text
Identidad humana:
Funciones editoriales/técnicas efectivamente ejercidas para este acto:
Fecha/hora UTC real comunicada del acto:
Manifest NEW_BYTES_REVIEW_MANIFEST.json: SHA-256 exacto:
Candidata rectora v1.11: SHA-256 exacto de SHA256SUMS.txt:
Archivos/alcance decididos, según manifest:
Dictamen Data Model sobre estructuras existentes y condiciones de pruebas:
Decisión Architecture y Security/Privacy técnica sobre estos bytes:
Decisión de publicación/activación de sucesoras y límites:
Observaciones/rechazos/parciales expresos:
Firma o mecanismo humano verificable:
```

Ese acto no será presentado como consentimiento del responsable legal del tenant, revisión de Evidence ni QA humana, ni aprobación de código o imágenes aún no generados. Si hay decisión parcial, sólo se habilitan sus dependencias satisfechas y se conserva el resto pendiente.
