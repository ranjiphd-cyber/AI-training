# Volvo Group–SRM Vehicle Technology Centre — Training & Operations Control Centre

Operational system of record for training, facility coordination, approvals, trainers, learning evidence, certificates
and CSR reporting for **Volvo Group India** and **SRM Institute of Science and Technology, Kattankulathur**, supported by
**Volvo Group CSR Trust**.

> **New to this? Start with the [Getting Started Guide](docs/08-getting-started-guide.md)**: run it privately in GitHub Codespaces, upload participants from Excel, download reports.
>
> **Status: Slice 1 plus participant import and report downloads, verified in a development environment. Not production-ready.**
> Production behaviour is deliberately blocked (fail-closed) until the decisions in
> [`docs/03-decision-register.md`](docs/03-decision-register.md) are recorded. All seed data is **synthetic**.

## What works today (Slice 1 — verified)

Create draft programme → add sessions → validate resources → submit against configured policy → record permitted
decisions → record SRM facility confirmation → transactionally confirm booking → view audit history.

- Approval engine with versioned, per-request-type policies (sequential/parallel, required counts, reasons, return/resubmit, withdrawal, stale-version guard).
- Operational records can only use **AUTHORISED** policies; none exist yet, so operational submission is **blocked with an actionable explanation**. Clearly labelled **SIMULATION** policies drive a separate sandbox.
- SRM portal: confirm / decline (reason) / propose alternative; acceptance of an alternative triggers reapproval when material.
- Final booking in a `SERIALIZABLE` transaction with row locks **and** PostgreSQL exclusion constraints (no overlapping confirmed exclusive resources or trainers, even under concurrency).
- Server-side RBAC with institution / programme scopes; CSRF; strict CSP; append-only audit written atomically with each business change.
- **Excel/CSV participant import** (SRM SPOC, own institution): template download, preview before saving, row-level errors, duplicate detection by roll number/email, mandatory human review of same-name matches, all-or-nothing commit. Formulas, macros, oversized and zip-bomb files are refused.
- **Report downloads** (.xlsx / .csv): programmes, sessions, approvals, facility requests, participant register, audit log. Scoped to the user, formula-injection safe, with an "About this report" sheet. Every download is audited.
- Responsive, keyboard-operable UI for Command Centre, Programmes, Approvals, SRM Operations, Calendar & Resources, Trainers, Administration & Audit. Later modules show honest “not yet implemented” states.

See [`docs/06-implementation-ledger.md`](docs/06-implementation-ledger.md) for completed / partial / pending capabilities.

## Run locally

Requirements: Node.js ≥ 22.18 (runs TypeScript natively), PostgreSQL 16 with `btree_gist`.

```bash
cp .env.example .env   # edit DATABASE_URL
npm ci
export $(grep -v '^#' .env | xargs)
npm run seed           # migrates + loads SYNTHETIC demo data (refuses in production)
npm start              # http://127.0.0.1:3000 — choose a demo identity
```

Tests (uses a separate database, default `postgres://vtc:vtc_dev_only@127.0.0.1:5432/vtc_test`, override with `TEST_DATABASE_URL`):

```bash
npm run typecheck && npm test
```

Database setup for a fresh machine:

```bash
sudo -u postgres psql -c "CREATE ROLE vtc LOGIN PASSWORD 'vtc_dev_only' CREATEDB;"
sudo -u postgres psql -c "CREATE DATABASE vtc_dev OWNER vtc;" -c "CREATE DATABASE vtc_test OWNER vtc;"
sudo -u postgres psql -d vtc_dev -c "CREATE EXTENSION btree_gist;"
sudo -u postgres psql -d vtc_test -c "CREATE EXTENSION btree_gist;"
```

## Suggested demo walkthrough

1. **Programme Administrator** → *Programmes* → “Industry Orientation (operational draft)” → *Submit*: blocked — no authorised routing (D-01).
2. Open “Vehicle Diagnostics Lab Series (SIMULATION)” → *Request SRM facility confirmation* → *Submit for approval*.
3. **SRM Centre SPOC** → *SRM Operations* → confirm, decline, or propose an alternative.
4. **Trainer B** → *Trainers* → accept. (Session 2 needs a trainer too — booking readiness will say so.)
5. **G. V. Rao** or **Ranjith T. P.** → *Approvals* / programme page → approve.
6. **Programme Administrator** → readiness checklist turns green → *Confirm final booking* → see *Calendar* and *History*.

## Documentation

| Doc | Content |
|---|---|
| [01 Blueprint & requirements](docs/01-blueprint-and-requirements.md) | Summary, feature map, confirmed rules, requirements/traceability register |
| [02 Permission matrix](docs/02-permission-matrix.md) | Roles × permissions × scopes |
| [03 Decision register](docs/03-decision-register.md) | Unresolved decisions that block production, with safe interim behaviour |
| [04 Architecture](docs/04-architecture.md) | Components, ERD, state machines, concurrency, security, contracts, ADRs |
| [05 Test plan & results](docs/05-test-plan-and-results.md) | 30 mandatory scenarios with actual status |
| [06 Implementation ledger](docs/06-implementation-ledger.md) | Completed / partial / pending, roadmap |
| [07 Deployment assessment](docs/07-deployment-assessment.md) | Options A/B/C compared; checks still required |
| [08 Getting started guide](docs/08-getting-started-guide.md) | Step-by-step for newcomers: Codespaces, Excel upload, reports |
