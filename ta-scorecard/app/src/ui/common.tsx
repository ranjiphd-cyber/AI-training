import { ReactNode, useState } from 'react';
import { DeliveryResult, Recruiter, TraceLine } from '../types';
import { useApp, uid } from '../store/state';
import { displayName } from '../engine/compute';

export const fmt = (v: number | null | undefined, d = 1, suf = '') => (v === null || v === undefined ? '—' : `${Number(v.toFixed(d))}${suf}`);
export const pct = (frac: number | null | undefined) => (frac === null || frac === undefined ? '—' : `${(frac * 100).toFixed(1)}%`);

export function bandClass(b: string | null) {
  if (!b) return '';
  if (b === 'Exceptional' || b === 'High') return 'g';
  if (b === 'Good') return '';
  if (b === 'Adequate') return 'o';
  return 'r';
}
export function Band({ d }: { d: DeliveryResult }) {
  if (d.status === 'blocked') return <span className="pill b" title={d.missing.join('\n')}>Blocked</span>;
  return <span className={`pill ${bandClass(d.band)}`}>{d.band}</span>;
}
export function StatusNote({ d }: { d: DeliveryResult }) {
  if (d.status === 'blocked')
    return (
      <div className="note block">
        <b>No score — calculation blocked.</b> Missing: {d.missing.join('; ')}. Add these in Settings → Scoring rules or on the recruiter record.
      </div>
    );
  return (
    <>
      {d.status === 'incomplete' && (
        <div className="note">
          <b>100-point delivery score not produced.</b> Missing: {d.missing.join('; ')}. The attainment band is still valid.
        </div>
      )}
      {d.warnings.length > 0 && (
        <div className="note">
          <b>Data warnings:</b>
          <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
            {d.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
export function Trace({ t }: { t: TraceLine[] }) {
  return (
    <table className="trace">
      <thead>
        <tr>
          <th>Step</th>
          <th>How</th>
          <th className="n">Value</th>
        </tr>
      </thead>
      <tbody>
        {t.map((x, i) => (
          <tr key={i}>
            <td>{x.step}</td>
            <td>{x.detail}</td>
            <td className="n">{x.value ?? ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
export function Tile({ k, v, s, c = '' }: { k: string; v: ReactNode; s?: ReactNode; c?: string }) {
  return (
    <div className={`tile ${c}`}>
      <div className="k">{k}</div>
      <div className="v">{v}</div>
      {s && <div className="s">{s}</div>}
    </div>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
export function Page({ title, sub, children, actions }: { title: string; sub?: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1>{title}</h1>
          {sub && <div className="muted small">{sub}</div>}
        </div>
        {actions && <div className="row noprint">{actions}</div>}
      </div>
      <div style={{ marginTop: 12 }}>{children}</div>
    </div>
  );
}
export function useName() {
  const { showNames, data } = useApp();
  return (r: Recruiter | undefined) => (r ? displayName(r, showNames, data.recruiters) : '—');
}

// ---------- generic editable record table (manual entry with audit) ----------

export type Col<T> = {
  key: keyof T & string;
  label: string;
  type: 'text' | 'long' | 'date' | 'number' | 'bool' | 'select' | 'recruiter';
  options?: readonly string[];
  required?: boolean;
  min?: number;
  max?: number;
  width?: number;
};

export function RecordTable<T extends { id: string }>({
  rows,
  cols,
  blank,
  onSave,
  onDelete,
  title,
  readOnly,
  filter,
}: {
  rows: T[];
  cols: Col<T>[];
  blank: () => T;
  onSave: (row: T, isNew: boolean) => void;
  onDelete?: (row: T) => void;
  title: string;
  readOnly?: boolean;
  filter?: ReactNode;
}) {
  const { data } = useApp();
  const name = useName();
  const [edit, setEdit] = useState<T | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [err, setErr] = useState('');
  const show = (r: T, c: Col<T>) => {
    const v = r[c.key] as unknown;
    if (c.type === 'recruiter') return name(data.recruiters.find((x) => x.id === v));
    if (c.type === 'bool') return v ? 'Yes' : 'No';
    if (v === null || v === undefined || v === '') return <span className="muted">—</span>;
    return String(v);
  };
  const save = () => {
    if (!edit) return;
    for (const c of cols) {
      const v = edit[c.key] as unknown;
      if (c.required && (v === null || v === undefined || v === '')) return setErr(`${c.label} is required`);
      if (c.type === 'number' && v !== null && v !== undefined && v !== '') {
        if (c.min !== undefined && (v as number) < c.min) return setErr(`${c.label} must be ≥ ${c.min}`);
        if (c.max !== undefined && (v as number) > c.max) return setErr(`${c.label} must be ≤ ${c.max}`);
      }
    }
    onSave(edit, isNew);
    setEdit(null);
    setErr('');
  };
  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>
          {title} <span className="muted small">({rows.length})</span>
        </h2>
        <div className="row">
          {filter}
          {!readOnly && (
            <button
              className="b"
              onClick={() => {
                setEdit(blank());
                setIsNew(true);
              }}
            >
              + Add
            </button>
          )}
        </div>
      </div>
      {edit && (
        <div className="card" style={{ background: 'var(--cream-l)', marginTop: 10 }}>
          <div className="form">
            {cols.map((c) => (
              <label key={c.key} style={c.type === 'long' ? { gridColumn: '1 / -1' } : undefined}>
                {c.label}
                {c.required ? ' *' : ''}
                <Field col={c} value={edit[c.key] as unknown} onChange={(v) => setEdit({ ...edit, [c.key]: v })} />
              </label>
            ))}
          </div>
          {err && <div className="note">{err}</div>}
          <div className="row" style={{ marginTop: 10 }}>
            <button className="b" onClick={save}>
              Save
            </button>
            <button className="b ghost" onClick={() => (setEdit(null), setErr(''))}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {rows.length === 0 ? (
        <Empty>No records yet. {readOnly ? '' : 'Use + Add or Data Imports.'}</Empty>
      ) : (
        <div className="tw" style={{ marginTop: 10, maxHeight: 520 }}>
          <table>
            <thead>
              <tr>
                {cols.map((c) => (
                  <th key={c.key} className={c.type === 'number' ? 'n' : ''}>
                    {c.label}
                  </th>
                ))}
                {!readOnly && <th />}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  {cols.map((c) => (
                    <td key={c.key} className={c.type === 'number' ? 'n' : ''} style={c.type === 'long' ? { maxWidth: 320 } : undefined}>
                      {show(r, c)}
                    </td>
                  ))}
                  {!readOnly && (
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="link" onClick={() => (setEdit(structuredClone(r)), setIsNew(false))}>
                        Edit
                      </button>
                      {onDelete && (
                        <>
                          {' · '}
                          <button className="link" onClick={() => confirm('Delete this record? This is recorded in the audit log.') && onDelete(r)}>
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function Field<T>({ col, value, onChange }: { col: Col<T>; value: unknown; onChange: (v: unknown) => void }) {
  const { data } = useApp();
  const name = useName();
  switch (col.type) {
    case 'long':
      return <textarea value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />;
    case 'date':
      return <input type="date" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value || null)} />;
    case 'number':
      return (
        <input
          type="number"
          step="any"
          min={col.min}
          max={col.max}
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        />
      );
    case 'bool':
      return <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />;
    case 'select':
      return (
        <select value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)}>
          {col.options!.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      );
    case 'recruiter':
      return (
        <select value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">— select —</option>
          {data.recruiters.map((r) => (
            <option key={r.id} value={r.id}>
              {name(r)}
            </option>
          ))}
        </select>
      );
    default:
      return <input value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />;
  }
}

/** Standard save/delete handlers that write the audit log. */
export function useCollection<K extends keyof import('../types').AppData>(key: K, label: string) {
  const { update, yearClosed } = useApp();
  type T = import('../types').AppData[K] extends (infer U)[] ? U : never;
  return {
    readOnly: yearClosed,
    onSave: (row: T, isNew: boolean) =>
      update(isNew ? `${label} added` : `${label} edited`, (row as { id: string }).id, (d) => {
        const arr = d[key] as unknown as T[];
        if (isNew) arr.push({ ...(row as object), id: (row as { id: string }).id || uid(label.slice(0, 3).toUpperCase()) } as T);
        else {
          const i = arr.findIndex((x) => (x as { id: string }).id === (row as { id: string }).id);
          if (i >= 0) arr[i] = row;
        }
      }),
    onDelete: (row: T) =>
      update(`${label} deleted`, (row as { id: string }).id, (d) => {
        (d[key] as unknown as T[]).splice(
          (d[key] as unknown as T[]).findIndex((x) => (x as { id: string }).id === (row as { id: string }).id),
          1,
        );
      }),
  };
}
