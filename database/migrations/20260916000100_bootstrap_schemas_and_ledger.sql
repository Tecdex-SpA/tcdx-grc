CREATE SCHEMA IF NOT EXISTS "platform";
CREATE SCHEMA IF NOT EXISTS "iam";
CREATE SCHEMA IF NOT EXISTS "org";
CREATE SCHEMA IF NOT EXISTS "regulatory";
CREATE SCHEMA IF NOT EXISTS "controls";
CREATE SCHEMA IF NOT EXISTS "evidence";
CREATE SCHEMA IF NOT EXISTS "risk";
CREATE SCHEMA IF NOT EXISTS "remediation";
CREATE SCHEMA IF NOT EXISTS "audit";
CREATE SCHEMA IF NOT EXISTS "operations";
CREATE SCHEMA IF NOT EXISTS "third_party";
CREATE SCHEMA IF NOT EXISTS "resilience";
CREATE SCHEMA IF NOT EXISTS "privacy";
CREATE SCHEMA IF NOT EXISTS "survey";
CREATE SCHEMA IF NOT EXISTS "data";
CREATE SCHEMA IF NOT EXISTS "rules";
CREATE SCHEMA IF NOT EXISTS "integration";
CREATE SCHEMA IF NOT EXISTS "config";
CREATE SCHEMA IF NOT EXISTS "reporting";
CREATE SCHEMA IF NOT EXISTS "knowledge";
CREATE SCHEMA IF NOT EXISTS "ai";
CREATE SCHEMA IF NOT EXISTS "notification";
CREATE SCHEMA IF NOT EXISTS "ops_audit";

CREATE TABLE platform.schema_migrations (
  migration_id char(14) NOT NULL,
  filename text NOT NULL,
  content_sha256 char(64) NOT NULL,
  transactional boolean NOT NULL,
  runner_version varchar(32) NOT NULL,
  started_at timestamptz NOT NULL,
  applied_at timestamptz NOT NULL,
  duration_ms bigint NOT NULL,
  outcome varchar(16) NOT NULL,
  CONSTRAINT pk_schema_migrations PRIMARY KEY (migration_id),
  CONSTRAINT uq_schema_migrations__filename UNIQUE (filename),
  CONSTRAINT ck_schema_migrations__outcome CHECK (outcome = 'applied'),
  CONSTRAINT ck_schema_migrations__duration CHECK (duration_ms >= 0)
);
