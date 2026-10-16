# QA30 R2 — resultado de promoción pareada

`2026-10-13 20:34:49 UTC`. Rama fuente `fix/qa-functional-commercial-onboarding-20261013`, HEAD `290d975d80ebcd859587e3577ed7985066b39525`. GO humano exacto R2 de 15 minutos, recibo local protegido `.release-custody/20261013/functional-plan-qa30-r2-go-receipt.json`, SHA-256 `c28ce93da6c740f6e5462a011ec4e109db13694720b87dad51a94eef43856c3d`, ventana `20:31:17–20:46:17 UTC`. Recibo y ejecución detallada permanecen fuera de Git.

Preflight de solo lectura `PASS` en ambos hosts: IDs, imagen anterior, health, huella de configuración, imagen de rollback, TLS/CA y artefactos locales exactos. Driver R2 SHA-256 `c75edf88f9584f5efea8e930f4f4bff18b5399adcc6c33b95b54facaa46949d6`; promotor R2 SHA-256 `5f4ed60a4b4ff5451213049a74da61701dca808f214ab690b26295c02841045b`. Ejecutado una vez: `loaded`, `preflight`, `park`, `deploy`, `post-config` y `capture-logs` terminaron `PASS` para la pareja. Resultado `QA_DEPLOY_STATUS=DEPLOYED`, sin rollback activado.

| Host | Activo observado, imagen exacta | Estado | Contenedor anterior conservado |
|---|---|---|---|
| Backend `192.168.2.45` | `7ecebfec9a6695133fb10addf7197fec173b8a7b48c7d5454f45f3f2b53e41f6` · `sha256:59479e69ece15ae654498b637a6be5a66f0d4f0a56e00ffbea7c8cb6d3f22b49` | running, healthy, restart 0 | `88d54bee4116a182c41d080ec1bf88f9d58e262056af5715f8c643f0846b6062`, exited, imagen `sha256:3be791953c806bbb24556526f06adfa73b364f374856a4f8102e5db9521d3cee` |
| Frontend `192.168.2.46` | `659adc0c82b55f0f3ad66f88ae36ca70059c1c287345dc3a9cf4215fcefb91b8` · `sha256:461f6605c6dabded45a697d7fea40b534e78faaea9abc1eba678e3e13d117804` | running, healthy, restart 0 | `91dd4933c972f0cdf6107a7f643d179f02d2e420fe7f13187d4b07de2c67765c`, exited, imagen `sha256:2936ac99ed0fea65354f4e55f2b9f3d0fe431ab72a5a4f47c97bc31fc0768ab1` |

Comparación de Config/HostConfig, mounts y red `PASS`, cero diferencias no autorizadas. Logs sanitizados completos: cero secretos, fatales, errores SQL, 5xx inesperados o reinicios. CA pública anclada SHA-256 `0a99469321c1117cdf3154a7e5c5e50dd42f719af7b8b1a647fa0bb55179519b`. Transacción PostgreSQL de lectura: TLSv1.3, `ssl=true`, servidor `192.168.2.40`, BD `tcdx-grc`, `transaction_read_only=on`, 30 migraciones, última `20261007000200`.

`https://grc.tecdex.net/` devolvió 200/TLS válido. `/api/v1/auth/providers` 200; `/api/v1/platform/plan-versions` 401 sin sesión, confirmando la ruta protegida; `/api/v2/auth/me/authorization` 401; `/api/v1/auth/me/authorization` 404; referencias QA32 404. CSS y JS públicos respondieron MIME correcto y SHA-256 exacto del manifiesto R2. No se ejecutaron DDL/DML, migraciones, grants ni cambios IAM, DNS o Caddy.

Consulta agregada de solo lectura: 3 `PlanVersion` publicadas y vigentes seleccionables según el predicado del endpoint; 1 suscripción activa. Este conteo no valida autorización ni creación de una nueva suscripción.

Esta evidencia acredita despliegue técnico QA30 del selector/asignación comercial, **no** un ciclo autenticado de plan → suscripción → packs ni cierre STEP 6A.3. `humanPlanAssignment=HUMAN_VALIDATION_PENDING`; Normas QA32 y la migración `20261009000200` siguen fuera de esta pareja. `RECTOR_GATE=BLOCKED` para cierre de fase/producto; `STEP_6A3=PARTIAL_BLOCKED`; `STEP_6A4=NOT_STARTED`; `MARKET_RELEASE_READY` no acreditado. El registro detallado local es `qa-functional-execution-r2.json` (no publicar).
