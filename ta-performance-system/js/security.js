/* Access control without a server.
   - TA Head: access restricted to TA_HEAD_EMAIL plus a passphrase. The workspace is stored AES-256-GCM encrypted
     (key derived with PBKDF2-SHA256), so it cannot be read from browser storage or a backup file without the passphrase.
   - Team members: open a personal file created by the TA Head. It contains only that person's records and is
     encrypted with its own passphrase, so peer data is not present at all. Members export their inputs as a
     responses file (same passphrase) for the TA Head to import.
   This protects confidentiality; it is not corporate single sign-on. Production access belongs in the BRD
   architecture with Entra ID (SYSTEM_DESIGN.md §9). */

const TA_HEAD_EMAIL = 'ranjith.tp@volvo.com';
const SECURE_KEY = 'ta-pdms-secure-v1';
const KDF_ITER = 310000;
let session = null; // { kind: 'head' | 'member' | 'demo', email, empId, key, salt, pass }

// ---------- crypto ----------
const enc = new TextEncoder(), dec = new TextDecoder();
function b64(buf) { const a = new Uint8Array(buf); let s = ''; for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); }
function unb64(s) { const b = atob(s), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
async function deriveKey(pass, salt) {
  const base = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: KDF_ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function sealWithKey(obj, key, salt, format, meta = {}) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj)));
  return { format, v: 1, meta, kdf: 'PBKDF2-SHA256-' + KDF_ITER, salt: b64(salt), iv: b64(iv), ct: b64(ct) };
}
async function seal(obj, pass, format, meta) { const salt = crypto.getRandomValues(new Uint8Array(16)); return sealWithKey(obj, await deriveKey(pass, salt), salt, format, meta); }
async function openEnvelope(env, pass) {
  const salt = unb64(env.salt), key = await deriveKey(pass, salt);
  try { return { obj: JSON.parse(dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(env.iv) }, key, unb64(env.ct)))), key, salt }; }
  catch (e) { throw new Error('Wrong passphrase, or the file is damaged.'); }
}
function newPassphrase() {
  const A = 'abcdefghjkmnpqrstuvwxyz23456789', r = crypto.getRandomValues(new Uint8Array(15));
  return [...r].map(x => A[x % A.length]).join('').replace(/(.{5})(.{5})(.{5})/, '$1-$2-$3');
}
const isEncrypted = o => o && typeof o === 'object' && typeof o.ct === 'string' && typeof o.salt === 'string';

