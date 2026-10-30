# Setup guide

About 30 minutes. You need a Google account and, for hosting, this GitHub repository. An Anthropic API key is optional, but recommended: it powers the live company research (employee reviews, news, leadership statements, function level) that lets candidates from any company get a researched match.

## 1. Create the data store (Google Sheet and Apps Script)

1. Create a new Google Sheet, for example "Fit Check study data". Keep it private: share it only with the research team.
2. In the sheet, open **Extensions → Apps Script**.
3. Delete the sample code, paste the contents of [`backend/Code.gs`](../backend/Code.gs) and save.
4. Optional, for the company research: open **Project settings → Script properties** and add a property named `ANTHROPIC_API_KEY` with your Claude API key. To change the daily limit (default 60 new organisations per day) or the cache period (default 14 days), edit `CFG` at the top of `Code.gs`.
5. Click **Deploy → New deployment**, choose type **Web app**, and set:
   - *Execute as*: **Me**
   - *Who has access*: **Anyone**
6. Click **Deploy**, authorise the requested permissions, and copy the **Web app URL** (it ends in `/exec`).

The sheet gets four tabs automatically: `responses` (one row per participant, one column per answer), `contacts` (follow-up emails, stored separately), `withdrawals`, and `scan_cache`.

## 2. Configure and build the app

Edit [`config.json`](../config.json):

| Field | What to enter |
|---|---|
| `studyName` | Shown at the top of every page |
| `researcher`, `contactEmail` | Shown in the participant information and on the thank-you page |
| `ethicsRef` | Your ethics committee approval reference, once you have it |
| `dataLocation`, `retention` | How and how long data is stored (shown to participants) |
| `backendUrl` | The Web app URL from step 1.6 |
| `scanEnabled` | `true` only if you set `ANTHROPIC_API_KEY` |

Then build:

```bash
python3 fit-check/build.py
```

This writes `fit-check/index.html` and refreshes `docs/item-bank.md`. Re-run it after any change to `src/`, `config.json`, or the shared engine in `culture-fit-architect/index.html`.

## 3. Host the app

**GitHub Pages (free).** In the repository, open **Settings → Pages**. Under *Build and deployment*, choose **Deploy from a branch**, select the branch that holds `fit-check/` and the `/ (root)` folder, then save. After a minute, the app is available at:

```
https://<your-github-user>.github.io/<repository>/fit-check/
```

The page contains no confidential data. It holds the questionnaire, the scoring engine, and the backend URL. The backend only accepts new submissions and withdrawals; it never returns data.

Any static host works instead, for example Netlify (drag and drop the `fit-check` folder) or your university web space.

## 4. Test before inviting participants

1. Open the app and complete it once in each mode (about 20 minutes each; you can answer quickly).
2. Confirm that a new row appears in the `responses` tab and that `consent_research` is 1.
3. If company research is enabled, try it with a well-known organisation and a business unit. Check that the report's *What the company research says* section lists sources under several types, and that the `scan_cache` tab has a row.
4. Try **Withdraw my data** on the thank-you page. The row's `withdrawn` column should change to 1.
5. Delete your test rows before launch.

## 5. Running the study

- **Invite participants** with the link and a short note on purpose, time needed (20–25 minutes), anonymity, and what they get (an instant personal report).
- **Withdrawals:** once a month, open Apps Script and run `purgeWithdrawn`. This deletes withdrawn participants' rows from `responses` and `contacts`. You can also add a monthly time-driven trigger for it.
- **Analysis:** download the `responses` tab as CSV (**File → Download → CSV**), then run:

  ```bash
  python3 fit-check/analysis/validate.py responses.csv --out results/
  ```

  Read `results/validation_report.md`. To try the pipeline before real data exists:

  ```bash
  python3 fit-check/analysis/simulate.py --n 400 --out sim.csv
  ```

  ```bash
  python3 fit-check/analysis/validate.py sim.csv --out sim_results/
  ```

## Costs

- Google Sheets and Apps Script: free within Google's quotas (a few hundred submissions a day is far below them).
- **Company research:** billed to your Anthropic account. Each new combination of organisation, unit, location and function runs one Claude request with up to 14 web searches. Expect roughly US$0.20–0.80 per research run, and check current pricing before launch. Results are cached for 14 days and capped at 60 new runs a day (`CFG` in `Code.gs`).

## Changing the questionnaire

Edit `src/instrument.json`, increase `version` (for example `FC-1.2`), rebuild, and redeploy. Every record stores `instrument_version`, so the analysis can separate versions. New item IDs become new sheet columns automatically.
