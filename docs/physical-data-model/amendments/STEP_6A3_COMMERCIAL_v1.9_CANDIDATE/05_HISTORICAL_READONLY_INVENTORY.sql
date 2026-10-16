-- Proposed READ ONLY inventory. Not executed. Shared QA requires exact authorization.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT current_database() AS database_name,current_setting('server_version_num') AS version_num,
       current_setting('transaction_read_only') AS transaction_read_only;
SELECT migration_id,filename,content_sha256,transactional,outcome
  FROM platform.schema_migrations ORDER BY migration_id;
SELECT lifecycle_state,count(*) AS subscriptions FROM platform.subscriptions GROUP BY lifecycle_state;
SELECT count(*) AS active_subscription_overlaps
FROM platform.subscriptions a JOIN platform.subscriptions b
  ON a.tenant_id=b.tenant_id AND a.subscription_id<b.subscription_id
 AND a.lifecycle_state='active' AND b.lifecycle_state='active'
 AND a.cancelled_at IS NULL AND b.cancelled_at IS NULL
 AND tstzrange(a.starts_at,a.ends_at,'[)') && tstzrange(b.starts_at,b.ends_at,'[)');
WITH overlaps AS (
 SELECT a.effective_from AS a_from,a.effective_to AS a_to,
        b.effective_from AS b_from,b.effective_to AS b_to,
        a.lifecycle_state AS a_state,b.lifecycle_state AS b_state
 FROM platform.subscription_regulatory_packs a
 JOIN regulatory.regulatory_pack_versions av USING(regulatory_pack_version_id)
 JOIN platform.subscription_regulatory_packs b
   ON a.subscription_id=b.subscription_id
  AND a.subscription_regulatory_pack_id<b.subscription_regulatory_pack_id
 JOIN regulatory.regulatory_pack_versions bv ON bv.regulatory_pack_version_id=b.regulatory_pack_version_id
 WHERE av.regulatory_pack_id=bv.regulatory_pack_id
   AND tstzrange(a.effective_from,a.effective_to,'[)') && tstzrange(b.effective_from,b.effective_to,'[)')
) SELECT count(*) AS all_historical_root_overlaps,
 count(*) FILTER(WHERE a_state='active' AND b_state='active'
   AND tstzrange(a_from,a_to,'[)') @> transaction_timestamp()
   AND tstzrange(b_from,b_to,'[)') @> transaction_timestamp()) AS effective_root_conflicts,
 count(*) FILTER(WHERE greatest(a_from,b_from)>transaction_timestamp()) AS future_root_overlaps
 FROM overlaps;
SELECT count(*) AS usage_limit_rows,
 count(*) FILTER(WHERE limit_value::text IN ('NaN','Infinity','-Infinity') OR limit_value<0) AS invalid_values,
 count(*) FILTER(WHERE limit_code='regulatory_pack_count' AND (unit<>'pack' OR trunc(limit_value)<>limit_value)) AS invalid_pack_values,
 count(*) FILTER(WHERE effective_to IS NOT NULL AND effective_to<=effective_from) AS invalid_intervals
 FROM platform.usage_limits;
SELECT p.pack_code,p.source_type,count(v.regulatory_pack_version_id) AS version_count
 FROM regulatory.regulatory_packs p LEFT JOIN regulatory.regulatory_pack_versions v USING(regulatory_pack_id)
 GROUP BY p.pack_code,p.source_type ORDER BY p.pack_code;
SELECT connamespace::regnamespace::text AS schema_name,conname,pg_get_constraintdef(oid) AS definition
 FROM pg_constraint WHERE conrelid IN ('platform.usage_limits'::regclass,
 'platform.subscriptions'::regclass,'platform.subscription_regulatory_packs'::regclass)
 ORDER BY 1,2;
ROLLBACK;
