# Contratación asistida mediante ticket - decisión PO 2026-10-22

Autoridad: `QA_FULL_FUNCTIONAL_CLOSURE_NORMATIVE_CONTRACTING_PREMIUM_UI`,
POST_STEP6A4_PRE_STEP6A5, baseline rectora v1.12. QA sin cobro; producción excluida.

El PO confirmó que tanto el PDF del ticket como los términos GRC V2 están por
diseñar. No existe un texto predecesor llamado TERMINOS_COMERCIALES_GRC_V2 en el
repositorio verificado. Por tanto no se atribuye adopción, cláusulas ni firmas a
un documento inexistente. El PDF de términos de esta entrega recoge exclusivamente
la decisión operacional aprobada y preserva los contratos canónicos existentes.

Gerencia recibe y autoriza la solicitud y emite el ticket de creación de tenant.
Operaciones verifica los datos, ejecuta comandos canónicos autorizados y registra
el resultado y entrega de acceso. El ticket es el único documento necesario para
iniciar el alta; el documento de términos no es un segundo formulario, firma o
adjunto obligatorio para crear un tenant.

El ticket identifica solicitante, empresa/tenant, identificador de ticket, marcos
y versiones, fecha, aprobación real de Gerencia, estado y responsable de
Operaciones. Incluye referencia de tenant/Subscription, activaciones y auditorías
al completarse. El formulario vacío no prueba aprobación ni contratación. Su
modalidad QA se identifica como validación sin cobro. No se introducen precios,
pagos, facturación, renovaciones, plazos comerciales o condiciones jurídicas no
decididas. No se exige un contrato PDF adicional.

Hasta completar Fase10 se conserva la contratación asistida por Platform Admin
de rector42§6, mediante tenantInitialOnboardingCreate, Subscription/PlanVersion
publicada y subscriptionRegulatoryPackActivate, sin alta autoservida ni privilegios
implícitos. Tenant TECDEX existente se reconcilia; no se crea otra empresa.
La selección o emisión de un ticket no activa permisos, no publica fuentes y no
otorga derechos ISO. Sólo versiones realmente elegibles pueden contratarse.
RegulatoryPackValidationAccess permanece separado de contratación oficial.

El ticket PDF es un documento externo al dominio, no un motor de tickets ni una
tabla nueva. La vinculación electrónica, persistencia de solicitud y estados de
aprobación deben consumir un contrato ejecutable publicado antes de implementarse;
no se guardan como autoridad en localStorage, un JSON paralelo ni un checkbox.
Los comandos actuales conservan sus esquemas cerrados, idempotencia, ETag,
autorización, aislamiento y auditoría. Esta decisión no convierte un PDF vacío en
un ticket emitido ni inventa aprobación gerencial para QA.
