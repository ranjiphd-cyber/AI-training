// VTC Control Centre client. All authority is enforced server-side; this client only renders what the API returns.
// DOM is built with createElement/textContent only (no innerHTML with data) to prevent XSS.

const TZ = 'Asia/Kolkata';
const state = { me: null, meta: null, csrf: null };

// ------------------------------------------------------------------ DOM helpers
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid === null || kid === undefined || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}
const fmt = (d) => d ? new Intl.DateTimeFormat('en-IN', { timeZone: TZ, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d)) : '—';
const fmtTime = (d) => new Intl.DateTimeFormat('en-IN', { timeZone: TZ, timeStyle: 'short' }).format(new Date(d));
/** datetime-local value (interpreted as IST wall-clock) → ISO with +05:30 offset. */
const istToIso = (v) => v ? `${v}:00+05:30` : '';
const isoToIstInput = (d) => {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date(d)).reduce((a, x) => ({ ...a, [x.type]: x.value }), {});
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
};

const STATUS_TONE = {
  DRAFT: 'neutral', IN_APPROVAL: 'info', IN_REVIEW: 'info', RETURNED: 'warn', APPROVED: 'ok', REJECTED: 'bad', CONFIRMED: 'ok',
  CANCELLED: 'neutral', PENDING: 'warn', DECLINED: 'bad', ALTERNATIVE_PROPOSED: 'warn', ALTERNATIVE_ACCEPTED: 'neutral',
  SUPERSEDED: 'neutral', WITHDRAWN: 'neutral', INVITED: 'warn', ACCEPTED: 'ok', TENTATIVE: 'warn', RELEASED: 'neutral',
  SUCCESS: 'ok', BLOCKED: 'warn', DENIED: 'bad', FAILED: 'bad', ACTIVE: 'ok', RETIRED: 'neutral',
};
const ICON = { ok: '✓', bad: '✕', warn: '!', info: '•', neutral: '○' };
function chip(status, label) {
  const tone = STATUS_TONE[status] || 'neutral';
  return h('span', { class: `chip ${tone}` }, h('span', { 'aria-hidden': 'true' }, ICON[tone]), label || status.replaceAll('_', ' '));
}
const simChip = () => h('span', { class: 'chip sim', title: 'Simulation record — not operational' }, '◇ SIMULATION');

