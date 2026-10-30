/**
 * C-Psych Fit Check — study backend (Google Apps Script, bound to a Google Sheet).
 *
 * Actions (POST, JSON body sent as text/plain to avoid CORS preflight):
 *   submit   {record, contact?}  -> appends one row to "responses" (one column per field);
 *                                   contact email (if given) goes to a separate "contacts" sheet.
 *   withdraw {pid}               -> logs the request in "withdrawals" and flags matching rows.
 *   scan     {company, unit?, country?, industry?, func?}
 *                                -> multi-source company research (employee reviews, leadership statements,
 *                                   news, function level) via the Claude API with web search.
 *                                   Disabled unless the script property ANTHROPIC_API_KEY is set.
 *                                   Cached per organisation/unit/function for CACHE_DAYS; daily call limit.
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

/* ---------- company research (Claude API + web search) ----------
   One research run per organisation / unit / function, read as four separate lenses:
   employees (review platforms), leadership (stated values, careers pages), news (last 24 months) and the participant's function.
   Keep RESEARCH_SHAPE and RESEARCH_RULES in step with src/template.html. */
const RESEARCH_SHAPE = '{"identified": "the organisation you researched: name, headquarters, sector (or \\"ambiguous\\" if several match)", "summary": "4-6 sentences on the lived culture, drawing on all lenses", "lenses": {"employees": {"cvf": {"clan": n, "adhoc": n, "market": n, "hier": n}, "norms": {"pace": 0-100, "risk": 0-100, "conflict": 0-100, "autonomy": 0-100}, "psych_safety": 1-5, "leadership_trust": 1-5, "praised": ["up to 5 recurring themes"], "criticised": ["up to 5 recurring themes"], "strength": "low|moderate|high"}, "leadership": {"stated_values": ["values and priorities leadership states publicly"], "cvf": {"clan": n, "adhoc": n, "market": n, "hier": n}, "strength": "low|moderate|high"}, "news": {"events": [{"date": "YYYY-MM", "headline": "short factual description", "signal": "layoffs|churn|restructure|regulatory|growth|mna|other"}], "signals": {"layoffs": bool, "churn": bool, "restructure": bool, "regulatory": bool, "growth": bool, "mna": bool}, "strength": "low|moderate|high"}, "function": {"unit": "the function or unit assessed", "cvf": {"clan": n, "adhoc": n, "market": n, "hier": n}, "norms": {"pace": 0-100, "risk": 0-100, "conflict": 0-100, "autonomy": 0-100}, "notes": "1-2 sentences on how this function or unit differs from the organisation as a whole", "strength": "low|moderate|high"}}, "sources": [{"type": "reviews|news|leadership|careers|function|other", "platform": "e.g. Glassdoor, AmbitionBox, Indeed, Kununu, Reuters, company website", "title": "page title", "url": "https://...", "period": "e.g. 2025-2026", "rating": n or null, "rating_max": 5, "review_count": n or null, "finding": "one sentence: what this source shows about the culture"}], "agreement": "1-3 sentences: where the sources agree and where they disagree", "say_do": "1-2 sentences: gap between what leadership says and what employees report", "strength": "low|moderate|high", "caveats": ["..."]}';
const RESEARCH_RULES = 'Map culture onto the Competing Values Framework as shares summing to 100 (clan = collaborative/people-first, adhoc = innovative/entrepreneurial, market = results/competition, hier = control/process). Rate operating norms 0-100 (pace = decision speed, risk = appetite for risk, conflict = openness to disagreement, autonomy = latitude given to employees). Rate psychological safety and trust in leadership 1-5 from what employees report. Judge each lens only from its own sources and give it its own strength: high = several recent, consistent sources (e.g. hundreds of reviews); moderate = some sources or mixed signals; low = little or old evidence. Where a lens has no evidence, set its strength to "low" and its numbers to neutral (cvf 25 each, norms 50, ratings 3). Summarise recurring patterns; never quote or reproduce individual reviews. Prefer the last 24 months and say when evidence is older.';
const SRC_TYPES_ = ['reviews', 'news', 'leadership', 'careers', 'function', 'other'];

