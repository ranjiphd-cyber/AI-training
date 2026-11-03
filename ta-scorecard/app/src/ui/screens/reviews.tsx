import { useState } from 'react';
import { useApp, uid, todayISO } from '../../store/state';
import { scoreDelivery, scoreGrowth } from '../../engine/scoring';
import { DeliveryResult, GrowthResult, Recruiter, Review, ReviewType, RuleVersion, ScoreInputs } from '../../types';
import { Band, Empty, fmt, Page, pct, StatusNote, Trace, useName } from '../common';
import type { Nav } from '../Shell';

const TYPES: ReviewType[] = ['10-day', 'monthly', 'quarterly', 'annual'];

export function RecordReview({ r, rule, inp, d, g, onDone }: { r: Recruiter; rule: RuleVersion; inp: ScoreInputs; d: DeliveryResult; g: GrowthResult; onDone: () => void }) {
  const { year, period, update } = useApp();
  const [type, setType] = useState<ReviewType>(period.key.startsWith('Q') ? 'quarterly' : period.key.startsWith('M') ? 'monthly' : 'annual');
  const [commentary, setCommentary] = useState('');
  const [actions, setActions] = useState('');
  const save = () => {
    const rv: Review = {
      id: uid('RV'),
      recruiterId: r.id,
      year,
      type,
      periodLabel: period.label,
      periodStart: period.start,
      periodEnd: period.end,
      date: todayISO(),
      ruleVersionId: rule.id,
      snapshot: { takenAt: new Date().toISOString(), inputs: structuredClone(inp), delivery: d, growth: g },
      finalRating: null,
      calibrationNote: '',
      commentary,
      agreedActions: actions,
      status: 'draft',
      approvedBy: null,
      approvedAt: null,
    };
    update('Review recorded (draft)', `${r.name} · ${type} · ${period.label}`, (x) => {
      x.reviews.push(rv);
    });
    onDone();
  };
  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Record a review — {period.label}</h2>
      <p className="small muted">
        Saving freezes a snapshot of the source records, rule version v{rule.version} ({rule.status}) and the calculated results, so the review can be reproduced later even if data or rules change. Set the
        calibrated final rating and approve it on the Reviews &amp; Appraisals page.
      </p>
      <StatusNote d={d} />
      <div className="form">
        <label>
          Review type
          <select value={type} onChange={(e) => setType(e.target.value as ReviewType)}>
            {TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          Calculated band
          <div>
            <Band d={d} /> {pct(d.ratingBasis)}
          </div>
        </label>
        <label>
          Growth score
          <div>{fmt(g.score, 2)}</div>
        </label>
        <label style={{ gridColumn: '1/-1' }}>
          Manager commentary
          <textarea value={commentary} onChange={(e) => setCommentary(e.target.value)} />
        </label>
        <label style={{ gridColumn: '1/-1' }}>
          Agreed actions and development commitments
          <textarea value={actions} onChange={(e) => setActions(e.target.value)} />
        </label>
      </div>
      <button className="b" style={{ marginTop: 10 }} onClick={save}>
        Save review snapshot
      </button>
    </div>
  );
}