// ------------------------------------------------------------------ API
async function api(method, url, body) {
  if (body === undefined && method !== 'GET') body = {};
  const res = await fetch(url, {
    method, credentials: 'same-origin',
    headers: { 'content-type': 'application/json', ...(state.csrf ? { 'x-csrf-token': state.csrf } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty */ }
  if (!res.ok) {
    const err = new Error(data?.error?.message || `Request failed (${res.status})`);
    err.status = res.status; err.info = data?.error || {};
    if (res.status === 401 && !url.endsWith('/demo-login')) { state.me = null; render(); }
    throw err;
  }
  return data;
}

function errorBox(err) {
  const i = err.info || {};
  const details = Array.isArray(i.details) ? i.details : [];
  return h('div', { class: 'alert error', role: 'alert' },
    h('strong', {}, i.code === 'FORBIDDEN' ? 'Not permitted: ' : i.code === 'POLICY_NOT_CONFIGURED' ? 'Blocked — policy not configured: ' : 'Action not completed: '),
    err.message,
    i.resolution && h('div', {}, h('strong', {}, 'How to resolve: '), i.resolution),
    i.resolver && h('div', {}, h('strong', {}, 'Who can resolve: '), i.resolver),
    details.length > 0 && h('ul', {}, details.map((d) => h('li', {}, typeof d === 'string' ? d :
      `${d.label ? d.label + ': ' : ''}${d.message || d.detail || JSON.stringify(d)}${d.resolution ? ' — ' + d.resolution : ''}`))),
    i.correlationId && h('div', { class: 'muted mono' }, `Correlation ID: ${i.correlationId}`));
}

/** Wraps an async action with an inline result area. */
function runner(target, fn, successMsg) {
  return async (ev) => {
    ev?.preventDefault?.();
    const btn = ev?.submitter || ev?.currentTarget;
    if (btn && btn.tagName === 'BUTTON') btn.disabled = true;
    target.replaceChildren();
    try {
      const out = await fn(ev);
      if (successMsg) target.append(h('div', { class: 'alert success', role: 'status' }, typeof successMsg === 'function' ? successMsg(out) : successMsg));
      setTimeout(() => route(), successMsg ? 900 : 0);
    } catch (err) {
      target.append(errorBox(err));
      if (btn && btn.tagName === 'BUTTON') btn.disabled = false;
    }
  };
}

const formData = (form) => Object.fromEntries(new FormData(form).entries());
const has = (perm) => state.me?.permissions.includes(perm);

// ------------------------------------------------------------------ navigation
const NAV = [
  { href: '#/', label: 'Command Centre', show: () => has('dashboard.view') },
  { href: '#/programmes', label: 'Programmes', show: () => state.me?.canSeeProgrammes },
  { href: '#/calendar', label: 'Calendar & Resources', show: () => has('resource.view') },
  { href: '#/approvals', label: 'Approvals', show: () => has('request.view') || has('request.approve') || has('centre_access.create') },
  { href: '#/participants', label: 'Participants', planned: 'Slice 2' },
  { href: '#/trainers', label: 'Trainers', show: () => has('trainer.view') || !!state.me?.user.trainerId },
  { href: '#/srm', label: 'SRM Operations', show: () => has('facility.view') },
  { href: '#/attendance', label: 'Attendance & Evidence', planned: 'Slice 3' },
  { href: '#/certificates', label: 'Certificates', planned: 'Slice 4' },
  { href: '#/communications', label: 'Communications', planned: 'Slice 5' },
  { href: '#/csr', label: 'CSR Reports', planned: 'Slice 6' },
  { href: '#/admin', label: 'Administration & Audit', show: () => has('audit.view') || has('policy.view') },
];

function shell(content) {
  const current = location.hash.split('/').slice(0, 2).join('/') || '#/';
  const banner = state.meta?.demoEnvironment
    ? h('div', { class: 'env-banner', role: 'note' }, 'DEMO ENVIRONMENT — synthetic data only · no emails or external messages are sent · simulation policies are examples, not company policy')
    : null;
  return h('div', {}, banner,
    h('div', { class: 'shell' },
      h('header', { class: 'top' },
        h('div', { class: 'brand' }, 'Volvo Group–SRM Vehicle Technology Centre', h('small', {}, 'Training & Operations Control Centre')),
        h('div', { class: 'who' }, h('div', {}, state.me.user.displayName), h('div', {}, state.me.roles.map((r) => r.role.replaceAll('_', ' ')).join(' · ')),
          h('button', { class: 'secondary', onclick: async () => { await api('POST', '/api/v1/auth/logout'); state.me = null; location.hash = '#/'; render(); } }, 'Sign out'))),
      h('nav', { class: 'side', 'aria-label': 'Main' }, h('ol', {}, NAV.filter((n) => n.planned || n.show()).map((n) =>
        h('li', {}, h('a', { href: n.href, 'aria-current': (n.href === current || (n.href === '#/' && current === '#')) ? 'page' : null }, n.label,
          n.planned && h('span', { class: 'planned' }, n.planned)))))),
      h('main', { id: 'main', tabindex: '-1' }, content)));
}

// ------------------------------------------------------------------ views
async function viewLogin() {
  const meta = state.meta;
  const out = h('div');
  const root = h('div', { class: 'login' },
    h('h1', {}, 'VTC Training & Operations Control Centre'),
    h('p', { class: 'sub' }, 'Volvo Group India · SRM Institute of Science and Technology, Kattankulathur · supported by Volvo Group CSR Trust'),
    meta.demoEnvironment
      ? [h('div', { class: 'alert notice', role: 'note' }, h('strong', {}, 'Demo sign-in. '),
          'These are isolated synthetic identities for evaluation. A person claiming to be an approver is not authentication; production requires the approved enterprise identity provider (decision D-06). Demo sign-in is refused at server start in production.'),
        out,
        h('div', { class: 'grid' }, meta.demoIdentities.map((u) => h('button', { class: 'identity', onclick: async (e) => {
          out.replaceChildren();
          try { const r = await api('POST', '/api/v1/auth/demo-login', { userKey: u.user_key }); state.csrf = r.csrfToken; await loadMe(); render(); }
          catch (err) { out.append(errorBox(err)); }
        } }, h('strong', {}, u.display_name), h('div', { class: 'muted' }, u.organisation),
          h('div', { class: 'muted' }, (u.roles || []).filter(Boolean).join(', ').replaceAll('_', ' ')))))]
      : h('div', { class: 'alert error' }, 'Sign-in is not available: enterprise identity integration is not configured.'));
  return root;
}

async function viewDashboard() {
  const inc = new URLSearchParams(location.hash.split('?')[1] || '').get('sim') !== 'off';
  const d = await api('GET', `/api/v1/dashboard?includeSimulation=${inc}`);
  const card = (k) => h('div', { class: 'kpi' },
    h('div', { class: 'l' }, k.label),
    k.value === null ? h('div', { class: 'v na' }, 'Unavailable') : h('div', { class: 'v' }, k.value),
    k.unavailableReason && h('div', { class: 'm' }, k.unavailableReason),
    h('div', { class: 'm' }, `Period: ${k.period} · ${k.filters}`),
    h('details', {}, h('summary', {}, 'Definition'), h('div', { class: 'm' }, k.definition)),
    k.drill && h('a', { href: k.drill }, 'View source records →'));
  const keys = ['APPROVAL:TRAINING_REQUEST', 'APPROVAL:CENTRE_ACCESS', 'BOOKING'];
  const authorised = new Set(d.policyCoverage.filter((p) => p.provenance === 'AUTHORISED').map((p) => p.policy_key));
  return h('div', {},
    h('h1', {}, 'Command Centre'),
    h('p', { class: 'sub' }, `Generated ${fmt(d.generatedAt)} IST. Every figure is computed from stored records; unavailable figures are shown as unavailable, never as zero.`),
    h('div', { class: 'row' }, h('span', { class: 'muted' }, 'Scope:'),
      h('a', { href: '#/?sim=on', 'aria-current': inc ? 'true' : null }, inc ? h('strong', {}, 'Operational + simulation') : 'Operational + simulation'), ' | ',
      h('a', { href: '#/?sim=off', 'aria-current': !inc ? 'true' : null }, !inc ? h('strong', {}, 'Operational only') : 'Operational only')),
    keys.some((k) => !authorised.has(k)) && h('div', { class: 'alert notice', role: 'note' }, h('strong', {}, 'Production behaviour blocked pending decisions. '),
      'No AUTHORISED policy is active for: ', keys.filter((k) => !authorised.has(k)).join(', '),
      '. Operational submissions and bookings fail closed until the decision owners record routing (see Administration & Audit).'),
    h('h2', {}, 'Operations'), h('div', { class: 'grid' }, d.kpis.map(card)),
    h('h2', {}, 'Verified CSR indicators'), h('div', { class: 'grid' }, d.csr.map(card)));
}

async function viewProgrammes() {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const qs = new URLSearchParams();
  if (params.get('status')) qs.set('status', params.get('status'));
  const rows = await api('GET', `/api/v1/programmes?${qs}`);
  const out = h('div');
  let createForm = null;
  if (has('programme.create')) {
    const institutions = await api('GET', '/api/v1/institutions');
    createForm = h('details', { class: 'card' }, h('summary', {}, 'Create draft programme'),
      h('form', { class: 'stack', onsubmit: runner(out, async (e) => {
        const f = formData(e.target);
        const p = await api('POST', '/api/v1/programmes', {
          title: f.title, technicalDomain: f.technicalDomain, description: f.description, deliveryMode: f.deliveryMode,
          isSimulation: f.dataClass === 'SIMULATION', institutionIds: new FormData(e.target).getAll('institutionIds'),
          learningObjectives: (f.learningObjectives || '').split('\n').map((s) => s.trim()).filter(Boolean) });
        location.hash = `#/programmes/${p.id}`;
      }) },
      h('label', {}, 'Title', h('input', { name: 'title', required: true, maxlength: 200 })),
      h('label', {}, 'Technical domain', h('input', { name: 'technicalDomain', required: true })),
      h('label', {}, 'Description', h('textarea', { name: 'description' })),
      h('label', {}, 'Learning objectives', h('span', { class: 'hint' }, 'One per line'), h('textarea', { name: 'learningObjectives' })),
      h('label', {}, 'Delivery mode', h('select', { name: 'deliveryMode' }, ['ONSITE', 'ONLINE', 'HYBRID'].map((m) => h('option', { value: m }, m)))),
      h('fieldset', {}, h('legend', {}, 'Institution scope'), institutions.filter((i) => ['HOST', 'PARTNER_UNIVERSITY'].includes(i.kind)).map((i) =>
        h('label', { class: 'row' }, h('input', { type: 'checkbox', name: 'institutionIds', value: i.id, checked: i.kind === 'HOST' }),
          `${i.name} `, chip(i.approval_status === 'APPROVED' ? 'APPROVED' : 'PENDING', i.approval_status.replaceAll('_', ' '))))),
      h('fieldset', {}, h('legend', {}, 'Data class'),
        h('label', { class: 'row' }, h('input', { type: 'radio', name: 'dataClass', value: 'SIMULATION', checked: true }), 'Simulation — governed only by example policies; never reported as operational'),
        h('label', { class: 'row' }, h('input', { type: 'radio', name: 'dataClass', value: 'OPERATIONAL' }), 'Operational — governed only by AUTHORISED policies (currently blocked)')),
      h('div', {}, h('button', { type: 'submit' }, 'Create draft'))));
  }
  const statuses = ['DRAFT', 'IN_APPROVAL', 'RETURNED', 'APPROVED', 'CONFIRMED', 'REJECTED', 'CANCELLED'];
  return h('div', {},
    h('h1', {}, 'Programmes'), h('p', { class: 'sub' }, 'Programmes visible within your authorised scope.'),
    out, createForm,
    h('div', { class: 'row' }, h('span', { class: 'muted' }, 'Filter:'), h('a', { href: '#/programmes' }, 'All'),
      statuses.map((s) => h('a', { href: `#/programmes?status=${s}` }, s.replace('_', ' ')))),
    rows.length === 0 ? h('div', { class: 'empty' }, 'No programmes in your scope match this filter.') :
      h('div', { class: 'table-wrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Code', 'Title', 'Domain', 'Mode', 'Sessions', 'First session', 'Status', 'Owner'].map((c) => h('th', { scope: 'col' }, c)))),
        h('tbody', {}, rows.map((p) => h('tr', {},
          h('td', { class: 'mono' }, p.code), h('td', {}, h('a', { href: `#/programmes/${p.id}` }, p.title), ' ', p.is_simulation && simChip()),
          h('td', {}, p.technical_domain), h('td', {}, p.delivery_mode), h('td', {}, p.session_count), h('td', {}, fmt(p.first_session)),
          h('td', {}, chip(p.status)), h('td', {}, p.owner_name)))))));
}

