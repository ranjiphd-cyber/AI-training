# NIPUNA Karnataka — Independent Proposal Review Workbench

A single-advisor tool for Dr. Ranjith T P to review skilling and employment proposals forwarded by KDEM under NIPUNA Karnataka, and to issue a concise, editable Word evaluation. It supports the advisor's judgement. It never issues or implies government approval.

| Path | What it is |
|---|---|
| `dist/index.html` | The artifact page (React + htm, single file; libraries load from pinned CDN URLs) |
| `src/engine.js` | Deterministic logic: money parsing/formatting, budget and funding reconciliation, safe formula checks, scoring, gating, excerpt verification, prompt building |
| `src/report.js` | Word report and internal annex builder (`docx` library), shared by browser and tests |
| `src/app.js`, `src/shell.html` | User interface and page styles; `node build.js` assembles `dist/` |
| `private/` (git-ignored) | Applicant material: the prepared first case, its builder, its reports and private regression checks. **This repository is public; applicant documents, case files and evaluations must never be committed.** `node build.js` publishes `private/prepared.case.json` (if present) with the private artifact only. |
| `tests/` | Acceptance tests, browser smoke test, results (`tests/RESULTS.md`) |

## What the environment supports, and how each piece works

| Need | How it is done here | Limits |
|---|---|---|
| PDF extraction | pdf.js 3.11.174 in the browser, page by page; citations are `p.N` (physical PDF page). Pages without a text layer and pages with embedded images are flagged. | **No OCR.** Scanned pages are reported as unreliable; supply an OCR-enabled copy, paste text, or add a labelled transcription for that page. |
| DOCX extraction | mammoth 1.6.0; locations are headings, paragraphs and table rows. | No DOCX page numbers (never invented). Footnotes, text boxes and headers may be dropped; a warning says so. |
| AI analysis | The claude.ai artifact `sample` capability: the viewer's own Claude account, after a consent prompt and an explicit tick-box. Two calls: facts extraction, then analysis. | Not available outside claude.ai. Fallback: copy the prompt into a Claude chat and paste the JSON back. Every quoted excerpt is re-checked against the source text; unmatched quotes are marked “excerpt not found”. |
| External verification | **Not available inside the tool** (it cannot browse). Records are entered by the advisor and labelled “Advisor-entered verification”. Without records the report says “Independent verification not performed.” and prints a checklist. | The prepared first case carries records from web research done in a Claude Code session, labelled “Claude session web research (advisor to re-check)”, with URLs, dates and limitations. |
| Arithmetic | Application code only: line items (qty × unit × frequency), subtotals, funding shares and reconciliation, tranche totals per funder, per-trainee costs, free-form checks (e.g. `13 × 2 × 50`). | No tax, calendar or utilisation assumptions are added. Rounding is to the paisa; tolerance is ±₹0.50. |
| Word output | `docx` 8.5.0 builds a real OOXML file (editable paragraphs and tables, repeating table headers, hyperlinks, A4, page X of Y footer). Saved through the artifact `downloads` capability (the viewer confirms each save). | 3–5 pages is a target, not a guarantee; Word's pagination may differ. |
| Saving cases | The artifact `db` capability, under `data/users/<your id>/`, which only your account can read. Falls back to browser storage, and you can always export/import a `.case.json`. | No claims about encryption or guaranteed deletion. Exported files are outside the tool's control. |

## First-use guide

