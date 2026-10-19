# TA Performance Dashboard

An editable performance-management dashboard for the Head of Talent Acquisition, India. It links
commitments → results → trends → business value → decisions → actions → evidence.

## Open it

Open `index.html` in Chrome or Edge. No install or build step is needed, and it works offline.
The export libraries are bundled in `vendor/`: PptxGenJS 3.12.0, docx 9.5.1, jsPDF 2.5.2 and jsPDF-AutoTable 3.8.4, all MIT-licensed.

## Sections

Executive Overview · Deliverables & Metrics · Trends & Programme Results · Team & Development ·
Projects & Process Improvement · Leadership Development · Feedback & Actions · Business Value & Savings ·
Data Quality & Evidence · Reports & Exports · Settings / Backup.

## Seed data

The dashboard is seeded only with the reference data in the brief:

- Programme targets and joiners for 1 Jan–14 Oct 2026.
- The other reported measures for the same period.
- Adarsh's offer figures for 1 Jan–12 Oct 2026.
- The departures of Padma and Jayaram.

Anything not supplied is shown as **Not provided**, including definitions, populations, targets, roles, financial inputs, projects, feedback and development records. The brief's open questions are pre-loaded under Data Quality & Evidence → Open questions.

## Process-improvement projects (2026)

The 12 initiatives from the *TA year plan India – Strategic Alignment 2026* deck are added once to each dashboard (after any account copy loads, so newer saved data is never overwritten). Each project has its India P&C priority, owner, what has been completed, what remains and the planned completion as written in the deck. Stage dates become milestones.

- Change a project's status directly from the dropdown in the Projects table. The change is dated, and every change is kept in the project's status history.
- Use **+ Add project**, **Edit** and **Delete** (deleted projects go to the recycle bin).
- Slide conflicts and missing dates are listed as open questions. Decisions named in the deck are listed under Feedback & Actions → Decisions & support.

## TA programme calendar 2026

**Trends & Programme Results → Programme calendar 2026** lists the 21 programmes from the *P&C Calendar ver1.0* tracker (sheet "Talent Pipeline & University Relations Calendar"). Each shows its owner, the person responsible, expected numbers, service charges as stated, and a fortnightly schedule taken from the tracker's colour legend.

- Use **+ Add programme**, **Edit**, **Delete** and the status dropdown.
- **Edit schedule** changes a programme's activities and fortnights.
- Tracker numbers are a plan. The scorecard targets stay official; differences are flagged (rule R23).
- New team members from the org chart are added. Possible name matches are not merged until confirmed.
- With confidential details excluded, exports also hide team members' name variants.

## 2026 hiring data (Hiring2026 tracker)

The candidate-level tracker is **not** stored in the dashboard. Only aggregates are loaded, computed outside the page:
- **YTD period:** 1 Jan–14 Oct 2026, aligned to the scorecard cut-off.
- **Monthly periods:** Jan–Sep, plus a partial October that isn't compared with full months.
- **Measures:** external joiners, offers, decline and acceptance rates, cycle times (mean, with median noted), and vendor, referral, direct and gender shares.
- **Breakdowns:** by business area, source, hiring type, employment type and decline reason, plus pending joiners.
- **Recruiter-level counts:** confidential, and only for confirmed names.

Lateral (351) and fresher (62) joiners reconcile with the scorecard. Cohorts with offers still pending are marked incomplete and left out of trend comparisons.

## Lateral-hiring key parameters 2020–2026

Gender diversity, vendor usage and employee referral share for lateral joiners, taken from the Business Review Meeting (Oct) slide.
- 2020–2025 are full years (annual periods, scope "Lateral hiring").
- 2026 is year-to-date. It is drawn as a hollow point, and its change from 2025 is labelled as not like-for-like.
- Lateral-only values recalculated from the hiring tracker sit alongside for comparison.

## How data is stored

- Data is saved automatically in **this browser on this device**. It uses IndexedDB, plus a localStorage copy when the data fits.
- **When opened as a claude.ai Artifact**, a copy is also saved in the artifact's database, in the signed-in viewer's private per-user area (`data/users/<id>/`). The platform keeps that area private to that person, the artifact owner included. On another device or browser, the dashboard loads that account copy. Recovery points are not copied.
- Outside claude.ai (opening `index.html` directly) there is no account copy, sync or cloud storage.
- There is no separate login, multi-user editing or external integration. The AI insight service is a labelled placeholder; insights come from transparent, documented rules. No API credentials are stored or used.
- Use **Settings / Backup → Download backup (JSON)** regularly, and **Restore from backup** to recover.
- A recovery point is created automatically before any restore, import, reset or account-copy load (the last five are kept, in this browser only).
- Inside claude.ai, files are offered through the viewer's save prompt; elsewhere they download normally.

## Exports

These files are generated in the browser from saved data, the selected period and the selected sections:

- **PPTX:** native, editable charts, tables and text.
- **DOCX:** editable tables and text. Chart data is included as tables, not as native Word charts.
- **PDF:** a presentation-ready snapshot.

Every file shows the reporting dates, generation date, assumptions, sources, data-quality conflicts and open questions.

Confidential individual details are excluded by default. When excluded, team-member names are replaced throughout, and individual results appear only as team-level counts.

## Acceptance test

```
python3 -m http.server 8765        # from this folder
npm i playwright                   # or set PLAYWRIGHT_CORE / CHROMIUM_PATH
node tests/acceptance.js http://localhost:8765/index.html
```

The test exercises the 12 validation criteria from the brief, including opening the downloaded PPTX and DOCX files.
It resets the dashboard to the seed data before and after the run.
