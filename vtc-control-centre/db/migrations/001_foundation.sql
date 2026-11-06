-- 001_foundation.sql
-- Volvo Group–SRM Vehicle Technology Centre | Training & Operations Control Centre
-- Slice 1 foundation schema. All status vocabularies are enforced with CHECK constraints.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ---------------------------------------------------------------- institutions
CREATE TABLE institutions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                  text NOT NULL UNIQUE,
  name                  text NOT NULL,
  kind                  text NOT NULL CHECK (kind IN ('HOST','PARTNER_UNIVERSITY','CORPORATE','TRUST')),
  -- Eligibility: SRM is CONFIRMED eligible. The authoritative partner list is UNRESOLVED (D-03).
  approval_status       text NOT NULL CHECK (approval_status IN ('APPROVED','PENDING_DECISION','SUSPENDED','NOT_APPLICABLE')),
  approval_reference    text,
  is_synthetic          boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- identities
CREATE TABLE users (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_key              text NOT NULL UNIQUE,           -- stable login handle (demo) / IdP subject mapping later
  idp_subject           text UNIQUE,                    -- populated once enterprise identity is integrated
  display_name          text NOT NULL,
  email                 text,
  organisation          text NOT NULL,
  institution_id        uuid REFERENCES institutions(id),
  status                text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','DISABLED')),
  is_synthetic          boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE role_assignments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES users(id),
  role                  text NOT NULL CHECK (role IN (
                          'VOLVO_APPROVER','CERTIFICATE_APPROVER','PROGRAMME_ADMIN','SRM_CENTRE_SPOC',
                          'SRM_SUPPORT_SPOC','TRAINER','PARTICIPANT','INSTITUTION_COORDINATOR',
                          'TECH_ADMIN','AUDITOR')),
  scope_type            text NOT NULL CHECK (scope_type IN ('GLOBAL','INSTITUTION','PROGRAMME')),
  scope_id              uuid,
  granted_by            uuid REFERENCES users(id),
  granted_at            timestamptz NOT NULL DEFAULT now(),
  expires_at            timestamptz,
  revoked_at            timestamptz,
  CHECK ((scope_type = 'GLOBAL' AND scope_id IS NULL) OR (scope_type <> 'GLOBAL' AND scope_id IS NOT NULL))
);
CREATE INDEX role_assignments_user_idx ON role_assignments(user_id) WHERE revoked_at IS NULL;

CREATE TABLE auth_sessions (
  token_hash            text PRIMARY KEY,               -- sha256 of the bearer cookie; raw token never stored
  user_id               uuid NOT NULL REFERENCES users(id),
  csrf_token            text NOT NULL,
  auth_mode             text NOT NULL CHECK (auth_mode IN ('demo','oidc')),
  created_at            timestamptz NOT NULL DEFAULT now(),
  last_seen_at          timestamptz NOT NULL DEFAULT now(),
  expires_at            timestamptz NOT NULL,
  revoked_at            timestamptz
);

-- ---------------------------------------------------------------- policies (versioned)
-- policy_key examples: APPROVAL:TRAINING_REQUEST, APPROVAL:CENTRE_ACCESS, BOOKING
-- provenance AUTHORISED = recorded company decision; SIMULATION = illustrative example, never company policy.
CREATE TABLE policies (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_key               text NOT NULL,
  provenance               text NOT NULL CHECK (provenance IN ('AUTHORISED','SIMULATION')),
  version                  integer NOT NULL CHECK (version > 0),
  status                   text NOT NULL CHECK (status IN ('DRAFT','ACTIVE','RETIRED')),
  title                    text NOT NULL,
  definition               jsonb NOT NULL,
  authorisation_reference  text,                         -- decision record proving the policy was authorised
  created_by               uuid REFERENCES users(id),
  created_at               timestamptz NOT NULL DEFAULT now(),
  activated_by             uuid REFERENCES users(id),
  activated_at             timestamptz,
  retired_at               timestamptz,
  UNIQUE (policy_key, provenance, version),
  CHECK (provenance = 'SIMULATION' OR status = 'DRAFT' OR authorisation_reference IS NOT NULL)
);
CREATE UNIQUE INDEX policies_one_active ON policies(policy_key, provenance) WHERE status = 'ACTIVE';

-- ---------------------------------------------------------------- programmes & sessions
CREATE TABLE programmes (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                  text NOT NULL UNIQUE,
  title                 text NOT NULL,
  technical_domain      text NOT NULL,
  description           text NOT NULL DEFAULT '',
  learning_objectives   text[] NOT NULL DEFAULT '{}',
  delivery_mode         text NOT NULL CHECK (delivery_mode IN ('ONSITE','ONLINE','HYBRID')),
  owner_user_id         uuid NOT NULL REFERENCES users(id),
  status                text NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
                          'DRAFT','IN_APPROVAL','RETURNED','APPROVED','REJECTED','CONFIRMED','CANCELLED')),
  version               integer NOT NULL DEFAULT 1,
  is_simulation         boolean NOT NULL DEFAULT false,
  timezone              text NOT NULL DEFAULT 'Asia/Kolkata',
  created_by            uuid NOT NULL REFERENCES users(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  cancelled_reason      text
);

