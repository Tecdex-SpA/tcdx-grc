BEGIN;
-- DRAFT and SUBMITTED carry unapproved decisions; the stored decision vocabulary is exact.
ALTER TABLE regulatory.requirement_applicabilities
  ADD CONSTRAINT ck_requirement_applicabilities__decision_closed
    CHECK (applicability_decision IN ('applicable','not_applicable')),
  ADD CONSTRAINT ck_requirement_applicabilities__not_applicable_rationale
    CHECK (applicability_decision <> 'not_applicable' OR length(btrim(rationale)) > 0);
COMMIT;