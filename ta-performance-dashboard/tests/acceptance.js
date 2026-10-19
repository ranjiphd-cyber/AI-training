/* Acceptance test for the 12 validation criteria.
   Usage: serve the dashboard folder (e.g. `python3 -m http.server 8765`) and run
   `node tests/acceptance.js http://localhost:8765/index.html` with playwright (or playwright-core) installed.
   Set CHROMIUM_PATH to use a specific Chromium binary. Downloads are inspected with Python's zipfile. */
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');
let pw; try { pw = require('playwright'); } catch (e) { pw = require(process.env.PLAYWRIGHT_CORE || 'playwright-core'); }
const URL = process.argv[2] || 'http://localhost:8765/index.html';
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'ta-dash-'));
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' – ' + detail : '')); };
const zipText = (file, re) => execFileSync('python3', ['-I', '-c', 'import sys,zipfile,re\nz=zipfile.ZipFile(sys.argv[1])\nprint("\\n".join(n+"\\t"+z.read(n).decode("utf-8","ignore") for n in z.namelist() if re.search(sys.argv[2],n)))', file, re], { maxBuffer: 256 * 1024 * 1024 }).toString();

(async () => {
  const browser = await pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1400, height: 1000 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL);
  await page.waitForFunction(() => window.TA_READY === true);
  // Start from the seed so the test is repeatable.
  await page.evaluate(() => { TA.Store.resetToSeed(); TA.syncInsights(); });

  const nav = async (sec) => { await page.click(`#nav [data-sec="${sec}"]`); };
  const tab = async (sec, t) => { await page.click(`[data-act="tab"][data-sec="${sec}"][data-tab="${t}"]`); };
  const fill = async (data) => {
    for (const [k, v] of Object.entries(data)) {
      const el = page.locator(`#rec-form [name="${k}"]`);
      const tag = await el.evaluate(e => e.tagName + ':' + e.type);
      if (tag.startsWith('SELECT')) await el.selectOption(typeof v === 'object' ? v : { label: v });
      else if (tag.endsWith('checkbox')) await el.setChecked(!!v);
      else await el.fill(String(v));
    }
  };
  const save = async () => { await page.click('#form-save'); await page.waitForTimeout(80); };
  const saveConfirm = async () => { await save(); if (await page.locator('#form-save').isVisible()) await save(); };
  const formErrors = async () => (await page.locator('#form-msgs').innerText()).trim();
  const closeAll = async () => page.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
  const content = async () => page.locator('#content').innerText();
  const pid = (name) => page.evaluate(n => TA.Store.list('programmes').find(p => p.name === n).id, name);

  /* 1. Updating a metric refreshes related calculations and visuals */
  await nav('metrics'); await tab('metrics', 'programmes');
  await page.click(`[data-act="edit"][data-id="${await pid('Lateral')}"]`);
  await fill({ joined: 400 }); await save();
  await nav('overview');
  let txt = await content();
  check('1. Metric update refreshes calculations and visuals',
    txt.includes('934') && txt.includes('102.1%') && txt.includes('400 / 450') && (await page.locator('#nav [data-sec="quality"] .count').innerText()) === '5',
    'programme sum 934, aggregate 102.1%, chart label 400 / 450, reconciliation conflict raised');
  await nav('metrics'); await tab('metrics', 'programmes');
  await page.click(`[data-act="edit"][data-id="${await pid('Lateral')}"]`); await fill({ joined: 351 }); await save();

  /* 2. Compare valid periods and inspect evidence */
  await nav('metrics'); await tab('metrics', 'periods');
  await page.click('[data-act="add"][data-entity="periods"]');
  await fill({ label: '2025 YTD – Business scorecard', type: 'YTD', scope: 'Business scorecard', start: '2025-01-01', end: '2025-10-14', cutoff: '2025-10-14', source: 'Test fixture (not real data)' }); await save();
  const p25 = await page.evaluate(() => TA.Store.list('periods').find(p => p.label.startsWith('2025')).id);
  await tab('metrics', 'programmes'); await page.click('[data-act="add"][data-entity="programmes"]');
  await fill({ name: 'Lateral', periodId: { value: p25 }, group: 'Lateral hiring', target: 450, joined: 300 }); await save();
  await nav('trends');
  await page.selectOption('#cmp-period', p25);
  txt = await page.locator('#content').textContent();
  const amber = await page.locator('#content svg rect[fill="var(--series-2)"]').count();
  await page.selectOption('#cmp-period', 'per_rec_2026ytd').catch(() => {});
  const incompatible = await page.evaluate(() => { const r = TA.comparability(TA.period('per_biz_2026ytd'), TA.period('per_rec_2026ytd')); return !r.ok && r.reasons.join(' '); });
  const obsId = await page.evaluate(() => TA.Store.list('observations')[0].id);
  await page.evaluate(id => TA.openDrawer('observations', id), obsId);
  await page.fill('#ev-label', 'Source scorecard extract'); await page.fill('#ev-url', 'https://example.org/scorecard'); await page.click('[data-act="ev-add"]');
  const drawerTxt = await page.locator('#dlg-drawer').innerText();
  await closeAll();
  if (process.env.DEBUG) console.log({ amber, has51: txt.includes('+51'), incompatible, ev: drawerTxt.includes('Source scorecard extract'), sr: /source-reported/i.test(drawerTxt) });
  check('2. Valid period comparison and evidence drill-down', amber === 1 && txt.includes('+51') && !!incompatible && drawerTxt.includes('Source scorecard extract') && /source-reported/i.test(drawerTxt),
    'comparison series drawn for comparable 2025 YTD; recruiter period refused (' + incompatible + '); evidence attached and visible');

  /* 3. Development tracked through application at work */
  await nav('leadership');
  await page.click('[data-act="add"][data-entity="devItems"]');
  await fill({ kind: 'Learning', title: 'Test learning item', learningStatus: 'Completed', capabilityStage: 'Capability demonstrated – reviewer validated' }); await save();
  const devErr = await formErrors();
  await fill({ applicationAtWork: 'Applied in test scenario', reviewer: 'Test reviewer', reviewDate: '2026-10-01' }); await save();
  txt = await content();
  check('3. Development tracked through application at work', devErr.includes('requires application at work') && /1\s*Capability demonstrated/.test(txt.replace(/\n/g, ' ')), 'blocked without evidence; counted once evidence recorded');

  /* 4. Project completion distinct from benefits */
  await nav('projects');
  await page.click('[data-act="add"][data-entity="projects"]');
  await fill({ name: 'Test project', status: 'Completed', completionDate: '2026-09-30', completionEvidence: 'Test', benefitStatus: 'Realised – validated' }); await save();
  const prjErr = await formErrors();
  await fill({ benefitStatus: 'Expected – not yet measurable' }); await save();
  const r15 = await page.evaluate(() => TA.dataChecks().some(c => c.rule.startsWith('R15') && c.title.includes('Test project')));
  check('4. Project completion distinct from realised benefits', prjErr.includes('benefit validation evidence') && r15, 'validated benefit needs evidence; completed-without-benefit flagged');

  /* 5. Feedback through stakeholder validation */
  await nav('feedback');
  await page.click('[data-act="add"][data-entity="feedback"]');
  await fill({ provider: 'Test provider', date: '2026-10-01', theme: 'Hiring speed', wordingType: 'Paraphrase (labelled)', wording: 'Test paraphrase', agreedAction: 'Test action', progress: 'Action completed', closureStatus: 'Closed – stakeholder validated' }); await save();
  const fbErr = await formErrors();
  await fill({ closureStatus: 'Action completed; stakeholder validation pending' }); await save();
  txt = await content();
  const fbId = await page.evaluate(() => TA.Store.list('feedback')[0].id);
  await page.click(`[data-act="edit"][data-id="${fbId}"]`);
  await fill({ closureStatus: 'Closed – stakeholder validated', validatedBy: 'Test provider', validationDate: '2026-10-10' }); await save();
  const closed = await page.evaluate(id => TA.Store.get('feedback', id).closureStatus, fbId);
  check('5. Feedback actions tracked through stakeholder validation', fbErr.includes('requires "Validated by"') && /1\s*Action completed; validation pending/.test(txt.replace(/\n/g, ' ')) && closed === 'Closed – stakeholder validated', 'pending state supported; closure requires validator and date');

  /* 6. Benefit calculations expose inputs and assumptions */
  await nav('value');
  await page.click('[data-act="add"][data-entity="benefits"]');
  await fill({ title: 'Test vendor fee benefit', category: 'Realised financial saving', calcType: 'Vendor-fee saving', baselineVolume: 20, comparisonVolume: 12, unitCost: 100000, assumptions: 'Test assumption: same fee basis', validationStatus: 'Proposed – not validated' }); await saveConfirm();
  const bId = await page.evaluate(() => TA.Store.list('benefits')[0].id);
  await page.evaluate(id => TA.openDrawer('benefits', id), bId);
  const bTxt = await page.locator('#dlg-drawer').innerText(); await closeAll();
  txt = await content();
  check('6. Benefit calculations expose inputs and assumptions', bTxt.includes('(20 − 12) vendor hires × INR 1,00,000 per hire = INR 8,00,000') && bTxt.includes('Test assumption') && bTxt.includes('Implementation cost (missing is not zero)') && txt.includes('None validated'),
    'formula, assumptions and missing costs shown; unvalidated value not counted');

  /* 7. Insights can be edited or dismissed */
  await nav('quality'); await tab('quality', 'insights');
  const insId = await page.evaluate(() => TA.Store.list('insights').find(i => i.ruleKey === 'no-trend').id);
  await page.click(`[data-act="edit"][data-entity="insights"][data-id="${insId}"]`);
  await fill({ interpretation: 'Edited interpretation (test)' }); await save();
  const edited = await page.evaluate(id => TA.Store.get('insights', id), insId);
  await page.click(`[data-act="insight-status"][data-status="Dismissed"][data-id="${insId}"]`);
  const visible = await page.locator(`[data-act="edit"][data-entity="insights"][data-id="${insId}"]`).count();
  check('7. Insights can be edited or dismissed', edited.status === 'Edited' && edited.interpretation.includes('Edited') && visible === 0, 'status Edited, then dismissed and hidden');

  /* 8. Delete and restore */
  await nav('metrics'); await tab('metrics', 'programmes');
  const nats = await pid('NATS');
  await page.click(`[data-act="delete"][data-id="${nats}"]`); await page.click('#dlg-confirm [data-c="yes"]');
  const afterDel = await page.evaluate(() => TA.programmeSummary('per_biz_2026ytd').joinedSum);
  await nav('quality'); await tab('quality', 'bin');
  await page.click(`[data-act="restore"][data-id="${nats}"]`);
  const afterRestore = await page.evaluate(() => TA.programmeSummary('per_biz_2026ytd').joinedSum);
  check('8. Records can be deleted and restored', afterDel === 668 && afterRestore === 885, 'total 885 → 668 → 885');

  /* 9. Save, reopen and recover */
  await page.evaluate(() => TA.Store.flush());
  await page.reload(); await page.waitForFunction(() => window.TA_READY === true);
  const persisted = await page.evaluate(() => TA.Store.list('projects').some(p => p.name === 'Test project'));
  await nav('settings');
  const [bdl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act="backup"]')]);
  const bfile = path.join(OUT, bdl.suggestedFilename()); await bdl.saveAs(bfile);
  await page.click('[data-act="reset-seed"]'); await page.click('#dlg-confirm [data-c="yes"]');
  const afterReset = await page.evaluate(() => TA.Store.list('projects').length);
  await page.setInputFiles('#restore-file', bfile);
  await page.waitForSelector('[data-act="restore-confirm"]'); await page.click('[data-act="restore-confirm"]');
  const restored = await page.evaluate(() => TA.Store.list('projects').some(p => p.name === 'Test project'));
  const recoveryPoints = await page.evaluate(() => TA.Store.state.recovery.length);
  check('9. Save, reopen and recover', persisted && afterReset === 0 && restored && recoveryPoints >= 1, 'persisted across reload; backup restored after reset; recovery points kept');

  /* 10 + 11. PPTX/DOCX for the selected period; confidential exclusion */
  await nav('reports');
  await page.selectOption('#rp-period', 'per_biz_2026ytd');
  let dlCount = 0;
  const dl = async (fmt) => { const [d] = await Promise.all([page.waitForEvent('download'), page.click(`[data-act="export"][data-fmt="${fmt}"]`)]); const f = path.join(OUT, (++dlCount) + '-' + d.suggestedFilename()); await d.saveAs(f); return f; };
  const pptx1 = await dl('pptx'), docx1 = await dl('docx'), pdf1 = await dl('pdf');
  const slides = zipText(pptx1, '^ppt/slides/slide\\d+\\.xml$'), charts = zipText(pptx1, '^ppt/charts/chart\\d+\\.xml$'), doc1 = zipText(docx1, '^word/(document|footer\\d*)\\.xml$');
  check('10. Editable PPTX and DOCX download using the selected period',
    slides.includes('2026 YTD – Business scorecard') && charts.includes('<c:barChart>') && slides.includes('<a:tbl>') && doc1.includes('2026 YTD – Business scorecard') && doc1.includes('<w:tbl>') && fs.statSync(pdf1).size > 5000 && slides.includes('Generated') && slides.includes('Assumptions'),
    'native chart + table XML in PPTX, Word tables in DOCX, period/generation/assumptions present; PDF ' + fs.statSync(pdf1).size + ' bytes');
  await page.check('#rp-conf');
  const pptx2 = await dl('pptx'), docx2 = await dl('docx');
  const slides2 = zipText(pptx2, '^ppt/slides/slide\\d+\\.xml$'), doc2 = zipText(docx2, '^word/document\\.xml$');
  check('11. Confidential individual details can be excluded', !slides.includes('Adarsh') && !doc1.includes('Adarsh') && !slides.includes('Padma') && slides2.includes('Adarsh') && doc2.includes('Adarsh'),
    'names absent by default; present only when explicitly selected');
  await page.uncheck('#rp-conf');

  /* 12. Data-quality issues remain visible without losing original evidence */
  const dq = await page.evaluate(() => { const rr = TA.Store.list('recruiterResults')[0]; return { reported: rr.offerAttainmentReported, recalc: TA.round(TA.rrCalc(rr).offerRecalc, 1), flagged: TA.dataChecks().some(c => c.rule.startsWith('R06')), q: TA.Store.list('questions').some(q => q.type === 'Data conflict' && q.status === 'Open') }; });
  check('12. Data-quality issues visible without losing original evidence', dq.reported === 100 && dq.recalc === 137.6 && dq.flagged && dq.q && slides.includes('Conflict'), 'reported 100% retained beside recalculated 137.6%; conflict in app and exports');

  check('No page errors', errors.length === 0, errors.join('; '));
  await page.evaluate(() => { TA.Store.resetToSeed(); TA.Store.state.recovery = []; return TA.Store.flush(); });
  await browser.close();
  const failed = results.filter(r => !r.ok).length;
  console.log('\n' + (results.length - failed) + '/' + results.length + ' passed. Files in ' + OUT);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
