# TCDX GRC — Infraestructura conocida y límites actuales

## Repositorio

`Tecdex-SpA/tcdx-grc`

## Base de datos

Servidor existente: `192.168.2.40`
Motor: PostgreSQL 16
Nueva base: `tcdx-grc`

La base es nueva y debe reflejar exclusivamente el Canonical Data Model de TCDX GRC.

## Aplicación

Topología canónica conocida:

| componente lógico | función | FQDN | IP |
|---|---|---|---|
| `bk-grc` | backend modular monolith y workers | `grc-bk.tcdx.int` | `192.168.2.45` |
| `www-grc` | frontend React/Vite | `grc-www.tcdx.int` | `192.168.2.46` |
| `ia2.tcdx.int` | motor IA existente consumido como servicio | `ia2.tcdx.int` | servicio externo a la topología GRC; sin VM GRC adicional |

`bk-grc` y `www-grc` son nombres lógicos de componente y se materializan exclusivamente en los FQDN/IP aprobados de esta base rectora. No existe un destino de despliegue `ia-grc`. El backend GRC consume el servicio existente `ia2.tcdx.int`; cualquier cambio de proveedor, FQDN, topología o creación de una capa IA desplegable separada requiere ADR humano y nueva versión rectora antes de implementación.

El stack, topología objetivo, almacenamiento, secretos y observabilidad están cerrados en 43. La indisponibilidad actual de las VMs no reabre esas decisiones; su creación pertenece a la fase de infraestructura.

## IA

- integración/orquestación IA: responsabilidad del backend GRC bajo autorización, provenance y supervisión humana
- motor/proveedor de modelos: servicio existente `ia2.tcdx.int`

La aplicación no debe acoplar reglas de negocio al proveedor de modelo.

## Proyecto anterior

`tcdx-iso-saas-v4` no constituye dependencia runtime ni schema legacy obligatorio. Su función es aportar conocimiento, funcionalidades aprendidas, patrones válidos y evidencia de errores que no deben repetirse.
