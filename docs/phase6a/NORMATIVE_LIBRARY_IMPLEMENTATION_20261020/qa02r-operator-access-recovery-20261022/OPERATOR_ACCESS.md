# Operador canónico y acceso

Componente: operador privado de publicación compartido con catálogo comercial, en grc-bk/192.168.2.45. No es endpoint HTTP de la aplicación ni un servicio del Mac. Conexión administrativa comprobada: `ssh tecdex@192.168.2.45`. No requiere transferir credenciales M2M entre cuentas Codex.

Fuentes locales: apps/backend/src/security/publication-operator-server.ts inicia el proceso; commercial-catalog-operator.ts mantiene el socket y valida requests; iam-publication-operator-cli.ts es el cliente local del proceso; iam-publication-runtime.ts carga perfil/contratos/inputs; iam-publication.ts autentica; normative-library-publication.ts publica exactamente IAM+B06+Definitions en transacción. H04 conserva su vía interna humana separada.

Desde /app en el runtime QA configurado, el comando canónico es:

```sh
node apps/backend/dist/security/publication-operator-server.js
```

No se ejecutó en QA02R. Requiere NODE_ENV=qa, configuración backend autenticada, par JWT de aplicación, conexión PostgreSQL, ocho variables de perfil IAM (cuatro rutas y cuatro hashes), manifiesto comercial aprobado, TCDX_COMMERCIAL_CATALOG_OPERATOR_SOCKET y TCDX_QA_EXISTING_SESSION_ORIGIN. La configuración Library posterior requiere además ROOT, INPUT_FILE e INPUT_SHA256 bajo el prefijo TCDX_LIBRARY_PUBLICATION_. El proceso no publica al iniciar; tampoco ofrece modo seguro/estado/health específico.

El procedimiento histórico documentado de creación de contenedor está en scripts/phase6a3/qa-iam-publication-runtime.py, interfaz `python3 ... IMAGE_ID SOURCE_SHA CONFIG_DIRECTORY`. Verifica host grc-bk, imagen amd64/source hash, configuración protegida y custodia existente, y ejecuta Docker con filesystem read-only, tmpfs y no-new-privileges. Es un despliegue y no se ejecutó ni se recomienda ejecutarlo con parámetros supuestos dentro de QA02R. Sus variantes históricas c04w-lifecycle e initial-source conservan el mismo entry point.

Los siguientes sockets se comprobaron activos. Dentro de cada contenedor, todos se presentan como /run/tcdx-operator/catalog.sock; en el host son distintos:

| Contenedor | Socket en /home/tecdex/.config/tcdx-grc/ | Acceso |
| --- | --- | --- |
| tcdx-grc-step6a3-publication-operator | step6a3-iam-m2m-20261014/operator/catalog.sock | CONNECTED_NO_BYTES |
| tcdx-grc-step6a3-c04w-publication-operator | step6a3-iam-m2m-20261014/operator-c04w/catalog.sock | CONNECTED_NO_BYTES |
| tcdx-grc-step6a3-c04w-lifecycle-operator | step6a3-c04w-final-20261015/operator-lifecycle/catalog.sock | CONNECTED_NO_BYTES |
| tcdx-grc-step6a3-initial-source-operator | step6a3-iam-m2m-20261014/operator-initial-source/catalog.sock | CONNECTED_NO_BYTES |

Propietario host y proceso UID1000/tecdex; directorios0700, sockets0600. Acceso sólo desde contexto OS autorizado, por ejemplo la cuenta SSH existente y docker exec en el contenedor apropiado. No se requiere chmod, copia del socket o forwarding público. No se copió ni leyó una sesión ajena.

El CLI canónico recibe exactamente SOCKET y operación. La forma futura para Biblioteca, sólo tras disponer del runtime correcto y una orden que reanude QA02, es `node apps/backend/dist/security/iam-publication-operator-cli.js /run/tcdx-operator/catalog.sock iam.library.publish` dentro del ejecutor preparado. **No ejecutar esa forma contra los contenedores históricos actuales**: los cuatro carecen del dispatch y publisher Library. No usar iam.publish genérico como sustituto.

Los requests IAM transportan operation/correlation_id; el servidor obtiene una prueba M2M fresca desde custodia, no confía en un ID aportado por el cliente. La otra rama del mismo socket, publicación comercial, exige bearer humano Platform y manifiesto exacto. Un login SSH, una cuenta postgres y una sesión humana no sustituyen el proof M2M.

Cierre canónico: SIGTERM/SIGINT cierra el listener, espera conexiones, elimina sólo el socket con inode/dev propio y destruye el pool. QA02R no envió señales a procesos históricos. No hay proceso diagnóstico persistente nuevo que detener.

Clasificación del bloqueo: operador no iniciado=NO; otro contexto=VM/contenedor; socket inexistente=NO en QA; otra ruta=SÍ, ver tabla; permisos incompatibles=NO para tecdex; credencial ausente=NO en QA; configuración Library incompleta=SÍ; incompatibilidad entre cuentas Codex=NO demostrada; sandbox local=EPERM resuelto por ejecución autorizada; versión remota sin Library=SÍ.

Ejecuciones anteriores: QA_RUNTIME_PUBLICATION_RELEASE_EVIDENCE_20261014 registra client_credentials real, publicación/replay y denegación de autoridad humana al M2M. STEP_6A3_QA_DEPLOY_HANDOFF_RESULT_20261015 registra la publicación inicial posterior. Son evidencia histórica; QA02R no las repite ni afirma vigencia de un token anterior.
