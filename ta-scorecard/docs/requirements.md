# Requirements Traceability Matrix

Source codes: **MP §n** = master prompt section; **SPEC** = authoritative spec (not yet available).
Status: Confirmed · Needs clarification · Proposed enhancement · Deferred.

| Req ID | Source | Requirement | Status | Module | Acceptance test | Evidence | Open decision |
|---|---|---|---|---|---|---|---|
| R-GOV-01 | MP §2 | Spec is authoritative; no invented formulas | Confirmed | All | Engine returns BLOCKED when a rule is missing | — | D-SPEC-01 |
| R-GOV-02 | MP §3 | AI never sets or finalises a rating | Confirmed | AI | T-AI-01 | — | D-AI-01 |
| R-GOV-03 | MP §3 | No fabricated operational data; empty states | Confirmed | UI | T-UI-01 | — | — |
| R-DEL-01 | MP §7B | Delivery max: Offers & complexity 80, Cycle time 15, Vendor 5, Total 100 | Confirmed (maxima only) | Engine | T-DEL-CAP | — | D-SPEC-01 |
| R-DEL-02 | SPEC | Category-point tables, extra points, women bonus | Needs clarification | Engine | T-DEL-CAT | — | D-SPEC-01 |
| R-DEL-03 | SPEC | Targets, pro-rating for joiners and leavers | Needs clarification | Engine | T-DEL-PRO | — | D-SPEC-01, D-DATA-04 |
| R-DEL-04 | SPEC | Cycle-time formula, holidays, boundaries | Needs clarification | Engine | T-DEL-CT | — | D-SPEC-01, D-DATA-05 |
| R-DEL-05 | SPEC | Vendor-usage calculation | Needs clarification | Engine | T-DEL-VEN | — | D-SPEC-01 |
| R-DEL-06 | SPEC | Rating bands, rounding | Needs clarification | Engine | T-DEL-BAND | — | D-SPEC-01 |
| R-DEL-07 | SPEC | Recruiter vs. lead rules; JL→SG conversion | Needs clarification | Engine | T-DEL-LEAD, T-DEL-JLSG | — | D-SPEC-01 |
| R-DEL-08 | MP §7B | Full calculation trace from source records to band | Confirmed | Engine/UI | T-TRACE-01 | — | — |
| R-GRW-01 | MP §7C | Five independent growth ratings | Confirmed | Growth | T-GRW-01 | — | D-CONF-02 (scale) |
| R-GRW-02 | SPEC | Growth weighting and missing-data treatment | Needs clarification | Growth | T-GRW-02 | — | D-SPEC-01 |
| R-GRW-03 | MP §7C | Never blend delivery and growth into one score | Confirmed | Engine | T-GRW-SEP | — | — |
| R-MAT-01 | SPEC | 3×3 matrix thresholds | Needs clarification | Matrix | T-MAT-BND | — | D-SPEC-01 |
| R-REV-01 | MP §7F | 10-day / monthly / quarterly / annual reviews | Confirmed | Reviews | T-REV-01 | — | D-GOV-01 |
| R-REV-02 | MP §7F | Frozen snapshots that can be reproduced | Confirmed | Reviews | T-REV-FRZ | — | — |
| R-REV-03 | MP §7F | Calculated band kept separate from calibrated rating | Confirmed | Reviews | T-REV-CAL | — | — |
| R-YR-01 | MP §7G | Open, copy-forward, close year; closed year is read-only | Confirmed | Years | T-YR-CLOSE | — | D-GOV-03 (reopen) |
| R-IMP-01 | MP §8 | Staged import with reconciliation, approval, undo | Confirmed | Imports | T-IMP-* | — | D-IMP-01..03 |
| R-RPT-01 | MP §11 | Editable PPTX, XLSX; PDF | Confirmed | Reports | T-RPT-CONS | — | SPEC for contents |
| R-SEC-01 | MP §12 | Server-side authorization, record scopes | Confirmed | Security | T-SEC-* | — | D-SEC-01..03 |
| R-SEC-02 | MP §6 | Show/Hide Names in screens and exports (presentation only) | Confirmed | UI/Reports | T-MASK-01 | — | D-SEC-04 |
| R-AI-01 | MP §10 | AI disabled until provider is approved; human approval required | Confirmed | AI | T-AI-* | — | D-AI-01 |
| R-UX-01 | MP §13 | Approved palette; WCAG AA | Needs clarification | UI | T-A11Y | — | D-UX-01 |
