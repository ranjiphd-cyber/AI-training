# Getting Started Guide: running the VTC Control Centre in your personal space

This guide assumes no technical background. It shows you how to run your own private copy of the Control Centre in your
web browser, add participants from an Excel sheet, and download reports. Expect the first setup to take about
15 minutes, mostly spent waiting. After that, starting the app takes about one minute.

> **Read this first.** This copy is a demonstration sandbox, not the official system.
> - Use **made-up (synthetic) data only**. Do not upload real student, teacher or trainer details until the system is
>   approved and hosted by Volvo IT. Privacy law (India's DPDP Act) and Volvo/SRM data policies apply.
> - Sign-in is a **demo sign-in**: anyone who can open your copy can pick any role, including an approver. Keep it private.
> - No emails are ever sent from this copy.

---

## Words you will see

| Word | What it means here |
|---|---|
| **GitHub** | The website where the project's files (the "code") are stored, in your repository `ranjiphd-cyber/ai-training`. |
| **Repository (repo)** | The project folder on GitHub. |
| **Codespace** | A temporary computer that GitHub runs for you in the cloud. You use it through your web browser, so there's nothing to install. |
| **Branch** | A named version of the project. The Control Centre is on the branch `claude/intelligent-galileo-jznhlr` until it is merged into the main version. |
| **Port 3000** | The "door" through which the app is shown in your browser. GitHub gives it a private web address. |
| **Terminal** | The black text window at the bottom of the Codespace, where the app prints what it is doing. |
| **Synthetic data** | Invented names and numbers used for practice. |

---

## Part A: One-time setup (about 15 minutes)

### Step 1: Check your repository is private
1. Go to **github.com** and sign in.
2. Open your repository **ranjiphd-cyber/ai-training**.
3. Next to the name you will see **Public** or **Private**.
4. If it says **Public**, go to **Settings → General → Danger Zone → Change repository visibility → Make private**.
   *Why:* a public repository lets anyone on the internet read the project files.

### Step 2: Create your Codespace
1. In the repository, click the branch selector (it usually says **main**) and choose
   **claude/intelligent-galileo-jznhlr**.
2. Click the green **<> Code** button.
3. Open the **Codespaces** tab.
4. Click **Create codespace on claude/intelligent-galileo-jznhlr**.
5. A new browser tab opens showing an editor (it looks like Microsoft VS Code). Leave it alone while it sets up.
   - You will see "Setting up your codespace" and a log of activity. **First setup takes 5–10 minutes.**
   - It installs the app, creates the database and loads the demo data automatically.
6. When it finishes, a terminal at the bottom shows a line containing `Server listening at http://0.0.0.0:3000`.
   A preview of the app may open by itself.

### Step 3: Open the app in a full browser tab
1. At the bottom of the editor, click the **PORTS** tab.
2. Find the row labelled **VTC Control Centre (3000)**.
3. Hover over the **Forwarded Address** and click the **globe icon (Open in Browser)**.
4. The sign-in page opens. Bookmark it. The address looks like
   `https://<your-codespace-name>-3000.app.github.dev`.
5. Leave **Visibility** set to **Private** (the default). Only you, signed in to GitHub, can open it.

That's it: your private copy is running.

---

## Part B: Everyday use

### Start your copy
1. Go to **github.com/codespaces**.
2. Click your Codespace's name. It "wakes up" in about one minute.
3. The app starts by itself in the terminal. If it doesn't, see *Troubleshooting*.
4. Open your bookmarked address (or use the **PORTS** tab as in Step 3).

### Stop your copy when you finish (important: it saves your free hours)
- Go to **github.com/codespaces**, click **⋯** next to your Codespace, and choose **Stop codespace**.
- GitHub also stops it automatically after 30 minutes without use.
- Your data (programmes, uploaded participants) is **kept** while stopped.
- GitHub gives personal accounts a monthly allowance of free Codespaces usage. Check your current allowance and usage
  under **GitHub → Settings → Billing and plans**. Stopping the Codespace stops usage. Storage is still counted while it
  is stopped, so delete Codespaces you no longer need.

### Sign in as a role
The sign-in page lists demo identities. Pick the role you want to act as:

| Choose | To try |
|---|---|
| Programme Administrator (synthetic) | Create programmes and sessions, request facilities, submit, finalise bookings, download reports |
| SRM Centre SPOC | Confirm or decline facilities, **upload participant spreadsheets**, download participant reports |
| G. V. Rao / Ranjith T. P. (demo identity) | Approve, return or reject requests, and download reports |
| Trainer A or B | Accept or decline teaching invitations |
| Technical Administrator | View settings and the audit log (cannot approve anything) |
| Read-only Auditor | See everything, change nothing, download reports |

Use **Sign out** (top right) to switch roles.

---

## Part C: Add participants from an Excel sheet

Only the **SRM Centre SPOC** role can upload, and only for their own institution. This matches the confirmed rule that
the SRM SPOC uploads participant records.

### Step 1: Get the template
1. Sign in as **SRM Centre SPOC**.
2. Click **Participants** in the left menu.
3. Click **Download the Excel template**. The file `vtc-participants-template.xlsx` downloads.
4. Open it in Excel. The **Instructions** sheet explains every column.

### Step 2: Fill it in
On the **Participants** sheet, enter one row per person:

| Column | Required? | Example |
|---|---|---|
| Participant type | Yes: Student or Teacher (pick from the drop-down) | Student |
| Full name | Yes, exactly as it should appear on a certificate | Priya Raman |
| Email | Email **or** roll/staff number is required | priya.r@example.edu |
| Roll or staff number | (see above) | RA2211003010123 |
| Department | Optional | Mechanical Engineering |
| Year of study | Students only, 1–6 | 3 |

Rules that keep the register clean:
- **Don't change the header row.**
- **Type values only.** Formulas such as `=A2&B2` are refused for safety, so use Paste → Values if you copied from elsewhere.
- Save as **.xlsx** (normal Excel workbook) or **.csv**. Macro files (.xlsm) and old .xls files are refused.
- Up to **2,000 rows** and **2 MB** per file.
- Collect only these fields. Don't add phone numbers, addresses or dates of birth.

Want to practise first? Use the ready-made practice file `vtc-control-centre/samples/sample-roster-SYNTHETIC.xlsx`.
In the Codespace, right-click it in the file list on the left and choose **Download**.

### Step 3: Upload and check the preview
1. Back on **Participants**, choose your **Institution** and click **Choose file** to pick your spreadsheet.
2. Click **Upload and preview**. **Nothing is saved yet.**
3. The preview counts the rows in four boxes:
   - **To add:** new people who will be registered.
   - **Need your decision:** someone with the **same name** but a different roll number or email already exists, or appears twice in the file.
     The system never assumes two people are the same just because their names match.
   - **Already registered:** same roll number or email as an existing person. These rows are skipped, so there are no duplicates.
   - **Errors:** each one shows what is wrong (for example, "Email is not a valid address"). These rows are **never imported**.
4. For every **Check: same name** row, click **New person** (a different individual) or **Skip**.
5. Click **Import N people**. You'll see "Imported N people; M rows skipped".
6. To fix error rows, correct them in Excel and upload the file again. People already imported are skipped automatically.

If you change your mind before importing, click **Discard upload**. Nothing is saved.

Every upload, decision and import is recorded in the audit log, with who did it and when.

---

## Part D: Download reports

1. Sign in as **Programme Administrator**, **G. V. Rao**, **Ranjith T. P.**, **Read-only Auditor** or **SRM Centre SPOC**.
2. Click **Reports & downloads** in the left menu.
3. Next to a report, click **Excel** (.xlsx) or **CSV**. The file downloads straight away.

| Report | Contains | Who can download |
|---|---|---|
| Programmes | One row per programme: status, sessions, first date, owner | Admin, approvers, auditor |
| Sessions, resources and trainers | Every session with times (IST), expected numbers, labs/rooms, trainers and their responses, booking state | Admin, approvers, auditor |
| Approval requests | Requests, decisions, reasons and the policy version used | Admin, approvers, auditor |
| SRM facility requests | Facility requests and SRM responses | Admin, approvers, auditor, SRM SPOC (own institution) |
| Participant register | Registered students and teachers (**personal data**) | Admin, approvers, auditor, SRM SPOC (own institution) |
| Audit log | Who did what and when | Approvers, auditor |

Each Excel file has a second sheet, **About this report**, showing when it was produced, by whom, how many rows it has,
and whether it contains personal data. The **Data class** column marks **SIMULATION** rows (practice records) separately
from **OPERATIONAL** ones. Every download is recorded in the audit log.

> CSR impact figures (students trained, training hours, participant-hours) are not in the reports yet. They will be
> calculated from verified attendance in Stage 3, never estimated.

---

## Part E: Practise the full workflow (10 minutes)

1. **Programme Administrator** → **Programmes** → open "Vehicle Diagnostics Lab Series (SIMULATION)".
2. Click **Request SRM facility confirmation**, then **Submit for approval**.
3. Sign out. **SRM Centre SPOC** → **SRM Operations** → **Respond** → **Confirm availability** (for each row).
4. Sign out. **Trainer B** → **Trainers** → **Accept**.
5. Sign out. **Programme Administrator** → open the programme. Under Session 2, choose Trainer A → **Invite**.
6. Sign out. **Trainer A** → **Trainers** → **Accept**.
7. Sign out. **Ranjith T. P.** → open the programme → **Approve**.
8. Sign out. **Programme Administrator** → open the programme. Every line of **Booking readiness** is now ✓ → **Confirm final booking**.
9. Open **Calendar & Resources** to see the confirmed booking, then **Reports & downloads** → **Sessions** → **Excel**.

Also try the "Industry Orientation (operational draft)" programme. Submitting it is **blocked** with an explanation,
because the real approval routing (decision D-01) has not been decided yet. This is intended.

---

## Part F: Showing it to someone

- **Easiest and safest:** share your screen in Teams or Zoom while you drive the app.
- **Letting someone click through it themselves:** in the **PORTS** tab, right-click the port → **Port Visibility**:
  - **Private to Organization** works only if your Codespace belongs to a GitHub organization.
  - **Public** means *anyone with the link* can open it **and sign in as any role**. Use it only for a short, live session,
    switch it back to **Private** straight afterwards, and stop the Codespace.

---

## Part G: Starting fresh

To wipe everything and reload the original demo data:
1. In the Codespace terminal, press **Ctrl + C** to stop the app.
2. Run each command below (type or paste it, then press Enter):

```bash
cd /workspaces/ai-training/vtc-control-centre
```

```bash
npm run seed
```

```bash
npm start
```

---

## Troubleshooting

| What you see | What to do |
|---|---|
| The page says "Sign in required" or keeps returning to sign-in | Your sign-in expired (after 8 hours) or the Codespace restarted. Sign in again. |
| The PORTS tab has no port 3000, or the page won't load | The app isn't running. Open the terminal (menu **☰ → Terminal → New Terminal**) and run the two commands below this table. |
| "Address already in use" | The app is already running in another terminal. Use that one, or close it with the 🗑 icon and start again. |
| Upload says "Formulas are not accepted" | In Excel, select all → Copy → Paste Special → **Values**, save, and upload again. |
| Upload says "The header row does not match the template" | Start from a fresh template and paste your data under the existing headers. |
| Upload says the institution "is not an approved institution" | Only approved institutions can register participants. The partner-university list is decision D-03. |
| "Action not completed … Correlation ID: …" | Note the ID. It locates the exact event in **Administration & Audit**. |
| Codespace won't start / out of hours | Check **GitHub → Settings → Billing and plans → Codespaces** usage. Delete old Codespaces at github.com/codespaces. |

Commands to restart the app (run each one, pressing Enter after each):

```bash
cd /workspaces/ai-training/vtc-control-centre
```

```bash
npm start
```

---

## Alternative: run it on your own laptop

Only needed if you prefer not to use Codespaces.
1. Install **Node.js 22** (LTS) from nodejs.org and **PostgreSQL 16** from postgresql.org.
2. Download the project from GitHub (**<> Code → Download ZIP**, after selecting the branch) and unzip it.
3. Follow **Run locally** in `vtc-control-centre/README.md`.

---

## When it moves to the official system

This personal copy is for learning, demonstrations and refining requirements. Moving to Volvo's approved environment
needs the decisions in `docs/03-decision-register.md` (approval routing, sign-in provider, hosting and others).
Nothing you practise here is lost: the same workflows, templates and reports carry over.