1. Open the artifact on claude.ai. Press **Upload a proposal — PDF or Word (.docx)** to start a case from the proposal file, or **Open the prepared case**. Old `.doc` files are refused with an instruction to re-save them as `.docx` or PDF.
2. **A. Case**: set stage, evaluation date (defaults to today), whether a current approved policy was supplied, and special concerns. Tick the confidentiality acknowledgement.
3. **B. Documents**: pick a role, then add PDF/DOCX/TXT files: proposal, annexures, current policy, earlier evaluations, applicant responses, and the reference report (format only). Read the extraction warnings; add transcriptions for image-only pages that carry evidence.
4. **C. Facts**: press **Extract facts** (or use the manual route). Check each value against its citation (click a citation chip to open the evidence viewer), add missing values, tick **Confirmed**. Conflicting values stay side by side.
5. **D. Analyse**: enter or paste the budget lines and totals, funding sources and tranches, and any consistency checks. Then **Run analysis**.
6. **E. Findings & scores**: filter and edit findings (evidence label, severity, stage, required action, closure evidence). Accept or override each score; a reason is required when you change an AI draft by 0.25 or more. Edit the compliance rows. Category A rows are only possible once a policy document and an officer confirmation are recorded.
7. **F. Decision**: add verification records, review the condition lists, and choose exactly one outcome with merit, readiness, rationale and principal conditions.
8. **G. Report & save**: preview, then **Download report for KDEM (Word .docx)**. The same download is always available from **Download Word report** in the top bar. The file is named `NIPUNA-Evaluation_<applicant>_<date>.docx` and opens as an editable Word document for final edits before sending. The internal annex is a separate download for your records. Copy the short summary, export the case file, and save.

For a **revised proposal**, add it as “Proposal (revised)” to the same case, plus the earlier evaluation and the applicant's response. Earlier findings can be marked Closed / Partly closed / Unresolved / New finding. **Closed** stays disabled until closure evidence is entered.

## Privacy

Files are parsed in the browser. Extracted text is stored with the case. AI analysis sends the text of the proposal (and, for analysis, policy and verification) documents to Claude under the advisor's account, only after explicit confirmation. Reference reports are never sent as evidence. Do not upload trainee lists or identity documents. The audit trail records document changes, fact edits, analysis runs, score overrides, status changes and exports.

## Test results (run 7 Nov 2026)

`node tests/acceptance.test.js`: **16 of 16 passed**: the 14 required tests plus 2 regression checks, all on synthetic fixtures. The scanned-PDF test generates its own image-only PDF. See `tests/RESULTS.md`. Private checks on the first real case (budget recomputation, tranche discrepancy, all citations verified against the PDF, report length) also passed; they are not in the repository.
`node tests/browser-upload-download.js`: passed. It covers a Word proposal and a PDF proposal uploaded from the home screen, `.doc` rejection, and both download buttons through a simulated claude.ai download capability; each downloaded file was reopened with python-docx and LibreOffice.
`node tests/browser-smoke.js`: passed in headless Chromium. Covered: real PDF upload and extraction warnings, evidence viewer, the unavailable-Claude path, export refusal outside claude.ai, in-browser .docx generation and preview, the prepared case, the score override with reason enforcement, and 390 px phone width with no horizontal overflow.

**Not tested**: live Claude calls through `sample`; the claude.ai download prompt; the claude.ai `db` store. These run only inside the claude.ai viewer. Model compliance with the embedded-instruction guard is also untested live; test 12 covers detection, prompt structure and output sanitising only. The CDN script URLs could not be fetched from the build container; the browser test used identical local copies of the same package versions.

## Deployment / integration outside claude.ai

The page runs anywhere that serves `dist/` as static files. Outside claude.ai, `sample`, `downloads` and `db` are absent: the tool falls back to browser storage and the manual prompt route, and it cannot save files until a download path is added. To run AI analysis from your own host, add a small server endpoint and never put an API key in the page:

```
POST /api/analyse
Request:  { "prompt": "<string from NWB.buildFactsPrompt(c).prompt or NWB.buildAnalysisPrompt(c).prompt>", "kind": "facts" | "analysis" }
Response: the JSON object described at the end of the prompt (parsed), or { "error": "<message>" }
```

The server holds the Anthropic API key, calls the Messages API with the prompt as the user turn, and returns the parsed JSON. The page passes the result to `NWB.applyFactsResult` / `NWB.applyAnalysisResult`, which verify every excerpt.

Rebuild and test:

```bash
npm install
```

```bash
node build.js && node tests/acceptance.test.js
```
