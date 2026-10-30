/**
 * C-Psych Fit Check — study backend (Google Apps Script, bound to a Google Sheet).
 *
 * Actions (POST, JSON body sent as text/plain to avoid CORS preflight):
 *   submit   {record, contact?}  -> appends one row to "responses" (one column per field);
 *                                   contact email (if given) goes to a separate "contacts" sheet.
 *   withdraw {pid}               -> logs the request in "withdrawals" and flags matching rows.
 *   scan     {company, country?, industry?}
 *                                -> public-sources culture summary via the Claude API with web search.
 *                                   Disabled unless the script property ANTHROPIC_API_KEY is set.
 *                                   Cached per organisation for CACHE_DAYS; daily call limit.
 * GET returns a health check.
 *
 * Setup: see fit-check/docs/setup-guide.md.
 */
const CFG = {
  RESPONSES: 'responses', CONTACTS: 'contacts', WITHDRAWALS: 'withdrawals', SCANS: 'scan_cache',
  MODEL: 'claude-opus-5-5', API_VERSION: '2026-10-21', CACHE_DAYS: 14, DAILY_SCAN_LIMIT: 60,
  MAX_FIELDS: 800, MAX_VALUE_CHARS: 4000,
};

function doGet() { return json_({ ok: true, service: 'fit-check', time: new Date().toISOString() }); }

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.action === 'submit') return json_(submit_(body));
    if (body.action === 'withdraw') return json_(withdraw_(body));
    if (body.action === 'scan') return json_(scan_(body));
    return json_({ ok: false, error: 'unknown_action' });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'server_error' });
  }
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/* ---------- storage ---------- */
function sheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}
// Append a flat record; new keys become new columns, so the instrument can evolve without breaking the sheet.
function append_(name, rec) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = sheet_(name);
    let headers = sh.getLastColumn() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0] : [];
    const missing = Object.keys(rec).filter(k => headers.indexOf(k) < 0);
    if (missing.length) {
      sh.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
      headers = headers.concat(missing);
      sh.setFrozenRows(1);
    }
    sh.appendRow(headers.map(h => (h in rec ? rec[h] : '')));
  } finally {
    lock.releaseLock();
  }
}
function clean_(rec) {
  if (!rec || typeof rec !== 'object') throw new Error('no record');
  const out = {};
  const keys = Object.keys(rec).slice(0, CFG.MAX_FIELDS);
  for (const k of keys) {
    if (!/^[A-Za-z0-9_]{1,64}$/.test(k)) continue;
    let v = rec[k];
    if (typeof v === 'boolean') v = v ? 1 : 0;
    if (typeof v === 'number') { if (!isFinite(v)) continue; out[k] = v; continue; }
    v = String(v == null ? '' : v).slice(0, CFG.MAX_VALUE_CHARS);
    out[k] = /^[=+\-@]/.test(v) ? "'" + v : v; // never let participant text become a spreadsheet formula
  }
  return out;
}

function submit_(b) {
  const rec = clean_(b.record);
  if (!/^FC-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(String(rec.pid || ''))) return { ok: false, error: 'bad_pid' };
  if (!rec.consent_research) return { ok: false, error: 'no_consent' };
  rec.received_at = new Date().toISOString();
  rec.withdrawn = 0;
  append_(CFG.RESPONSES, rec);
  const email = b.contact && String(b.contact.email || '').trim();
  if (email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) append_(CFG.CONTACTS, { pid: rec.pid, email: email.slice(0, 200), added_at: rec.received_at });
  return { ok: true };
}

function withdraw_(b) {
  const pid = String(b.pid || '');
  if (!/^FC-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(pid)) return { ok: false, error: 'bad_pid' };
  append_(CFG.WITHDRAWALS, { pid: pid, requested_at: new Date().toISOString() });
  const sh = sheet_(CFG.RESPONSES), data = sh.getDataRange().getValues(), h = data[0] || [];
  const ip = h.indexOf('pid'), iw = h.indexOf('withdrawn');
  for (let r = 1; r < data.length; r++) if (data[r][ip] === pid && iw >= 0) sh.getRange(r + 1, iw + 1).setValue(1);
  return { ok: true };
}

/* ---------- public-sources culture scan (Claude API + web search) ---------- */
const SCAN_SHAPE = '{"summary": "4-6 sentence summary of the lived culture", "strengths": ["up to 5 things employees often praise"], "concerns": ["up to 5 things employees often criticise"], "espoused_values": ["values leadership publicly states"], "cvf": {"clan": n, "adhoc": n, "market": n, "hier": n}, "norms": {"pace": 0-100, "risk": 0-100, "conflict": 0-100, "autonomy": 0-100}, "signals": {"layoffs": bool, "churn": bool, "restructure": bool, "regulatory": bool, "growth": bool, "mna": bool}, "strength": "low" | "moderate" | "high", "caveats": ["..."], "sources": [{"title": "...", "url": "..."}]}';