function sessionForm(resources, onSubmit, s) {
  return h('form', { class: 'stack', onsubmit: onSubmit },
    h('label', {}, 'Session title', h('input', { name: 'title', required: true, value: s?.title })),
    h('div', { class: 'row' },
      h('label', {}, 'Starts (IST)', h('input', { type: 'datetime-local', name: 'startsAt', required: true, value: s ? isoToIstInput(s.starts_at) : null })),
      h('label', {}, 'Ends (IST)', h('input', { type: 'datetime-local', name: 'endsAt', required: true, value: s ? isoToIstInput(s.ends_at) : null })),
      h('label', {}, 'Mode', h('select', { name: 'deliveryMode' }, ['ONSITE', 'ONLINE', 'HYBRID'].map((m) => h('option', { value: m, selected: s?.delivery_mode === m }, m))))),
    h('div', { class: 'row' },
      h('label', {}, 'Expected on-site', h('input', { type: 'number', min: 0, name: 'expectedOnsite', value: s?.expected_onsite ?? 0 })),
      h('label', {}, 'Expected online', h('input', { type: 'number', min: 0, name: 'expectedOnline', value: s?.expected_online ?? 0 }))),
    h('fieldset', {}, h('legend', {}, 'Resources (synthetic placeholder inventory)'), resources.filter((r) => r.status === 'ACTIVE').map((r) =>
      h('div', { class: 'row' },
        h('label', { class: 'row' }, h('input', { type: 'checkbox', name: 'res', value: r.id, checked: s?.resources?.some((x) => x.resource_id === r.id) }),
          `${r.code} — ${r.name} (cap. ${r.capacity}, ${r.allocation_mode.toLowerCase()})`),
        r.allocation_mode === 'SHARED' && r.kind !== 'VIRTUAL' && h('label', {}, 'Units', h('input', { type: 'number', min: 1, name: `units_${r.id}`,
          value: s?.resources?.find((x) => x.resource_id === r.id)?.units_required, class: 'narrow' }))))),
    h('div', {}, h('button', { type: 'submit' }, s ? 'Save session' : 'Add session')));
}

function sessionPayload(form) {
  const fd = new FormData(form); const f = Object.fromEntries(fd.entries());
  return {
    title: f.title, startsAt: istToIso(f.startsAt), endsAt: istToIso(f.endsAt), deliveryMode: f.deliveryMode,
    expectedOnsite: Number(f.expectedOnsite || 0), expectedOnline: Number(f.expectedOnline || 0),
    resources: fd.getAll('res').map((id) => ({ resourceId: id, ...(f[`units_${id}`] ? { units: Number(f[`units_${id}`]) } : {}) })),
  };
}

