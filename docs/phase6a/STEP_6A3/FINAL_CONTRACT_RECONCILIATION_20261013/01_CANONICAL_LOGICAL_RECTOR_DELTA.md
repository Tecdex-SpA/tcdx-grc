# Delta propuesto canónico/lógico/rector — C-01..C-12

STATUS=DRAFT_NOT_EFFECTIVE. Autoridad: mandato de reconciliación; rector45/49.
No se edita baselinev1.8. Aprobación de diseño no activa una baseline sucesora.

## Deltas exactos para publicación posterior

| Fuente superior | Delta editorial propuesto | Límite |
| --- | --- | --- |
| Rector07/08/33 | Agregar CommercialFamily al owner Tenant & Commercial Entitlements, PLATFORM_CONTROL. UUIDv7; código/significado publicados inmutables; retención IMMUTABLE_RETAIN. | Una autoridad; sin PackFamily paralelo. |
| Rector30 | CommercialFamily1→0..N RegulatoryPack por relación soporte; raíz exactamente1 clasificación para nueva elegibilidad; PlanVersion N:M CommercialFamily por relación soporte. | Sin derecho implícito por source_type/código. |
| Rector30/42 | UsageLimit N→1PlanVersion; dimensión total NULL o familia explícitamente vinculada; un total y uno/familia efectivos durante toda vigencia. | Cero explícito; ausencia bloquea; cambio material→nueva PlanVersion. |
| Rector21 | Subscription active/subscription.change_plan/ended; child active/subscription_regulatory_pack.transfer_close/revoked; activación hija es INSERT active. | Sin update_status; registry exacto antes de código. |
| Rector22§10 | Recurso platform.subscription: read/create/update; update sólo subscriptionChangePlan y llamadas internas; read sólo las tres lecturas comerciales nuevas. Recurso platform.commercial_catalog: publish sólo ceremonia interna commercialCatalogPublication. | Tres permissions nuevas propuestas; tres grants base PLATFORM_ADMIN pendientes; no IAM ejecutado. |
| Rector23/42 | El cambio conserva ends_at programado y expiración de packs. Intervalo destino contiene íntegramente la nueva vigencia comercial. | Sin renovación/recorte/extensión automáticos. |
| Rector29/34 | Guards persistentes de publicación y nuevas asignaciones; transacción de la autoridad comercial única con outbox. | No FeatureFlag como entitlement ni segunda lógica de cambio. |

No se agregan estados de Subscription, capabilities, planes, roles, entidades legales ni fórmulas. Relaciones soporte no son autoridades de negocio nuevas.
La clasificación ISO/standard y LEGAL/law y sus cinco mappings de rector41 se proponen como datos manifestados, no seeds ejecutados. ISO_9001_2026 no se vuelve oficial por clasificación. GRC conserva clases legales/contractuales/sectoriales; familias futuras y cuotas se publican expresamente en nuevas versiones, sin herencia automática.

| Raíz canónica propuesta | Familia / source_type |
| --- | --- |
| ISO_9001_2015 | ISO / standard |
| ISO_9001_2026 | ISO / standard; clasificación no publica edición prepublication |
| ISO_IEC_27001_2022 | ISO / standard |
| ISO_IEC_42001_2023 | ISO / standard |
| CL_LEY_21719 | LEGAL / law; clasificación no altera vigencia legal |

Nuevas versiones propuestas de ISO e ISO_RIESGO_OPERATIVO admiten ISO; nuevaGRC admite ISO+LEGAL, sin limitar para siempre el alcance contractual/sectorial rector42§2.3. Ninguna fila se agrega a las v1 publicadas. Nuevas familias de esas clases exigen nuevas versiones y mappings explícitos.

## F-05: regla prospectiva permanente recomendada R-P

La exclusión existente Subscription+PackVersion permanece íntegra. Agregar regulatory_pack_id por FK exacta de versión. No añadir exclusión retrospectiva por raíz sobre todas las filas.
Cada INSERT y toda ampliación/cambio de raíz, versión, padre o tenant de asignación toma lock de Subscription y rechaza solapamiento con cualquier intervalo de otra asignación de la misma raíz; la comparación incluye filas históricas y usa [from,to). No hay flag legacy, excepción por tenant/fecha, bypass de runtime ni segunda tabla de derechos.
Cerrar/revocar un intervalo mediante comando autorizado puede reducirlo sin reprobar retrospectivamente coexistencias legítimas del intervalo anterior; nunca permite extenderlo. El trigger protege también DML que omita el servicio. READ COMMITTED obligatorio para esta regla propuesta, con nuevo SELECT tras el lock; PostgreSQL real deberá demostrar visibilidad y ausencia de write skew antes de publicación operacional. Un nivel no revisado se rechaza, no se asume equivalente.
IDs y períodos existentes no se reescriben. previous_* histórico NULL significa vínculo no registrado. No se asigna una versión de regla retrospectiva a filas antiguas.
Change-plan exige a lo sumo una versión efectiva por raíz en el origen. Si dos coexistencias actuales legítimas impiden conservar ambas bajo la regla nueva, devuelve409RESOURCE sin mutación. La adopción de ese tenant queda bloqueada para decisión competente; la migración estructural conserva la historia.

## Alternativa exacta R-A condicionada

Root FK más EXCLUDE(subscription_id,regulatory_pack_id,tstzrange(from,to,'[)')) sobre todas las filas. Sólo elegible si inventario real acredita CERO solapamientos por raíz en toda historia y dictamen humano confirma compatibilidad con el contrato anterior. Ningún DELETE/truncamiento/reparación hace elegible R-A. Requiere artefacto SQL específico y hash nuevo; no se aprueba como cambio automático al candidato R-P.
R-P es la propuesta única implementable tras su firma. R-A queda alternativa documental fuera del conjunto implementable. Si el inventario encuentra conflicto activo o asignaciones futuras incompatibles, se entrega decisión comercial por IDs/versiones/derechos exactos antes de la adopción; no se elige ganadora por fecha/código.

## Alcance de aprobación

Este delta prepara publicación exacta superior. Los archivos activos siguen vigentes hasta aprobación y publicación competente. El DDL candidato puede revisarse conjuntamente; su aplicación depende de PHYSICAL_DATA_MODEL_REVIEW y EXECUTABLE_CONTRACTS humanos. Ninguna firma publica bytes de una baseline sucesora todavía no preparada ni cambia su fecha efectiva.
