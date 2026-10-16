# Plan de transición propuesto — F-01/F-05/F-06

STATUS=PROPOSED_NOT_AUTHORIZED. Estrategia propuesta: ventana anunciada de mantenimiento con suspensión de escrituras comerciales y de accesos oficiales afectados. No disponibilidad continua prometida. Sin topología nueva, segundo change-plan, fallback ni FeatureFlag como derecho. Infraestructura rector12/43: backend45, frontend46, PostgreSQL40; dominio público https://grc.tecdex.net/.

## Orden exacto y puntos de parada

| Paso | Operación futura | Entrada/autoridad | Criterio de salida / interrupción |
| --- | --- | --- | --- |
| T0 | Revisar publicación contractual y freeze de hashes | Firma del paquete+artefactos; deltas superiores publicados; modelos/ejecutables aprobados | Cualquier hash/gate distinto→NO_GO. |
| T1 | Ensayo aislado sobre base descartable con datos representativos autorizados | PostgreSQL16 local, manifest exacto, fixtures segregados | Migración/restore/rollback/concurrencia/RBAC/contratos PASS; cero datos reales inventados. |
| T2 | Inventario READ ONLY compartido y preflight | Autorización operacional exacta, conexión TLS, snapshot consistente | Ledger/checksums/IDs actuales; manifiesto de adopción por Subscription/PV/código/CAS/razón aprobado; cuotas aprobadas; conflicto activo/futuro/root→NO_GO. |
| T3 | Anunciar ventana y detener/drenar entradas afectadas | ReleaseOwner+DBA, duración y recovery points reales, backup/PITR restaurable | Suspender comandos y reads oficiales afectados y consumidores que dependan de ellos; comprobar ausencia de TX en vuelo. No sólo esconder botón. |
| T4 | Backup consistente y aplicar únicamente migraciones autorizadas | Manifest/runners/checksums; backup reference y gates | Cada migración+ledger en TX; cualquier error→rollback TX; conservar ventana. |
| T5 | Instalar imagen nueva técnica con ingreso público afectado cerrado | Digest aprobado, coordenadas rectoras existentes, autorización deploy | Liveness técnico no acredita negocio. Canal operacional autenticado sobre runtime existente; no ruta comercial alternativa. |
| T6 | Publicar catálogo/relaciones/nuevas PV/limits completos | Ceremonia independiente, actor real, Permission publish y manifest de cantidades por hash | Audit/outbox/publish guard atómicos; ninguna v1 editada. |
| T7 | Habilitar operacionalmente único POST change-plan para operador autorizado | Canal controlado+PlatformAdmin real+update+CAS+keys del manifiesto aprobado | Ejecutar exactamente mismo endpoint/servicio; cada cambio ACID con fechas preservadas. Sin bypass de origen/destino ni SQL comercial ad hoc. |
| T8 | Validar totalidad de adopciones y estado dependiente | Evidencia por IDs/actor/corte/quota/audit/idempotency; gates de dependencias | Sin suscripciones afectadas pendientes, sin pérdida de derechos, sin contradicción root/tenant/familia. Fallo→NO_GO y recuperación. |
| T9 | Smoke autenticado/UI/observabilidad y aceptación GO | Runtime autorizado, source/runtime parity, Security/QA/humanUI | PASS reales de escenarios comerciales y dependencias enumeradas; no health-only PASS. |
| T10 | Activación pública y reanudar consumidores afectados | GO explícito ReleaseOwner, hashes congelados, aprobación operacional | Habilitar guard comercial único ya consistente; monitorear y registrar publicación real. No STEP6A4 automático. |

No se requiere adopción antes de T5: el comando existe instalado y habilitado controladamente en T7, antes de T10. La barrera de ingreso se aplica en la infraestructura existente según su configuración operacional revisada; el plan concreto debe aportar hashes de reglas/router/ingress y verificar ambos accesos (host interno y público). No se genera una puerta secreta o token bypass. Si no se puede demostrar esa barrera con autoridad existente, T5 bloqueado, no se despliega.

## Preflight obligatorio

Inventario 05_HISTORICAL_READONLY_INVENTORY.sql sólo mediante sesión read-only. Comparar todo ledger con manifest actual aprobado, no asumir30/32. Identidad PG16/tcdx-grc/TLS; privilegios; catálogos/actors/grants reales; fuentes/licencias; FKs; límites finite/negative/units; gaps; subs activos; root overlaps pasados/actuales/futuros; PV contratadas; tiempos de término; provenance; compatibilidad de baseline/modelo/contratos. Consultas agregadas sin exportar PII; IDs para adopción sólo en expediente operacional protegido. Verificar familias/limits/versiones de destino y todos sus intervalos antes de escribir.
No ejecutar consulta de columnas nuevas en esquema previo: SQL de inventario usa JOIN a PackVersion para raíz. Inventario anterior0UsageLimit no sustituye el nuevo. Ninguna query produce diagnóstico PASS por fila ausente de dependencia.

## Recuperación y rollback

Antes de COMMIT de cada cambio: rollback íntegro del comando. Antes de COMMIT de cada migración: runner revierte SQL+ledger. Después de COMMIT no DOWN destructivo, cambio inverso de fechas, borrado de auditorías, reactivación manual ni escritura sobre historia.
Adopción multitenant NO es una única TX global: cada Subscription se confirma individualmente; un fallo intermedio mantiene la ventana cerrada. Recuperación después de cambios comerciales exige restaurar el backup/PITR coordinado de BD y el runtime anterior como unidad, antes de abrir ingreso, sin perder escrituras externas que se admitieron durante la ventana. Por ello se suspende todo escritor/consumer que afecte las filas/eventos/identidades de esa recuperación; si no es viable aislar ese alcance, suspender todas las escrituras de la aplicación durante la ventana o NO_GO. Publicación a consumidores externos se retiene durante adopción; no entregar eventos de operaciones que podrían restaurarse. No borrar outbox/audit manualmente.
Si ya se abrió público o se entregaron efectos externos, restauración unilateral NO autorizada: incidente, reconciliación de efectos por commands compensatorios explícitos y decisión Release/DBA/Product antes de mutar. El plan no promete rollback instantáneo del mundo externo.
Ensayo demuestra restore de imagen+BD/checksums/familias/asignaciones/historia/outbox/idempotency. RPO15min/RTO4h objetivos rector43; evidencia real y ventana concreta pendientes, no duración inventada. Criterios de interrupción: hash/ledger inesperado, datos incompatibles, autoridad incompleta, falta de cifras, bloqueo regulatorio de un pack requerido, timeout/deadlock sin reconciliación, error de auditoría/restore, smoke negativo o barrera permeable.

## Datos operacionales que no aprueba la firma de diseño

Fecha/duración de ventana, operador real, backup/PITR reference, imágenes/digests, rules ingress, secrets references, inventario real, mapping por Subscription, cuotas reales, grants publicados y recuperación deben presentarse juntos en mandato operacional posterior. Hoy no están autorizados ni ejecutados. La firma propone la estrategia; no aprueba valores o hashes futuros desconocidos.
