# Monthly TA review: input workbook and consolidation

Each month the TA Head uploads one input workbook (one workbook per year, updated monthly). `consolidate.py` checks it and produces the monthly review.

```
python consolidate.py TA_Monthly_Input_YYYY-MM.xlsx out/
```

## Input workbook (sheets)

| Sheet | Filled by | Content |
|---|---|---|
| README | TA Head | Cut-off date, reporting month, working days elapsed and in the year |
| 1_Offers | Operations | Full year-to-date offers list, all hiring streams, one row per offer |
| 2_Open_Reqs | Operations | Open-requisition report at the cut-off date, with main blocker and next step |
| 3_Joining_Pipeline | Operations | Every offer not yet joined: last contact, DOJ reconfirmed, counter-offer risk, BGV |
| 4_Programmes | TA Head / Operations | Time-bound requirements: target, joined, offered not joined |
| 5_Monthly_Review | TA Head | Notes from the monthly team review, one row per person per month |
| 6_Business_Feedback | TA Head / leads | Feedback from HRBPs, hiring managers and the business, with agreed actions |
| 7_Support_KPIs | Support colleagues | Monthly volume, SLA, errors, escalations, survey per activity |
| 8_Projects, 9_Learning | Owners | Project status and training |
| Lists, Points_Rules | TA Head | People, teams, targets, dropdown values and the agreed points rules |

Row 4 of each input sheet is an example and is never read; data starts on row 5.

## Rules applied

- In scope for cycle time, vendor, diversity, decline and referral measures: Lateral (incl. campus intern conversions), FTC and every conversion to employment, each as its own stream and in total. Programme hiring (NATS, ExcelHER, AICTE/PhD, interns) and other campus/fresher hires are reported separately.
- Points: every offer released this year scores per `Points_Rules` (grade band, women bonus, decline adjustment). Target to date = cadence × points of a lateral offer at the target grade × working days elapsed ÷ 10. Leads are rated on the average of own and team attainment. Rating bands: 130 / 110 / 95 / 85.
- Missing data is never estimated: it is reported as `[To fill]`.

## Outputs

| File | Use |
|---|---|
| `TA_Monthly_Review_<month>.xlsx` | Attention list, recruiter scorecard, requirement status by owner, time-bound requirements |
| `summary.md` | Readable month summary |
| `validation.md` | Row-level errors (fix before relying on the numbers) and warnings |
| `consolidated.json` | All metrics, for decks |
| `reqReview.json`, `feedback.json` | Dashboard documents (`settings/reqReview`, `feedback` collection) |