async function viewProgramme(id) {
  const d = await api('GET', `/api/v1/programmes/${id}`);
  const p = d.programme;
  const out = h('div');
  const act = (key) => d.actions.find((a) => a.key === key);
  const canEdit = act('edit')?.enabled;
  const resources = (has('resource.view') && canEdit) ? await api('GET', '/api/v1/resources') : [];
  const trainerList = (has('trainer.assign') && has('trainer.view')) ? await api('GET', '/api/v1/trainers') : [];

  const reasonPrompt = (label) => { const r = window.prompt(label); if (r === null) throw Object.assign(new Error('Cancelled'), { info: {} }); return r; };
  const ACTIONS = {
    submit: () => api('POST', `/api/v1/programmes/${id}/submit`),
    request_facilities: () => api('POST', `/api/v1/programmes/${id}/facility-requests`),
    finalise: () => api('POST', `/api/v1/programmes/${id}/booking`),
    reopen: () => api('POST', `/api/v1/programmes/${id}/reopen`, { reason: reasonPrompt('Reason for reopening (the current approval will be superseded and confirmed bookings released):') }),
    cancel: () => api('POST', `/api/v1/programmes/${id}/cancel`, { reason: reasonPrompt('Cancellation reason (required):') }),
    withdraw: () => api('POST', `/api/v1/requests/${d.request.id}/withdraw`, {}),
  };
  const actionBar = h('div', { class: 'row', role: 'group', 'aria-label': 'Available actions' },
    d.actions.filter((a) => ACTIONS[a.key]).map((a) => h('div', { class: 'action' },
      h('button', { class: ['cancel', 'reopen'].includes(a.key) ? 'danger' : a.key === 'withdraw' ? 'secondary' : '', disabled: !a.enabled,
        'aria-describedby': a.reason ? `why-${a.key}` : null,
        onclick: runner(out, ACTIONS[a.key], (r) => a.key === 'request_facilities' ? `Facility requests: ${r.created} created, ${r.superseded} superseded.` : 'Done.') }, a.label),
      a.reason && h('span', { class: 'why', id: `why-${a.key}` }, a.reason))));

  const readiness = h('ul', { class: 'checklist' }, d.readiness.checks.map((c) => h('li', { class: c.met ? 'met' : 'unmet' },
    h('span', { class: 'mark', 'aria-hidden': 'true' }, c.met ? '✓' : '✕'),
    h('div', {}, h('strong', {}, c.label), ' ', h('span', { class: 'sr-only' }, c.met ? '(met)' : '(not met)'), chip(c.met ? 'SUCCESS' : 'BLOCKED', c.met ? 'Met' : 'Not met'),
      h('div', { class: 'muted' }, c.detail), c.resolver && h('div', { class: 'muted' }, `Resolver: ${c.resolver}`),
      c.issues?.length > 0 && h('ul', {}, c.issues.map((i) => h('li', {}, i.message)))))));

  const issues = [...d.validation.errors, ...d.validation.warnings];
  const sessionsTable = d.sessions.length === 0 ? h('div', { class: 'empty' }, 'No sessions yet.') :
    h('div', { class: 'table-wrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Session', 'When (IST)', 'Mode', 'Participants', 'Resources', 'Trainers', ''].map((c) => h('th', { scope: 'col' }, c)))),
      h('tbody', {}, d.sessions.map((s) => h('tr', {},
        h('td', {}, s.title), h('td', {}, `${fmt(s.starts_at)} – ${fmtTime(s.ends_at)}`), h('td', {}, s.delivery_mode),
        h('td', {}, `${s.expected_onsite} on-site / ${s.expected_online} online`),
        h('td', {}, s.resources.length ? s.resources.map((r) => h('div', {}, `${r.code} (${r.units_required})`)) : h('span', { class: 'muted' }, 'None')),
        h('td', {}, s.trainers.length ? s.trainers.map((t) => h('div', {}, t.display_name, ' ', chip(t.status))) : h('span', { class: 'muted' }, 'None'),
          trainerList.length > 0 && !['CONFIRMED', 'CANCELLED', 'REJECTED'].includes(p.status) && h('form', { class: 'inline', onsubmit: runner(out, (e) =>
            api('POST', `/api/v1/sessions/${s.id}/trainers`, { trainerId: formData(e.target).trainerId }), 'Trainer invited in-app (no email sent — communications not configured).') },
            h('label', {}, h('span', { class: 'sr-only' }, 'Trainer'), h('select', { name: 'trainerId', 'aria-label': `Trainer for ${s.title}` }, trainerList.map((t) => h('option', { value: t.id }, t.display_name)))),
            h('button', { class: 'secondary', type: 'submit' }, 'Invite'))),
        h('td', {}, canEdit && h('details', {}, h('summary', {}, 'Edit'),
          sessionForm(resources, runner(out, (e) => api('PUT', `/api/v1/sessions/${s.id}`, sessionPayload(e.target)), 'Session saved.'), s),
          h('button', { class: 'danger', onclick: runner(out, () => api('DELETE', `/api/v1/sessions/${s.id}`), 'Session deleted.') }, 'Delete session'))))))));

  const req = d.request;
  const approval = !req ? h('div', { class: 'empty' }, 'Not yet submitted.') : h('div', { class: 'card' },
    h('div', { class: 'row' }, h('strong', { class: 'mono' }, req.reference), chip(req.status), req.isSimulation && simChip()),
    h('p', { class: 'muted' }, `Bound policy: ${req.policy.title} · v${req.policy.version} · ${req.policy.provenance} · ${req.policy.mode} · request covers programme v${req.subjectVersion}`),
    h('ol', {}, req.steps.map((s) => h('li', {}, h('strong', {}, s.name), ` — ${s.approvals}/${s.requiredApprovals} approvals · `, chip(s.state === 'COMPLETE' ? 'APPROVED' : s.state === 'OPEN' ? 'PENDING' : 'DRAFT', s.state),
      h('div', { class: 'muted' }, `Named approvers: ${s.approvers.join(', ')}`)))),
    req.decisions.length > 0 && h('ul', { class: 'timeline' }, req.decisions.map((x) => h('li', {}, h('strong', {}, `${x.decision} `), `by ${x.actor} (${x.step}) · ${fmt(x.at)}`, x.reason && h('div', { class: 'muted' }, `Reason: ${x.reason}`)))),
    req.awaitingMe && decisionForm(req.id, out));

  const frTable = d.facilityRequests.length === 0 ? h('div', { class: 'empty' }, 'No SRM facility requests yet.') :
    h('div', { class: 'table-wrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Session', 'Resource', 'Requested (IST)', 'Status', 'SRM response', ''].map((c) => h('th', { scope: 'col' }, c)))),
      h('tbody', {}, d.facilityRequests.map((f) => h('tr', {},
        h('td', {}, f.session_title, f.origin === 'ALTERNATIVE' && h('div', { class: 'muted' }, 'From SRM alternative')),
        h('td', {}, f.resource_code), h('td', {}, `${fmt(f.requested_starts_at)} – ${fmtTime(f.requested_ends_at)}`), h('td', {}, chip(f.status)),
        h('td', {}, f.response_note || '—', f.status === 'ALTERNATIVE_PROPOSED' && h('div', { class: 'muted' },
          `Proposed: ${f.alt_resource_code || f.resource_code}${f.alt_starts_at ? ` at ${fmt(f.alt_starts_at)} – ${fmtTime(f.alt_ends_at)}` : ''}`)),
        h('td', {}, f.status === 'ALTERNATIVE_PROPOSED' && has('programme.edit') && h('button', { class: 'secondary', onclick: runner(out, async () => {
          const needs = ['IN_APPROVAL', 'APPROVED'].includes(p.status);
          if (needs && !window.confirm('Accepting this alternative is a material change: the current approval will be superseded and the programme must be resubmitted. Continue?')) throw Object.assign(new Error('Cancelled'), { info: {} });
          return api('POST', `/api/v1/facility-requests/${f.id}/accept-alternative`, { confirmReapproval: needs });
        }, 'Alternative accepted; a new facility request was sent to SRM.') }, 'Accept alternative')))))));

  return h('div', {},
    h('p', {}, h('a', { href: '#/programmes' }, '← Programmes')),
    h('div', { class: 'row' }, h('h1', {}, p.title), chip(p.status), p.is_simulation && simChip()),
    h('p', { class: 'sub mono' }, `${p.code} · version ${p.version}`),
    out,
    h('div', { class: 'split' },
      h('div', {},
        h('div', { class: 'card next' }, h('h2', { class: 'flush' }, 'Next required action'), h('p', {}, h('strong', {}, d.nextAction.action)), h('p', { class: 'muted' }, `Owner: ${d.nextAction.owner}`)),
        d.actions.length > 0 ? actionBar : h('p', { class: 'muted' }, 'You have view-only access to this programme.')),
      h('div', { class: 'card' }, h('dl', { class: 'facts' },
        h('dt', {}, 'Owner'), h('dd', {}, p.owner_name), h('dt', {}, 'Domain'), h('dd', {}, p.technical_domain), h('dt', {}, 'Delivery'), h('dd', {}, p.delivery_mode),
        h('dt', {}, 'Institutions'), h('dd', {}, d.institutions.map((i) => i.name).join(', ') || '—'), h('dt', {}, 'Time zone'), h('dd', {}, p.timezone)))),
    p.learning_objectives.length > 0 && [h('h2', {}, 'Learning objectives'), h('ul', {}, p.learning_objectives.map((o) => h('li', {}, o)))],
    h('h2', {}, 'Booking readiness'), h('p', { class: 'muted' }, 'All conditions are re-validated inside the final-booking transaction.'), h('div', { class: 'card' }, readiness),
    h('h2', {}, `Validation (${d.validation.errors.length} errors, ${d.validation.warnings.length} warnings)`),
    issues.length === 0 ? h('p', { class: 'muted' }, 'No issues found.') : h('ul', {}, issues.map((i) => h('li', {}, chip(i.severity === 'ERROR' ? 'DENIED' : 'PENDING', i.severity), ' ', i.message, i.resolution && h('span', { class: 'muted' }, ` — ${i.resolution}`)))),
    h('h2', {}, 'Sessions'), sessionsTable,
    canEdit && h('details', { class: 'card' }, h('summary', {}, 'Add session'),
      sessionForm(resources, runner(out, (e) => api('POST', `/api/v1/programmes/${id}/sessions`, sessionPayload(e.target)), 'Session added.'))),
    h('h2', {}, 'Approval'), approval,
    h('h2', {}, 'SRM facility confirmations'), h('p', { class: 'muted' }, 'Facility confirmation is availability only — it is neither training approval nor a final booking.'), frTable,
    h('h2', {}, 'Reservations'), d.reservations.length === 0 ? h('p', { class: 'muted' }, 'None held.') :
      h('ul', {}, d.reservations.map((r) => h('li', {}, chip(r.status), ` ${r.resource_code} · ${fmt(r.starts_at)} – ${fmtTime(r.ends_at)}`))),
    d.history && [h('h2', {}, 'History'), historyList(d.history)]);
}