CREATE TABLE programme_institutions (
  programme_id          uuid NOT NULL REFERENCES programmes(id),
  institution_id        uuid NOT NULL REFERENCES institutions(id),
  PRIMARY KEY (programme_id, institution_id)
);

CREATE TABLE resources (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                            text NOT NULL UNIQUE,
  name                            text NOT NULL,
  kind                            text NOT NULL CHECK (kind IN ('ROOM','LAB','WORKSTATION_POOL','EQUIPMENT','VIRTUAL')),
  owner_institution_id            uuid NOT NULL REFERENCES institutions(id),
  capacity                        integer NOT NULL CHECK (capacity > 0),
  allocation_mode                 text NOT NULL CHECK (allocation_mode IN ('EXCLUSIVE','SHARED')),
  requires_facility_confirmation  boolean NOT NULL DEFAULT true,
  status                          text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  is_synthetic                    boolean NOT NULL DEFAULT false
);

CREATE TABLE trainers (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid UNIQUE REFERENCES users(id),
  display_name          text NOT NULL,
  organisation          text NOT NULL,
  expertise             text[] NOT NULL DEFAULT '{}',
  status                text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  is_synthetic          boolean NOT NULL DEFAULT false
);

CREATE TABLE sessions (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id              uuid NOT NULL REFERENCES programmes(id),
  title                     text NOT NULL,
  starts_at                 timestamptz NOT NULL,
  ends_at                   timestamptz NOT NULL,
  delivery_mode             text NOT NULL CHECK (delivery_mode IN ('ONSITE','ONLINE','HYBRID')),
  expected_onsite           integer NOT NULL DEFAULT 0 CHECK (expected_onsite >= 0),
  expected_online           integer NOT NULL DEFAULT 0 CHECK (expected_online >= 0),
  created_at                timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  CHECK (delivery_mode <> 'ONLINE' OR expected_onsite = 0)
);
CREATE INDEX sessions_programme_idx ON sessions(programme_id);

CREATE TABLE session_resources (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  resource_id           uuid NOT NULL REFERENCES resources(id),
  units_required        integer NOT NULL CHECK (units_required > 0),
  UNIQUE (session_id, resource_id)
);

CREATE TABLE session_trainers (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  trainer_id            uuid NOT NULL REFERENCES trainers(id),
  role                  text NOT NULL DEFAULT 'LEAD' CHECK (role IN ('LEAD','SUPPORT')),
  status                text NOT NULL DEFAULT 'INVITED' CHECK (status IN ('INVITED','ACCEPTED','DECLINED','WITHDRAWN')),
  responded_at          timestamptz,
  response_note         text,
  UNIQUE (session_id, trainer_id)
);

-- ---------------------------------------------------------------- requests & approvals
CREATE TABLE requests (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference             text NOT NULL UNIQUE,
  request_type          text NOT NULL CHECK (request_type IN ('TRAINING_REQUEST','CENTRE_ACCESS')),
  programme_id          uuid REFERENCES programmes(id),
  subject_version       integer NOT NULL,              -- programme version (or 1 for standalone requests)
  payload               jsonb NOT NULL DEFAULT '{}',
  is_simulation         boolean NOT NULL,
  status                text NOT NULL CHECK (status IN ('IN_REVIEW','APPROVED','REJECTED','RETURNED','WITHDRAWN','SUPERSEDED')),
  policy_id             uuid NOT NULL REFERENCES policies(id),   -- bound policy version: never re-resolved
  current_step          integer NOT NULL DEFAULT 0,
  submitted_by          uuid NOT NULL REFERENCES users(id),
  submitted_at          timestamptz NOT NULL DEFAULT now(),
  closed_at             timestamptz,
  CHECK (request_type <> 'TRAINING_REQUEST' OR programme_id IS NOT NULL)
);
CREATE UNIQUE INDEX requests_one_open_per_programme ON requests(programme_id)
  WHERE status IN ('IN_REVIEW','APPROVED','RETURNED') AND programme_id IS NOT NULL;

CREATE TABLE approval_decisions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id            uuid NOT NULL REFERENCES requests(id),
  step_index            integer NOT NULL,
  actor_user_id         uuid NOT NULL REFERENCES users(id),
  decision              text NOT NULL CHECK (decision IN ('APPROVE','REJECT','RETURN')),
  reason                text,
  subject_version       integer NOT NULL,
  policy_id             uuid NOT NULL REFERENCES policies(id),
  decided_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, step_index, actor_user_id),
  CHECK (decision = 'APPROVE' OR (reason IS NOT NULL AND length(trim(reason)) > 0))
);

