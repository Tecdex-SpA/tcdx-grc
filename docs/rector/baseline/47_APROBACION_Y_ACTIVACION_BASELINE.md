# 47 — Aprobación y activación v1.8

## Decisión humana

El mandato expreso del Product Owner del 2026-10-09 autoriza preparar, validar, publicar y activar la enmienda interna precisa, sin nueva aprobación de activación. Fuente: docs/governance/amendments/INTERNAL_REVIEW_v1.8_20261009/HUMAN_AUTHORIZATION.md. Se activa TCDX_GRC_MASTER_REGENT_BASELINE_v1.8_2026-10-09 sobre v1.7, preservada íntegra bajo history.

## Alcance

Únicamente 00/22/43/45/46/47/49: revisión humana unipersonal por funciones acumuladas, segunda persona interna no obligatoria por defecto, y author + approve editorial/metodológico interno expresamente permitido. Se preservan íntegros controles operacionales, obligaciones superiores, entidades, contratos de producto, migraciones y fases. SOG v2 no se activa.

## Activación comprobable

La fecha UTC efectiva y SHA-256 del manifest se registran en docs/rector/ACTIVE_ACTIVATION.json tras materializar el delta; su coherencia se comprueba mediante verify-rector-governance.sh y verify-internal-governance.py. BASELINE_ID, BASELINE_STATUS, RECTOR_MANIFEST.sha256 y baseline/SHA256SUMS.txt deben concordar. Una falla bloquea consumidores. La evidencia técnica se conserva fuera de la baseline inmutable. No se declara PASS de gates técnicos antes de ejecutarlos.

## Límites

La publicación de esta enmienda no publica CT01/03/04, CFG-D none, grants ni vocabularios pendientes del manifiesto macro firmado. DDL queda limitado a entorno local aislado descartable expresamente autorizado; no QA, IAM real ni despliegue. La condición CI/revisión humana previa a integración en main permanece.