function historyList(rows) {
  if (!rows.length) return h('p', { class: 'muted' }, 'No history.');
  return h('ul', { class: 'timeline' }, rows.map((e) => h('li', {},
    h('strong', {}, e.action), ' ', chip(e.outcome), ` · ${e.actor_label} · ${fmt(e.occurred_at)}`, e.entity_version && h('span', { class: 'muted' }, ` · v${e.entity_version}`),
    e.reason && h('div', { class: 'muted' }, e.reason))));
}

function decisionForm(requestId, out) {
  return h('form', { class: 'stack', onsubmit: runner(out, (e) => {
    const f = formData(e.target);
    return api('POST', `/api/v1/requests/${requestId}/decisions`, { decision: e.submitter.value, reason: f.reason });
  }, (r) => `Decision recorded. Request is now ${r.status}.`) },
    h('label', {}, 'Reason', h('span', { class: 'hint' }, 'Required to reject or return'), h('textarea', { name: 'reason' })),
    h('div', { class: 'row' },
      h('button', { type: 'submit', value: 'APPROVE' }, 'Approve'),
      h('button', { type: 'submit', value: 'RETURN', class: 'secondary' }, 'Return for revision'),
      h('button', { type: 'submit', value: 'REJECT', class: 'danger' }, 'Reject')));
}

