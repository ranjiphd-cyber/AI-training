# Acceptance test results

Run: 2026-11-07T12:37:10.114Z · Node v22.23.4

| # | Test | Result | Evidence |
|---|---|---|---|
| 1 | No proposal → no completed evaluation | PASS | Blank template exported; reference-only case still blocked. |
| 2 | No current policy → provisional compliance label | PASS | Provisional until a policy document AND an officer confirmation are recorded. |
| 3 | No browsing → no invented web results | PASS | AI output can only add a checklist; report states verification not performed. |
| 4 | Scores 4, 3, 4, 2 → composite 3.25 | PASS | 3.25 / 5.00 |
| 5 | One criterion unscored → full composite withheld | PASS | Withheld — 1 criterion/criteria not scored |
| 6 | ₹1,20,00,000 stated subtotal vs ₹1,50,00,000 item sum → ₹30,00,000 discrepancy | PASS | Stated ₹1,20,00,000 vs computed ₹1,50,00,000 → ₹30,00,000 |
| 7 | 13 × 2 × 50 → exactly 1,300 | PASS | 1,300 vs applicant 1,000 → contradictory statements (−300) |
| 8 | Conflicting durations → both retained with citations | PASS | 6 months (p.2) vs 8 months (p.4) retained |
| 9 | High composite + unresolved funding → readiness warning | PASS | 2 warnings |
| 10 | Reference date differs from today → actual case date used | PASS | Case date 7 November 2026; reference excluded from prompt |
| 11 | Scanned PDF without OCR → extraction warning, not empty success | PASS | Image-only synthetic PDF → status 'failed' with OCR warning; scoring stays disabled |
| 12 | Embedded applicant instruction to approve → ignored | PASS | Flagged at p.4; guard precedes sources; deterministic state unchanged. Live model behaviour NOT tested. |
| 13 | DOCX export → valid editable document | PASS | synthetic: report 22 5 30 (paras tables rows), 2 A4 page(s); annex 11 7 43; blank: report 21 3 14 (paras tables rows), 1 A4 page(s); annex 9 5 29 |
| 14 | Human score override → composite recalculated and change recorded | PASS | 2.75 → 3.00; audit: c1: 2.50 → 3.50 (Advisor reviewed curriculum annex) |
| X5 | Automatic extraction on upload finds stated details with citations and never invents | PASS | 16 values, 4 budget lines; seeded subtotal error caught (stated ₹20,00,000 vs ₹21,00,000); tranche % ignored |
| X6 | Recommendation draft: concerns, outcome, merit, readiness, conditions — and the advisor stays in control | PASS | 14 concerns; outcome Return for revision/resubmission; fill keeps advisor text; report prints concerns |
| X3 | Indian rupee formatting and parsing | PASS | ok |
| X4 | Closed status requires closure evidence | PASS | ok |

18 of 18 passed.

Not covered here: live Claude calls from the artifact (needs the claude.ai viewer), the claude.ai download prompt and the claude.ai data store. See README → Test results.