function scan_(b) {
  const key = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!key) return { ok: false, error: 'scan_disabled' };
  const s = (v, n) => String(v || '').replace(/[\r\n"]+/g, ' ').trim().slice(0, n);
  const company = s(b.company, 120), unit = s(b.unit, 120), country = s(b.country, 80), industry = s(b.industry, 80), fn = s(b.func, 60).replace(/^Other$/, '');
  if (!company) return { ok: false, error: 'company_required' };
  const cacheKey = [company, unit, country, fn].join('|').toLowerCase();
  const cached = cacheGet_(cacheKey);
  if (cached) return { ok: true, scan: cached, cached: true };
  if (!quota_()) return { ok: false, error: 'daily_limit' };

  const where = (unit ? ', especially its ' + unit : '') + (country ? ' in ' + country : '') + (industry ? ' (' + industry + ')' : '');
  const prompt = 'Research the workplace culture of the organisation "' + company + '"' + where + '. First make sure you have the right organisation; if the name is ambiguous, use the location and industry, and say which one you chose in "identified". ' +
    'Search four kinds of source and keep them separate: ' +
    '(1) EMPLOYEES: employee review platforms such as Glassdoor, AmbitionBox, Indeed, Kununu or Comparably; note the overall rating, number of reviews and period where stated, and recurring themes; ' +
    '(2) LEADERSHIP: the organisation\'s published values, leadership interviews and statements, annual or sustainability reports, careers and employer-brand pages; ' +
    '(3) NEWS: reputable news from the last 24 months on layoffs, leadership changes, restructuring, regulatory or legal issues, growth, mergers and acquisitions; ' +
    '(4) FUNCTION: what employees and other sources say about the ' + (fn || 'relevant') + ' function' + (unit ? ' or the ' + unit + ' unit' : '') + ' specifically, and how it differs from the organisation as a whole. ' +
    'Use several searches so every lens has its own evidence. ' + RESEARCH_RULES + ' ' +
    'Base every judgement on what the sources support; if evidence is thin, contradictory or the organisation is ambiguous, say so in "caveats". ' +
    'List every page you relied on in "sources" with its type. Reply with ONLY one JSON object of this shape: ' + RESEARCH_SHAPE;

  let messages = [{ role: 'user', content: prompt }], resp = null;
  for (let i = 0; i < 5; i++) {
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
  // keep pages the search actually returned, in case the model's own list is short
  if (!Array.isArray(scan.sources)) scan.sources = [];
  scan.sources = scan.sources.filter(x => x && typeof x === 'object').map(x => Object.assign(x, { type: SRC_TYPES_.indexOf(x.type) >= 0 ? x.type : 'other' }));
  const seen = {};
  scan.sources.forEach(x => { if (x.url) seen[x.url] = 1; });
  (resp.content || []).forEach(c => {
    if (c.type === 'web_search_tool_result' && Array.isArray(c.content)) c.content.slice(0, 4).forEach(r => {
      if (r.url && !seen[r.url] && scan.sources.length < 18) { scan.sources.push({ type: 'other', title: r.title || r.url, url: r.url, platform: hostOf_(r.url) }); seen[r.url] = 1; }
    });
  });
  scan.searched_at = new Date().toISOString();
  cachePut_(cacheKey, company, country, scan);
  return { ok: true, scan: scan };
}
function hostOf_(u) { const m = String(u).match(/^https?:\/\/(?:www\.)?([^\/]+)/); return m ? m[1] : ''; }

function callClaude_(key, messages) {
  const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { 'x-api-key': key, 'anthropic-version': CFG.API_VERSION, 'anthropic-beta': 'server-side-fallback-2026-07-01' },
    payload: JSON.stringify({
      model: CFG.MODEL, max_tokens: 16000, fallbacks: 'default', output_config: { effort: 'medium' },
      tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 14 }],
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