async function viewApprovals() {
  const out = h('div');
  const rows = (has('request.view') || has('request.approve')) ? await api('GET', '/api/v1/requests') : [];
  const mine = rows.filter((r) => r.awaitingMe);
  const table = (list) => list.length === 0 ? h('div', { class: 'empty' }, 'Nothing here.') :
    h('div', { class: 'table-wrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Reference', 'Type', 'Subject', 'Policy', 'Status', 'Submitted', ''].map((c) => h('th', { scope: 'col' }, c)))),
      h('tbody', {}, list.map((r) => h('tr', {},
        h('td', { class: 'mono' }, r.reference), h('td', {}, r.requestType.replace('_', ' ')),
        h('td', {}, r.programmeId ? h('a', { href: `#/programmes/${r.programmeId}` }, `${r.programmeCode} ${r.programmeTitle}`) : `${r.payload.visitorName} · ${r.payload.organisation} · ${r.payload.visitDate}`, ' ', r.isSimulation && simChip()),
        h('td', {}, `${r.policy.title} v${r.policy.version}`), h('td', {}, chip(r.status)), h('td', {}, `${fmt(r.submittedAt)} by ${r.submittedBy}`),
        h('td', {}, r.awaitingMe && !r.programmeId && h('details', {}, h('summary', {}, 'Decide'), decisionForm(r.id, out))))))));
  return h('div', {},
    h('h1', {}, 'Approvals'), h('p', { class: 'sub' }, 'Each request is bound to the policy version in force at submission. Approval authority is checked server-side against the named approvers of that version.'),
    out,
    has('request.approve') && [h('h2', {}, `Awaiting my decision (${mine.length})`), table(mine)],
    has('centre_access.create') && h('details', { class: 'card' }, h('summary', {}, 'New Centre access request'),
      h('form', { class: 'stack', onsubmit: runner(out, (e) => { const f = formData(e.target);
        return api('POST', '/api/v1/centre-access-requests', { ...f, isSimulation: f.dataClass === 'SIMULATION' }); }, 'Centre access request submitted.') },
        h('label', {}, 'Visitor name', h('input', { name: 'visitorName', required: true })),
        h('label', {}, 'Organisation', h('input', { name: 'organisation', required: true })),
        h('label', {}, 'Purpose', h('input', { name: 'purpose', required: true })),
        h('label', {}, 'Visit date', h('input', { type: 'date', name: 'visitDate', required: true })),
        h('fieldset', {}, h('legend', {}, 'Data class'),
          h('label', { class: 'row' }, h('input', { type: 'radio', name: 'dataClass', value: 'SIMULATION', checked: true }), 'Simulation'),
          h('label', { class: 'row' }, h('input', { type: 'radio', name: 'dataClass', value: 'OPERATIONAL' }), 'Operational (blocked until routing is authorised)')),
        h('div', {}, h('button', { type: 'submit' }, 'Submit request')))),
    rows.length > 0 && [h('h2', {}, 'All requests in scope'), table(rows)]);
}

async function viewSrm() {
  const out = h('div');
  const rows = await api('GET', '/api/v1/facility-requests');
  const resources = await api('GET', '/api/v1/resources');
  const pending = rows.filter((r) => r.status === 'PENDING');
  const respondForm = (f) => h('form', { class: 'stack', onsubmit: runner(out, (e) => {
    const x = formData(e.target);
    return api('POST', `/api/v1/facility-requests/${f.id}/respond`, { action: e.submitter.value, note: x.note,
      altResourceId: x.altResourceId || undefined, altStartsAt: istToIso(x.altStartsAt) || undefined, altEndsAt: istToIso(x.altEndsAt) || undefined });
  }, 'Response recorded.') },
    h('label', {}, 'Note', h('span', { class: 'hint' }, 'Required to decline or propose an alternative'), h('textarea', { name: 'note' })),
    h('fieldset', {}, h('legend', {}, 'Alternative (optional)'),
      h('label', {}, 'Resource', h('select', { name: 'altResourceId' }, h('option', { value: '' }, 'Same resource'),
        resources.filter((r) => r.status === 'ACTIVE' && r.owner_institution_id === f.owner_institution_id).map((r) => h('option', { value: r.id }, `${r.code} (cap. ${r.capacity})`)))),
      h('div', { class: 'row' }, h('label', {}, 'Starts (IST)', h('input', { type: 'datetime-local', name: 'altStartsAt' })), h('label', {}, 'Ends (IST)', h('input', { type: 'datetime-local', name: 'altEndsAt' })))),
    h('div', { class: 'row' },
      h('button', { type: 'submit', value: 'CONFIRM' }, 'Confirm availability'),
      h('button', { type: 'submit', value: 'PROPOSE_ALTERNATIVE', class: 'secondary' }, 'Propose alternative'),
      h('button', { type: 'submit', value: 'DECLINE', class: 'danger' }, 'Decline')));
  const table = (list, respond) => list.length === 0 ? h('div', { class: 'empty' }, 'No facility requests.') :
    h('div', { class: 'table-wrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Programme', 'Session', 'Resource', 'When (IST)', 'Expected on-site', 'Status', respond ? 'Respond' : 'Response'].map((c) => h('th', { scope: 'col' }, c)))),
      h('tbody', {}, list.map((f) => h('tr', {},
        h('td', {}, h('a', { href: `#/programmes/${f.programme_id}` }, f.programme_code), ' ', f.is_simulation && simChip()), h('td', {}, f.session_title),
        h('td', {}, `${f.resource_code} (cap. ${f.capacity})`), h('td', {}, `${fmt(f.requested_starts_at)} – ${fmtTime(f.requested_ends_at)}`), h('td', {}, f.expected_onsite),
        h('td', {}, chip(f.status)),
        h('td', {}, respond && f.canRespond ? h('details', {}, h('summary', {}, 'Respond'), respondForm(f)) : (f.response_note || (f.status === 'PENDING' ? h('span', { class: 'muted' }, 'View only — no respond authority') : '—'))))))));
  return h('div', {},
    h('h1', {}, 'SRM Operations'),
    h('p', { class: 'sub' }, 'Confirm, decline or propose alternatives for facility requests on resources your institution owns. Confirmation records availability only; it is not training approval or a final booking.'),
    out,
    h('h2', {}, `Awaiting SRM response (${pending.length})`), table(pending, true),
    h('h2', {}, 'All facility requests in scope'), table(rows.filter((r) => r.status !== 'PENDING'), false),
    h('div', { class: 'alert info' }, 'Participant roster upload and attendance recording (confirmed SPOC responsibilities) arrive in slices 2–3.'));
}

