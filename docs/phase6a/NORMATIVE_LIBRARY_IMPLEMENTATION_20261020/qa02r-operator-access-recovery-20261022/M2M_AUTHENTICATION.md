# Identidad y custodia M2M existentes

Identidad canónica: grc-qa-iam-publisher, service_principal_id 01a13c3b-dbdd-763f-bcbb-f16ff41d99ba, MACHINE_TO_MACHINE, PLATFORM_CONTROL, tenant_id NULL, lifecycle active. Provisión audit_event_id 01a13c3b-dbe4-7603-8bd4-a397bcf6d716, outcome success, observada por SELECT read-only. No se crea ni reprovisiona identidad.

Autoridad: Andrés Barouh, PO/Seguridad-IAM/DBA, decisión DR-STEP6A3-IAM-M2M-QA-20261014-01 en docs/phase6a/STEP_6A3/IAM_M2M_QA_DECISION_RECEIPT_20261014.json. Perfil público iam/config/step6a3-m2m-qa-profile.json, SHA2566c4bc99b0d25fb75cf67ad8dd8818f1dff1c430c031b1c642b11d0a408ca00f7; decisión SHA256aa509b568c2ccee57f2caf96578dd51a6ffc1187698debbf233cdc9c40b9f72a. Coinciden con provisión y configuración física de los operadores.

Proveedor: Keycloak realm tcdx-managed-identity, issuer https://iam.grc.tecdex.net/realms/tcdx-managed-identity. Client ID igual al principal, audience tcdx-grc-api. La autenticación canónica es OAuth2 client_credentials con HTTP Basic al endpoint del issuer /protocol/openid-connect/token; verifica firma RS256 con el JWKS publicado. No emplea la contraseña SSH o PostgreSQL.

Cada operación IAM obtiene prueba fresca. Exige principal_class MACHINE_TO_MACHINE, issuer/audience/azp/client_id coherentes, sub/jti/iat/exp, lifetime máximo300s, tolerancia máxima5s y ausencia de roles administrativos Keycloak. Resuelve el ServicePrincipal vigente mediante perfil/decisión/auditoría de provisión y subject/issuer hashes. No asigna PLATFORM_ADMIN a una máquina ni le concede acceso humano general. Su autoridad de publicación es la ceremonia interna aprobada; Permission/RolePermission nuevos de Biblioteca son datos publicados para roles funcionales, no privilegios humanos del principal técnico.

Custodia física comprobada por metadata, sin leer contenido:

- Host QA: /home/tecdex/.secrets/tcdx-grc-qa/iam-publisher-client-secret, archivo regular no symlink, UID/GID1000, modo0600.
- Contenedores históricos: montaje read-only a /run/secrets/iam_publisher_client_secret, archivo0600 y propietario igual al proceso.
- Configuración no sensible: /home/tecdex/.config/tcdx-grc/step6a3-iam-m2m-20261014 y variante step6a3-c04w-final-20261015, directorios0700.

Los valores secretos no salen de la VM. Una sesión Codex autorizada usa SSH tecdex y el proceso canónico en esa VM; no necesita copiar el secret al Mac ni a otra cuenta. PO_CREDENTIAL_ACTION_REQUIRED=NO en el estado observado. La presencia/formato de metadata no acredita que Keycloak aún acepte el valor: QA02R no leyó el secret ni solicitó tokens. Una comprobación futura debe ejecutarse en el autenticador canónico antes de cualquier publicación, sin exponer el token.

Si en otra ejecución la custodia realmente faltara, el mecanismo histórico documentado es scripts/phase6a3/store-iam-publisher-secret.py: entrada interactiva oculta con getpass en la cuenta tecdex de la VM y creación exclusiva0600. El administrador autorizado obtiene la credencial **existente** del cliente grc-qa-iam-publisher en el realm indicado mediante la administración Keycloak; no regenerar ni rotar. El script no debe ejecutarse ahora: el archivo ya existe y O_EXCL evita sobreescribirlo. No se requiere ni se solicita aportar su valor por ChatGPT/Codex, argumentos, archivos del repositorio o mensajes.

Sesión administrativa reutilizable: SSH tecdex, SÍ comprobada. Sesión GRC humana: no inspeccionada, no se extrajeron cookies/tokens; existen dos identidades activas con asignación Platform Admin, pero ese conteo no prueba una sesión browser vigente. La rama IAM Library no requiere una sesión browser humana; H04 futuro mantiene su contexto humano canónico independiente.
