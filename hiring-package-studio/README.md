# Hiring Package Studio

Prepared by Dr. Ranjith TP.

A working tool for Talent Acquisition Partners. Use it to prepare, update and share a hiring package with a hiring manager, from the first kickoff meeting to the hiring closure date.

## What it does

- **Guided steps:** the dashboard opens on five steps: enter details, market research, tentative plan, submit, send to hiring manager. Each step shows its status and a button for the next action.
- **Tentative plan as a Gantt chart:** every dated stage is a bar (a window) or a diamond (a single date) on a weekly grid, with today and the closure date marked. It appears on the dashboard and the Plan page, and as a week-by-week grid in the Tentative Hiring Plan document (Word, HTML and email).
- **Talent Market Intelligence Report:** structured like a talent-intelligence agency report: executive summary with key findings and an at-a-glance table, scope and methodology, market context, talent supply, demand and competition, compensation benchmarks, hiring difficulty index, talent mobility, alternative talent pools, recommendations, data gaps for the TA Partner to confirm, references and limitations. It also includes headline-number tiles, a city map of hiring growth (cities placed by latitude/longitude, no boundaries), pay-range and difficulty charts, skill trends, talent availability by city, and target companies grouped as GCCs, automotive, IT services and start-ups/boutiques. INR pay is shown in lakh. Charts are drawn as images so they appear in the page, the Word file and the email. Every finding carries a source ID ([S1]) and an evidence type, and anything Claude cannot verify goes to the data-gaps list instead of being guessed.
- **Per-section actions:** Kickoff & minutes, Market intelligence and Interview & hiring plan each have a bar with **Edit**, **Generate report** (shows the finished document with Word, HTML and email options) and **Submit** (checks required details and saves a numbered version; for market intelligence it sends the details to Claude for research).
- **Click to confirm:** in every on-screen report preview, the email preview, the Confirmation tracker and the dashboard callout, each **[To confirm] ✎** and each red status is clickable. It opens a small editor to enter the value and set the status (preset to Confirmed). Downloads and copied emails show plain text.
- **Submit:** the Submit button in the header checks the required details, builds the plan if needed, saves a numbered version, and asks Claude to research the market if that has not been done yet. Adding the research findings rebuilds the plan from the market difficulty.
- **Dashboard (opens first):** live tiles for business days to closure, the share of items confirmed, open hiring manager decisions, the hardest skill to hire, the first resume commitment, offer and start dates, market research status, and open actions. Charts show confirmation status by area, the tentative hiring plan and timeline against the closure date, hiring difficulty by skill, and indicative pay ranges. Hover or focus any mark to see its value.
- **Market research by Claude:** **Find market intelligence with Claude** saves a research brief built from the role, location, skills and the inputs tagged for market intelligence, then notifies the linked Claude Code session through the Claude Code Remote connector. Claude searches the web and writes sourced findings back to the page: availability and difficulty scores, pay ranges, market factors, alternative skills, typical notice period and sources with access dates. The TA Partner reviews the findings and selects **Add findings to the report**.
- **Tentative hiring plan based on market intelligence:** **Build tentative plan** sets the lead time to the first resumes from the hardest-to-hire skill (Low 5, Moderate 7, High 10, Very high 15 business days), widens the interview windows for High or Very high difficulty, suggests the size of the first resume set, and uses the notice period to estimate the start date. The interview schedule lists each stage from a dropdown (first set of CVs, hiring manager CV feedback, TA screening, first-level and second-level interviews, HR interview, final decision, offer, onboarding) with a tentative date or date window. All dates are limited to 2026–2035.
- **Separate downloads:** **Minutes of Meeting**, **Market Intelligence Report** and **Tentative Hiring Plan** are standalone documents, each available as Word (.docx), HTML or formatted email text. The full hiring package is still available too.
- **Inputs:** keep the job description, meeting notes, hiring manager emails, salary data and market reports with the requisition. Tag each input for the minutes, the market intelligence or the interview plan. Tagged inputs appear as read-only references in those sections.
- **Package sections:** these follow the order of the email document.
  1. Overview: role, people, dates, information status and executive summary. The summary can be drafted from the package data.
  2. Kickoff and minutes: a meeting log for every kickoff or follow-up; context; primary, secondary and good-to-have skills; location and market; hiring manager preferences; success measures; selection process and decision rights; interviewers and P&C partner; closure date; decisions; open questions; action items.
  3. Confirmation tracker: lists everything that is Confirmed, To confirm, Proposed or Missing, and flags critical gaps.
  4. Market intelligence: availability and a scored difficulty rating per skill, indicative pay ranges with currency, geography, date and limitations, market factors, alternative skills for the hiring manager to accept or reject, and a source register with links and access dates.
  5. Interview and hiring plan: stages, criteria, the first resume commitment (default 5), the interview schedule, assessments, the tentative offer date and onboarding/start date, milestones with decision points, and risks. **Build proposed timeline** fills in dates from the kickoff date in business days.
  6. Decisions requested from the hiring manager.
  7. TA Partner action list.
- **Meeting snapshots:** save a copy of the package after each meeting, compare it with the current version, or restore it.
- **Email document:** copy the package as formatted email text for Outlook or Gmail, or download it as Word (.docx) or HTML.

Every field and row carries a status, so recommendations are never shown as agreed. Empty fields appear as **[To confirm]** in the email document.

## Saving

- **Published artifact:** packages save to the artifact's shared store, so the TA team sees the same data and changes appear live.
- **Opened as a local file:** packages save in that browser only. Use **Meeting snapshots → Export package (.json)** to back up or move a package, and **Import** to load one.

The page ships with no market data. Pay figures and talent-supply findings must be researched and sourced for each role and location.
