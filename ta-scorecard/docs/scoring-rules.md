# Scoring Rules and Their Sources

Pre-filled in rule version v1 (draft) for each new workspace. Everything is editable and versioned in **Settings → Scoring rules**. Approved versions are frozen.

Sources, newest first:

- **S0 — TA Head, 13 Nov 2026:** rating = delivery 100%; weights 80 offers & complexity / 5 cycle time / 15 vendor usage; self-development kept separate.
- **S1 — TA Head, 3 Nov 2026:** delivery maxima 80 / 15 / 5 (superseded by S0); growth is rated on a 1–10 scale; standalone app; data stored locally for 3 years; recruiters only receive PPT packs.
- **S2 — TA Head, 25–26 Oct 2026:** the monthly-review points model (Points_Rules sheet and `consolidate.py`, with the IJP, internship and target decisions). This is the latest scoring chat.
- **S3 — TA Head, 18 Oct 2026:** the dashboard rules (cycle-time and vendor thresholds, points formula pattern).

Where S1 and S2/S3 differ, S1 wins. See decisions D-26..D-29.

## Points per offer (S2)

| Category | Points | Women bonus |
|---|---|---|
| Lateral SG1–3 / SG4–7 / SG8–9 / SG10+ | 1 / 3 / 4 / 5 | yes |
| FTC SG1–3 / SG4–7 / SG8–9 / SG10+ | 1 / 3 / 4 / 5 | no |
| FTC, grade missing | 2 | no |
| Conversion to employment | 1 | no |
| Campus intern conversion | 1 | no |
| Internal (IJP) up to SG7 / SG8+ | 1 / 2 | no |
| NATS | 2 | yes |
| GET / PGET | 2 | yes |
| ExcelHER | 3 | no |
| AICTE / PhD | 3 | no |
| Intern | 1 | no |

Other rules:

- **Women bonus:** +0.5.
- **Declined offers:** keep their base points, plus a decline adjustment of −0.25.
- **Grades:** SG = JL + 2.
- **Missing lateral grade:** counted at the lowest lateral band, with a warning.

## Target, attainment and band (S2)

- **Target to date** = cadence (offers per 10 working days) × lateral points at the person's target SG × working days employed ÷ 10.
- **Working days:** Monday–Friday minus the holiday list. The full year is 254.
- **Mid-year joiners and leavers:** working days are counted only while the person was employed. This applies the S2 pro-rating to each person's own dates (D-30, to confirm).
- **Attainment** = points ÷ target to date.
- **Leads:** rated on the average of own attainment and team attainment (Σ team points ÷ Σ team targets, active members).
- **Bands on attainment (names from 13 Nov 2026):** Exceptional ≥ 130%, Exceeds Expectations ≥ 110%, Meets Expectations ≥ 95%, Developing ≥ 85%, Not Meeting Expectations below that.

## 100-point delivery score (S0 weights: offers 80 / cycle time 15 / vendor 5, D-38)

| Component | Max | Rule | Status |
|---|---|---|---|
| Offers & complexity | 80 | 80 × min(attainment, 100%). The pattern comes from S3 (40 × min(points ÷ points target, 1)) scaled to 80. | Confirmed 13 Nov (D-27) |
| Cycle time | 15 | Average calendar days from requisition approval to offer. In-scope offers only, declined excluded. < 45 days = 15, 45–55 = 9, > 55 = 3. | Confirmed 13 Nov (D-38) |
| Vendor usage | 5 | Vendor share of in-scope joiners: < 10% = 5, 10–20% = 3, > 20% = 1 | Confirmed 13 Nov (D-38) |

- **In scope** for cycle time, vendor, diversity and declines: Lateral (including campus intern conversions), FTC, and conversions to employment.
- **Out of scope:** programme hiring scores points but is excluded from these quality measures.
- **No data:** a component with no data shows "—" and no total is produced.

## Growth and matrix (S1)

- **Ratings:** five ratings, each 1–10: projects, self-development, training, behaviours, stakeholder feedback.
- **Weights:** not yet decided, so the growth score is blocked until you set them (D-29).
- **Matrix:** delivery axis = attainment %; growth axis = growth score. Thresholds are not yet decided (D-29).
