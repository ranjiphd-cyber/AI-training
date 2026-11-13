// End-to-end smoke test on the built single-file app. SYNTHETIC DATA ONLY.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import * as XLSX from 'xlsx';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const file = 'file://' + path.resolve('dist/index.html');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tas-'));
const out = process.env.SHOTS || tmp;
const log = (...a) => console.log('✓', ...a);
const fail = (m) => { console.error('✗', m); process.exit(1); };

// synthetic import files
const team = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(team, XLSX.utils.aoa_to_sheet([
  ['Employee ID', 'Employee Name', 'Role', 'TA Team', 'Cadence', 'Target SG', 'Start Date (if mid-year)', 'Leaving Date'],
  ['T001', 'Test Recruiter A', 'Recruiter', 'Team 1', 1, 'SG7', '', ''],
  ['T002', 'Test Lead B', 'Lead', 'Team 1', 0.5, 'SG7', '', ''],
  ['T003', 'Test Leaver C', 'Recruiter', 'Team 1', 1, 'SG5', '', '15-03-2026'],
]), 'Employee Master');
XLSX.writeFile(team, path.join(tmp, 'team.xlsx'));
const offers = [['Req ID', 'Candidate ID', 'Recruiter', 'Stream', 'Salary Grade', 'Req Approved Date', 'Offer Date', 'DOJ', 'Gender', 'Source', 'Status']];
for (let i = 0; i < 12; i++) offers.push([`R${100 + i}`, `C${i}`, i % 3 === 0 ? 'Test Lead B' : 'T001', i % 4 === 0 ? 'NATS' : 'Lateral', i % 2 ? 'JL7' : 'SG5', `0${1 + (i % 8)}-01-2026`, `1${i % 9}-0${2 + (i % 7)}-2026`, i % 2 ? `2${i % 8}-0${3 + (i % 6)}-2026` : '', i % 3 ? 'Female' : 'Male', i % 5 ? 'Direct' : 'Vendor', i % 2 ? 'Joined' : i === 4 ? 'Declined' : 'Offered']);
offers.push(['R100', 'C0', 'T001', 'Lateral', 'SG5', '01-01-2026', '10-02-2026', '', 'Male', 'Direct', 'Offered']); // duplicate
offers.push(['R999', 'C9', 'Nobody', 'Lateral', 'SG5', '01-01-2026', 'tomorrow', '', '', '', 'Offered']); // error row
const ob = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(ob, XLSX.utils.aoa_to_sheet(offers), '1_Offers');
XLSX.writeFile(ob, path.join(tmp, 'offers.xlsx'));

const browser = await chromium.launch();
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1360, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('dialog', (d) => d.accept(d.type() === 'prompt' ? 'ERASE' : undefined));
await page.goto(file);
const nav = (n) => page.getByRole('navigation').getByRole('button', { name: n, exact: true }).click();

// 1. create workspace
await page.getByText('Create your workspace').waitFor();
if ((await page.locator('input').first().inputValue()) !== 'ranjiphd@gmail.com') fail('default email');
await page.getByPlaceholder('Shown on reports').fill('Test Org');
await page.locator('input[type=password]').nth(0).fill('correct horse battery');
await page.locator('input[type=password]').nth(1).fill('correct horse battery');
await page.getByRole('button', { name: 'Create workspace' }).click();
await page.getByRole('heading', { name: 'Executive Overview' }).waitFor();
log('workspace created; empty state shown with no fabricated data');
if (!(await page.getByText('No recruiters yet').isVisible())) fail('empty state');

// 2. import team
await nav('Data Imports');
await page.locator('select').nth(2).selectOption('recruiters');
await page.locator('input[type=file]').setInputFiles(path.join(tmp, 'team.xlsx'));
await page.getByRole('button', { name: 'Validate and preview' }).click();
await page.getByRole('button', { name: 'Approve and commit' }).click();
await page.getByText('Import history').waitFor();
log('team imported (3 people)');

// 3. import offers
await page.locator('select').nth(2).selectOption('offers');
await page.locator('input[type=file]').setInputFiles(path.join(tmp, 'offers.xlsx'));
await page.getByRole('button', { name: 'Validate and preview' }).click();
const tiles = await page.locator('.tile .v').allInnerTexts();
log('offer reconciliation (read / ready / dup / rejected):', tiles.slice(0, 4).join(' / '));
if (tiles.slice(0, 4).join() !== '14,12,1,1') fail('reconciliation counts ' + tiles.join());
await page.screenshot({ path: path.join(out, 'import.png') });
await page.getByRole('button', { name: 'Approve and commit' }).click();
await page.waitForTimeout(300);

