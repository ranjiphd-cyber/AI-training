# Planned Acceptance Tests

Status values: **Pending business confirmation** (expected values not yet available) · Ready · Passed · Failed.
Every business-rule test below is *Pending business confirmation* until the SPEC gives inputs and expected outputs.

| Test ID | Covers | Can run now? | Status |
|---|---|---|---|
| T-BLOCK-01 | Engine returns BLOCKED when any rule is missing | Yes | Planned |
| T-DEL-CAP | Component caps 80/5/15 and total ≤100 | Yes (caps only) | Planned |
| T-DEL-CAT | Category points, women bonus, extra points | No | Pending business confirmation |
| T-DEL-REC / T-DEL-LEAD | Recruiter and lead scoring examples from SPEC | No | Pending business confirmation |
| T-DEL-LOW | Low-points performance case | No | Pending business confirmation |
| T-DEL-PRO | Joiner/leaver pro-rating | No | Pending business confirmation |
| T-DEL-CT | Cycle-time boundaries, holidays, zero denominators | No | Pending business confirmation |
| T-DEL-JLSG | JL→SG conversion | No | Pending business confirmation |
| T-DEL-BAND | Band boundaries and rounding | No | Pending business confirmation |
| T-GRW-SEP | Delivery and growth never combined | Yes | Planned |
| T-MAT-BND | Matrix boundary cases | No | Pending business confirmation |
| T-RANK-LVR | Leavers excluded from rankings | Partly | Pending business confirmation |
| T-IMP-RECON / DUP / UNDO | Reconciliation, repeated-import protection, undo with dependencies | Framework yes | Planned |
| T-REV-FRZ | Frozen review reproduces after data or rule changes | Yes | Planned |
| T-YR-CLOSE | Closed year rejects writes | Yes | Planned |
| T-SEC-* | Unauthorised read/write attempts denied server-side | Yes (once roles approved) | Planned |
| T-MASK-01 | Name masking on screens and in exports | Yes | Planned |
| T-RPT-CONS | Export values = engine values | Yes | Planned |
| T-AI-01 | AI cannot write ratings; drafts need approval | Yes | Planned |
