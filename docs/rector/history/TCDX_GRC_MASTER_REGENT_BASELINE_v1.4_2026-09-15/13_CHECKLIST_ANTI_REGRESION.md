# TCDX GRC — Checklist anti-regresión arquitectónica

Antes de aceptar cualquier cambio relevante verificar:

- [ ] Existe requisito funcional o contrato que justifica el cambio.
- [ ] Se conoce el bounded context owner.
- [ ] Se usa la entidad canónica correcta.
- [ ] No se crea una segunda autoridad.
- [ ] Tenant ownership es inequívoco.
- [ ] No existe hardcode por tenant/UUID/cliente/fecha.
- [ ] No se agregó fallback legacy.
- [ ] No se inventó un dato faltante.
- [ ] Unidad y escala están declaradas.
- [ ] Temporalidad está definida.
- [ ] Estados/transiciones respetan el contrato.
- [ ] Retry es idempotente.
- [ ] DB constraints y aplicación representan la misma invariante.
- [ ] RBAC se valida en backend.
- [ ] Commercial entitlement no sustituye RBAC.
- [ ] Audit trail existe donde corresponde.
- [ ] La IA no se convirtió en autoridad.
- [ ] Unit tests relevantes pasan.
- [ ] Integration tests relevantes pasan.
- [ ] E2E cubre el flujo cuando corresponde.
- [ ] Cross-tenant está probado cuando corresponde.
- [ ] Runtime fue realmente probado antes de declarar PASS.
- [ ] Traceability Matrix fue actualizada.

## Gate adicional - Datos, calculos y consumidores

Antes de aprobar un cambio verificar:
- [ ] No crea una copia paralela de un hecho ya canonico.
- [ ] No introduce acceso directo de un dominio a una fuente externa para hechos oficiales.
- [ ] Inputs y Outputs estan definidos en terminos canonicos.
- [ ] Formula/regla y sus versiones son identificables cuando aplica.
- [ ] Freshness, calidad y datos insuficientes tienen tratamiento explicito.
- [ ] El resultado conserva lineage hasta la fuente.
- [ ] La nueva funcionalidad reutiliza el contrato 14/15 o existe extension versionada aprobada.
- [ ] No reinterpreta silenciosamente historicos.
- [ ] IA no se convierte en autoridad alternativa de hechos o calculos.
## Pre-implementation

Antes del primer schema físico debe existir `PRE_IMPLEMENTATION_CONTRACT_GATE=PASS` conforme a documento 28. Una regresión semántica incluye introducir una segunda autoridad, convertir no-data en cero, bypass de Integration Hub, cálculo en UI, hardcode tenant-specific o cambio retroactivo de versión publicada.
