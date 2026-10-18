/* App shell: roles, navigation, dialogs, tooltip, theme. */

const ROLES = {
  head:     { label: 'TA Head', pages: ['team', 'member', 'compare', 'exceptions', 'heatmap', 'review', 'talent', '|Data & reports', 'import', 'requests', 'reports', '|Settings', 'setup', 'admin', 'audit', 'guide'] },
  employee: { label: 'Employee', pages: ['me', 'requests', 'reports', 'guide'] },
  tl:       { label: 'Team Lead', pages: ['me', 'myteam', 'requests', 'reports', 'guide'] },
  importer: { label: 'TA Ops (data importer)', pages: ['import', 'audit', 'guide'] },
  admin:    { label: 'System Administrator', pages: ['admin', 'setup', 'audit', 'guide'] },
  member:   { label: 'Team member', pages: ['me', 'requests', 'reports', 'guide'] },
};
const PAGE_TITLES = {
  team: 'Team Overview', member: 'Member View', compare: 'Compare Members', exceptions: 'Exceptions', heatmap: 'Capability Heatmap',
  review: 'Annual Review & Calibration', talent: 'Talent & Promotion', import: 'Data Import', requests: 'Requests', reports: 'Reports',
  setup: 'Team Setup', admin: 'Rules & Settings', audit: 'Audit Log', guide: 'How to use', me: 'My Performance', myteam: 'My Team',
};
const UI_KEY = 'ta-pdms-ui-v1';
let ui = { role: 'head', emp: null, page: 'team', member: null, compare: [], memberTab: 'all' };

function saveUI() { try { localStorage.setItem(UI_KEY, JSON.stringify(Object.assign({}, ui, { imp: undefined }))); } catch (e) { /* ignore */ } }
function loadUI() { try { const s = localStorage.getItem(UI_KEY); if (s) ui = Object.assign(ui, JSON.parse(s)); } catch (e) { /* ignore */ } }

function currentUserLabel() {
  if (session && session.kind === 'head') return 'TA Head (' + session.email + ')';
  if (session && session.kind === 'member') { const e = emp(session.empId); return e ? e.name : 'Team member'; }
  if (ui.role === 'head') return 'TA Head';
  if (ui.role === 'admin') return 'System Admin';
  if (ui.role === 'importer') return 'TA Ops Analyst';
  const e = ui.emp && emp(ui.emp); return e ? e.name : 'Employee';
}
const isHead = () => ui.role === 'head';
function teamName(k) { const t = state.teams && state.teams[k]; return t ? (t.short || t.name) : (k || '—'); }
const sortKey = e => (Object.keys(state.teams).indexOf(e.team) + 100) + (isLead(e) ? '0' : isSupport(e) ? '2' : '1') + e.name;
function sortedEmployees() { return [...state.employees].sort((a, b) => sortKey(a).localeCompare(sortKey(b))); }

function boot() {
  loadUI();
  try { const t = localStorage.getItem('ta-pdms-theme'); if (t) document.documentElement.dataset.theme = t; } catch (e) { /* ignore */ }
  document.getElementById('period-label').textContent = '· ' + PERIOD.label + ' · data cut-off ' + D.nice(PERIOD.cutoff);
  const rs = document.getElementById('role-sel');
  rs.innerHTML = Object.entries(ROLES).filter(([k]) => k !== 'member').map(([k, r]) => `<option value="${k}">${r.label}</option>`).join('');
  rs.onchange = () => { ui.role = rs.value; ui.page = ROLES[ui.role].pages.find(p => p[0] !== '|'); render(); };
  document.getElementById('emp-sel').onchange = ev => { ui.emp = ev.target.value; render(); };
  document.getElementById('theme-btn').onclick = () => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('ta-pdms-theme', root.dataset.theme); } catch (e) { /* ignore */ }
  };
  initTooltip();
  window.addEventListener('hashchange', () => { const p = location.hash.slice(1); if (p && PAGE_TITLES[p]) { ui.page = p; render(false); } });
  render();
}

