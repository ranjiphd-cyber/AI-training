# TA Vendor Register

Talent Acquisition vendor dashboard for Dr. Ranjith TP. It covers the vendor directory, the shortlist with transparent ranking, PASS / HOLD / FAIL decisions, data-quality flags, web-research suggestions and annual vendor performance evaluation.

## Files

| File | Purpose |
| --- | --- |
| `app.html` | Dashboard source (page fragment with an empty data placeholder). |
| `index.html` | Standalone build with **no vendor data**. Open it and use **Import** to load `vendors.json`. |
| `tools/build_dataset.py` | Parses the shortlisting workbook (all six tabs) into `vendors.json`, merging duplicates and recording conflicts. |
| `tools/inject.py` | Embeds `vendors.json` into `app.html` to make a working page. |

## Why the data is not in this repository

The workbook holds names, phone numbers and e-mail addresses of 300+ vendor contacts and client references, plus GST/PAN numbers. This repository is public, so the data is kept out (see `.gitignore`). The full dashboard with data is published as a private claude.ai artifact.

## Build locally

```bash
python3 tools/build_dataset.py Short_listed_vendor-26.xlsx vendors.json
python3 tools/inject.py app.html vendors.json register-with-data.html --standalone
```

Opened as a local file, the page saves edits and evaluations in that browser only. As a claude.ai artifact it uses the artifact's shared database, so changes are saved for everyone with Contributor access or higher.

## Rules the dashboard follows

- Workbook values are kept as written. Conflicts between tabs are shown side by side and labelled **Conflicting**, not resolved.
- Quality labels: Provided, Needs verification, Conflicting, Missing, Web-sourced, Edited, Not evaluated.
- Hiring categories show their basis: from the workbook, derived from keywords, or ambiguous.
- Each shortlisted vendor sits in exactly one category: Executive / CXO, Leadership, Junior–mid or Volume. The workbook's CXO/Leadership shortlist tab decides where it covers a vendor; other PASS vendors get a proposed category marked "Proposed · confirm". HOLD and FAIL vendors cannot be shortlisted. The Junior–mid shortlist only takes vendors from the workbook's junior–mid list (Module C = yes or a Mid Level tag).
- Under each category, every vendor the workbook lists for it (Executive search tab, Volume hiring tab, Shortlisted Vendors blocks, Modules B/C, level tags) is shown unranked, so no listed name is dropped.
- Fee bands per category come from TA guidance (Executive 22–33%, Leadership 16–22%, Junior–mid 8.33–10%) and are editable. They show as estimates until a vendor-specific fee is entered. The workbook itself contains no fee data.
- A contact register lists every name, phone and e-mail in the workbook, splitting combined cells into one row per person.
- Web research is never applied without approval. Firms added from the web are shown in violet and carry no contact details.
- Performance ratings are entered only by users. A missing rating is excluded from scores, never counted as zero. The window is the most recent 5 completed years of Volvo engagement, or fewer if the engagement is shorter. Each evaluation keeps the criteria and weights that applied when it was entered.
