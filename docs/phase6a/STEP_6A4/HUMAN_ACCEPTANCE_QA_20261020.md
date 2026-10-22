# STEP6A4 — aceptación humana específica de QA

Estado: **PENDING**. Destino exclusivo: https://grc.tecdex.net/. Empresa: **TecDex**, mediante cuenta humana existente. No conceder roles, inventar datos ni cambiar permisos para ejecutar esta revisión. La revisión puede comenzar ahora sobre el frontend publicado; la aceptación funcional integral requiere resolver los escenarios y actores pendientes de la matriz.

## Revisión breve de presentación

En escritorio y a390px, abrir **Nuevo registro**, revisar campos/grupos/ayudas, navegar con Tab y Shift+Tab, provocar un envío vacío, corregir un campo y comprobar que las otras entradas permanecen. Cerrar con Escape y comprobar retorno al disparador. No guardar contenido inventado. Verificar acceso al botón inferior mediante desplazamiento. Las capturas técnicas no sustituyen la decisión humana.

| Pantalla y formularios | Actor/permiso existente requerido | Revisión y resultado esperado |
| --- | --- | --- |
| Cumplimiento → Aplicabilidad; FORM-01..03 | Responsable de cumplimiento autorizado; `compliance.applicability.create/submit/approve` según operación, scope/ObjectPolicy vigentes | Marco → Requisito, decisión y fundamento condicional, fechas de empresa; errores precisos. Para envío/aprobación se necesita registro auténtico en estado válido y actor elegible. |
| Requisitos; FORM-04..07 | Responsable de cumplimiento autorizado; `compliance.requirement_assessment.create/update/submit/approve` | Aplicabilidad y metodología autorizadas; configuración opcional ausente se omite. Inicio/aprobación muestran confirmación y estado resultante; resultado requiere evidencia auténtica. No autoaprobar. |
| Cumplimiento → Declaración de aplicabilidad; FORM-08..09 | Actor con `compliance.soa.create/publish` | Agregar elemento, elegir Control y su ControlVersion, decisión/justificación/implementación; comprobar ambos pares de versión. Publicar sólo una SoA real y preparada. |
| Controles → Controles/Evaluaciones de control/Pruebas de aseguramiento; FORM-10..20 | Responsable de control/prueba y revisor/aprobador existentes; permiso exacto de cada fila de la matriz | Referencias y versiones dependientes, campos contractuales, muestras con enteros seguros y períodos UTC. Para FORM-18 se requiere prueba auténtica en progreso: la prueba visible está aprobada. No alterar esa prueba para alcanzar el editor. |
| Evidencias → Solicitudes/Evidencias; FORM-21..27 | Responsable de evidencia y revisor/aprobador distintos cuando corresponda; permiso exacto de la matriz | Seis destinos de vínculo, fechas opcionales y errores por fila, referencias elegibles. Crear/enviar/revisar exige archivo/procedencia/objeto auténticos y autoría/SoD correctas. No repetir carga, creación, descarga o aceptación de QA_EVID_RET_001 acreditada en STEP6A3. |
| Evidencias → Políticas de retención; FORM-28..32 | Responsable de privacidad/custodio/revisor autorizado por cada operación, según propósito y scope; `privacy.retention_policy.*` exacto de matriz | Segundos/minutos/horas/días de24h, sin meses/años; legal hold conserva semántica y elimina duración cuando corresponde. Las políticas visibles están publicadas: una decisión real nueva debe proporcionar el borrador/actores, sin modificar las publicadas. |
| Acciones → Hallazgos y brechas/Acciones; FORM-33..42 | Responsable de hallazgo/acción y verificador existente; `remediation.issue.*` o `remediation.action.*` exacto de matriz | Datos auténticos, responsable, fechas, evidencia y verificación diferenciadas. El hallazgo y acción visibles están cerrados/verificados; no reabrirlos para fabricar cobertura. |

**Los nombres de rol orientan la pantalla; no otorgan autoridad.** La columna REQUIRED_PERMISSION de `evidence/qa-20261020/FORM_QA_MATRIX.csv` contiene el permiso exacto para cada una de las42 operaciones. Sólo la proyección/backend y la política por objeto determinan acceso. Platform Admin no sustituye membresía operativa. No se inventa quién debe aprobar ni se crea una identidad para simular independencia.

## Acción humana mínima para completar la verificación funcional

El Product Owner debe identificar los escenarios QA auténticos que efectivamente desea ejecutar en cada grupo pendiente: datos de negocio, evidencia/procedencia y objeto inicial elegible, y las personas existentes que efectuarán autoría/revisión/aprobación según contrato. La matriz individual explica el estado que impide cada operación y la pantalla y permiso necesarios. Si no existe escenario auténtico, mantener BLOCKED_HUMAN_ACTION; no crear un fixture ficticio ni transformar el expediente de STEP6A3 en evidencia de STEP6A4.

Con el escenario preparado, el actor autorizado realiza la operación por UI, comprueba el resultado visible y su persistencia mediante lectura oficial y aporta correlación/resultado sin tokens. Los casos de conflicto, idempotencia, auditoría, aislamiento y SoD requieren pruebas reales suficientes y autorizadas; ninguna de esas propiedades queda acreditada por esta revisión de sólo lectura.

Al concluir, el Product Owner comunica explícitamente aceptación funcional/visual/accesibilidad de **STEP6A4**, o defectos con pantalla/formulario y comportamiento observado. La aceptación no se infiere de una captura, silencio, HTTP200 o healthcheck. STEP6A3 permanece PASS y no se vuelve a aceptar.