// ---------- persistence (replaces plain localStorage) ----------
let saveTimer = null;
function persistState() {
  if (!session || session.kind !== 'head') return; // demo and member sessions stay in memory
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try { const env = await sealWithKey(state, session.key, session.salt, 'ta-pdms-workspace', { email: session.email, updated: nowStamp() }); localStorage.setItem(SECURE_KEY, JSON.stringify(env)); }
    catch (e) { toast('Could not save in this browser: ' + e.message + '. Export a backup.'); }
  }, 300);
}
function readSecureStore() { try { const s = localStorage.getItem(SECURE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
function readLegacyPlain() { try { const s = localStorage.getItem(STORE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }

// ---------- sign-in ----------
function signInView() {
  const store = readSecureStore();
  const legacy = readLegacyPlain();
  return `<div class="signin">
   <div class="pagehead"><div class="grow"><h1>TA Performance &amp; Development</h1><p class="muted">Talent Acquisition, India · ${PERIOD.label}. Sign in as the TA Head, or open your personal performance file.</p></div></div>
   <div class="grid g2">
   <section class="card"><h2>TA Head</h2><p class="small muted">Overall view of the team. Access is restricted to <b>${esc(TA_HEAD_EMAIL)}</b>.</p>
    ${store ? `<label class="field">Email<input type="email" id="si-email" autocomplete="username" value=""></label>
      <label class="field">Passphrase<input type="password" id="si-pass" autocomplete="current-password" onkeydown="if(event.key==='Enter')headSignIn()"></label>
      <div class="actions" style="margin-top:10px"><button class="btn pri" onclick="headSignIn()">Sign in</button><button class="btn link" onclick="resetWorkspaceDlg()">Forgot passphrase?</button></div>
      <p class="small muted">Workspace last saved ${esc((store.meta || {}).updated || '—')}, encrypted in this browser.</p>`
    : `<p class="small"><b>First use in this browser.</b> Create the TA Head workspace. Choose a passphrase of at least 10 characters; it cannot be recovered, so keep it safe.</p>
      <label class="field">Email<input type="email" id="si-email" autocomplete="username"></label>
      <label class="field">New passphrase<input type="password" id="si-pass" autocomplete="new-password"></label>
      <label class="field">Confirm passphrase<input type="password" id="si-pass2" autocomplete="new-password" onkeydown="if(event.key==='Enter')headSetup()"></label>
      ${legacy && legacy.mode === 'live' ? '<p class="small note warn">An unencrypted workspace from an earlier version was found in this browser. It will be moved into the encrypted workspace and the unencrypted copy deleted.</p>' : ''}
      <div class="actions" style="margin-top:10px"><button class="btn pri" onclick="headSetup()">Create workspace</button><label class="btn">Restore encrypted backup<input type="file" accept=".json" hidden onchange="restoreAtSignIn(this.files[0])"></label></div>`}
   </section>
   <section class="card"><h2>Team member</h2><p class="small muted">See your own performance, complete your self-assessment and respond to requests. Your TA Head gives you a personal file and a passphrase.</p>
    <label class="field">Your performance file<input type="file" id="mf-file" accept=".json"></label>
    <label class="field">Passphrase<input type="password" id="mf-pass" autocomplete="off" onkeydown="if(event.key==='Enter')memberOpen()"></label>
    <div class="actions" style="margin-top:10px"><button class="btn pri" onclick="memberOpen()">Open my performance</button></div>
    <p class="small muted">Your file contains only your own records. Nothing is uploaded; it opens in this browser only.</p></section></div>
   <p class="small muted">Training demo: <button class="btn link" onclick="demoStart()">explore the dashboard with fictional data</button> (not saved).</p>
   <div class="note small">How access works here: the TA Head workspace and every personal file are encrypted with AES-256; without the passphrase the data cannot be read. This is not corporate single sign-on. For organisation-wide access with Volvo sign-in, build the production version (Power Apps + Dataverse with Entra ID).</div></div>`;
}
const emailOk = v => String(v || '').trim().toLowerCase() === TA_HEAD_EMAIL;
async function headSetup() {
  const email = val('si-email'), p1 = document.getElementById('si-pass').value, p2 = document.getElementById('si-pass2').value;
  if (!emailOk(email)) { toast('TA Head access is restricted to ' + TA_HEAD_EMAIL + '.'); return; }
  if (p1.length < 10) { toast('Use a passphrase of at least 10 characters.'); return; }
  if (p1 !== p2) { toast('The passphrases do not match.'); return; }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  session = { kind: 'head', email: TA_HEAD_EMAIL, key: await deriveKey(p1, salt), salt };
  const legacy = readLegacyPlain();
  state = legacy && legacy.mode === 'live' ? migrateState(legacy) : emptyState();
  try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
  audit('TA Head workspace created', 'Workspace', 'Encrypted; access restricted to ' + TA_HEAD_EMAIL, '', 'TA Head');
  ui.role = 'head'; ui.page = state.employees.length ? 'team' : 'setup';
  touch(); render(); toast('Workspace created and encrypted');
}
async function headSignIn() {
  const email = val('si-email'), pass = document.getElementById('si-pass').value;
  if (!emailOk(email)) { toast('TA Head access is restricted to ' + TA_HEAD_EMAIL + '.'); return; }
  const env = readSecureStore();
  try { const { obj, key, salt } = await openEnvelope(env, pass); session = { kind: 'head', email: TA_HEAD_EMAIL, key, salt }; state = migrateState(obj); }
  catch (e) { toast(e.message); return; }
  ui.role = 'head'; if (!ROLES.head.pages.includes(ui.page)) ui.page = 'team';
  calcVersion++; render();
}
function resetWorkspaceDlg() {
  openDlg('Forgot passphrase', `<p>The passphrase cannot be recovered. You can delete the encrypted workspace in this browser and start again, then restore an encrypted backup (you will need that backup's passphrase).</p>`,
    [{ label: 'Cancel' }, { label: 'Delete workspace in this browser', cls: 'pri', onClick: () => { try { localStorage.removeItem(SECURE_KEY); } catch (e) { /* ignore */ } render(); toast('Deleted. Set up the workspace again.'); } }]);
}
function askPass(title, label, onOk) {
  openDlg(title, `<label class="field">${esc(label)}<input type="password" id="ask-p" autocomplete="off"></label>`,
    [{ label: 'Cancel' }, { label: 'Continue', cls: 'pri', onClick: () => { const v = document.getElementById('ask-p').value; if (!v) return false; closeDlg(); onOk(v); return false; } }]);
  setTimeout(() => { const t = document.getElementById('ask-p'); if (t) t.focus(); }, 30);
}
function readFileText(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsText(file); }); }
async function restoreAtSignIn(file) {
  if (!file) return;
  const env = JSON.parse(await readFileText(file));
  if (!isEncrypted(env) || env.format !== 'ta-pdms-workspace') { toast('Not an encrypted workspace backup. Create the workspace first, then use Team Setup → Restore backup.'); return; }
  askPass('Restore backup', 'Passphrase used for this backup', async pass => {
    const email = val('si-email');
    if (!emailOk(email)) { toast('Enter the TA Head email first (' + TA_HEAD_EMAIL + ').'); return; }
    try { const { obj, key, salt } = await openEnvelope(env, pass); session = { kind: 'head', email: TA_HEAD_EMAIL, key, salt }; state = migrateState(obj); }
    catch (e) { toast(e.message); return; }
    audit('Backup restored', file.name, state.employees.length + ' members', ''); ui.role = 'head'; ui.page = 'team'; touch(); render();
  });
}
function demoStart() { session = { kind: 'demo' }; state = buildSampleState(); ui.role = 'head'; ui.page = 'team'; calcVersion++; render(); }
function signOut() {
  const go2 = () => { clearTimeout(saveTimer); if (session && session.kind === 'head') { const s = session; persistNow(s).then(() => { session = null; state = null; render(); }); } else { session = null; state = null; render(); } };
  if (session && session.kind === 'member' && session.dirty) confirmDlg('Sign out', 'You have changes that have not been exported. Export your responses first, or they will be lost.', go2); else go2();
}
async function persistNow(s) { try { const env = await sealWithKey(state, s.key, s.salt, 'ta-pdms-workspace', { email: s.email, updated: nowStamp() }); localStorage.setItem(SECURE_KEY, JSON.stringify(env)); } catch (e) { /* ignore */ } }

// ---------- encrypted backups (TA Head) ----------
async function exportBackupSecure() {
  if (!session || session.kind !== 'head') { toast('Backups are available to the TA Head.'); return; }
  audit('Backup exported', 'Workspace', state.employees.length + ' members (encrypted)');
  const env = await sealWithKey(state, session.key, session.salt, 'ta-pdms-workspace', { email: session.email, updated: nowStamp() });
  download(`TA_Performance_backup_${D.fmt(Date.now())}.json`, JSON.stringify(env), 'application/json'); persistState();
}
async function restoreBackupSecure(file) {
  if (!file) return;
  let parsed; try { parsed = JSON.parse(await readFileText(file)); } catch (e) { toast('Not a valid backup file.'); return; }
  const apply = s => { if (!s.employees || !s.rules) { toast('Not a dashboard backup.'); return; } migrateState(s);
    confirmDlg('Restore backup', `Replace the current workspace with ${file.name} (${s.employees.length} people)?`, () => { state = s; audit('Backup restored', file.name, s.employees.length + ' members', ''); touch(); render(); toast('Backup restored'); }); };
  if (isEncrypted(parsed)) askPass('Restore backup', 'Passphrase used for this backup', async pass => { try { apply((await openEnvelope(parsed, pass)).obj); } catch (e) { toast(e.message); } });
  else { apply(parsed); toast('This file was not encrypted. Delete it after restoring.'); }
}

// ---------- personal performance files ----------
const clone = o => JSON.parse(JSON.stringify(o));
function packStateFor(id) {
  const e = clone(emp(id)), m = metrics(id), mine = x => x.emp === id;
  e.ratings = [null, null, null]; e.flags = []; // rating history (D-29) and internal notes stay with the TA Head
  const tl = teamLead(e.team); if (tl && tl.id !== id) e.leadName = tl.name; // reporting line only
  const pick = obj => (obj && obj[id] != null ? { [id]: clone(obj[id]) } : {});
  const s = {
    mode: 'member', rules: clone(state.rules), teams: clone(state.teams), roles: clone(state.roles), areaTargets: clone(state.areaTargets), areaPPO: clone(state.areaPPO || {}),
    employees: [e], offers: clone(state.offers.filter(mine)), scorecards: pick(state.scorecards), assessments: pick(state.assessments),
    projects: clone(state.projects.filter(p => p.owner === id)), learning: clone(state.learning.filter(mine)), compDev: pick(state.compDev), idp: pick(state.idp), afi: pick(state.afi),
    requests: clone(state.requests.filter(mine)), comments: pick(state.comments), review: pick(state.review), overrides: clone(state.overrides.filter(mine)),
    reports: clone(state.reports.filter(r => r.emp === id)), promo: {}, audit: [], batches: [], breakGlass: [], teamSnapshots: {},
  };
  if (m.isTL && m.team) { const t = clone(m.team); t.offers = []; t.members = t.members.map(() => ''); s.teamSnapshots[id] = t; } // team totals only, no member-level data
  return s;
}
function packsDlg() {
  const list = sortedEmployees().filter(e => !isFormer(e));
  openDlg('Personal performance files', `<p class="small">Each file contains only that person's own records (no rating history, no notes to confirm, no peer data) and is encrypted with its own passphrase. Send the file and the passphrase through different channels, for example the file by e-mail and the passphrase in person or by Teams chat.</p>
   <div class="grid g3">${list.map(e => `<label class="small"><input type="checkbox" class="pk-e" value="${e.id}" checked> ${esc(e.name)} <span class="muted">${esc(roleOf(e).name)}</span></label>`).join('')}</div>
   <label class="small" style="display:block;margin-top:8px"><input type="checkbox" id="pk-new"> Create new passphrases (otherwise each person keeps their existing one)</label>`,
    [{ label: 'Cancel' }, { label: 'Create files', cls: 'pri', onClick: () => { makePacks([...document.querySelectorAll('.pk-e:checked')].map(x => x.value), document.getElementById('pk-new').checked); return false; } }]);
}
async function makePacks(ids, fresh) {
  state.packs = state.packs || {};
  const out = [];
  for (const id of ids) {
    if (fresh || !state.packs[id]) state.packs[id] = { pass: newPassphrase(), created: nowStamp() };
    const e = emp(id), env = await seal(packStateFor(id), state.packs[id].pass, 'ta-pdms-pack', { created: nowStamp() });
    out.push({ id, name: e.name, pass: state.packs[id].pass, file: `${PERIOD.year}_My_Performance_${e.name.replace(/[^A-Za-z]+/g, '_')}.json`, data: JSON.stringify(env) });
    audit('Personal file created', e.name, 'Own records only; encrypted');
  }
  touch(); window._packs = out;
  openDlg('Files ready', `<p class="small">Download each file and send its passphrase separately. Passphrases are kept in your encrypted workspace so you can import responses later.</p>
   <div class="tbl-wrap"><table><thead><tr><th>Person</th><th>Passphrase</th><th></th></tr></thead><tbody>${out.map((p, i) => `<tr><td>${esc(p.name)}</td><td class="mono">${esc(p.pass)}</td><td><button class="btn sm" onclick="download(window._packs[${i}].file, window._packs[${i}].data, 'application/json')">Download file</button></td></tr>`).join('')}</tbody></table></div>`, [{ label: 'Done', cls: 'pri' }]);
}
async function memberOpen() {
  const f = document.getElementById('mf-file').files[0], pass = document.getElementById('mf-pass').value;
  if (!f || !pass) { toast('Choose your file and enter its passphrase.'); return; }
  let env; try { env = JSON.parse(await readFileText(f)); } catch (e) { toast('This is not a performance file.'); return; }
  if (!isEncrypted(env) || env.format !== 'ta-pdms-pack') { toast('This is not a personal performance file.'); return; }
  try { const { obj } = await openEnvelope(env, pass); state = migrateState(obj); session = { kind: 'member', empId: obj.employees[0].id, pass, dirty: false }; }
  catch (e) { toast(e.message); return; }
  ui.role = 'member'; ui.emp = session.empId; ui.page = 'me'; calcVersion++; render();
}

// ---------- responses round-trip ----------
async function exportResponses() {
  const id = session.empId, own = x => x.emp === id;
  const data = {
    assessments: (state.assessments[id] || []).map(a => ({ period: a.period, date: a.date, self: a.self, selfEvidence: a.selfEvidence })),
    requests: state.requests.filter(own).filter(r => r.response).map(r => ({ id: r.id, response: r.response, status: r.status })),
    comment: (state.comments[id] || {}).emp || '', empComment: (state.review[id] || {}).empComment || '',
    learning: state.learning.filter(own), projects: state.projects.filter(p => p.owner === id).map(p => ({ id: p.id, title: p.title, problem: p.problem, metric: p.metric, baseline: p.baseline, target: p.target, actual: p.actual, nextAction: p.nextAction, lessons: p.lessons, selfScore: p.selfScore, pendingEvidence: p.pendingEvidence, start: p.start, planEnd: p.planEnd })),
    compDevSelf: (state.compDev[id] || {}).self || null,
  };
  const env = await seal({ format: 'ta-pdms-responses', emp: id, name: emp(id).name, at: nowStamp(), data }, session.pass, 'ta-pdms-responses', { at: nowStamp() });
  download(`${PERIOD.year}_Responses_${emp(id).name.replace(/[^A-Za-z]+/g, '_')}_${D.fmt(Date.now())}.json`, JSON.stringify(env), 'application/json');
  session.dirty = false; render(); toast('Send this file to your TA Head.');
}
async function importResponsesFile(file) {
  if (!file) return;
  let env; try { env = JSON.parse(await readFileText(file)); } catch (e) { toast('Not a responses file.'); return; }
  if (!isEncrypted(env) || env.format !== 'ta-pdms-responses') { toast('Not a responses file.'); return; }
  const tryPasses = Object.values(state.packs || {}).map(p => p.pass);
  for (const p of tryPasses) { try { const { obj } = await openEnvelope(env, p); return mergeResponses(obj, file.name); } catch (e) { /* next */ } }
  askPass('Import responses', 'Passphrase of this person\'s file', async pass => { try { mergeResponses((await openEnvelope(env, pass)).obj, file.name); } catch (e) { toast(e.message); } });
}
function mergeResponses(r, fname) {
  const id = r.emp, e = emp(id);
  if (!e) { toast('This person is not in your workspace.'); return; }
  const d = r.data, changes = [];
  const h = state.assessments[id] = state.assessments[id] || [];
  for (const a of d.assessments || []) {
    if (!a.self || !Object.keys(a.self).length) continue;
    let rec = h.find(x => x.period === a.period);
    if (!rec) { rec = { period: a.period, date: a.date, self: {}, mgr: {}, selfEvidence: {}, mgrEvidence: {}, by: 'self', mgrPending: true }; h.push(rec); }
    if (JSON.stringify(rec.self) !== JSON.stringify(a.self)) { rec.self = a.self; rec.selfEvidence = a.selfEvidence || {}; delete rec.selfPending; changes.push('self-assessment ' + a.period); }
  }
  for (const x of d.requests || []) { const q = state.requests.find(y => y.id === x.id && y.emp === id); if (q && ['Sent', 'Viewed'].includes(q.status)) { q.response = x.response; q.status = x.status === 'Closed' ? 'Closed' : 'Responded'; if (x.response.kind === 'Confirm all') state.offers.forEach(o => { if (q.rows.includes(o.id)) o.confirmed = true; }); changes.push('response to ' + q.id); } }
  if (d.comment && (state.comments[id] || {}).emp !== d.comment) { (state.comments[id] = state.comments[id] || {}).emp = d.comment; changes.push('comment'); }
  if (d.empComment && (state.review[id] || {}).empComment !== d.empComment) { (state.review[id] = state.review[id] || {}).empComment = d.empComment; changes.push('annual review comment'); }
  for (const l of d.learning || []) { const i = state.learning.findIndex(y => y.id === l.id); if (i < 0) { state.learning.push(Object.assign(l, { emp: id, validated: false })); changes.push('learning ' + l.programme); } else if (state.learning[i].emp === id) { const v = state.learning[i].validated && state.learning[i].application === l.application; state.learning[i] = Object.assign(l, { emp: id, validated: v }); } }
  for (const p of d.projects || []) { const q = state.projects.find(y => y.id === p.id); if (q && q.owner === id) { Object.assign(q, { actual: p.actual, nextAction: p.nextAction, lessons: p.lessons, selfScore: p.selfScore, pendingEvidence: p.pendingEvidence }); } else if (!q) { state.projects.push(Object.assign({ owner: id, stage: -1, inProgress: 0, lastValidated: '', planStages: [], history: [], contributing: false, mgrScore: null, sponsor: '' }, p, { id: 'P-' + String(state.projects.length + 1).padStart(3, '0') })); changes.push('new project ' + p.title); } }
  if (d.compDevSelf) { (state.compDev[id] = state.compDev[id] || {}).self = d.compDevSelf; }
  audit('Employee responses imported', e.name, changes.join('; ') || 'No new changes', fname); touch(); render();
  toast(changes.length ? `Imported for ${e.name}: ${changes.length} change(s)` : 'No new changes in this file');
}

// ---------- update files (merge new information without replacing the workspace) ----------
// Format: { format: 'ta-pdms-update', source, people: [{ id, set, addFlags, removeFlags }], scorecards: { id: fields },
//           projects: [{ owner, match, set } | { owner, add }] }. Preview first; every change is audited.
async function applyUpdateFile(file) {
  if (!file) return;
  let u; try { u = JSON.parse(await readFileText(file)); } catch (e) { toast('Not a valid update file.'); return; }
  const go2 = obj => { if (obj.format !== 'ta-pdms-update') { toast('Not an update file.'); return; } previewUpdate(obj, file.name); };
  if (isEncrypted(u)) askPass('Apply update', 'Passphrase for this file', async p => { try { go2((await openEnvelope(u, p)).obj); } catch (e) { toast(e.message); } }); else go2(u);
}
function updatePlan(u) {
  const plan = [];
  for (const p of u.people || []) { const e = emp(p.id); if (!e) { plan.push(['Skipped', p.id, 'Not in this workspace']); continue; }
    const ch = Object.entries(p.set || {}).filter(([k, v]) => JSON.stringify(e[k]) !== JSON.stringify(v)).map(([k, v]) => k + ': ' + (Array.isArray(v) ? v.join(', ') : v));
    const rm = (e.flags || []).filter(f => (p.removeFlags || []).some(x => f.includes(x)));
    const add = (p.addFlags || []).filter(f => !(e.flags || []).includes(f));
    if (ch.length || rm.length || add.length) plan.push(['Person', e.name, [...ch, ...rm.map(f => 'resolved: ' + f), ...add.map(f => 'to confirm: ' + f)].join(' · ')]); }
  for (const [id, f] of Object.entries(u.scorecards || {})) { const e = emp(id); if (!e) { plan.push(['Skipped', id, 'Not in this workspace']); continue; }
    plan.push(['Scorecard', e.name, Object.keys(f).join(', ') + (state.scorecards[id] ? '' : ' (new scorecard)')]); }
  for (const p of u.projects || []) { const e = emp(p.owner); if (!e) { plan.push(['Skipped', p.owner, 'Project owner not in this workspace']); continue; }
    const ex = p.match && state.projects.find(x => x.owner === p.owner && x.title.toLowerCase().includes(p.match.toLowerCase()));
    if (p.add && state.projects.some(x => x.owner === p.owner && x.title.toLowerCase() === p.add.title.toLowerCase())) { plan.push(['Skipped', e.name, 'Project already present: ' + p.add.title]); continue; }
    plan.push(['Project', e.name, ex ? 'update "' + ex.title + '"' + (p.set.title && p.set.title !== ex.title ? ' → "' + p.set.title + '"' : '') : p.add ? 'add "' + p.add.title + '"' : 'no match for "' + p.match + '" (skipped)']); }
  return plan;
}
function previewUpdate(u, fname) {
  const plan = updatePlan(u);
  openDlg('Apply update', `<p class="small">Source: ${esc(u.source || fname)}. Nothing is replaced wholesale; only the items below change, and each change is recorded in the audit log.</p>
   <div class="tbl-wrap"><table><thead><tr><th>Type</th><th>Who</th><th>Change</th></tr></thead><tbody>${plan.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td class="small">${esc(r[2])}</td></tr>`).join('') || '<tr><td colspan="3" class="empty">Nothing new in this file.</td></tr>'}</tbody></table></div>`,
    [{ label: 'Cancel' }, { label: 'Apply', cls: 'pri', onClick: () => { mergeUpdate(u, fname); } }]);
  document.getElementById('dlg').style.maxWidth = '960px';
}
function mergeUpdate(u, fname) {
  const src = u.source || fname; let n = 0;
  for (const p of u.people || []) { const e = emp(p.id); if (!e) continue;
    for (const [k, v] of Object.entries(p.set || {})) if (JSON.stringify(e[k]) !== JSON.stringify(v)) { audit('Updated from file', e.name, k + ': ' + (e[k] ?? '—') + ' → ' + v, src); e[k] = v; n++; }
    const before = (e.flags || []).length;
    e.flags = (e.flags || []).filter(f => !(p.removeFlags || []).some(x => f.includes(x)));
    if (e.flags.length < before) { audit('Resolved from file', e.name, (before - e.flags.length) + ' item(s) to confirm', src); n++; }
    for (const f of p.addFlags || []) if (!e.flags.includes(f)) { e.flags.push(f); n++; } }
  for (const [id, f] of Object.entries(u.scorecards || {})) { if (!emp(id)) continue; state.scorecards[id] = Object.assign(state.scorecards[id] || { asOf: PERIOD.cutoff }, f); audit('Scorecard updated from file', emp(id).name, Object.keys(f).join(', '), src); n++; }
  for (const p of u.projects || []) { if (!emp(p.owner)) continue;
    const ex = p.match && state.projects.find(x => x.owner === p.owner && x.title.toLowerCase().includes(p.match.toLowerCase()));
    if (ex) { Object.assign(ex, p.set); audit('Project updated from file', ex.id + ' · ' + emp(p.owner).name, ex.title, src); n++; }
    else if (p.add && !state.projects.some(x => x.owner === p.owner && x.title.toLowerCase() === p.add.title.toLowerCase())) {
      const pr = Object.assign({ id: 'P-' + String(state.projects.length + 1).padStart(3, '0'), owner: p.owner, problem: '', metric: '', baseline: '—', target: '—', actual: null, sponsor: 'TA Head', start: '', planEnd: '',
        stage: -1, inProgress: null, lastValidated: '', planStages: [], history: [], nextAction: '', contributing: false, mgrScore: null, selfScore: null, lessons: '', reported: '' }, p.add);
      state.projects.push(pr); audit('Project added from file', pr.id + ' · ' + emp(p.owner).name, pr.title, src); n++; } }
  touch(); render(); toast(n + ' change(s) applied');
}
