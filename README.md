# TCDX GRC

Repositorio oficial del producto TCDX GRC.

## Estado del proyecto

**BOOTSTRAP_GOVERNED**

Los documentos rectores definitivos se encuentran en proceso de revisión externa y todavía no forman parte de este repositorio.

Hasta que el baseline rector sea aprobado, versionado y activado, este repositorio sólo autoriza:

- gobierno del desarrollo;
- estructura documental;
- controles CI/CD;
- preparación técnica no funcional que no defina contratos de producto, datos, API, backend o frontend.

No se autoriza todavía:

- diseño físico definitivo de base de datos;
- migraciones o DDL ejecutable;
- backend funcional;
- frontend funcional;
- contratos API ejecutables;
- implementaciones de IA;
- ampliación o reinterpretación del alcance rector.

## Repositorios y arquitectura objetivo

- Desarrollo: `Tecdex-SpA/tcdx-grc`
- Design system, sólo lectura: `Tecdex-SpA/tecdex-design-system`
- Base de datos: `192.168.2.40`
- Backend futuro: `192.168.2.45` / `grc-bk.tcdx.int`
- Frontend futuro: `192.168.2.46` / `grc-www.tcdx.int`
- Motor IA de apoyo: `ia2.tcdx.int`

## Regla de consistencia

La autoridad arquitectónica seguirá esta cadena:

`baseline rector -> modelo canónico -> modelo físico PostgreSQL congelado -> backend -> frontend`

Ninguna capa posterior puede redefinir silenciosamente una capa anterior.

Ver `AGENTS.md` y `docs/governance/CODEX_RECTOR_ENFORCEMENT.md`.