async function viewCalendar() {
  const [resources, res] = await Promise.all([api('GET', '/api/v1/resources'), api('GET', '/api/v1/reservations')]);
  const byDay = {};
  for (const r of res) (byDay[new Intl.DateTimeFormat('en-IN', { timeZone: TZ, dateStyle: 'full' }).format(new Date(r.starts_at))] ??= []).push(r);
  return h('div', {},
    h('h1', {}, 'Calendar & Resources'), h('p', { class: 'sub' }, 'Next 60 days. Tentative holds do not block other programmes; confirmed reservations are enforced by the database. Times include any configured buffer.'),
    h('h2', {}, 'Reservations'),
    Object.keys(byDay).length === 0 ? h('div', { class: 'empty' }, 'No tentative or confirmed reservations in the next 60 days.') :
      Object.entries(byDay).map(([day, list]) => [h('h3', {}, day), h('div', { class: 'table-wrap' }, h('table', {},
        h('thead', {}, h('tr', {}, ['Time (IST)', 'Resource', 'Programme', 'Session', 'Units', 'Status'].map((c) => h('th', { scope: 'col' }, c)))),
        h('tbody', {}, list.map((r) => h('tr', {}, h('td', {}, `${fmtTime(r.starts_at)} – ${fmtTime(r.ends_at)}`), h('td', {}, r.resource_code),
          h('td', {}, r.programme_code, ' ', r.is_simulation && simChip()), h('td', {}, r.session_title), h('td', {}, r.units), h('td', {}, chip(r.status)))))))]),
    h('h2', {}, 'Resource inventory'), h('div', { class: 'alert notice' }, 'Inventory, capacities and readiness requirements are synthetic placeholders pending decision D-09.'),
    h('div', { class: 'table-wrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Code', 'Name', 'Kind', 'Capacity', 'Allocation', 'SRM confirmation', 'Status'].map((c) => h('th', { scope: 'col' }, c)))),
      h('tbody', {}, resources.map((r) => h('tr', {}, h('td', { class: 'mono' }, r.code), h('td', {}, r.name), h('td', {}, r.kind), h('td', {}, r.capacity),
        h('td', {}, r.allocation_mode), h('td', {}, r.requires_facility_confirmation ? 'Required' : 'Not required'), h('td', {}, chip(r.status))))))));
}

async function viewTrainers() {
  const out = h('div');
  const list = has('trainer.view') ? await api('GET', '/api/v1/trainers') : null;
  const mine = state.me.user.trainerId ? await api('GET', '/api/v1/my/assignments') : null;
  return h('div', {},
    h('h1', {}, 'Trainers'), out,
    mine && [h('h2', {}, 'My invitations and assignments'), mine.length === 0 ? h('div', { class: 'empty' }, 'No assignments.') :
      h('div', { class: 'table-wrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Programme', 'Session', 'When (IST)', 'Status', ''].map((c) => h('th', { scope: 'col' }, c)))),
        h('tbody', {}, mine.map((a) => h('tr', {}, h('td', {}, h('a', { href: `#/programmes/${a.programme_id ?? ''}` }, a.programme_code), ' ', a.programme_title, ' ', a.is_simulation && simChip()),
          h('td', {}, a.session_title), h('td', {}, `${fmt(a.starts_at)} – ${fmtTime(a.ends_at)}`), h('td', {}, chip(a.status)),
          h('td', {}, a.status === 'INVITED' && h('div', { class: 'row' },
            h('button', { onclick: runner(out, () => api('POST', `/api/v1/assignments/${a.id}/respond`, { action: 'ACCEPT' }), 'Accepted.') }, 'Accept'),
            h('button', { class: 'secondary', onclick: runner(out, () => api('POST', `/api/v1/assignments/${a.id}/respond`, { action: 'DECLINE', note: window.prompt('Optional note to the programme team:') || undefined }), 'Declined.') }, 'Decline')))))))) ],
    list && [h('h2', {}, 'Trainer directory'), h('div', { class: 'table-wrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Name', 'Organisation', 'Expertise', 'Upcoming confirmed sessions'].map((c) => h('th', { scope: 'col' }, c)))),
      h('tbody', {}, list.map((t) => h('tr', {}, h('td', {}, t.display_name), h('td', {}, t.organisation), h('td', {}, t.expertise.join(', ')), h('td', {}, t.upcoming_commitments))))))],
    h('div', { class: 'alert info' }, 'Briefs, reminders, withdrawal handling and appreciation messages arrive with the Communications slice; no messages are sent today.'));
}

async function viewAdmin() {
  const out = h('div');
  const pol = has('policy.view') ? await api('GET', '/api/v1/policies') : null;
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const audit = has('audit.view') ? await api('GET', `/api/v1/audit?${params}`) : null;
  return h('div', {},
    h('h1', {}, 'Administration & Audit'), out,
    pol && [h('h2', {}, 'Policy coverage'),
      h('div', { class: 'table-wrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Policy', 'Provenance', 'Active version', 'Decision', 'Decision owner'].map((c) => h('th', { scope: 'col' }, c)))),
        h('tbody', {}, pol.coverage.map((c) => h('tr', {}, h('td', { class: 'mono' }, c.policy_key), h('td', {}, c.provenance === 'SIMULATION' ? simChip() : 'AUTHORISED'),
          h('td', {}, c.active ? chip('ACTIVE') : chip('BLOCKED', 'NOT CONFIGURED — fails closed')), h('td', {}, c.decision.decision), h('td', {}, c.decision.owner)))))),
      h('h2', {}, 'Policy versions'),
      h('div', { class: 'table-wrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Policy', 'Version', 'Title', 'Status', 'Approvers / rules', 'Authorisation', ''].map((c) => h('th', { scope: 'col' }, c)))),
        h('tbody', {}, pol.policies.map((p) => h('tr', {}, h('td', { class: 'mono' }, p.policy_key, ' ', p.provenance === 'SIMULATION' && simChip()), h('td', {}, `v${p.version}`), h('td', {}, p.title),
          h('td', {}, chip(p.status)), h('td', { class: 'mono' }, p.approver_names ? p.approver_names.map((s, i) => `Step ${i + 1}: ${s.join(', ')}`).join(' | ') : JSON.stringify(p.definition)),
          h('td', {}, p.authorisation_reference || '—', p.activated_by_name && h('div', { class: 'muted' }, `Activated by ${p.activated_by_name}`)),
          h('td', {}, p.status === 'DRAFT' && (has('policy.activate_authorised') || has('policy.activate_simulation')) && h('button', { class: 'secondary', onclick: runner(out, () =>
            api('POST', `/api/v1/policies/${p.id}/activate`, { authorisationReference: p.provenance === 'AUTHORISED' ? (window.prompt('Authorisation reference (decision record ID):') || '') : undefined }), 'Policy activated.') }, 'Activate'))))))),
      has('policy.draft') && h('details', { class: 'card' }, h('summary', {}, 'Draft a policy version'),
        h('p', { class: 'muted' }, 'Drafting does not activate. AUTHORISED policies require activation by a Volvo approver (not the drafter) with a decision reference. Named approvers must hold the VOLVO_APPROVER role.'),
        h('form', { class: 'stack', onsubmit: runner(out, (e) => { const f = formData(e.target); let def;
          try { def = JSON.parse(f.definition); } catch { throw Object.assign(new Error('Definition is not valid JSON.'), { info: {} }); }
          return api('POST', '/api/v1/policies', { policyKey: f.policyKey, provenance: f.provenance, title: f.title, definition: def }); }, 'Draft saved.') },
          h('label', {}, 'Policy key', h('select', { name: 'policyKey' }, ['APPROVAL:TRAINING_REQUEST', 'APPROVAL:CENTRE_ACCESS', 'BOOKING'].map((k) => h('option', {}, k)))),
          h('label', {}, 'Provenance', h('select', { name: 'provenance' }, h('option', {}, 'SIMULATION'), h('option', {}, 'AUTHORISED'))),
          h('label', {}, 'Title', h('input', { name: 'title', required: true })),
          h('label', {}, 'Definition (JSON)', h('textarea', { name: 'definition', class: 'mono', rows: 8, required: true },
            '{"mode":"SEQUENTIAL","allow_self_approval":false,"steps":[{"name":"Step 1","approver_user_ids":["<user uuid>"],"required_approvals":1}]}')),
          h('div', {}, h('button', { type: 'submit' }, 'Save draft'))))],
    audit && [h('h2', {}, 'Audit search'),
      h('form', { class: 'inline', onsubmit: (e) => { e.preventDefault(); const f = new URLSearchParams(Object.entries(formData(e.target)).filter(([, v]) => v)); location.hash = `#/admin?${f}`; } },
        h('label', {}, 'Action', h('input', { name: 'action', value: params.get('action') })), h('label', {}, 'Actor', h('input', { name: 'actor', value: params.get('actor') })),
        h('label', {}, 'Outcome', h('select', { name: 'outcome' }, ['', 'SUCCESS', 'BLOCKED', 'DENIED', 'FAILED'].map((o) => h('option', { value: o, selected: params.get('outcome') === o }, o || 'Any')))),
        h('button', { type: 'submit' }, 'Search')),
      h('div', { class: 'table-wrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Time (IST)', 'Actor', 'Action', 'Entity', 'Outcome', 'Reason', 'Correlation'].map((c) => h('th', { scope: 'col' }, c)))),
        h('tbody', {}, audit.map((e) => h('tr', {}, h('td', {}, fmt(e.occurred_at)), h('td', {}, e.actor_label), h('td', { class: 'mono' }, e.action),
          h('td', { class: 'mono' }, `${e.entity_type}${e.entity_version ? ' v' + e.entity_version : ''}`), h('td', {}, chip(e.outcome)), h('td', {}, e.reason || ''), h('td', { class: 'mono' }, e.correlation_id.slice(0, 8)))))))]);
}

