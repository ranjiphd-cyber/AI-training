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
