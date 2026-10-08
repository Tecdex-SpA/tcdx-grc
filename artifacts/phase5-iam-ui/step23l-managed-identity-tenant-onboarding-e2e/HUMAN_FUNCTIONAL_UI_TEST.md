Tecdex GRC — prueba funcional humana pendiente

1. Abre https://grc.tecdex.net/ con una sesión Platform Admin ya habilitada. Entra en Configuraciones → Identidades gestionadas. Mantén andres.grc sin activar y R3 pendiente.

2. Test 1: Provisionar identidad. Usa una persona y nombre de usuario nuevos autorizados; completa nombre visible y referencia de verificación, con correo opcional. Confirma la provisión, custodia la credencial temporal por el canal autorizado, pulsa «Ya custodié la credencial» y «Finalizar sólo con identidad». Comprueba que no tenga acceso a empresas y que la credencial no reaparezca al abrir el detalle.

3. Test 2: Provisiona otra identidad. Después de custodiar su credencial, usa Acceso a empresas (opcional) → Agregar acceso a empresa. Selecciona una empresa previamente inicializada con CORE_PLATFORM vigente, marca uno o varios roles del catálogo runtime, indica el motivo y pulsa Incorporar a empresa. Confirma la empresa, membresía activa, roles y resultado leído desde servidor. ACME-1 tiene cero roles/membresías/suscripciones: se preservó y no sirve como prueba positiva de este flujo sin una recuperación aprobada independiente.

4. Test 3: Abre una identidad existente → Acceso a empresas. Agrega acceso a una empresa elegible o administra sus roles. Si ya tiene membresía, confirma que se conserve y que sus roles anteriores permanezcan. Una incorporación a otra empresa debe mantener sus accesos independientes. Comprueba la recuperación de una asociación pendiente sin reprovisionar ni mostrar nuevamente la credencial.

5. Test 4: Comprueba que Acceso a empresas y Roles de plataforma sean secciones distintas. Asignar rol de plataforma debe mostrar sólo el catálogo Platform; el catálogo de la empresa debe contener sólo roles tenant.

6. Test 5: En una sesión Tenant Admin con su contexto de empresa, abre Usuarios → Agregar usuario. Busca exactamente una identidad existente y confirma que conserve el flujo Membership/roles. Tenant Admin no debe poder provisionar Managed Identity. La invitación Zoho debe figurar como Invitación con identidad corporativa Zoho, separada de Agregar usuario.

7. Registra el resultado funcional y visual humano sin enviar contraseñas temporales, tokens o capturas con secretos. Codex no ejecutó estas pruebas positivas en QA y no aprobó el gate humano.
