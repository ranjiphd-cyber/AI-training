# TA Performance & Development Dashboard

A working dashboard for the India Talent Acquisition team. It covers continuous performance tracking, coaching, team comparison, promotion readiness (visible to the TA Head only) and annual review, built from the *TA Performance & Development Management System BRD v1.0*.

- **Open:** double-click `dist/TA_Performance_Dashboard.html` (a single file you can share), or `index.html`. It runs in any modern browser and needs no install or server. Internet is used only to create `.xlsx` files.
- **Rebuild the single file** after code changes: `python3 tools/build_single_file.py`.
- **Hosted copy:** a private claude.ai artifact of the same dashboard. There, PDF reports download as `.html` files that you open and print to PDF, because the hosted viewer can't open the print dialog.
- **Design:** [`SYSTEM_DESIGN.md`](SYSTEM_DESIGN.md) covers users and permissions, page layouts, KPI rules, the import workflow, reporting, security and AI guardrails, **open BRD conflicts and decisions (§8)**, the roadmap and acceptance tests.
- **Templates:** [`templates/`](templates). You can also download each template from the Data Import page.

## Access and security

| Who | How they get in | What they see |
|---|---|---|
| **TA Head** | Sign in with **ranjith.tp@volvo.com** and a passphrase (set on first use) | Overall view of all teams and people; adds, edits and removes people; sets targets; imports data; creates personal files |
| **Team members and leads** | Open their **personal file** with its passphrase (both sent by the TA Head) | **Only their own performance**: their file contains no other person's data. Team leads also see their team's totals, without member names |

- The TA Head workspace is **encrypted (AES-256)** in the browser and in backups. Without the passphrase it cannot be read. The passphrase cannot be recovered, so keep it safe and export encrypted backups regularly.
- Personal files are encrypted with their own passphrase. Send the file and the passphrase through different channels, for example the file by e-mail and the passphrase by Teams chat. People's rating history and internal notes are not included in their files.
- People enter their input in their file (self-assessment, request responses, project and learning updates, comments), then use **Export my responses**. The TA Head imports the responses file on the Requests page.
- This is passphrase-based protection, not corporate single sign-on. For organisation-wide access with Volvo sign-in, build the production version (Power Apps + Dataverse + Entra ID, `SYSTEM_DESIGN.md` §9).

## First use (TA Head)

1. Open `dist/TA_Performance_Dashboard.html` (or `index.html`). On the sign-in page, enter **ranjith.tp@volvo.com**, choose a passphrase and click **Create workspace**.
2. **Team Setup → Restore backup** and choose your team file. People can be added, renamed or removed at any time in Team Setup.
3. Set each person's **annual points target** in Team Setup (Edit in the *Annual points target* column), or keep the default of offer target × 2.
4. Import offers or recruiter scorecards with weighted points in **Data Import**.
5. **Team Setup → Create personal files** and send each person their file and passphrase. They open the same dashboard file and choose *Open my performance*.
6. **Export an encrypted backup** regularly.

A training demo with fictional data is available from the sign-in page; it is never saved.

## How delivery is assessed

People are assessed on **weighted hiring points**, not offer counts:
- **Points target = offer target × 2** by default. The TA Head can set a **personal annual points target** for any team member or lead (Team Setup or Member View), change the default in Rules & Settings, or set a value per business area.
- **Offer Delivery & Complexity score (40) = 40 × points ÷ points target**, capped at 40.
- Statuses, 10-day cadence charts, exceptions and comparisons all use points; offer counts are shown for context.

For people with only a summary scorecard, enter their weighted points with **Enter points** on their Business Deliverables panel, or include a *Weighted Points* column in the recruiter scorecard import.

## Teams, roles and assignments

Open **Team Setup** to:
- change any person's **team, business area or role** directly in the table (a reason is required and logged);
- **add or edit teams** and the business areas each one serves;
- **add or edit roles**. Each role uses a scorecard template: Recruiter, Team Lead, or Support / Operations (no hiring targets);
- mark people who **also support** other teams, record **former members** with a leaving date, and keep **notes to confirm**.

If you only have YTD recruiter scorecards (target, offers, joiners, offer days, vendor %), import them in **Data Import → Recruiter scorecard**. The dashboard shows attainment and the joining, cycle-time and vendor scores from them. The 40-point offer score needs offer-level data, or a TA Head override with a reason.

## Teams and targets

| TA team | Business areas | Target per 10 working days |
|---|---|---|
| TTI | GTP, GTO, GTT | 5, 4, 4 (BRD) |
| DTO+ | DTO, FCA, Penta, VFS | 5, 5, *4 placeholder*, 4 |
| University Relations & Early Careers | PMIS, NATS, GET, PGET, ExcelHER | *6 placeholder* |
| VCE + Leadership Hiring | VCE, Leadership Hiring | 4, *1 placeholder* |

Team Leads are scored on team goal achievement, their own delivery against 50% of a team-member target, and competency development. This model is proposed and awaits approval (see `SYSTEM_DESIGN.md` §4.7). You can change targets in Team Setup.

## Important limitations of this version

- **One TA Head per browser.** The encrypted workspace lives in the browser where it was created. Use encrypted backups to move it to another computer.
- **People work from their personal file.** Their changes are kept only until they export their responses; there is no live shared database.
- **Provisional scores.** Several scoring rules conflict or are undefined in the BRD, for example the hiring-point tables, the vendor denominator and the joining-ratio bands. Each one is configurable in **Rules & Settings** and marked *Pending*. Scores that depend on them are labelled *Provisional* until you record a decision.
- Reports cover the review period to the data cut-off (16 Oct 2026 in this version).
- Excel downloads are real `.xlsx` workbooks when the computer is online. Offline, the dashboard falls back to the Excel 2003 XML format (`.xls`); Excel may warn that the format and extension don't match. Choose *Yes* to open it.
