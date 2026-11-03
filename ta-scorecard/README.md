# TA Performance Scorecard

A standalone, offline app for evaluating recruiter and lead performance year after year: delivery scoring, growth (1–10), 3×3 matrix, reviews and calibration, imports, and editable PowerPoint/Excel reports. It is not tied to any company; the organisation name is a setting.

## Run it

1. Download **`TA_Performance_Scorecard.html`** (this folder) to your computer.
2. Open it in **Chrome or Edge** (double-click). No installation, no internet, no server.
3. First time: create the workspace with your email (pre-filled `ranjiphd@gmail.com`) and a passphrase of at least 10 characters.
4. Next times: sign in with the same email and passphrase. The app locks itself after 15 minutes idle.

**Where the data is:** only on this computer, encrypted (AES-256-GCM, key derived from your email and passphrase with PBKDF2, 310,000 iterations) inside the browser's storage for this file. Nothing is sent anywhere. Save an encrypted backup regularly (Settings → Backup) — clearing browser site data or losing the passphrase loses the workspace. Keep the HTML file in the same folder: browsers treat a moved file as a new app (restore from backup if you move it).

**Recruiters do not log in.** Download their individual PowerPoint pack (Reports & Exports) and send it yourself.

**Retention:** 3 years. Settings → General lists records older than 3 years and deletes them only when you confirm.

## Quick start

1. **Data Imports** → *Team members*: upload your employee master (Employee ID, Name, Role, Team, Cadence, Target SG, start/leaving dates), or add people in Recruiter Profiles.
2. **Data Imports** → *Offers*: upload the hiring tracker (one row per offer). Map columns, check the preview, approve.
3. **Settings → Scoring rules**: review the pre-filled agreed rules and fill the items listed under *Still to decide*. Approve the version.
4. **Delivery Scorecard / Recruiter Profiles**: results with full calculation trace.
5. **Recruiter Profile → Record review**, then **Reviews & Appraisals** to set the calibrated final rating and approve.
6. **Reports & Exports**: team pack, individual packs, Excel workbooks, PDF.

## For developers

Source is in `app/` (React + TypeScript, Vite, single-file build).

```bash
cd app && npm install
npm test          # engine + import unit tests
npm run build     # → app/dist/index.html (copy to ../TA_Performance_Scorecard.html)
npm run e2e       # browser end-to-end test on the built file (needs Playwright + Chromium)
```

Documents: [scoring rules and sources](docs/scoring-rules.md) · [decisions](docs/decisions.md) · [requirements](docs/requirements.md) · [test results](docs/test-results.md) · [architecture](docs/architecture.md) · [limitations](docs/known-limitations.md)