function scan_(b) {
  const key = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!key) return { ok: false, error: 'scan_disabled' };
  const company = String(b.company || '').trim().slice(0, 120), country = String(b.country || '').trim().slice(0, 80), industry = String(b.industry || '').trim().slice(0, 80);
  if (!company) return { ok: false, error: 'company_required' };
  const cacheKey = (company + '|' + country).toLowerCase();
  const cached = cacheGet_(cacheKey);
  if (cached) return { ok: true, scan: cached, cached: true };
  if (!quota_()) return { ok: false, error: 'daily_limit' };

  const prompt = 'Research the workplace culture of the organisation "' + company + '"' + (country ? ' in ' + country : '') + (industry ? ' (' + industry + ')' : '') + ' using public sources: ' +
    'employee review platforms (for example Glassdoor, AmbitionBox, Indeed, Kununu), reputable news from the last 24 months (layoffs, leadership changes, restructuring, regulatory issues, growth, mergers), ' +
    'and leadership statements or published values. Summarise patterns rather than quoting individual reviews, and do not reproduce reviews at length. ' +
    'Map the lived culture onto the Competing Values Framework as shares summing to 100 (clan = collaborative/people-first, adhoc = innovative/entrepreneurial, market = results/competition, hier = control/process), ' +
    'and rate operating norms from 0 to 100 (pace = decision speed, risk = appetite for risk, conflict = openness to disagreement, autonomy = latitude given to employees). ' +
    'Base every judgement on what the sources support. If evidence is thin, contradictory, or the organisation is ambiguous, say so in "caveats", set "strength" to "low" and keep numbers near neutral (cvf 25 each, norms 50). ' +
    'List the pages you relied on in "sources". Reply with ONLY one JSON object of this shape: ' + SCAN_SHAPE;

  let messages = [{ role: 'user', content: prompt }], resp = null;
  for (let i = 0; i < 4; i++) {
    resp = callClaude_(key, messages);
    if (resp.stop_reason === 'pause_turn') { messages = [{ role: 'user', content: prompt }, { role: 'assistant', content: resp.content }]; continue; } // server tool loop paused: resend to continue
    break;
  }
  if (!resp || resp.stop_reason === 'refusal') return { ok: false, error: 'refused' };
  const text = (resp.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n');
  const a = text.indexOf('{'), z = text.lastIndexOf('}');
  if (a < 0 || z <= a) return { ok: false, error: 'no_result' };
  let scan;
  try { scan = JSON.parse(text.slice(a, z + 1)); } catch (err) { return { ok: false, error: 'bad_result' }; }
  // keep the sources the search actually returned, in case the model's own list is short
  const seen = {};
  (scan.sources || []).forEach(s => { if (s && s.url) seen[s.url] = 1; });
  (resp.content || []).forEach(c => {
    if (c.type === 'web_search_tool_result' && Array.isArray(c.content)) c.content.slice(0, 5).forEach(r => { if (r.url && !seen[r.url] && (scan.sources || (scan.sources = [])).length < 10) { scan.sources.push({ title: r.title || r.url, url: r.url }); seen[r.url] = 1; } });
  });
  scan.searched_at = new Date().toISOString();
  cachePut_(cacheKey, company, country, scan);
  return { ok: true, scan: scan };
}

function callClaude_(key, messages) {
  const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { 'x-api-key': key, 'anthropic-version': CFG.API_VERSION, 'anthropic-beta': 'server-side-fallback-2026-07-01' },
    payload: JSON.stringify({
      model: CFG.MODEL, max_tokens: 16000, fallbacks: 'default', output_config: { effort: 'medium' },
      tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 8 }],
      messages: messages,
    }),
  });
  const code = res.getResponseCode();
  if (code !== 200) { console.error('Claude API ' + code + ': ' + res.getContentText().slice(0, 500)); throw new Error('api_' + code); }
  return JSON.parse(res.getContentText());
}

function quota_() {
  const props = PropertiesService.getScriptProperties(), day = Utilities.formatDate(new Date(), 'UTC', 'yyyyMMdd'), k = 'scan_count_' + day;
  const n = Number(props.getProperty(k) || 0);
  if (n >= CFG.DAILY_SCAN_LIMIT) return false;
  props.setProperty(k, String(n + 1));
  return true;
}
function cacheGet_(k) {
  const sh = sheet_(CFG.SCANS), data = sh.getDataRange().getValues(), cutoff = Date.now() - CFG.CACHE_DAYS * 864e5;
  for (let r = data.length - 1; r >= 1; r--) if (data[r][0] === k && new Date(data[r][3]).getTime() > cutoff) { try { return JSON.parse(data[r][4]); } catch (e) { return null; } }
  return null;
}
function cachePut_(k, company, country, scan) {
  const sh = sheet_(CFG.SCANS);
  if (!sh.getLastRow()) sh.appendRow(['key', 'company', 'country', 'searched_at', 'json']);
  sh.appendRow([k, company, country, new Date().toISOString(), JSON.stringify(scan).slice(0, 45000)]);
}

/* ---------- researcher utilities (run from the Apps Script editor) ---------- */
// Deletes every response row whose pid has a withdrawal request. Run periodically (or on a time trigger).
function purgeWithdrawn() {
  const w = sheet_(CFG.WITHDRAWALS).getDataRange().getValues().slice(1).map(r => r[0]);
  if (!w.length) return;
  for (const name of [CFG.RESPONSES, CFG.CONTACTS]) {
    const sh = sheet_(name), data = sh.getDataRange().getValues(), ip = (data[0] || []).indexOf('pid');
    for (let r = data.length - 1; r >= 1; r--) if (w.indexOf(data[r][ip]) >= 0) sh.deleteRow(r + 1);
  }
}