function render(pushHash = true) {
  const sb = document.getElementById('session-bar'), rw = document.getElementById('role-wrap');
  if (!session) {
    closeDlg();
    document.getElementById('nav').innerHTML = ''; document.getElementById('nav').style.display = 'none'; rw.style.display = 'none'; document.getElementById('emp-sel-wrap').style.display = 'none';
    sb.innerHTML = ''; document.getElementById('mode-label').textContent = '';
    document.getElementById('main').innerHTML = signInView(); document.title = 'Sign in · TA Performance Dashboard'; return;
  }
  document.getElementById('nav').style.display = '';
  // Only the TA Head (to preview what others see) and the demo can switch views; a member file is fixed to its owner.
  if (session.kind === 'member') { ui.role = 'member'; ui.emp = session.empId; }
  else if (ui.role === 'member') ui.role = 'head';
  rw.style.display = session.kind === 'member' ? 'none' : '';
  sb.innerHTML = session.kind === 'head' ? `<span class="small">🔒 ${esc(session.email)}</span> <button type="button" onclick="signOut()">Lock</button>`
    : session.kind === 'member' ? `<span class="small">${esc(currentUserLabel())}${session.dirty ? ' · unsaved changes' : ''}</span> <button type="button" onclick="exportResponses()">Export my responses</button> <button type="button" onclick="signOut()">Close</button>`
    : `<span class="small">Demo (fictional)</span> <button type="button" onclick="signOut()">Exit demo</button>`;
  const role = ROLES[ui.role];
  if (!role.pages.includes(ui.page)) ui.page = role.pages.find(p => p[0] !== '|');
  // person selector for employee and team-lead roles
  const wrap = document.getElementById('emp-sel-wrap'), es = document.getElementById('emp-sel');
  const people = ui.role === 'tl' ? state.employees.filter(e => isLead(e)) : ui.role === 'employee' ? state.employees.filter(e => !isLead(e)) : [];
  wrap.style.display = people.length ? '' : 'none';
  if (people.length) {
    if (!people.find(p => p.id === ui.emp)) ui.emp = people[0].id;
    es.innerHTML = people.map(p => `<option value="${p.id}" ${p.id === ui.emp ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
  }
  document.getElementById('role-sel').value = ui.role;
  document.getElementById('mode-label').textContent = session.kind === 'head' ? (ui.role === 'head' ? 'TA Head · encrypted workspace' : 'Preview as ' + ROLES[ui.role].label) : session.kind === 'member' ? 'My performance file' : 'Demo · fictional data';
  const openReq = state.requests.filter(r => ['Sent', 'Viewed'].includes(r.status) && (ui.role === 'head' ? false : r.emp === ui.emp)).length + (isHead() ? state.requests.filter(r => r.status === 'Responded').length : 0);
  const pendingBatches = state.batches.filter(b => b.status === 'Awaiting approval').length;
  document.getElementById('nav').innerHTML = role.pages.map(p => {
    if (p[0] === '|') return `<div class="sec">${esc(p.slice(1))}</div>`;
    let badge = '';
    if (p === 'requests' && openReq) badge = `<span class="badge">${openReq}</span>`;
    if (p === 'import' && pendingBatches && isHead()) badge = `<span class="badge">${pendingBatches}</span>`;
    const title = p === 'requests' && !isHead() ? 'Inbox' : PAGE_TITLES[p];
    return `<a href="#${p}" class="${p === ui.page ? 'on' : ''}" ${p === ui.page ? 'aria-current="page"' : ''}>${esc(title)}${badge}</a>`;
  }).join('');
  if (!state.employees.length && !['setup', 'admin', 'audit', 'guide', 'import'].includes(ui.page)) {
    document.getElementById('main').innerHTML = emptyWorkspace();
  } else {
    let html;
    try { html = VIEWS[ui.page](); } catch (err) { console.error(err); html = `<div class="card"><h2>Something went wrong</h2><p class="muted">${esc(err.message)}</p></div>`; }
    document.getElementById('main').innerHTML = html;
  }
  if (pushHash && location.hash.slice(1) !== ui.page) { try { history.replaceState(null, '', '#' + ui.page); } catch (e) { /* sandboxed */ } }
  document.title = PAGE_TITLES[ui.page] + ' · TA Performance Dashboard';
  saveUI();
}
function go(page, extra = {}) { Object.assign(ui, extra); ui.page = page; render(); window.scrollTo(0, 0); }

function emptyWorkspace() {
  return `<div class="card"><h1>Your workspace is empty</h1>
  <p>Add your team, then load performance data. Everything is encrypted with your passphrase and saved in this browser only.</p>
  <ol><li><b>Load your team file:</b> <a href="#setup">Team Setup</a> → Restore backup, or add people one at a time.</li>
  <li>Paste or upload offer data or recruiter scorecards in <a href="#import">Data Import</a>.</li>
  <li>Create personal files for your team in Team Setup so each person can see only their own performance.</li></ol></div>`;
}

// ---------- dialogs & toast ----------
let dlgActions = [];
function openDlg(title, body, buttons = [{ label: 'Close' }]) {
  document.getElementById('dlg-title').textContent = title;
  document.getElementById('dlg-body').innerHTML = body;
  dlgActions = buttons;
  document.getElementById('dlg-foot').innerHTML = buttons.map((b, i) => `<button type="button" class="btn ${b.cls || ''}" onclick="dlgAct(${i})">${esc(b.label)}</button>`).join('');
  const d = document.getElementById('dlg'); if (!d.open) d.showModal();
}
function dlgAct(i) { const b = dlgActions[i]; if (b.onClick) { if (b.onClick() === false) return; } closeDlg(); }
function closeDlg() { const d = document.getElementById('dlg'); if (d.open) d.close(); }
function val(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }
function toast(msg) {
  document.querySelectorAll('.toast').forEach(x => x.remove());
  const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
}
// In-page replacements for prompt()/confirm(), which hosted viewers block.
function askText(title, label, onOk, onCancel) {
  openDlg(title, `<label class="field">${esc(label)}<textarea id="ask-t" rows="3"></textarea></label>`,
    [{ label: 'Cancel', onClick: () => { if (onCancel) onCancel(); } }, { label: 'Confirm', cls: 'pri', onClick: () => { const v = val('ask-t'); if (!requireReason(v)) return false; closeDlg(); onOk(v); return false; } }]);
  setTimeout(() => { const t = document.getElementById('ask-t'); if (t) t.focus(); }, 30);
}
function confirmDlg(title, msg, onOk) {
  openDlg(title, `<p>${esc(msg)}</p>`, [{ label: 'Cancel' }, { label: 'Continue', cls: 'pri', onClick: () => { closeDlg(); onOk(); return false; } }]);
}
function requireReason(r) { if (!r) { toast('A reason is required.'); return false; } return true; }

// ---------- tooltip ----------
function initTooltip() {
  const tip = document.getElementById('tip');
  document.addEventListener('mouseover', e => { const t = e.target.closest('[data-tip]'); if (!t) { tip.style.display = 'none'; return; } tip.innerHTML = t.getAttribute('data-tip'); tip.style.display = 'block'; });
  document.addEventListener('mousemove', e => {
    if (tip.style.display !== 'block') return;
    const w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = Math.min(window.innerWidth - w - 8, e.clientX + 14) + 'px';
    tip.style.top = (e.clientY + h + 20 > window.innerHeight ? e.clientY - h - 10 : e.clientY + 16) + 'px';
  });
  document.addEventListener('scroll', () => { tip.style.display = 'none'; }, true);
}

// ---------- downloads ----------
// Hosted viewers block script-started downloads; there the page asks the viewer to save via the downloads capability.
const HOSTED = !!(window.claude && window.claude.use);
async function download(name, content, type) {
  if (HOSTED) {
    const dl = await window.claude.use('downloads');
    if (!dl) { toast('Downloads are not available in this view.'); return; }
    try { await dl.save({ filename: name, data: content }); toast('Saved ' + name); }
    catch (e) { if (e && e.code !== 'declined') toast('Could not save: ' + (e.message || e.code)); }
    return;
  }
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function toCSV(rows) { return rows.map(r => r.map(c => { const s = c == null ? '' : String(c); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\n'); }
