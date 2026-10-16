-- Reproducible precondition scenarios only; no DDL, DML or persisted fixtures.
-- This proves detection predicates, never native constraints or migration safety.
BEGIN TRANSACTION READ ONLY;
WITH defaults(scenario,value_type,b,i,d,t,ts,dur,j,expected) AS (VALUES
 ('valid_false','boolean',FALSE,NULL::bigint,NULL::numeric,NULL::text,NULL::timestamptz,NULL::bigint,NULL::jsonb,TRUE),
 ('valid_zero','integer',NULL,0,NULL,NULL,NULL,NULL,NULL,TRUE),
 ('valid_decimal','decimal',NULL,NULL,0,NULL,NULL,NULL,NULL,TRUE),
 ('valid_empty_text','text',NULL,NULL,NULL,'',NULL,NULL,NULL,TRUE),
 ('valid_timestamp','timestamp',NULL,NULL,NULL,NULL,'2026-10-09T00:00:00Z',NULL,NULL,TRUE),
 ('valid_duration_zero','duration',NULL,NULL,NULL,NULL,NULL,0,NULL,TRUE),
 ('valid_json','json',NULL,NULL,NULL,NULL,NULL,NULL,'{}',TRUE),
 ('absent','boolean',NULL,NULL,NULL,NULL,NULL,NULL,NULL,FALSE),
 ('multiple','boolean',FALSE,0,NULL,NULL,NULL,NULL,NULL,FALSE),
 ('wrong_type','text',FALSE,NULL,NULL,NULL,NULL,NULL,NULL,FALSE),
 ('unknown_type','unknown',FALSE,NULL,NULL,NULL,NULL,NULL,NULL,FALSE)
), evaluated AS (
 SELECT scenario,expected,num_nonnulls(b,i,d,t,ts,dur,j)=1 AND CASE value_type
 WHEN 'boolean' THEN b IS NOT NULL WHEN 'integer' THEN i IS NOT NULL
 WHEN 'decimal' THEN d IS NOT NULL WHEN 'text' THEN t IS NOT NULL
 WHEN 'timestamp' THEN ts IS NOT NULL WHEN 'duration' THEN dur IS NOT NULL
 WHEN 'json' THEN j IS NOT NULL ELSE FALSE END AS actual FROM defaults
), ec(scenario,tenant,definition,subject,instant,hash) AS (VALUES
 ('existing_distinct_keys',1,1,NULL::integer,1,'a'),
 ('existing_distinct_keys',1,2,NULL,1,'a'),
 ('existing_distinct_keys',2,1,NULL,1,'a'),
 ('existing_distinct_keys',1,1,2,1,'a'),
 ('existing_distinct_keys',1,1,NULL,2,'a'),
 ('existing_distinct_keys',1,1,NULL,1,'b'),
 ('duplicate_null_subject',1,1,NULL,1,'a'),
 ('duplicate_null_subject',1,1,NULL,1,'a')
), ec_duplicates AS (
 SELECT scenario FROM ec GROUP BY scenario,tenant,definition,subject,instant,hash HAVING count(*)>1
), layers(scenario,parent,level,ordinal) AS (VALUES
 ('existing_contextual_ordinal',1,'tenant',1),('existing_contextual_ordinal',2,'tenant',1),
 ('existing_contextual_ordinal',1,'object',1),
 ('duplicate_context',1,'tenant',1),('duplicate_context',1,'tenant',1)
), layer_duplicates AS (
 SELECT scenario FROM layers GROUP BY scenario,parent,level,ordinal HAVING count(*)>1
), results AS (
 SELECT scenario,actual IS NOT DISTINCT FROM expected AS passed FROM evaluated
 UNION ALL SELECT 'existing_distinct_keys',NOT EXISTS(SELECT 1 FROM ec_duplicates WHERE scenario='existing_distinct_keys')
 UNION ALL SELECT 'duplicate_null_subject',EXISTS(SELECT 1 FROM ec_duplicates WHERE scenario='duplicate_null_subject')
 UNION ALL SELECT 'existing_contextual_ordinal',NOT EXISTS(SELECT 1 FROM layer_duplicates WHERE scenario='existing_contextual_ordinal')
 UNION ALL SELECT 'duplicate_context',EXISTS(SELECT 1 FROM layer_duplicates WHERE scenario='duplicate_context')
)
SELECT scenario,passed FROM results ORDER BY scenario;
ROLLBACK;
