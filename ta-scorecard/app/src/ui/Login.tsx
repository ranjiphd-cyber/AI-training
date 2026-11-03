import { useEffect, useState } from 'react';
import { AppData } from '../types';
import { emptyData } from '../engine/defaults';
import { deriveKey, eraseVault, newSalt, open, readVault, seal, VaultRecord, writeVault } from '../store/vault';

export interface Unlocked {
  data: AppData;
  email: string;
  key: CryptoKey;
  salt: Uint8Array;
}

const DEFAULT_EMAIL = 'ranjiphd@gmail.com';

export function Login({ onUnlock }: { onUnlock: (u: Unlocked) => void }) {
  const [vault, setVault] = useState<VaultRecord | null | undefined>(undefined);
  const [email, setEmail] = useState(DEFAULT_EMAIL);
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [org, setOrg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    readVault()
      .then((v) => {
        setVault(v);
        if (v) setEmail(v.email);
      })
      .catch(() => setErr('This browser blocks local storage for files. Open the app in Chrome or Edge.'));
  }, []);

  const signIn = async () => {
    setBusy(true);
    setErr('');
    try {
      if (vault!.email.toLowerCase() !== email.trim().toLowerCase()) throw new Error('Incorrect email or passphrase');
      const r = await open(vault!, pass);
      onUnlock({ data: r.data, email: vault!.email, key: r.key, salt: r.salt });
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };

  const create = async () => {
    setErr('');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr('Enter a valid email');
    if (pass.length < 10) return setErr('Passphrase must be at least 10 characters');
    if (pass !== pass2) return setErr('Passphrases do not match');
    setBusy(true);
    const salt = newSalt();
    const key = await deriveKey(email, pass, salt);
    const data = emptyData(new Date().getFullYear());
    if (org.trim()) data.orgName = org.trim();
    data.audit.push({ at: new Date().toISOString(), user: email, action: 'Workspace created', detail: 'Encrypted local workspace created' });
    await writeVault(await seal(data, email, key, salt));
    onUnlock({ data, email, key, salt });
  };

  const restore = async (f: File) => {
    setErr('');
    try {
      const rec = JSON.parse(await f.text()) as VaultRecord;
      if (rec.v !== 1 || !rec.ct) throw new Error('Not a TA Scorecard backup file');
      const p = prompt(`Passphrase for backup of ${rec.email}:`);
      if (!p) return;
      const r = await open(rec, p);
      if (vault && !confirm('Replace the workspace on this computer with this backup?')) return;
      await writeVault(rec);
      onUnlock({ data: r.data, email: rec.email, key: r.key, salt: r.salt });
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <div className="login">
      <div className="card">
        <div className="stripe">
          <i style={{ background: '#acc686' }} />
          <i style={{ background: '#ebdebd' }} />
          <i style={{ background: '#e89e4a' }} />
          <i style={{ background: '#9f653c' }} />
        </div>
        <h1>TA Performance Scorecard</h1>
        <p className="muted small" style={{ marginTop: 0 }}>
          Recruiter delivery, growth and reviews, year after year. Your data stays encrypted on this computer.
        </p>
        {vault === undefined && <p>Loading…</p>}
        {vault === null && (
          <>
            <h2>Create your workspace</h2>
            <div className="form" style={{ gridTemplateColumns: '1fr' }}>
              <label>
                Email
                <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
              </label>
              <label>
                Organisation name (optional)
                <input value={org} onChange={(e) => setOrg(e.target.value)} placeholder="Shown on reports" />
              </label>
              <label>
                Passphrase (min 10 characters)
                <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="new-password" />
              </label>
              <label>
                Repeat passphrase
                <input type="password" value={pass2} onChange={(e) => setPass2(e.target.value)} autoComplete="new-password" onKeyDown={(e) => e.key === 'Enter' && create()} />
              </label>
            </div>
            <div className="note small">The passphrase cannot be recovered. Keep it safe, and save encrypted backups from Settings.</div>
            <button className="b" onClick={create} disabled={busy}>
              {busy ? 'Creating…' : 'Create workspace'}
            </button>
          </>
        )}
        {vault && (
          <>
            <h2>Sign in</h2>
            <div className="form" style={{ gridTemplateColumns: '1fr' }}>
              <label>
                Email
                <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
              </label>
              <label>
                Passphrase
                <input type="password" value={pass} autoFocus onChange={(e) => setPass(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && signIn()} autoComplete="current-password" />
              </label>
            </div>
            <div style={{ marginTop: 10 }}>
              <button className="b" onClick={signIn} disabled={busy}>
                {busy ? 'Unlocking…' : 'Sign in'}
              </button>
            </div>
          </>
        )}
        {err && <div className="note">{err}</div>}
        <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '16px 0' }} />
        <div className="row small">
          <label className="b ghost" style={{ cursor: 'pointer' }}>
            Restore from backup file
            <input type="file" accept=".tasbackup,application/json" hidden onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} />
          </label>
          {vault && (
            <button
              className="link"
              onClick={async () => {
                if (confirm('Erase the encrypted workspace on this computer? This cannot be undone unless you have a backup file.') && prompt('Type ERASE to confirm') === 'ERASE') {
                  await eraseVault();
                  setVault(null);
                }
              }}
            >
              Forgot passphrase / erase
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
