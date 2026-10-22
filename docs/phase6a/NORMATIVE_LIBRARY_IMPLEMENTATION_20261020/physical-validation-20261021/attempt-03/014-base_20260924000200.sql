BEGIN;
ALTER TABLE privacy.retention_policies
  ALTER COLUMN effective_from DROP NOT NULL,
  ALTER COLUMN effective_to DROP NOT NULL,
  ADD COLUMN row_version bigint NOT NULL DEFAULT 1;
ALTER TABLE privacy.retention_policies
  ADD CONSTRAINT ck_retention_policies__row_version_positive
    CHECK (row_version > 0),
  ADD CONSTRAINT ck_retention_policies__policy_kind
    CHECK (policy_kind IN (
      'legal_hold',
      'mandatory_regulatory_policy',
      'contractual_policy',
      'tenant_policy',
      'product_baseline'
    )),
  ADD CONSTRAINT ck_retention_policies__precedence_rank
    CHECK (
      (policy_kind = 'legal_hold' AND precedence_rank = 500)
      OR (policy_kind = 'mandatory_regulatory_policy' AND precedence_rank = 400)
      OR (policy_kind = 'contractual_policy' AND precedence_rank = 300)
      OR (policy_kind = 'tenant_policy' AND precedence_rank = 200)
      OR (policy_kind = 'product_baseline' AND precedence_rank = 100)
    ),
  ADD CONSTRAINT ck_retention_policies__trigger_event
    CHECK (trigger_event_code = 'expiry_or_closure'),
  ADD CONSTRAINT ck_retention_policies__lifecycle
    CHECK (lifecycle_state IN ('draft','under_review','approved','published')),
  ADD CONSTRAINT ck_retention_policies__publication_effective_from
    CHECK (
      (lifecycle_state = 'published' AND effective_from IS NOT NULL)
      OR (lifecycle_state IN ('draft','under_review','approved') AND effective_from IS NULL)
    );
COMMIT;