const PLANNED = {
  participants: ['Participant Registry', 'Slice 2', 'Students and teachers, CSV/XLSX import with validation preview, reviewed duplicate resolution (never name-only merges), eligibility, waitlists and substitutions.', 'D-03 approved-institution list; D-05 enrolment approval rules.'],
  attendance: ['Attendance & Evidence', 'Slice 3', 'Session-level attendance by the SRM SPOC, bulk upload, evidence references, reasoned corrections, assessments and feedback. Attendance is never inferred from enrolment.', 'D-10 evidence requirements and retention.'],
  certificates: ['Certificate Centre', 'Slice 4', 'Independent Participation and Completion rules, evidence-based eligibility, mandatory recorded approval by Ranjith T. P., unique identifiers, specimen mode, verification, supersession and revocation.', 'D-07 eligibility criteria, template and signatory approval.'],
  communications: ['Communications', 'Slice 5', 'Approved templates, outbox with idempotency keys, retries and dead-letter handling; provider acceptance is never reported as delivery.', 'D-08 email provider, sender identity and send authorisation.'],
  csr: ['CSR Reports', 'Slice 6', 'Unique participants, institutions served, delivered hours, participant-hours, attendance and completion — from verified records only, with documented denominators and deduplication.', 'Reporting definitions and targets are not set by this system.'],
};
function viewPlanned(key) {
  const [title, slice, what, blocked] = PLANNED[key];
  return h('div', {}, h('h1', {}, title), h('div', { class: 'alert info', role: 'note' }, h('strong', {}, `Not yet implemented — planned for ${slice}. `), 'No data in this module is simulated or estimated.'),
    h('div', { class: 'card' }, h('h2', { class: 'flush' }, 'Scope'), h('p', {}, what), h('h3', {}, 'Decisions that gate production behaviour'), h('p', {}, blocked)));
}

// ------------------------------------------------------------------ router
async function loadMe() {
  try { state.me = await api('GET', '/api/v1/me'); state.csrf = state.me.csrfToken; } catch { state.me = null; }
}

async function route() {
  const root = document.getElementById('root');
  if (!state.me) { root.replaceChildren(await viewLogin()); return; }
  const [path] = location.hash.replace(/^#/, '').split('?');
  const parts = path.split('/').filter(Boolean);
  let view;
  try {
    if (parts.length === 0) view = has('dashboard.view') ? await viewDashboard() : state.me.user.trainerId ? await viewTrainers() : h('div', { class: 'empty' }, 'No dashboard access for your role.');
    else if (parts[0] === 'programmes' && parts[1]) view = await viewProgramme(parts[1]);
    else if (parts[0] === 'programmes') view = await viewProgrammes();
    else if (parts[0] === 'approvals') view = await viewApprovals();
    else if (parts[0] === 'srm') view = await viewSrm();
    else if (parts[0] === 'calendar') view = await viewCalendar();
    else if (parts[0] === 'trainers') view = await viewTrainers();
    else if (parts[0] === 'admin') view = await viewAdmin();
    else if (PLANNED[parts[0]]) view = viewPlanned(parts[0]);
    else view = h('div', { class: 'empty' }, 'Page not found.');
  } catch (err) {
    view = h('div', {}, h('h1', {}, err.status === 403 ? 'Permission denied' : err.status === 404 ? 'Not found' : 'Something went wrong'), errorBox(err));
  }
  root.replaceChildren(shell(view));
  document.getElementById('main')?.focus({ preventScroll: true });
}
const render = route;

window.addEventListener('hashchange', route);
(async () => {
  state.meta = await api('GET', '/api/v1/meta');
  await loadMe();
  route();
})();