export function Reviews({ go }: Nav) {
  const { data, year } = useApp();
  const name = useName();
  const [open, setOpen] = useState<string | null>(null);
  const list = data.reviews.filter((v) => v.year === year).sort((a, b) => (a.date < b.date ? 1 : -1));
  const cur = list.find((v) => v.id === open);
  if (cur) return <ReviewDetail v={cur} back={() => setOpen(null)} />;
  return (
    <Page title="Reviews & Appraisals" sub={`${year} · 10-day, monthly, quarterly and annual reviews. Start a review from a Recruiter Profile → Record review.`}>
      {list.length === 0 ? (
        <Empty>
          No reviews yet. Open a <button className="link" onClick={() => go('profiles')}>Recruiter Profile</button> and choose Record review.
        </Empty>
      ) : (
        <div className="card tw">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Name</th>
                <th>Type</th>
                <th>Period</th>
                <th>Calculated band</th>
                <th>Final rating</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((v) => (
                <tr key={v.id} className="click" onClick={() => setOpen(v.id)}>
                  <td>{v.date}</td>
                  <td>{name(data.recruiters.find((r) => r.id === v.recruiterId))}</td>
                  <td>{v.type}</td>
                  <td>{v.periodLabel}</td>
                  <td>
                    <Band d={v.snapshot.delivery} />
                  </td>
                  <td>{v.finalRating ? <span className="pill b">{v.finalRating}</span> : '—'}</td>
                  <td>{v.status === 'approved' ? <span className="pill g">approved</span> : <span className="pill o">draft</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Page>
  );
}

function ReviewDetail({ v, back }: { v: Review; back: () => void }) {
  const { data, update, user, yearClosed } = useApp();
  const name = useName();
  const rule = data.ruleVersions.find((x) => x.id === v.ruleVersionId);
  const [fr, setFr] = useState(v.finalRating ?? '');
  const [cal, setCal] = useState(v.calibrationNote);
  const [com, setCom] = useState(v.commentary);
  const [act, setAct] = useState(v.agreedActions);
  const [check, setCheck] = useState<string | null>(null);
  const locked = v.status === 'approved' || yearClosed;
  const r = data.recruiters.find((x) => x.id === v.recruiterId);
  const reproduce = () => {
    const d2 = scoreDelivery(v.snapshot.inputs);
    const g2 = scoreGrowth(v.snapshot.inputs);
    const same = JSON.stringify(d2) === JSON.stringify(v.snapshot.delivery) && JSON.stringify(g2) === JSON.stringify(v.snapshot.growth);
    setCheck(same ? 'Reproduced exactly from the frozen snapshot.' : 'Recalculation differs from the stored result — the engine has changed since this review. The stored result remains the record.');
  };
  const saveEdits = (approve: boolean) => {
    if (approve) {
      if (!fr) return alert('Set the calibrated final rating before approving.');
      if (rule?.status !== 'approved') return alert('Approve the rule version used by this review first (Settings → Scoring rules), so the configuration is frozen.');
      if (!confirm('Approve this review? It becomes read-only.')) return;
    }
    update(approve ? 'Review approved' : 'Review edited', `${r?.name} · ${v.type} · ${v.periodLabel}${fr !== (v.finalRating ?? '') ? ` · final rating ${v.finalRating ?? '—'} → ${fr}` : ''}`, (d) => {
      const x = d.reviews.find((q) => q.id === v.id)!;
      x.finalRating = fr || null;
      x.calibrationNote = cal;
      x.commentary = com;
      x.agreedActions = act;
      if (approve) {
        x.status = 'approved';
        x.approvedBy = user;
        x.approvedAt = new Date().toISOString();
      }
    });
    if (approve) back();
  };
  const d = v.snapshot.delivery;
  return (
    <Page
      title={`Review — ${name(r)}`}
      sub={`${v.type} · ${v.periodLabel} · recorded ${v.date} · rule version v${rule?.version ?? '?'} (${rule?.status ?? 'missing'})${v.approvedAt ? ` · approved by ${v.approvedBy} on ${v.approvedAt.slice(0, 10)}` : ''}`}
      actions={
        <>
          <button className="b ghost" onClick={back}>
            ← Back
          </button>
          <button className="b ghost" onClick={reproduce}>
            Verify reproducibility
          </button>
        </>
      }
    >
      {check && <div className={`note ${check.startsWith('Reproduced') ? 'ok' : ''}`}>{check}</div>}
      <div className="grid2">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Calculated (frozen)</h2>
          <p>
            Band: <Band d={d} /> · attainment {pct(d.ratingBasis)} · delivery {fmt(d.total)}/100 · growth {fmt(v.snapshot.growth.score, 2)}/10
          </p>
          <StatusNote d={d} />
          <Trace t={d.trace} />
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Calibration (your decision)</h2>
          <div className="form" style={{ gridTemplateColumns: '1fr' }}>
            <label>
              Final rating (calibrated)
              <select value={fr} onChange={(e) => setFr(e.target.value)} disabled={locked}>
                <option value="">— not set —</option>
                {(rule?.ratingBands ?? []).map((b) => (
                  <option key={b.label}>{b.label}</option>
                ))}
              </select>
            </label>
            {fr && d.band && fr !== d.band && (
              <div className="note small">Final rating differs from the calculated band ({d.band}). Record the reason below.</div>
            )}
            <label>
              Calibration note
              <textarea value={cal} onChange={(e) => setCal(e.target.value)} disabled={locked} />
            </label>
            <label>
              Manager commentary
              <textarea value={com} onChange={(e) => setCom(e.target.value)} disabled={locked} />
            </label>
            <label>
              Agreed actions
              <textarea value={act} onChange={(e) => setAct(e.target.value)} disabled={locked} />
            </label>
          </div>
          {!locked && (
            <div className="row" style={{ marginTop: 10 }}>
              <button className="b ghost" onClick={() => saveEdits(false)}>
                Save draft
              </button>
              <button className="b" onClick={() => saveEdits(true)}>
                Approve review
              </button>
            </div>
          )}
          {locked && <div className="note ok small">This review is approved and read-only.</div>}
        </div>
      </div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Calibration history</h2>
        <ul className="small">
          {data.audit
            .filter((a) => a.action.startsWith('Review') && a.detail.includes(v.periodLabel) && (r ? a.detail.includes(r.name) : true))
            .map((a, i) => (
              <li key={i}>
                {a.at.slice(0, 16).replace('T', ' ')} · {a.action} · {a.detail}
              </li>
            ))}
        </ul>
      </div>
    </Page>
  );
}
