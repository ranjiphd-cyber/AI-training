# TA Performance & Development Dashboard

A working dashboard for the India Talent Acquisition team. It covers continuous performance tracking, coaching, team comparison, promotion readiness (visible to the TA Head only) and annual review, built from the *TA Performance & Development Management System BRD v1.0*.

- **Open:** double-click `index.html`. It runs in any modern browser and needs no install, server or internet connection.
- **Design:** [`SYSTEM_DESIGN.md`](SYSTEM_DESIGN.md) covers users and permissions, page layouts, KPI rules, the import workflow, reporting, security and AI guardrails, **open BRD conflicts and decisions (§8)**, the roadmap and acceptance tests.
- **Templates:** [`templates/`](templates). You can also download each template from the Data Import page.

## First use with your own team

1. The dashboard opens with **fictional sample data** so you can explore it. Use **Signed in as** to see what the TA Head, a Team Lead, an Employee, the importer and the Administrator each see.
2. Go to **Team Setup → Start a live workspace** to remove the sample data.
3. Add team members one at a time, or paste your list in **Data Import → Employee profile & ratings**. The list includes job level and the last 3 years' ratings.
4. Go to **Data Import → Offers**. Copy rows from Excel (include the header row) and paste them, or upload a CSV. Map the columns, review the errors and warnings, fix cells inline, then approve. Points, cycle time and maturity are always calculated by the system.
5. Optionally **share** the imported rows. Each person gets a request containing only their own records, asking them to confirm, correct, or add evidence or comments.
6. Rate competencies, score projects and competency development, and build next-year development plans in **Member View**. You can also paste self and TA Head ratings in Data Import → Competency ratings.
7. Use **Reports** for annual reports (2–4 pages plus annexures), section reports, member comparisons, the calibration pack and the confidential talent report. PDF opens the print dialog (choose *Save as PDF*); Excel downloads a workbook.

## Teams and targets

| TA team | Business areas | Target per 10 working days |
|---|---|---|
| TTI | GTP, GTO, GTT | 5, 4, 4 (BRD) |
| DTO+ | DTO, FCA, Penta, VFS | 5, 5, *4 placeholder*, 4 |
| University Relations & Early Careers | PMIS, NATS, GET, PGET, ExcelHER | *6 placeholder* |
| VCE + Leadership Hiring | VCE, Leadership Hiring | 4, *1 placeholder* |

Team Leads are scored on team goal achievement, their own delivery against 50% of a team-member target, and competency development. This model is proposed and awaits approval (see `SYSTEM_DESIGN.md` §4.7). You can change targets in Team Setup.

## Important limitations of this version

- **Data stays in the browser where you enter it.** Nothing is uploaded. Use **Team Setup → Export backup** regularly, and store the backup somewhere approved and access-controlled, because it contains confidential performance data. To move to another computer, use Restore backup.
- **One user per browser.** The role switcher demonstrates the permission design, but it is **not security**: anyone who can open the browser profile can switch roles. For real multi-user access with sign-in, employee self-service and enforced confidentiality, build the production version on the BRD architecture (Power Apps + Dataverse + Power Automate + Power BI), as described in `SYSTEM_DESIGN.md` §9.
- **Provisional scores.** Several scoring rules conflict or are undefined in the BRD, for example the hiring-point tables, the 40-point offer formula, the volume gate and the vendor denominator. Each one is configurable in **Rules & Settings** and marked *Pending*. Scores that depend on them are labelled *Provisional* until you record a decision.
- Reports cover the review period to the data cut-off (16 Oct 2026 in this version). Quarterly and monthly report filters are part of the production design, not this version.
- Excel downloads use the Excel 2003 XML format (`.xls`). Excel may warn that the file format and extension don't match; choose *Yes* to open it.
