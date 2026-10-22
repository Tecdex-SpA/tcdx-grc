# Autoridad y custodia específicas

La orden PO actual permite comprobar respaldos y, si faltan, crear copia lógica QA-only y restaurarla temporalmente; permite reconciliación canónica y pruebas sintéticas. Prohíbe DDL/DML/ledger QA en este trabajo salvo orden operativa posterior. No se usa la ventana previa como abierta.

Respuestas PO durante este ciclo: «sin cifrado»; «es una BD de QA, dejala en la carpeta de usuario sin problemas». Se interpreta literalmente como archivo sin cifrado adicional y custodia en la carpeta de usuario, sin inventar clave. Rector26 exige encryption at rest; FileVault ON/APFS verificado permite proteger esa ubicación. No se declara que el archivo sea ciphertext autenticado ni que pueda trasladarse sin protección equivalente. No se ha publicado una excepción rectora o un contrato nuevo.

Directorio privado `~/.tcdx-grc-qa-recovery/`0700 y referencia opaca hija0700; dump0600. Custodio: cuenta local del PO andresbarouh. Retención operativa: conservar como recuperación hasta revisión/adopción y decisión explícita de disposición; sin borrado programado ni política comercial de retención inventada. El recibo documenta esa custodia y sus límites. Los datos en sesión desbloqueada siguen siendo sensibles.

Restaura sólo en PG16.15 temporal, red none, PGDATA tmpfs, sin montajes de archivos QA, puertos, credenciales ni servicios de aplicación. Se usan roles NOLOGIN como soporte de ACL de esa copia, sólo dentro del contenedor. Todos los contenedores/volúmenes temporales se destruyeron; la copia autorizada se conserva en el volumen protegido. No hay dumps, claves o filas de datos en el repositorio. Metadatos/contadores/hash sanitizados son la única evidencia versionable.

Los errores SSH del expediente anterior no se repitieron. Se pidió la elevación local de sandbox para consultar FileVault/usar Docker y escribir la copia autorizada fuera del workspace; no se cambiaron privilegios, credenciales o políticas QA.
