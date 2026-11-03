# Proposed Architecture (subject to D-ARCH-01/02)

```
[Browser: React + TS]  --HTTPS-->  [API: TypeScript (Fastify/NestJS)]
                                     ├─ AuthN: OIDC/SAML via approved IdP
                                     ├─ AuthZ: role + record-scope policy (server-side, deny-by-default)
                                     ├─ Workflows: reviews, calibration, year lifecycle
                                     ├─ @ta/scoring  (pure functions, no I/O)
                                     ├─ Import service (staging → commit → undo)
                                     ├─ Export service (PptxGenJS, ExcelJS, PDF)
                                     ├─ AI adapter (disabled; feature-flagged)
                                     └─ Audit writer (append-only)
                                   [PostgreSQL]
```

## Key design choices
- **Scoring is a pure function**: `score(inputs, ruleVersion) → Result`. `Result` is one of
  `Scored{components, total, band, trace}`, `Blocked{missingRules[], missingInputs[]}` or
  `Incomplete{…}`. Dashboards, reviews and exports all call this one function.
- **Rule versions are immutable** once an approved review references them. New year means draft copies that need approval before use.
- **Snapshots** store the rule-version ID, the source-record IDs and their hashes, and the computed output. Re-running the same rule version on the same records must reproduce the stored output (a test checks this).
- **Audit log** is append-only (DB role without UPDATE/DELETE). Feedback text is not copied into logs.
- **Name masking** happens in the presentation and export layers. Authorization happens in the API.

## Trade-offs
| Option | Pro | Con |
|---|---|---|
| Full stack (proposed) | Auditability, reproducibility, real authz | Needs hosting and IdP approval |
| Spreadsheet / Power BI | Fast, familiar | No frozen snapshots; weak record-level authz; logic spreads across sheets |
| Low-code (Power Apps) | Fits the Microsoft estate | Versioned pure scoring engine is hard; harder to test |

No external paid service or AI provider is assumed.