-- ---------------------------------------------------------------- SRM facility confirmations
-- Facility confirmation is NOT training approval and NOT a final booking.
CREATE TABLE facility_requests (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id          uuid NOT NULL REFERENCES programmes(id),
  session_id            uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  resource_id           uuid NOT NULL REFERENCES resources(id),
  requested_starts_at   timestamptz NOT NULL,
  requested_ends_at     timestamptz NOT NULL,
  units                 integer NOT NULL,
  origin                text NOT NULL DEFAULT 'PROGRAMME' CHECK (origin IN ('PROGRAMME','ALTERNATIVE')),
  status                text NOT NULL CHECK (status IN (
                          'PENDING','CONFIRMED','DECLINED','ALTERNATIVE_PROPOSED','ALTERNATIVE_ACCEPTED','SUPERSEDED')),
  requested_by          uuid NOT NULL REFERENCES users(id),
  requested_at          timestamptz NOT NULL DEFAULT now(),
  responded_by          uuid REFERENCES users(id),
  responded_at          timestamptz,
  response_note         text,
  alt_resource_id       uuid REFERENCES resources(id),
  alt_starts_at         timestamptz,
  alt_ends_at           timestamptz,
  CHECK (status <> 'DECLINED' OR (response_note IS NOT NULL AND length(trim(response_note)) > 0)),
  CHECK (status <> 'ALTERNATIVE_PROPOSED' OR (alt_resource_id IS NOT NULL OR alt_starts_at IS NOT NULL))
);
CREATE INDEX facility_requests_open_idx ON facility_requests(status, resource_id);

-- ---------------------------------------------------------------- reservations (database-enforced conflicts)
CREATE TABLE reservations (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id          uuid NOT NULL REFERENCES programmes(id),
  session_id            uuid NOT NULL REFERENCES sessions(id),
  resource_id           uuid NOT NULL REFERENCES resources(id),
  period                tstzrange NOT NULL,               -- includes any configured buffer
  units                 integer NOT NULL CHECK (units > 0),
  allocation_mode       text NOT NULL CHECK (allocation_mode IN ('EXCLUSIVE','SHARED')),
  status                text NOT NULL CHECK (status IN ('TENTATIVE','CONFIRMED','RELEASED')),
  facility_request_id   uuid REFERENCES facility_requests(id),
  created_by            uuid NOT NULL REFERENCES users(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  released_at           timestamptz,
  release_reason        text,
  -- Backstop: two CONFIRMED reservations of the same exclusive resource can never overlap.
  CONSTRAINT reservations_no_exclusive_overlap EXCLUDE USING gist (resource_id WITH =, period WITH &&)
    WHERE (status = 'CONFIRMED' AND allocation_mode = 'EXCLUSIVE')
);
CREATE INDEX reservations_resource_period_idx ON reservations USING gist (resource_id, period);

CREATE TABLE trainer_commitments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id          uuid NOT NULL REFERENCES programmes(id),
  session_id            uuid NOT NULL REFERENCES sessions(id),
  trainer_id            uuid NOT NULL REFERENCES trainers(id),
  period                tstzrange NOT NULL,
  status                text NOT NULL CHECK (status IN ('CONFIRMED','RELEASED')),
  created_at            timestamptz NOT NULL DEFAULT now(),
  released_at           timestamptz,
  CONSTRAINT trainer_no_overlap EXCLUDE USING gist (trainer_id WITH =, period WITH &&) WHERE (status = 'CONFIRMED')
);

-- ---------------------------------------------------------------- audit (append-only)
CREATE TABLE audit_events (
  id                    bigserial PRIMARY KEY,
  occurred_at           timestamptz NOT NULL DEFAULT clock_timestamp(),
  actor_user_id         uuid REFERENCES users(id),
  actor_label           text NOT NULL,
  scope                 text NOT NULL,                   -- e.g. 'programme:<id>' / 'institution:<id>' / 'system'
  action                text NOT NULL,
  entity_type           text NOT NULL,
  entity_id             text NOT NULL,
  entity_version        integer,
  correlation_id        text NOT NULL,
  outcome               text NOT NULL CHECK (outcome IN ('SUCCESS','BLOCKED','DENIED','FAILED')),
  reason                text,
  change                jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX audit_entity_idx ON audit_events(entity_type, entity_id);
CREATE INDEX audit_time_idx ON audit_events(occurred_at DESC);

CREATE FUNCTION audit_events_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only';
END $$;
CREATE TRIGGER audit_events_no_update BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION audit_events_immutable();

CREATE SEQUENCE programme_code_seq START 1001;
CREATE SEQUENCE request_ref_seq START 5001;
