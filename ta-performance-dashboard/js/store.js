/* Persistence and record maintenance.
   Storage: IndexedDB in this browser (primary) plus a localStorage copy when it fits.
   Nothing leaves the device unless the user downloads a backup or export. */
(function () {
  'use strict';
  const TA = window.TA;
  const DB_NAME = 'ta-performance-dashboard';
  const KV = 'kv';
  const STATE_KEY = 'state';
  const LS_KEY = 'ta-performance-dashboard.state';
  const SCHEMA_VERSION = 1;
  const HISTORY_CAP = 5000;
  const RECOVERY_CAP = 5;

  const nowIso = () => new Date().toISOString();
  const uid = (p) => (p || 'rec') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const clone = (o) => JSON.parse(JSON.stringify(o));

  /* ---------- IndexedDB helpers ---------- */
  let dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) { reject(new Error('IndexedDB unavailable')); return; }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(KV);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbp;
  }
  async function idbGet(key) {
    const d = await db();
    return new Promise((res, rej) => { const r = d.transaction(KV).objectStore(KV).get(key); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  }
  async function idbSet(key, val) {
    const d = await db();
    return new Promise((res, rej) => { const tx = d.transaction(KV, 'readwrite'); tx.objectStore(KV).put(val, key); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
  }

  function freshState() {
    const ts = nowIso();
    return {
      schemaVersion: SCHEMA_VERSION,
      meta: { owner: 'Dr. Ranjith TP', role: 'Head of Talent Acquisition, India', org: 'Volvo Group', currency: 'INR',
        createdAt: ts, updatedAt: ts, lastBackupAt: null, selectedPeriodId: 'per_biz_2026ytd', reportPrefs: null },
      data: TA.seed(ts),
      narratives: {},
      history: [{ id: uid('h'), ts, entity: '*', recordId: null, label: 'Seed data loaded', action: 'seed', changes: [] }],
      snapshots: [],
      recovery: []
    };
  }

  function normalise(st) {
    st.data = st.data || {};
    TA.ENTITY_ORDER.forEach(e => { if (!Array.isArray(st.data[e])) st.data[e] = []; });
    st.narratives = st.narratives || {};
    st.history = st.history || [];
    st.snapshots = st.snapshots || [];
    st.recovery = st.recovery || [];
    st.meta = Object.assign({ currency: 'INR' }, st.meta || {});
    return st;
  }

  const Store = {
    state: null,
    backend: 'IndexedDB',
    lastSavedAt: null,
    saveError: null,
    listeners: [],
    _timer: null,

    async load() {
      let st = null;
      try { st = await idbGet(STATE_KEY); } catch (e) { this.backend = 'localStorage'; }
      if (!st) {
        try { const raw = localStorage.getItem(LS_KEY); if (raw) st = JSON.parse(raw); } catch (e) { /* storage blocked */ }
      }
      if (!st) { st = freshState(); this.state = normalise(st); await this.flush(); return { seeded: true }; }
      this.state = normalise(st);
      return { seeded: false };
    },

    onChange(fn) { this.listeners.push(fn); },
    emit(info) { this.listeners.forEach(fn => { try { fn(info || {}); } catch (e) { console.error(e); } }); },

    touch() { this.state.meta.updatedAt = nowIso(); this.scheduleSave(); },
    scheduleSave() { clearTimeout(this._timer); this._timer = setTimeout(() => this.flush(), 150); },
    async flush() {
      clearTimeout(this._timer);
      const st = this.state;
      this.saveError = null;
      let ok = false;
      if (this.backend === 'IndexedDB') {
        try { await idbSet(STATE_KEY, st); ok = true; } catch (e) { this.backend = 'localStorage'; this.saveError = 'IndexedDB write failed: ' + e.message; }
      }
      try {
        // Light copy without recovery points, used if IndexedDB is unavailable.
        const light = Object.assign({}, st, { recovery: [] });
        localStorage.setItem(LS_KEY, JSON.stringify(light)); ok = true;
      } catch (e) {
        if (this.backend === 'localStorage') this.saveError = 'Browser storage full or blocked: ' + e.message + '. Download a backup now.';
      }
      if (ok) this.lastSavedAt = nowIso();
      this.emit({ saved: true });
      return ok;
    },

    /* ---------- Records ---------- */
    list(entity, opts) {
      const o = opts || {};
      return (this.state.data[entity] || []).filter(r => (o.deleted ? !!r.deletedAt : !r.deletedAt) && (o.archived || o.deleted ? true : !r.archived));
    },
    all(entity) { return this.state.data[entity] || []; },
    get(entity, id) { return (this.state.data[entity] || []).find(r => r.id === id) || null; },
    findAny(id) {
      for (const e of TA.ENTITY_ORDER) { const r = this.get(e, id); if (r) return { entity: e, record: r }; }
      return null;
    },

    log(entity, rec, action, changes) {
      this.state.history.unshift({ id: uid('h'), ts: nowIso(), entity, recordId: rec ? rec.id : null,
        label: rec ? TA.recordTitle(entity, rec) : '', action, changes: changes || [] });
      if (this.state.history.length > HISTORY_CAP) this.state.history.length = HISTORY_CAP;
    },

    add(entity, data, origin) {
      const ts = nowIso();
      const rec = Object.assign({ id: uid(entity.slice(0, 3)), createdAt: ts, updatedAt: ts, archived: false, deletedAt: null, evidence: [], origin: origin || 'User entry' }, data);
      if (entity === 'projects') { rec.deadlineRevisions = []; rec.statusHistory = rec.status ? [{ ts, from: null, to: rec.status, asOf: rec.statusAsOf || null, comment: rec.statusComment || null }] : []; }
      this.state.data[entity].push(rec);
      this.log(entity, rec, 'create', Object.keys(data).filter(k => data[k] !== null && data[k] !== '').map(k => ({ field: k, from: null, to: data[k] })));
      this.touch(); this.emit({ entity, id: rec.id });
      return rec;
    },

    update(entity, id, patch, opts) {
      const rec = this.get(entity, id);
      if (!rec) return null;
      const changes = [];
      Object.keys(patch).forEach(k => {
        const a = rec[k] === undefined ? null : rec[k];
        const b = patch[k] === undefined ? null : patch[k];
        if (JSON.stringify(a) !== JSON.stringify(b)) changes.push({ field: k, from: a, to: b });
      });
      if (!changes.length) return rec;
      // Preserve original project deadlines: changes to the revised deadline are kept as a revision trail.
      if (entity === 'projects') {
        rec.deadlineRevisions = rec.deadlineRevisions || [];
        const ch = changes.find(c => c.field === 'revisedDeadline');
        if (ch) rec.deadlineRevisions.push({ ts: nowIso(), from: ch.from, to: ch.to, reason: patch.revisionReason || rec.revisionReason || null });
        // Status changes (and new status comments) are kept as a dated status history.
        const sc = changes.find(c => c.field === 'status'), cc = changes.find(c => c.field === 'statusComment');
        if (sc || cc) {
          rec.statusHistory = rec.statusHistory || [];
          rec.statusHistory.push({ ts: nowIso(), from: sc ? sc.from : null, to: sc ? sc.to : (patch.status || rec.status), asOf: patch.statusAsOf !== undefined ? patch.statusAsOf : rec.statusAsOf || null, comment: cc ? cc.to : null });
        }
      }
      Object.assign(rec, patch, { updatedAt: nowIso() });
      if (!(opts && opts.silent)) this.log(entity, rec, (opts && opts.action) || 'update', changes);
      this.touch(); this.emit({ entity, id });
      return rec;
    },

    setArchived(entity, id, archived) { return this.update(entity, id, { archived: !!archived }, { action: archived ? 'archive' : 'unarchive' }); },
    softDelete(entity, id) { return this.update(entity, id, { deletedAt: nowIso() }, { action: 'delete' }); },
    restore(entity, id) { return this.update(entity, id, { deletedAt: null }, { action: 'restore' }); },
    purge(entity, id) {
      const arr = this.state.data[entity];
      const i = arr.findIndex(r => r.id === id);
      if (i < 0) return;
      const rec = arr[i];
      this.log(entity, rec, 'permanent delete', [{ field: '*', from: clone(rec), to: null }]);
      arr.splice(i, 1);
      this.touch(); this.emit({ entity, id });
    },

    addEvidence(entity, id, ev) {
      const rec = this.get(entity, id);
      const list = (rec.evidence || []).concat([Object.assign({ id: uid('ev'), addedAt: nowIso() }, ev)]);
      return this.update(entity, id, { evidence: list }, { action: 'add evidence' });
    },
    removeEvidence(entity, id, evId) {
      const rec = this.get(entity, id);
      return this.update(entity, id, { evidence: (rec.evidence || []).filter(e => e.id !== evId) }, { action: 'remove evidence' });
    },

    setNarrative(periodId, text) {
      const prev = this.state.narratives[periodId] ? this.state.narratives[periodId].text : null;
      if (prev === text) return;
      this.state.narratives[periodId] = { text, updatedAt: nowIso() };
      this.state.history.unshift({ id: uid('h'), ts: nowIso(), entity: 'narrative', recordId: periodId, label: 'Executive narrative', action: 'update',
        changes: [{ field: 'text', from: prev, to: text }] });
      this.touch(); this.emit({ entity: 'narrative' });
    },

    setMeta(patch) {
      Object.assign(this.state.meta, patch);
      this.touch(); this.emit({ entity: 'meta' });
    },

    /* ---------- Snapshots & recovery ---------- */
    takeSnapshot(label, periodId, summary) {
      const snap = { id: uid('snap'), ts: nowIso(), label, periodId, summary: summary || null, data: clone(this.state.data), narratives: clone(this.state.narratives) };
      this.state.snapshots.unshift(snap);
      this.state.history.unshift({ id: uid('h'), ts: snap.ts, entity: 'snapshot', recordId: snap.id, label, action: 'snapshot', changes: [] });
      this.touch(); this.emit({ entity: 'snapshot' });
      return snap;
    },
    deleteSnapshot(id) {
      this.state.snapshots = this.state.snapshots.filter(s => s.id !== id);
      this.touch(); this.emit({ entity: 'snapshot' });
    },
    recoveryPoint(reason) {
      this.state.recovery.unshift({ id: uid('rp'), ts: nowIso(), reason, data: clone(this.state.data), narratives: clone(this.state.narratives), meta: clone(this.state.meta) });
      if (this.state.recovery.length > RECOVERY_CAP) this.state.recovery.length = RECOVERY_CAP;
    },
    restoreRecovery(id) {
      const rp = this.state.recovery.find(r => r.id === id);
      if (!rp) return false;
      this.recoveryPoint('Before restoring recovery point of ' + rp.ts);
      this.state.data = normalise({ data: clone(rp.data) }).data;
      this.state.narratives = clone(rp.narratives || {});
      this.log('*', null, 'restore recovery point ' + rp.ts, []);
      this.touch(); this.emit({ entity: '*' });
      return true;
    },
    restoreSnapshot(id) {
      const s = this.state.snapshots.find(x => x.id === id);
      if (!s) return false;
      this.recoveryPoint('Before restoring snapshot "' + s.label + '"');
      this.state.data = normalise({ data: clone(s.data) }).data;
      this.state.narratives = clone(s.narratives || {});
      this.log('*', null, 'restore snapshot "' + s.label + '"', []);
      this.touch(); this.emit({ entity: '*' });
      return true;
    },

    /* ---------- Backup ---------- */
    backupObject() {
      return { app: 'TA Performance Dashboard', format: 'ta-dashboard-backup', schemaVersion: SCHEMA_VERSION, exportedAt: nowIso(),
        state: Object.assign({}, clone(this.state), { recovery: [] }) };
    },
    markBackup() { this.state.meta.lastBackupAt = nowIso(); this.touch(); this.emit({ entity: 'meta' }); },
    validateBackup(obj) {
      const errs = [];
      if (!obj || obj.format !== 'ta-dashboard-backup') errs.push('Not a dashboard backup file (format marker missing).');
      else if (!obj.state || !obj.state.data) errs.push('Backup has no data section.');
      else if (obj.schemaVersion > SCHEMA_VERSION) errs.push('Backup was made by a newer version of the dashboard.');
      return errs;
    },
    restoreBackup(obj) {
      this.recoveryPoint('Before restoring backup exported ' + (obj.exportedAt || 'unknown'));
      const keepRecovery = this.state.recovery;
      const st = normalise(clone(obj.state));
      st.recovery = keepRecovery;
      this.state = st;
      this.log('*', null, 'restore backup exported ' + (obj.exportedAt || 'unknown'), []);
      this.touch(); this.emit({ entity: '*' });
    },
    adopt(st, reason) {
      // Replaces the working state with a copy loaded from elsewhere (the account copy); a recovery point is kept first.
      this.recoveryPoint(reason);
      const keep = this.state.recovery;
      this.state = normalise(clone(st));
      this.state.recovery = keep;
      this.scheduleSave(); this.emit({ entity: '*' });
    },
    resetToSeed() {
      this.recoveryPoint('Before reset to seed data');
      const keep = this.state.recovery;
      this.state = freshState();
      this.state.recovery = keep;
      this.touch(); this.emit({ entity: '*' });
    }
  };

  /* ---------- Duplicate detection (never merges automatically) ---------- */
  function normName(s) {
    return String(s || '').toLowerCase().replace(/\b(dr|mr|mrs|ms|prof)\.?\s+/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function lev(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (!m || !n) return m || n;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }
  function similarNames(a, b) {
    const x = normName(a), y = normName(b);
    if (!x || !y) return false;
    if (x === y) return true;
    const fx = x.split(' ')[0], fy = y.split(' ')[0];
    if (fx.length > 2 && fx === fy) return true;
    return Math.max(x.length, y.length) >= 5 && lev(x, y) <= 2;
  }
  function findDuplicates(entity, data, excludeId) {
    const def = TA.ENTITIES[entity];
    if (!def.dupKeys) return [];
    const [nameKey, ...exact] = def.dupKeys;
    return Store.all(entity).filter(r => r.id !== excludeId && !r.deletedAt).filter(r => {
      if (exact.some(k => (r[k] || null) !== (data[k] || null))) return false;
      const a = r[nameKey], b = data[nameKey];
      if (TA.ENTITIES[entity].fields.find(f => f.k === nameKey && f.t === 'ref')) return a === b;
      return similarNames(a, b);
    });
  }

  Object.assign(TA, { Store, uid, nowIso, clone, findDuplicates, similarNames, SCHEMA_VERSION });
})();
