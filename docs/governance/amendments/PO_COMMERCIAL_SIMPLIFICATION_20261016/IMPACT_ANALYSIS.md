# Impacto, compatibilidad y restricciones concretas

## Modelo y capas preservadas

No hay cambio canónico/físico, tabla/columna/FK/check/índice, enum, estado, tenant
técnico ni migration.07/08/30/33/34/35/39 conservan bytes en la candidata; todos
los archivos preexistentes conservan hashes en PROTECTED_STATE.json. Baseline
activa v1.11 y punteros, contratos activos, backend/frontend, paquetes, UI, IAM,
infra y deploy permanecen intactos. El contrato candidate cambia presentación
documental y gobierno; no claims de runtime.175 operaciones, schemas, permisos,
scopes, auditoría/eventos e idempotencia se contrastan estructuralmente.

El objeto38/metodologías17/19/contrato27, SoD22§6, categorías23§6 y precedencia23§8
se conservan. No se convierte configuración ausente en none, valid o fuente legal.
La precedencia PO es de gobierno interno; no cambia SourcePrecedencePolicy de
observaciones ni prioridad de políticas de conservación de los clientes.

## Restricciones aplicables y alternativas compatibles

| ID / objeto | Fuente y cláusula comprobada | Consecuencia concreta | Alternativa compatible / alcance |
|---|---|---|---|
| T1 Selección de meses | OpenAPI RetentionPolicyCreateRequest.retention_seconds es entero; SEED011 no define este parámetro; modelo UsageLimit tiene valor/unidad, sin binding mensual publicado | No existe hoy contrato cerrado para convertir12/18/24/36/48/60meses a duración/selección persistida | Cerrar código/versión, input tipado, unidad/ancla/calendario/zona y manifiesto de datos sobre entidades existentes antes de implementar esa selección; no cambiar DB ni inferir30días; no bloquea candidata o administración independiente |
| T2 Primaria y cadena técnica | migration20261015000100, c04w_guard_file_chain: inserciones nuevas exigen FK y concordancia intent/FileObject/EvidenceVersion | No se puede suprimir FK ni seleccionar una draft como primaria ordinaria para hacer funcionar upload | Consumir primaria operativa publicada elegible; source opcional no vuelve nulo el binding técnico. Si no existe, falta el dato/operación autorizada correspondiente; no inventar UUID, estado, fixture ni bypass |
| T3 Fuente opcional y validación | misma migration, c04w_guard_applicability: source nullable; valida ev approved/scan/intervalo sólo IF source IS NOT NULL; publicado inmutable | La DB no obliga universalmente a fuente; una fuente invocada falsa/ajena/inválida sí se rechaza | Configuración ordinaria sin claim jurídico; fuente auténtica/revisada para acreditación formal; mantener locks, cadena, revisión/SoD. Compatibilidad estática, no prueba SQL nueva |
| T4 SoD y holds | rector22§6; contrato14; c04w_guard_hold_release exige humano autorizado distinto del autor y legal_hold publicado | La autoridad única del desarrollo no permite autoaprobar Evidence, liberar propio hold ni operar sin permiso | Usar workflow/actor efectivo correspondiente cuando se ejecute esa operación; no exigir ese acto para guardar configuración independiente. Sin release: mantener conservación |
| T5 Conservación | rector23§§6–8 y categorías originales; derechos de borrado sólo por workflow Privacy gobernado | Oferta12meses no puede acortar AuditEvent/evidencia aprobada7años ni sustituir otros eventos, obligaciones o holds | Mantener todos los pisos/obligaciones y acceso/historia contractuales; separación servicio/conservación, revalidación y DENY purge ante conflicto; no eliminación autorizada |
| T6 Límites de esta instrucción | tarea PO documental y DR003 integración: no backend/frontend/DB/activación/Git publicación/despliegues | La autorización integral general no incluye los actos expresamente excluidos aquí | Completar paquete y verificaciones; futura instrucción que incluya un acto distinto permite realizarlo sin segunda ratificación interna |
| T7 Nuevos grants/publicaciones | 05 y contratos25/26, grant efectivo + scope + ObjectPolicy; Tenant Admin no administra MI Platform-only | Nombre del rol o catálogo scope union no autoriza operaciones ajenas ni crear credenciales tenant-side | Reutilizar comandos actuales exactos y políticas publicadas; si falta grant/binding, acotar la operación. Ninguno se crea por esta tarea |

## Obligaciones externas

DR001/002/003 no aporta una fuente externa específica que imponga acreditación
jurídica universal para administrar SaaS. No se inventa ley, contrato, certificación,
revisor o independencia humana.23§6 expresa baselines de producto, no mínimos
legales universales. Obligaciones externas concretas vigentes en datos/contratos
reales conservan su efecto; este paquete no las dispensa ni declara cumplimiento.
Si una operación depende de una obligación externa, su fuente/cláusula/contexto,
consecuencia y alternativa deben demostrarse para esa operación. No se reclama
jurídicamente que la sola opción comercial satisfaga una jurisdicción.

## Desarrollo futuro y riesgo residual

La implementación existente aún puede aplicar guards semánticos v1.11; no se
declara corregida por estas anotaciones. Las diferencias son el trabajo posterior
tras una instrucción que incluya activación e implementación; deberá versionar
contratos/policies publicados cuando corresponda, respetar autoría/historia,
probar positivos/negativos y demostrar UI→API→dominio→persistencia/RBAC/audit.
T1/T2/T7 son límites localizados de implementación/operación, no vetos a preparar
la sucesora, ni petición de repetir la decisión comercial o firmas internas.
No hay aceptación QA/humana, release ni autoaprobación en este informe.
