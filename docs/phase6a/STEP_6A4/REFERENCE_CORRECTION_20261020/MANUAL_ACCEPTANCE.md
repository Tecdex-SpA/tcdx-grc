# Aceptación manual P3/P5 — pendiente del Product Owner

La corrección está en el workspace local. **No está publicada en QA**. El PASS de despliegue anterior no incluye estos cambios. No ejecutar esta guía en `https://grc.tecdex.net/` suponiendo que ya contiene la corrección. Se necesita una vista local configurada para lecturas autorizadas o, posteriormente, una publicación autorizada por separado. El servidor local puede iniciarse con `pnpm --filter @tcdx-grc/frontend dev --host 127.0.0.1`; la autenticación y el acceso al API deben estar configurados para esa vista. No se modificaron esos contratos en esta tarea. Si la vista local no puede autenticarse, informar esa limitación; no cambiar IAM para realizar esta revisión.

El PO pidió realizar personalmente las pruebas de navegador e informar después. No se ejecutarán más pruebas automáticas en navegador en esta tarea. La guía siguiente revisa presentación y selección sin nuevas escrituras de negocio. No pulsar «Crear registro» con datos válidos: ese clic ejecutaría un comando y requiere una autorización operativa independiente. No repetir FORM-05.

## Solicitar evidencia — `/evidencias`

1. Abrir **Solicitar evidencia**. Revisar que «Tipo de origen» indique obligatoriedad y explique que debe elegirse un único objeto. Los tipos disponibles deben ser requisito, control, evaluación de requisito, evaluación de control o prueba de control.
2. Sin seleccionar origen, intentar continuar. Debe aparecer un mensaje junto al tipo de origen y en el resumen. Pulsar «Objeto de origen» en el resumen: el foco debe ir al selector. No debe crearse ningún registro.
3. Elegir **Requisito**. El selector de requisito debe esperar al marco normativo. Elegir un marco y un requisito auténticos disponibles. Cambiar de marco: el requisito anterior debe quedar vacío. El marco es un filtro y no un segundo origen.
4. Elegir cada otro tipo de origen y un registro existente cuando esté disponible. Debe mostrarse solo el selector correspondiente. No debe pedirse una versión de control para esta solicitud.
5. Elegir un responsable y cambiar el tipo de origen. La referencia anterior y el responsable deben borrarse. Elegir otro registro dentro del mismo tipo también debe limpiar el responsable, que se consulta para el nuevo objeto.
6. Verificar que responsable y fecha límite sean opcionales. Cambiar el origen sin seleccionar todavía su nuevo registro e intentar continuar: debe impedirlo y orientar al origen pendiente. Seleccionar el registro debe retirar el error. Terminar cancelando, sin guardar.

## Registrar hallazgo — `/acciones`

1. Abrir **Registrar hallazgo**. Deben ofrecerse solo evaluación de requisito, evaluación de control y prueba de control como tipos de origen.
2. Intentar continuar sin origen: debe aparecer el mensaje junto al selector y el enlace del resumen debe llevar el foco al tipo de origen.
3. Elegir un tipo y un registro auténtico disponible. Cambiar sucesivamente a los otros tipos: solo debe mostrarse el selector activo y no debe conservarse el registro anterior. No seleccionar requisitos o controles adicionales como orígenes auxiliares.
4. Verificar que el rol del origen es obligatorio e independiente del objeto elegido. Responsable de negocio y fecha límite son opcionales y deben conservarse al cambiar de origen.
5. Cambiar de tipo sin elegir registro e intentar continuar: debe impedirlo. Completar el origen debe retirar el error. Terminar cancelando, sin guardar.

## En ambos formularios

Revisar con teclado y en escritorio/ancho de 390 px: etiquetas legibles, foco visible, resumen utilizable, sin desbordamiento horizontal. Si una lectura no está autorizada o no hay registros disponibles, el selector debe explicar esa condición y no aceptar una referencia invisible. La ausencia de un escenario auténtico se informa como limitación y no se suple con datos ficticios.

La comprobación del payload y los casos incompatibles se acreditan aquí mediante pruebas locales de contrato/componentes. Una prueba manual de envío válido, persistencia, autorización final o auditoría en QA queda pendiente y fuera de esta guía sin escrituras. No aceptar integralmente STEP6A4 por completar solo esta revisión.

## Resultado a comunicar

Informar por formulario: entorno/versión revisados, `ACEPTADO` u `OBSERVADO`, origen elegido, paso que falló y texto mostrado; añadir resultado de teclado y pantalla estrecha. No incluir credenciales ni tokens. Si no hay versión corregida accesible, indicar `NO_EJECUTADO_VERSION_CORREGIDA_NO_DISPONIBLE`. El agente registrará el resultado real posteriormente; `STEP6A4_HUMAN_ACCEPTANCE=PENDING` y `STEP6A4_CLOSURE=BLOCKED` permanecen hasta entonces y hasta los demás gates exigidos.
