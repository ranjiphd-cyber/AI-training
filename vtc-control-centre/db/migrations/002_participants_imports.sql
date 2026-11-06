-- 002_participants_imports.sql — Participant registry and audited spreadsheet imports.
-- Data minimisation: only fields needed to run training and issue certificates. No phone, address or date of birth.

CREATE TABLE participants (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_type   text NOT NULL CHECK (participant_type IN ('STUDENT','TEACHER')),
  full_name          text NOT NULL CHECK (length(trim(full_name)) BETWEEN 2 AND 200),
  email              text CHECK (email IS NULL OR email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  institution_id     uuid NOT NULL REFERENCES institutions(id),
  external_ref       text,                       -- roll number / staff ID issued by the institution
  department         text,
  year_of_study      integer CHECK (year_of_study IS NULL OR year_of_study BETWEEN 1 AND 6),
  status             text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  source_import_id   uuid,
  created_by         uuid NOT NULL REFERENCES users(id),
  created_at         timestamptz NOT NULL DEFAULT now(),
  CHECK (participant_type = 'STUDENT' OR year_of_study IS NULL)
);
-- Identity is established by institution-issued reference or email, never by name alone.
CREATE UNIQUE INDEX participants_ref_uq   ON participants(institution_id, lower(external_ref)) WHERE external_ref IS NOT NULL;
CREATE UNIQUE INDEX participants_email_uq ON participants(lower(email)) WHERE email IS NOT NULL;
CREATE INDEX participants_name_idx ON participants(institution_id, lower(full_name));

CREATE TABLE import_jobs (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind               text NOT NULL CHECK (kind IN ('PARTICIPANTS')),
  institution_id     uuid NOT NULL REFERENCES institutions(id),
  filename           text NOT NULL,
  file_sha256        text NOT NULL,
  file_bytes         integer NOT NULL,
  status             text NOT NULL CHECK (status IN ('PREVIEWED','COMMITTED','DISCARDED')),
  row_count          integer NOT NULL,
  uploaded_by        uuid NOT NULL REFERENCES users(id),
  created_at         timestamptz NOT NULL DEFAULT now(),
  closed_by          uuid REFERENCES users(id),
  closed_at          timestamptz,
  created_count      integer
);

CREATE TABLE import_rows (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id                 uuid NOT NULL REFERENCES import_jobs(id),
  row_number             integer NOT NULL,
  data                   jsonb NOT NULL,
  status                 text NOT NULL CHECK (status IN ('VALID','ERROR','DUPLICATE','POSSIBLE_DUPLICATE')),
  messages               text[] NOT NULL DEFAULT '{}',
  matched_participant_id uuid REFERENCES participants(id),
  resolution             text CHECK (resolution IN ('CREATE','SKIP')),
  UNIQUE (job_id, row_number)
);

ALTER TABLE participants ADD CONSTRAINT participants_import_fk FOREIGN KEY (source_import_id) REFERENCES import_jobs(id);
