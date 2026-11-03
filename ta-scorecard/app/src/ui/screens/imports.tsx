import { useState } from 'react';
import * as XLSX from 'xlsx';
import { useApp, uid } from '../../store/state';
import { autoMap, dupKey, FIELDS, Kind, Staged, validateRow } from '../../import/parse';
import { ImportBatch, Offer, Recruiter, Requisition } from '../../types';
import { Empty, Page } from '../common';

const KINDS: [Kind, string][] = [
  ['recruiters', 'Team members (employee master)'],
  ['offers', 'Offers (hiring tracker, one row per offer)'],
  ['requisitions', 'Open requisitions'],
];

export function Imports() {
  const { data, update, yearClosed } = useApp();
  const [kind, setKind] = useState<Kind>('offers');
  const [wb, setWb] = useState<XLSX.WorkBook | null>(null);
  const [file, setFile] = useState('');
  const [sheet, setSheet] = useState('');
  const [headerRow, setHeaderRow] = useState(1);
  const [map, setMap] = useState<Record<string, string>>({});
  const [staged, setStaged] = useState<Staged[] | null>(null);
  const [includeDup, setIncludeDup] = useState(false);
  const [err, setErr] = useState('');

  const rowsOf = (w = wb, s = sheet, hr = headerRow) => {
    if (!w || !s) return { headers: [] as string[], rows: [] as Record<string, unknown>[] };
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(w.Sheets[s], { header: 1, raw: true, defval: null });
    const headers = (aoa[hr - 1] ?? []).map((h) => String(h ?? '').trim());
    const rows = aoa.slice(hr).map((r) => Object.fromEntries(headers.map((h, i) => [h, (r as unknown[])[i]])));
    return { headers, rows };
  };

  const load = async (f: File) => {
    setErr('');
    setStaged(null);
    try {
      const w = XLSX.read(await f.arrayBuffer(), { cellDates: false });
      setWb(w);
      setFile(f.name);
      const s = w.SheetNames[0];
      setSheet(s);
      setMap(autoMap(kind, rowsOf(w, s, headerRow).headers));
    } catch {
      setErr('Could not read this file. Use .xlsx, .xls or .csv.');
    }
  };
  const { headers, rows } = rowsOf();

  const validate = () => {
    const missing = FIELDS[kind].filter((f) => f.required && !map[f.key]);
    if (missing.length) return setErr(`Map the required columns: ${missing.map((m) => m.label).join(', ')}`);
    setErr('');
    const existing = new Set(
      (kind === 'offers' ? data.offers : kind === 'requisitions' ? data.requisitions : data.recruiters).map((x) => dupKey(kind, x as unknown as Record<string, unknown>)),
    );
    const seen = new Set<string>();
    const out: Staged[] = [];
    rows.forEach((raw, i) => {
      const vals: Record<string, unknown> = {};
      for (const f of FIELDS[kind]) if (map[f.key]) vals[f.key] = raw[map[f.key]];
      if (Object.values(vals).every((v) => v === null || v === undefined || String(v).trim() === '')) return; // blank row
      const s = validateRow(kind, vals, i + headerRow + 1, data.recruiters);
      if (s.record) {
        const k = dupKey(kind, s.record);
        if (existing.has(k) || seen.has(k)) {
          s.duplicate = true;
          s.warnings.push(existing.has(k) ? 'Already in the app (same key) — possible repeated import' : 'Repeated within this file');
        }
        seen.add(k);
      }
      out.push(s);
    });
    setStaged(out);
  };

  const commit = () => {
    if (!staged) return;
    const ok = staged.filter((s) => s.record && (includeDup || !s.duplicate));
    const batch: ImportBatch = {
      id: uid('B'),
      kind,
      fileName: `${file} · ${sheet}`,
      at: new Date().toISOString(),
      rowsRead: staged.length,
      rowsCommitted: ok.length,
      rowsRejected: staged.length - ok.length,
      status: 'committed',
    };
    if (!confirm(`Commit ${ok.length} row(s) from ${file}? ${batch.rowsRejected} row(s) will not be imported.`)) return;
    update('Import committed', `${batch.id} ${kind}: ${ok.length} of ${staged.length} rows from ${file}`, (d) => {
      d.imports.unshift(batch);
      for (const s of ok) {
        const id = uid(kind === 'offers' ? 'O' : kind === 'requisitions' ? 'Q' : 'R');
        if (kind === 'offers') d.offers.push({ ...(s.record as Omit<Offer, 'id' | 'batchId'>), id, batchId: batch.id } as Offer);
        else if (kind === 'requisitions') d.requisitions.push({ ...(s.record as Omit<Requisition, 'id' | 'batchId'>), id, batchId: batch.id } as Requisition);
        else d.recruiters.push({ ...(s.record as Omit<Recruiter, 'id'>), id } as Recruiter);
      }
    });
    setStaged(null);
    setWb(null);
  };

  const undo = (b: ImportBatch) => {
    if (b.kind === 'recruiters') return alert('Team imports cannot be undone automatically because offers may reference these people. Edit or remove people in Recruiter Profiles.');
    const ids = new Set((b.kind === 'offers' ? data.offers : data.requisitions).filter((x) => x.batchId === b.id).map((x) => x.id));
    const used = data.reviews.filter((v) => v.status === 'approved' && v.snapshot.inputs.offers.some((o) => ids.has(o.id)));
    if (used.length)
      return alert(`Cannot undo: ${used.length} approved review(s) used records from this batch. The approved reviews keep their frozen snapshot; correct individual records instead.`);
    const drafts = data.reviews.filter((v) => v.status === 'draft' && v.snapshot.inputs.offers.some((o) => ids.has(o.id))).length;
    if (!confirm(`Undo batch ${b.id}? ${ids.size} record(s) will be removed.${drafts ? ` ${drafts} draft review(s) used them; their frozen snapshots are kept.` : ''}`)) return;
    update('Import undone', `${b.id}: ${ids.size} record(s) removed`, (d) => {
      if (b.kind === 'offers') d.offers = d.offers.filter((o) => o.batchId !== b.id);
      else d.requisitions = d.requisitions.filter((q) => q.batchId !== b.id);
      d.imports.find((x) => x.id === b.id)!.status = 'undone';
    });
  };

  const errs = staged?.filter((s) => s.errors.length).length ?? 0;
  const dups = staged?.filter((s) => s.duplicate).length ?? 0;
  const good = staged?.filter((s) => s.record && !s.duplicate).length ?? 0;
  return (
    <Page title="Data Imports" sub="Upload → map → validate → preview → match names → check duplicates → reconcile → approve → commit. Files are read on this computer only.">
      {yearClosed && <div className="note block">The selected year is closed; imports are still possible for other years.</div>}
      <div className="card">
        <div className="form">
          <label>
            What are you importing?
            <select value={kind} onChange={(e) => (setKind(e.target.value as Kind), setStaged(null), setMap(autoMap(e.target.value as Kind, headers)))}>
              {KINDS.map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label>
            File (.xlsx, .csv)
            <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => e.target.files?.[0] && load(e.target.files[0])} />
          </label>
          {wb && (
            <>
              <label>
                Sheet
                <select value={sheet} onChange={(e) => (setSheet(e.target.value), setMap(autoMap(kind, rowsOf(wb, e.target.value, headerRow).headers)), setStaged(null))}>
                  {wb.SheetNames.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Header row
                <input type="number" min={1} value={headerRow} onChange={(e) => (setHeaderRow(Math.max(1, Number(e.target.value))), setStaged(null))} />
              </label>
            </>
          )}
        </div>
        {err && <div className="note">{err}</div>}
      </div>
      {wb && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Map columns ({rows.length} data rows found)</h2>
          <div className="form">
            {FIELDS[kind].map((f) => (
              <label key={f.key}>
                {f.label}
                {f.required ? ' *' : ''}
                <select value={map[f.key] ?? ''} onChange={(e) => setMap({ ...map, [f.key]: e.target.value })}>
                  <option value="">— not in file —</option>
                  {headers.filter(Boolean).map((h) => (
                    <option key={h}>{h}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <button className="b" style={{ marginTop: 10 }} onClick={validate}>
            Validate and preview
          </button>
        </div>
      )}
      {staged && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Reconciliation</h2>
          <div className="tiles">
            <div className="tile">
              <div className="k">Rows read</div>
              <div className="v">{staged.length}</div>
            </div>
            <div className="tile">
              <div className="k">Ready</div>
              <div className="v">{good}</div>
            </div>
            <div className="tile o">
              <div className="k">Possible duplicates</div>
              <div className="v">{dups}</div>
            </div>
            <div className="tile b">
              <div className="k">Rejected (errors)</div>
              <div className="v">{errs}</div>
            </div>
          </div>
          <label className="f">
            <input type="checkbox" checked={includeDup} onChange={(e) => setIncludeDup(e.target.checked)} /> Import possible duplicates as well
          </label>
          <div className="tw" style={{ maxHeight: 380, marginTop: 8 }}>
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Result</th>
                  {FIELDS[kind].filter((f) => map[f.key]).map((f) => (
                    <th key={f.key}>{f.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staged.map((s) => (
                  <tr key={s.row}>
                    <td>{s.row}</td>
                    <td className="small">
                      {s.errors.length ? <span className="pill r">error</span> : s.duplicate ? <span className="pill o">duplicate?</span> : <span className="pill g">ok</span>}
                      <div>{[...s.errors, ...s.warnings].join('; ')}</div>
                    </td>
                    {FIELDS[kind].filter((f) => map[f.key]).map((f) => (
                      <td key={f.key}>{String(s.values[f.key] ?? '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="b" onClick={commit} disabled={!staged.some((s) => s.record && (includeDup || !s.duplicate))}>
              Approve and commit
            </button>
            <span className="small muted">Rows with errors are never imported and values are never guessed. Fix the file and re-import.</span>
          </div>
        </div>
      )}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Import history</h2>
        {data.imports.length === 0 ? (
          <Empty>No imports yet.</Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Batch</th>
                <th>Type</th>
                <th>File</th>
                <th className="n">Read</th>
                <th className="n">Committed</th>
                <th className="n">Rejected</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.imports.map((b) => (
                <tr key={b.id}>
                  <td>{b.at.slice(0, 16).replace('T', ' ')}</td>
                  <td className="small">{b.id}</td>
                  <td>{b.kind}</td>
                  <td>{b.fileName}</td>
                  <td className="n">{b.rowsRead}</td>
                  <td className="n">{b.rowsCommitted}</td>
                  <td className="n">{b.rowsRejected}</td>
                  <td>{b.status}</td>
                  <td>{b.status === 'committed' && <button className="link" onClick={() => undo(b)}>Undo</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="card small">
        <b>Templates.</b> Any column names work — you map them above. Recognised hiring streams: Lateral, FTC, Conversion to employment, Campus intern conversion, Internal (IJP), NATS, GET / PGET, ExcelHER, AICTE / PhD, Intern. Statuses: Offered,
        Joined, Declined, Offer revoked. Grades accept SG or JL (SG = JL + 2). Source containing "vendor" marks a vendor hire; gender "Female" marks a woman hire.
      </div>
    </Page>
  );
}