// 4. scorecard
await nav('Delivery Scorecard');
await page.locator('.topbar select').nth(1).selectOption('YTD');
const sc = await page.locator('table tbody tr').allInnerTexts();
log('scorecard rows:', sc.length);
if (!sc.some((t) => /Exceptional|Exceeds Expectations|Meets Expectations|Developing|Not Meeting Expectations/.test(t))) fail('no band computed');
await page.screenshot({ path: path.join(out, 'scorecard.png'), fullPage: true });

// 5. overview + names hidden
await nav('Executive Overview');
await page.getByText('Leavers (shown separately').waitFor();
log('leaver shown separately from ranking');
await page.screenshot({ path: path.join(out, 'overview.png'), fullPage: true });
await page.getByLabel('Show names').uncheck();
if (await page.getByText('Test Recruiter A').count()) fail('names not masked');
log('names masked');
await page.getByLabel('Show names').check();

// 6. profile trace + review
await page.getByRole('cell', { name: 'Test Recruiter A' }).first().click();
await page.getByText('Source records → eligibility').waitFor();
await page.screenshot({ path: path.join(out, 'profile.png'), fullPage: true });
await page.getByRole('tab', { name: 'Record review' }).click();
await page.locator('textarea').first().fill('Synthetic test commentary');
await page.getByRole('button', { name: 'Save review snapshot' }).click();
log('review snapshot saved');

// approve rule version, then approve review
await nav('Settings & Audit Log');
await page.getByRole('button', { name: 'Approve version' }).click();
await page.getByText(/approved .* frozen/).waitFor();
await nav('Reviews & Appraisals');
await page.locator('table tbody tr').first().click();
await page.getByRole('button', { name: 'Verify reproducibility' }).click();
await page.getByText('Reproduced exactly').waitFor();
log('frozen review reproduces exactly');
await page.locator('select').filter({ hasText: 'not set' }).selectOption({ index: 1 });
await page.getByRole('button', { name: 'Approve review' }).click();
await page.getByRole('cell', { name: 'approved' }).waitFor();
log('review approved (final rating kept separate from band)');

// 7. exports
await nav('Reports & Exports');
for (const [label, ext] of [['Team review pack (.pptx)', 'pptx'], ['Delivery scorecard (.xlsx)', 'xlsx'], ['Growth & development (.xlsx)', 'xlsx']]) {
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: label }).click()]);
  const p = path.join(out, dl.suggestedFilename());
  await dl.saveAs(p);
  if (!p.endsWith(ext) || fs.statSync(p).size < 2000) fail('export ' + label);
  log('exported', dl.suggestedFilename(), fs.statSync(p).size, 'bytes');
}
const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download .pptx' }).first().click()]);
await dl.saveAs(path.join(out, dl.suggestedFilename()));
log('individual pack', dl.suggestedFilename());
// export consistency: xlsx scorecard values = engine values shown on screen
const wbx = XLSX.read(fs.readFileSync(path.join(out, fs.readdirSync(out).find((f) => f.startsWith('TA_Delivery_Scorecard')))));
const sheet = XLSX.utils.sheet_to_json(wbx.Sheets['Delivery scorecard']);
const a = sheet.find((r) => r.Name === 'Test Recruiter A');
await nav('Delivery Scorecard');
const rowA = await page.getByRole('row', { name: /Test Recruiter A/ }).innerText();
if (!rowA.includes(String(a.Points))) fail(`export mismatch ${a.Points} vs ${rowA}`);
log('Excel export matches dashboard (points', a.Points + ')');

// 8. lock and sign in again; wrong passphrase rejected
await page.getByRole('button', { name: 'Lock' }).click();
await page.locator('input[type=password]').fill('wrong passphrase!');
await page.getByRole('button', { name: 'Sign in' }).click();
await page.getByText('Incorrect email or passphrase').waitFor();
log('wrong passphrase rejected');
await page.locator('input[type=password]').fill('correct horse battery');
await page.getByRole('button', { name: 'Sign in' }).click();
await page.getByRole('heading', { name: 'Executive Overview' }).waitFor();
log('data persisted locally and decrypted after sign-in');
const stored = await page.evaluate(() => new Promise((res) => { const r = indexedDB.open('ta-scorecard'); r.onsuccess = () => { const g = r.result.transaction('vault').objectStore('vault').get('data'); g.onsuccess = () => res(JSON.stringify(g.result)); }; }));
if (stored.includes('Test Recruiter A')) fail('plaintext found in storage');
log('stored data is encrypted (no plaintext names in IndexedDB)');

await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: path.join(out, 'mobile.png') });
if (errors.length) fail('page errors: ' + errors.join(' | '));
log('no page errors');
await browser.close();
console.log('ALL PASSED · outputs in', out);
