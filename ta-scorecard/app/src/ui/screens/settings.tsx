import { useState } from 'react';
import { useApp, todayISO } from '../../store/state';
import { seal } from '../../store/vault';
import { defaultRuleVersion } from '../../engine/defaults';
import { missingDeliveryRules, missingScoreRules, matrixMissing } from '../../engine/scoring';
import { GROWTH_KEYS, GROWTH_LABELS, RuleVersion, ThresholdBand } from '../../types';
import { Empty, Page } from '../common';

export function Settings() {
  const [tab, setTab] = useState('rules');
  return (
    <Page title="Settings & Audit Log">
      <div className="tabs" role="tablist">
        {[
          ['rules', 'Scoring rules'],
          ['years', 'Years'],
          ['general', 'General & retention'],
          ['backup', 'Backup'],
          ['audit', 'Audit log'],
        ].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>
      {tab === 'rules' && <Rules />}
      {tab === 'years' && <Years />}
      {tab === 'general' && <General />}
      {tab === 'backup' && <Backup />}
      {tab === 'audit' && <Audit />}
    </Page>
  );
}

const num = (v: string) => (v === '' ? null : Number(v));

function Rules() {
  const { data, year, update, yearClosed } = useApp();
  const versions = data.ruleVersions.filter((r) => r.year === year).sort((a, b) => b.version - a.version);
  const [sel, setSel] = useState(versions[0]?.id);
  const cur = versions.find((v) => v.id === sel) ?? versions[0];
  const [draft, setDraft] = useState<RuleVersion | null>(null);
  if (!cur) return <Empty>No rule version for {year}. Open the year in the Years tab.</Empty>;
  const r = draft && draft.id === cur.id ? draft : cur;
  const editable = r.status === 'draft' && !yearClosed;
  const set = (fn: (x: RuleVersion) => void) => {
    const x = structuredClone(r);
    fn(x);
    setDraft(x);
  };
  const usedByApproved = data.reviews.some((v) => v.ruleVersionId === r.id && v.status === 'approved');
  const missing = [...missingDeliveryRules(r), ...missingScoreRules(r), ...GROWTH_KEYS.filter((k) => r.growthWeights[k] === null).map((k) => `Growth weight: ${GROWTH_LABELS[k]}`), ...matrixMissing(r)];
  const save = () => {
    if (!draft) return;
    update('Rule version edited', `${year} v${r.version}`, (d) => {
      const i = d.ruleVersions.findIndex((x) => x.id === draft.id);
      d.ruleVersions[i] = draft;
    });
    setDraft(null);
  };
  const Bands = ({ label, bands, k, unit }: { label: string; bands: ThresholdBand[]; k: 'cycleTime' | 'vendor'; unit: string }) => (
    <div>
      <h3>{label}</h3>
      <table>
        <thead>
          <tr>
            <th>Up to and including ({unit})</th>
            <th>Points</th>
          </tr>
        </thead>
        <tbody>
          {bands.map((b, i) => (
            <tr key={i}>
              <td>
                {b.upTo === null ? (
                  <span className="muted">above (open-ended)</span>
                ) : (
                  <input type="number" step="any" value={b.upTo} disabled={!editable} onChange={(e) => set((x) => (x[k].bands[i].upTo = Number(e.target.value)))} />
                )}
              </td>
              <td>
                <input type="number" step="any" value={b.points ?? ''} placeholder="to decide" disabled={!editable} onChange={(e) => set((x) => (x[k].bands[i].points = num(e.target.value)))} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  return (
    <>
      <div className="card">
        <div className="row">
          <label className="f">
            Version
            <select value={cur.id} onChange={(e) => (setSel(e.target.value), setDraft(null))}>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.version} — {v.status}
                </option>
              ))}
            </select>
          </label>
          {r.status === 'approved' ? <span className="pill g">approved {r.approvedAt?.slice(0, 10)} · frozen</span> : <span className="pill o">draft — editable</span>}
          {usedByApproved && <span className="pill">used by approved reviews</span>}
          <span className="sp" style={{ flex: 1 }} />
          {editable && draft && (
            <button className="b" onClick={save}>
              Save changes
            </button>
          )}
          {editable && !draft && (
            <button
              className="b"
              onClick={() =>
                confirm('Approve this rule version? It becomes read-only; later changes need a new version.') &&
                update('Rule version approved', `${year} v${r.version}`, (d) => {
                  const x = d.ruleVersions.find((q) => q.id === r.id)!;
                  x.status = 'approved';
                  x.approvedAt = new Date().toISOString();
                })
              }
            >
              Approve version
            </button>
          )}
          {!yearClosed && (
            <button
              className="b ghost"
              onClick={() =>
                update('Rule version created', `${year} v${versions[0].version + 1} copied from v${r.version}`, (d) => {
                  d.ruleVersions.push({ ...structuredClone(r), id: `RV-${year}-${versions[0].version + 1}`, version: versions[0].version + 1, status: 'draft', approvedAt: null, note: `Copied from v${r.version} on ${todayISO()}` });
                })
              }
            >
              New version from this
            </button>
          )}
        </div>
        <p className="small muted">{r.note}</p>
        {missing.length > 0 ? (
          <div className="note block">
            <b>Still to decide ({missing.length}):</b> {missing.join(' · ')}
          </div>
        ) : (
          <div className="note ok">All rule values are set.</div>
        )}
      </div>
      <div className="grid2">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Points per offer</h2>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Points</th>
                <th>Women bonus</th>
              </tr>
            </thead>
            <tbody>
              {r.categories.map((c, i) => (
                <tr key={c.code}>
                  <td>{c.code}</td>
                  <td>
                    <input type="number" step="any" style={{ width: 80 }} value={c.points ?? ''} disabled={!editable} onChange={(e) => set((x) => (x.categories[i].points = num(e.target.value)))} />
                  </td>
                  <td>
                    <input type="checkbox" checked={c.womenBonus} disabled={!editable} onChange={(e) => set((x) => (x.categories[i].womenBonus = e.target.checked))} />
                  </td>
                </tr>
              ))}
              <tr>
                <td>FTC (grade missing)</td>
                <td>
                  <input type="number" step="any" style={{ width: 80 }} value={r.ftcNoGradePoints ?? ''} disabled={!editable} onChange={(e) => set((x) => (x.ftcNoGradePoints = num(e.target.value)))} />
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Bonuses, target and bands</h2>
          <div className="form">
            <label>
              Women bonus (points)
              <input type="number" step="any" value={r.womenBonus ?? ''} disabled={!editable} onChange={(e) => set((x) => (x.womenBonus = num(e.target.value)))} />
            </label>
            <label>
              Decline adjustment (points)
              <input type="number" step="any" value={r.declineAdjustment ?? ''} disabled={!editable} onChange={(e) => set((x) => (x.declineAdjustment = num(e.target.value)))} />
            </label>
            <label>
              Working days in year
              <input type="number" value={r.workingDaysInYear ?? ''} disabled={!editable} onChange={(e) => set((x) => (x.workingDaysInYear = num(e.target.value)))} />
            </label>
            <label>
              Rounding (decimals)
              <input type="number" min={0} max={4} value={r.roundingDecimals ?? ''} disabled={!editable} onChange={(e) => set((x) => (x.roundingDecimals = num(e.target.value)))} />
            </label>
            <label>
              <span>
                <input type="checkbox" checked={r.leadTeamAverage} disabled={!editable} onChange={(e) => set((x) => (x.leadTeamAverage = e.target.checked))} /> Leads: average of own + team
              </span>
            </label>
            <label>
              <span>
                <input type="checkbox" checked={r.includeExtraPoints} disabled={!editable} onChange={(e) => set((x) => (x.includeExtraPoints = e.target.checked))} /> Count approved extra points
              </span>
            </label>
          </div>
          <h3>Rating bands (attainment %)</h3>
          <table>
            <tbody>
              {r.ratingBands.map((b, i) => (
                <tr key={i}>
                  <td>
                    <input value={b.label} disabled={!editable} onChange={(e) => set((x) => (x.ratingBands[i].label = e.target.value))} />
                  </td>
                  <td>
                    ≥ <input type="number" step="any" style={{ width: 80 }} value={b.minPct ?? ''} disabled={!editable} onChange={(e) => set((x) => (x.ratingBands[i].minPct = num(e.target.value)))} /> %
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3>Holidays (excluded from working days)</h3>
          <textarea
            placeholder="One date per line, YYYY-MM-DD"
            value={r.holidays.join('\n')}
            disabled={!editable}
            onChange={(e) =>
              set(
                (x) =>
                  (x.holidays = e.target.value
                    .split(/\s+/)
                    .map((s) => s.trim())
                    .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s))),
              )
            }
          />
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>100-point delivery score (80 / 15 / 5)</h2>
          <label className="f">
            <input type="checkbox" checked={r.offersFormula === 'capped-attainment'} disabled={!editable} onChange={(e) => set((x) => (x.offersFormula = e.target.checked ? 'capped-attainment' : null))} />
            Confirm: Offers &amp; complexity = {r.maxima.offers} × min(attainment, 100%)
          </label>
          <Bands label={`Cycle time (max ${r.maxima.cycle})`} bands={r.cycleTime.bands} k="cycleTime" unit="avg calendar days" />
          <Bands label={`Vendor usage (max ${r.maxima.vendor})`} bands={r.vendor.bands} k="vendor" unit="% of joiners" />
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Growth weights and matrix</h2>
          <div className="form">
            {GROWTH_KEYS.map((k) => (
              <label key={k}>
                {GROWTH_LABELS[k]} weight
                <input type="number" step="any" min={0} value={r.growthWeights[k] ?? ''} placeholder="to decide" disabled={!editable} onChange={(e) => set((x) => (x.growthWeights[k] = num(e.target.value)))} />
              </label>
            ))}
          </div>
          <h3>3 × 3 matrix thresholds</h3>
          <div className="form">
            <label>
              Delivery: Medium from (%)
              <input type="number" step="any" value={r.matrix.deliveryLow ?? ''} disabled={!editable} onChange={(e) => set((x) => (x.matrix.deliveryLow = num(e.target.value)))} />
            </label>
            <label>
              Delivery: High from (%)
              <input type="number" step="any" value={r.matrix.deliveryHigh ?? ''} disabled={!editable} onChange={(e) => set((x) => (x.matrix.deliveryHigh = num(e.target.value)))} />
            </label>
            <label>
              Growth: Medium from (1–10)
              <input type="number" step="any" value={r.matrix.growthLow ?? ''} disabled={!editable} onChange={(e) => set((x) => (x.matrix.growthLow = num(e.target.value)))} />
            </label>
            <label>
              Growth: High from (1–10)
              <input type="number" step="any" value={r.matrix.growthHigh ?? ''} disabled={!editable} onChange={(e) => set((x) => (x.matrix.growthHigh = num(e.target.value)))} />
            </label>
          </div>
          <h3>Cell labels (optional)</h3>
          <div className="form">
            {[2, 1, 0].flatMap((g) =>
              [0, 1, 2].map((dl) => (
                <label key={`${g}${dl}`}>
                  {['Low', 'Med', 'High'][g]} growth · {['Low', 'Med', 'High'][dl]} delivery
                  <input value={r.matrix.labels[g * 3 + dl]} disabled={!editable} onChange={(e) => set((x) => (x.matrix.labels[g * 3 + dl] = e.target.value))} />
                </label>
              )),
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Years() {
  const { data, update } = useApp();
  const years = [...data.years].sort((a, b) => a.year - b.year);
  const next = years[years.length - 1].year + 1;
  return (
    <div className="card">
      <table>
        <thead>
          <tr>
            <th>Year</th>
            <th>Status</th>
            <th>Rule versions</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {years.map((y) => (
            <tr key={y.year}>
              <td>{y.year}</td>
              <td>{y.status === 'closed' ? `closed ${y.closedAt?.slice(0, 10)}` : 'open'}</td>
              <td>{data.ruleVersions.filter((r) => r.year === y.year).map((r) => `v${r.version} ${r.status}`).join(', ')}</td>
              <td>
                {y.status === 'open' && (
                  <button
                    className="b warn"
                    onClick={() => {
                      const drafts = data.reviews.filter((v) => v.year === y.year && v.status === 'draft').length;
                      if (confirm(`Close ${y.year}? All ${y.year} records become read-only.${drafts ? ` ${drafts} draft review(s) are still open.` : ''} Reopening is not supported in this version.`))
                        update('Year closed', String(y.year), (d) => {
                          const x = d.years.find((q) => q.year === y.year)!;
                          x.status = 'closed';
                          x.closedAt = new Date().toISOString();
                        });
                    }}
                  >
                    Close year
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row" style={{ marginTop: 12 }}>
        <button
          className="b"
          onClick={() =>
            update('Year opened', `${next}: settings copied from ${next - 1} as draft`, (d) => {
              d.years.push({ year: next, status: 'open', closedAt: null });
              const prev = d.ruleVersions.filter((r) => r.year === next - 1).sort((a, b) => b.version - a.version);
              const src = prev.find((r) => r.status === 'approved') ?? prev[0];
              d.ruleVersions.push(
                src
                  ? { ...structuredClone(src), id: `RV-${next}-1`, year: next, version: 1, status: 'draft', approvedAt: null, holidays: [], note: `Copied from ${next - 1} v${src.version}; update holidays and approve.` }
                  : defaultRuleVersion(next, `RV-${next}-1`),
              );
            })
          }
        >
          Open {next} (copy settings as draft)
        </button>
        <span className="small muted">Recruiters carry over automatically. Prior-year ratings appear in Multi-Year Analysis.</span>
      </div>
    </div>
  );
}

function General() {
  const { data, update } = useApp();
  const [org, setOrg] = useState(data.orgName);
  const cut = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - data.retentionYears);
    return d.toISOString().slice(0, 10);
  })();
  const old = {
    offers: data.offers.filter((o) => o.offerDate < cut).length,
    reqs: data.requisitions.filter((q) => (q.closedDate ?? q.openDate) < cut && q.status === 'closed').length,
    reviews: data.reviews.filter((v) => v.date < cut).length,
    feedback: data.feedback.filter((f) => f.date < cut).length,
    growth: data.growth.filter((g) => `${g.year}-12-31` < cut).length,
    audit: data.audit.filter((a) => a.at.slice(0, 10) < cut).length,
  };
  const total = Object.values(old).reduce((a, b) => a + b, 0);
  return (
    <div className="grid2">
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Organisation</h2>
        <div className="row">
          <input value={org} onChange={(e) => setOrg(e.target.value)} style={{ flex: 1 }} />
          <button className="b" onClick={() => update('Organisation renamed', org, (d) => void (d.orgName = org))}>
            Save
          </button>
        </div>
        <p className="small muted">Shown on screens and reports. The app is not tied to any company.</p>
      </div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Data retention — {data.retentionYears} years</h2>
        <p className="small">Records dated before {cut} are past the retention period.</p>
        {total === 0 ? (
          <div className="note ok small">Nothing is past retention.</div>
        ) : (
          <>
            <div className="note small">
              Past retention: {old.offers} offers, {old.reqs} closed requisitions, {old.reviews} reviews, {old.feedback} feedback entries, {old.growth} growth assessments, {old.audit} audit events.
            </div>
            <button
              className="b warn"
              onClick={() =>
                confirm(`Permanently delete ${total} record(s) dated before ${cut}? Save a backup first if you may need them.`) &&
                update('Retention purge', `${total} record(s) before ${cut} deleted`, (d) => {
                  d.offers = d.offers.filter((o) => o.offerDate >= cut);
                  d.requisitions = d.requisitions.filter((q) => !(q.status === 'closed' && (q.closedDate ?? q.openDate) < cut));
                  d.reviews = d.reviews.filter((v) => v.date >= cut);
                  d.feedback = d.feedback.filter((f) => f.date >= cut);
                  d.growth = d.growth.filter((g) => `${g.year}-12-31` >= cut);
                  d.audit = d.audit.filter((a) => a.at.slice(0, 10) >= cut);
                })
              }
            >
              Delete records past retention
            </button>
          </>
        )}
        <p className="small muted">Nothing is deleted automatically; you confirm each purge.</p>
      </div>
    </div>
  );
}

function Backup() {
  const { data, session, update } = useApp();
  const save = async () => {
    const rec = await seal(data, session.email, session.key, session.salt);
    const blob = new Blob([JSON.stringify(rec)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `TA_Scorecard_backup_${todayISO()}.tasbackup`;
    a.click();
    URL.revokeObjectURL(a.href);
    update('Backup saved', a.download, () => {});
  };
  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Encrypted backup</h2>
      <p>
        Your data lives only in this browser on this computer. Save an encrypted backup file regularly (for example weekly) to a folder you control, such as an encrypted drive. To move to another
        computer, open the app there and choose <b>Restore from backup file</b> on the sign-in screen.
      </p>
      <button className="b" onClick={save}>
        Save encrypted backup file
      </button>
      <p className="small muted">The backup opens only with your email and passphrase. Clearing the browser's site data deletes the workspace on this computer, so keep backups.</p>
    </div>
  );
}

function Audit() {
  const { data } = useApp();
  const [q, setQ] = useState('');
  const rows = data.audit.filter((a) => !q || `${a.action} ${a.detail}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Audit log ({data.audit.length})</h2>
        <input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <p className="small muted">Every change is logged automatically. The log cannot be edited in the app.</p>
      <div className="tw" style={{ maxHeight: 560 }}>
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>User</th>
              <th>Action</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 1000).map((a, i) => (
              <tr key={i}>
                <td style={{ whiteSpace: 'nowrap' }}>{a.at.slice(0, 19).replace('T', ' ')}</td>
                <td>{a.user}</td>
                <td>{a.action}</td>
                <td>{a.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
