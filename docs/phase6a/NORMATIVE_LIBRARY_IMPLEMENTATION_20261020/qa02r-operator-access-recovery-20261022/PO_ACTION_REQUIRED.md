# Intervención indispensable del PO

Opción B: requiere una decisión del PO para completar la disponibilidad funcional del ejecutor; no requiere suministrar credenciales ni realizar trabajo manual en las VMs.

USER_CREATION_REQUIRED=NO
ROLE_CREATION_REQUIRED=NO
PO_CREDENTIAL_ACTION_REQUIRED=NO
PO_VM_ACTION_REQUIRED=NO

El acceso SSH tecdex a grc-bk/192.168.2.45 ya está comprobado. La credencial M2M existente está custodiada en esa VM y los sockets funcionan. No pegue secretos en ninguna conversación ni copie el archivo entre cuentas. No es necesario crear, rotar o recuperar una credencial que ya está presente.

Faltan exclusivamente estas decisiones:

1. Autorizar una promoción limitada de los bytes canónicos B01–B09/H04 ya preparados localmente a un **ejecutor privado QA temporal**, conservando el backend/frontend de aplicación y las credenciales existentes. Debe incluir el montaje de fuentes/contratos e input por hashes y las tres variables TCDX_LIBRARY_PUBLICATION_*, sin ejecutar activaciones durante esa preparación. El cierre/retirada del ejecutor temporal debe formar parte del mismo alcance. Esta acción es un despliegue operacional y está prohibida expresamente por QA02R; no puede resolverse sólo arrancando los contenedores históricos, que ya están activos y carecen del código requerido.
2. Fijar destinos e intervalo para la posterior reanudación QA02: lista exacta tenantIds o declaración explícita global-only y effectiveFrom/effectiveTo. El runbook no los fija. TECDEX y ACME2 tienen las referencias observadas; ACME-1 no debe seleccionarse sin resolver por separado su falta de instancias de roles. No se solicita crear roles para resolver el acceso.

Una instrucción posterior puede autorizar esa preparación operacional y, si así lo decide el PO, delimitar por separado la reanudación QA02. La autorización conceptual de las funcionalidades no debe repetirse. No se requiere desplegar las aplicaciones para disponer de un operador privado actualizado; su ejecución y compatibilidad deben verificarse técnicamente antes de usarlo. No existe todavía un IMAGE_ID/source hash de ese ejecutor promovido que este documento pueda inventar.

Evidencia que debe aportar el PO: únicamente la decisión de alcance y los destinos/intervalo, sin secretos, capturas de credenciales o ejecución de comandos administrativos. Codex ya puede realizar las operaciones de VM autorizadas mediante la cuenta existente cuando se autorice el nuevo alcance. Las contraseñas proporcionadas en la conversación no se guardaron en archivos ni se usaron como argumentos.
