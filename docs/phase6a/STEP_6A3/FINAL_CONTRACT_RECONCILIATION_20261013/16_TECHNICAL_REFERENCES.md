# Referencias técnicas verificadas; no autoridad comercial

PostgreSQL16 numeric: https://www.postgresql.org/docs/16/datatype-numeric.html — NaN y valores finitos deben tratarse explícitamente.
PostgreSQL16 aggregates: https://www.postgresql.org/docs/16/functions-aggregate.html — range_agg produce la unión multirange; cardinalidad/cobertura comercial provienen del contrato propuesto, no de la documentación SQL.
PostgreSQL16 trigger data visibility: https://www.postgresql.org/docs/16/trigger-datachanges.html — triggersVOLATILE y visibilidad; el diseño requiere prueba real de concurrencia para confirmar su implementación exacta. La documentación no constituye PASS.
HTTP: https://www.rfc-editor.org/rfc/rfc9110.html#section-15.3.3 —202accepted no es finalización sincrónica;200change-plan es propuesta humana específica; alta202 aprobada preservada.
