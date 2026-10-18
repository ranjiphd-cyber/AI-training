/* Private account copy, used only when the page runs as a claude.ai Artifact.
   The state is kept in the artifact's database under the viewer's own data/users/<id>/ subtree,
   which the platform keeps private to that signed-in person. Outside claude.ai this module stays idle
   and the dashboard uses browser storage only. */
(function () {
  'use strict';
  const TA = window.TA;
  const CHUNK = 60000;      // characters per part; keeps each document well under the 256 KiB limit
  const PUSH_DELAY = 2500;

  const Sync = {
    status: 'off',          // off | connecting | synced | pushing | error
    detail: 'Account copy is only available when the dashboard is opened as a claude.ai Artifact.',
    lastSyncedAt: null,
    _db: null, _uid: null, _timer: null, _busy: false, _again: false, _pushedSig: null,

    base() { return 'data/users/' + this._uid; },
    payload() {
      // Recovery points stay in this browser; everything else is copied.
      return JSON.stringify(Object.assign({}, TA.Store.state, { recovery: [] }));
    },

    async init(seededNow) {
      if (!window.claude || typeof window.claude.use !== 'function') return;
      this.set('connecting', 'Connecting to your private account copy…');
      let db = null, user = null;
      try { [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]); } catch (e) { /* treated as unavailable */ }
      const uid = user ? await user.id().catch(() => null) : null;
      if (!db || !uid) { this.set('off', 'Account copy unavailable in this view (signed out or not granted). Data is kept in this browser only.'); return; }
      this._db = db; this._uid = uid;
      try {
        const head = await db.doc(this.base() + '/ta_state').get();
        const remote = head.exists ? head.data() : null;
        const localTs = TA.Store.state.meta.updatedAt;
        if (remote && remote.parts > 0 && (seededNow || remote.updatedAt > localTs)) {
          const parts = await Promise.all(Array.from({ length: remote.parts }, (_, i) => db.doc(this.base() + '/ta_part_' + i).get()));
          if (parts.every(p => p.exists)) {
            const st = JSON.parse(parts.map(p => p.data().chunk).join(''));
            TA.Store.adopt(st, 'Before loading your account copy saved ' + TA.fmtDateTime(remote.updatedAt));
            this._pushedSig = remote.updatedAt;
            this.lastSyncedAt = new Date().toISOString();
            this.set('synced', 'Loaded your account copy (saved ' + TA.fmtDateTime(remote.updatedAt) + ').');
            TA.toast('Loaded your saved dashboard from your account copy');
            return;
          }
        }
        if (!remote || remote.updatedAt !== localTs) await this.push();
        else { this._pushedSig = localTs; this.lastSyncedAt = new Date().toISOString(); this.set('synced', 'Account copy is up to date.'); }
      } catch (e) {
        this.set('error', 'Account copy could not be read (' + (e && e.code || 'error') + '). Data is still saved in this browser.');
      }
    },

    schedule() {
      if (!this._db) return;
      clearTimeout(this._timer);
      this._timer = setTimeout(() => this.push(), PUSH_DELAY);
    },

    async push() {
      if (!this._db) return;
      if (this._busy) { this._again = true; return; }
      const sig = TA.Store.state.meta.updatedAt;
      if (sig === this._pushedSig) return;
      this._busy = true; this.set('pushing', 'Saving to your account copy…');
      try {
        const text = this.payload();
        const n = Math.max(1, Math.ceil(text.length / CHUNK));
        const head = await this._db.doc(this.base() + '/ta_state').get();
        const oldParts = head.exists ? (head.data().parts || 0) : 0;
        // Parts are written one at a time, then the header that points to them.
        for (let i = 0; i < n; i++) await this._db.doc(this.base() + '/ta_part_' + i).set({ chunk: text.slice(i * CHUNK, (i + 1) * CHUNK) });
        await this._db.doc(this.base() + '/ta_state').set({ updatedAt: sig, parts: n, schemaVersion: TA.SCHEMA_VERSION, savedAt: new Date().toISOString() });
        for (let i = n; i < oldParts; i++) await this._db.doc(this.base() + '/ta_part_' + i).delete();
        this._pushedSig = sig;
        this.lastSyncedAt = new Date().toISOString();
        this.set('synced', 'Account copy saved ' + TA.fmtDateTime(this.lastSyncedAt) + '.');
      } catch (e) {
        const code = e && e.code;
        this.set('error', code === 'quota_exceeded' ? 'Account copy is full (' + (e.message || 'quota exceeded') + '). Remove large evidence files or old snapshots; data is still saved in this browser.'
          : 'Account copy not saved (' + (code || 'error') + '). Data is still saved in this browser; it will retry on the next change.');
      } finally {
        this._busy = false;
        if (this._again) { this._again = false; this.schedule(); }
      }
    },

    set(status, detail) {
      this.status = status; this.detail = detail;
      const el = document.getElementById('sync-status');
      if (el) el.textContent = this.label();
    },
    label() {
      return { off: '', connecting: 'Account copy: connecting…', synced: 'Account copy: saved', pushing: 'Account copy: saving…', error: 'Account copy: not saved' }[this.status] || '';
    },
    active() { return !!this._db; }
  };

  TA.Sync = Sync;
})();
