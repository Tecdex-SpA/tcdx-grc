-- Test-only extension: execute solely in the attested own disposable PG16 cluster.
-- Uses a native temporary constraint equivalent to the candidate typed default.
BEGIN;
CREATE TEMP TABLE step6a3_roundtrip(
 value_type text NOT NULL,b boolean,i bigint,d numeric(30,10),t text,
 ts timestamptz,dur bigint,j jsonb,
 CHECK(num_nonnulls(b,i,d,t,ts,dur,j)=1 AND CASE value_type
 WHEN 'boolean' THEN b IS NOT NULL WHEN 'integer' THEN i IS NOT NULL
 WHEN 'decimal' THEN d IS NOT NULL WHEN 'text' THEN t IS NOT NULL
 WHEN 'timestamp' THEN ts IS NOT NULL WHEN 'duration' THEN dur IS NOT NULL
 WHEN 'json' THEN j IS NOT NULL ELSE FALSE END)) ON COMMIT DROP;
INSERT INTO step6a3_roundtrip VALUES
 ('boolean',false,NULL,NULL,NULL,NULL,NULL,NULL),
 ('integer',NULL,0,NULL,NULL,NULL,NULL,NULL),
 ('decimal',NULL,NULL,0,NULL,NULL,NULL,NULL),
 ('text',NULL,NULL,NULL,'',NULL,NULL,NULL),
 ('timestamp',NULL,NULL,NULL,NULL,'2026-10-09T00:00:00Z',NULL,NULL),
 ('duration',NULL,NULL,NULL,NULL,NULL,0,NULL),
 ('json',NULL,NULL,NULL,NULL,NULL,NULL,'{}');
DO $proof$
BEGIN
 IF (SELECT count(*) FROM step6a3_roundtrip WHERE
 CASE value_type WHEN 'boolean' THEN b IS FALSE WHEN 'integer' THEN i=0
 WHEN 'decimal' THEN d=0 WHEN 'text' THEN t='' WHEN 'timestamp' THEN ts='2026-10-09T00:00:00Z'
 WHEN 'duration' THEN dur=0 WHEN 'json' THEN j='{}'::jsonb ELSE false END) <> 7
 THEN RAISE EXCEPTION 'ROUNDTRIP_COERCION_OR_ABSENCE'; END IF;
END $proof$;
ROLLBACK;
