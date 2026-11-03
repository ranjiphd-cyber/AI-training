import { useMemo, useState } from 'react';
import { useApp, uid, todayISO } from '../../store/state';
import { buildInputs, activeRule } from '../../engine/compute';
import { calendarDays, scoreDelivery, scoreGrowth, classifyMatrix, sgNumber } from '../../engine/scoring';
import { DevPlan, GROWTH_KEYS, GROWTH_LABELS, GrowthAssessment, Recruiter } from '../../types';
import { Band, Col, Empty, fmt, Page, pct, RecordTable, StatusNote, Tile, Trace, useCollection, useName } from '../common';
import { RecordReview } from './reviews';
import type { Nav } from '../Shell';

const recruiterCols: Col<Recruiter>[] = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'employeeId', label: 'Employee ID', type: 'text', required: true },
  { key: 'role', label: 'Role', type: 'select', options: ['recruiter', 'lead'] },
  { key: 'team', label: 'Team', type: 'text' },
  { key: 'jobLevel', label: 'Job level (e.g. JL5 / SG7)', type: 'text' },
  { key: 'cadence', label: 'Target offers per 10 working days', type: 'number', min: 0 },
  { key: 'targetSG', label: 'Target grade (SG)', type: 'number', min: 1, max: 20 },
  { key: 'startDate', label: 'Joined (if mid-year)', type: 'date' },
  { key: 'leaveDate', label: 'Left on', type: 'date' },
];

export function Profiles({ go, recruiterId }: Nav & { recruiterId?: string }) {
  const { data } = useApp();
  const col = useCollection('recruiters', 'Recruiter');
  const r = data.recruiters.find((x) => x.id === recruiterId);
  if (r) return <Profile r={r} go={go} />;
  return (
    <Page title="Recruiter Profiles" sub="Add the team here or import it. Aliases (other spellings in trackers) are matched during imports.">
      <RecordTable<Recruiter>
        title="Team members"
        rows={data.recruiters}
        cols={recruiterCols}
        blank={() => ({ id: uid('R'), employeeId: '', name: '', aliases: [], role: 'recruiter', team: '', jobLevel: '', cadence: null, targetSG: null, startDate: null, leaveDate: null })}
        onSave={(row, isNew) => col.onSave({ ...row, targetSG: row.targetSG ?? sgNumber(row.jobLevel) }, isNew)}
        onDelete={(row) => {
          if (data.offers.some((o) => o.recruiterId === row.id) || data.reviews.some((v) => v.recruiterId === row.id))
            return alert('This person has offers or reviews on record. Set a leaving date instead of deleting.');
          col.onDelete(row);
        }}
        readOnly={col.readOnly}
      />
      {data.recruiters.length > 0 && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Open a profile</h2>
          <div className="row">
            {data.recruiters.map((x) => (
              <button key={x.id} className="b ghost" onClick={() => go('profiles', x.id)}>
                {x.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </Page>
  );
}

function Profile({ r, go }: { r: Recruiter } & Nav) {
  const app = useApp();
  const { data, year, period, update, yearClosed } = app;
  const name = useName();
  const [tab, setTab] = useState('delivery');
  const rule = activeRule(data, year);
  const res = useMemo(() => {
    if (!rule) return null;
    const inp = buildInputs(data, r, year, period, rule);
    const d = scoreDelivery(inp);
    const g = scoreGrowth(inp);
    return { d, g, inp, m: d.ratingBasis !== null && g.score !== null ? classifyMatrix(d.ratingBasis * 100, g.score, rule) : null };
  }, [data, r, year, period, rule]);
  const reviews = data.reviews.filter((v) => v.recruiterId === r.id).sort((a, b) => (a.date < b.date ? 1 : -1));
  const reqs = data.requisitions.filter((q) => q.recruiterId === r.id && q.status !== 'closed');
  const aliases = r.aliases.join(', ');
  return (
    <Page
      title={name(r)}
      sub={`${r.role === 'lead' ? 'Lead' : 'Recruiter'} · ${r.team || 'no team'} · ${r.jobLevel || 'level —'} · cadence ${r.cadence ?? '—'} at SG${r.targetSG ?? '—'}${r.leaveDate ? ` · left ${r.leaveDate}` : ''}`}
      actions={
        <>
          <button className="b ghost" onClick={() => go('profiles')}>
            ← All profiles
          </button>
          {!yearClosed && (
            <button className="b" onClick={() => setTab('review')}>
              Record review
            </button>
          )}
        </>
      }
    >
      {res && (
        <div className="tiles">
          <Tile k="Points / target to date" v={`${fmt(res.d.weightedPoints, 2)} / ${fmt(res.d.target)}`} s={`${res.d.workingDaysElapsed ?? '—'} working days employed`} c="b" />
          <Tile k="Rating basis" v={pct(res.d.ratingBasis)} s={<Band d={res.d} />} />
          <Tile k="Delivery score /100" v={fmt(res.d.total)} s={res.d.status === 'scored' ? 'all components' : 'not produced — see note'} c="o" />
          <Tile k="Growth score /10" v={fmt(res.g.score, 2)} s={res.g.status === 'scored' ? 'weighted 1–10' : res.g.missing[0]} />
          <Tile k="Matrix position" v={<span style={{ fontSize: 14 }}>{res.m?.label ?? '—'}</span>} />
          <Tile k="Open requisitions" v={reqs.length} s={`${reqs.filter((q) => calendarDays(q.openDate, period.end) > 90).length} older than 90 days`} c="b" />
        </div>
      )}
      <div className="tabs" role="tablist">
        {[
          ['delivery', 'Delivery & calculation'],
          ['growth', 'Growth ratings'],
          ['dev', 'Development plan'],
          ['evidence', 'Evidence'],
          ['history', 'Reviews & history'],
          ['review', 'Record review'],
          ['aliases', 'Aliases'],
        ].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>
      {!rule && <div className="note block">No rule version for {year}.</div>}
      {tab === 'delivery' && res && (
        <div className="card">
          <StatusNote d={res.d} />
          <h2 style={{ marginTop: 0 }}>Source records → eligibility → points → target → band</h2>
          <Trace t={res.d.trace} />
          {res.d.offersExcluded.length > 0 && <p className="small muted">{res.d.offersExcluded.length} offer record(s) outside the year-to-date window are not counted.</p>}
        </div>
      )}
      {tab === 'growth' && <GrowthTab r={r} />}
      {tab === 'dev' && <DevTab r={r} />}
      {tab === 'evidence' && (
        <div className="grid2">
          <Mini title="Open requisitions" rows={reqs.map((q) => `${q.reqId} · ${q.title} · open ${calendarDays(q.openDate, period.end)} days`)} />
          <Mini title="Projects" rows={data.projects.filter((p) => p.recruiterId === r.id && p.year === year).map((p) => `${p.title} — ${p.status}${p.outcome ? ` · ${p.outcome}` : ''}`)} />
          <Mini title="Training" rows={data.training.filter((p) => p.recruiterId === r.id && p.year === year).map((t) => `${t.programme} — ${t.status}${t.applicationEvidence ? ` · applied: ${t.applicationEvidence}` : ' · no evidence of application yet'}`)} />
          <Mini title="Stakeholder feedback" rows={data.feedback.filter((f) => f.recruiterId === r.id).map((f) => `${f.date} · ${f.source}${f.rating ? ` · ${f.rating}/10` : ''} · ${f.comment}`)} />
          <Mini title="Extra points" rows={data.extraPoints.filter((e) => e.recruiterId === r.id).map((e) => `${e.date} · ${e.points} pts · ${e.reason} · ${e.approved ? 'approved' : 'awaiting approval'}`)} />
        </div>
      )}
      {tab === 'history' && (
        <div className="card">
          {reviews.length === 0 ? (
            <Empty>No reviews recorded yet.</Empty>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Period</th>
                  <th>Calculated band</th>
                  <th>Final rating</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((v) => (
                  <tr key={v.id} className="click" onClick={() => go('reviews')}>
                    <td>{v.date}</td>
                    <td>{v.type}</td>
                    <td>{v.periodLabel}</td>
                    <td>{v.snapshot.delivery.band ?? 'Blocked'}</td>
                    <td>{v.finalRating ?? '—'}</td>
                    <td>{v.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      {tab === 'review' && res && rule && <RecordReview r={r} rule={rule} inp={res.inp} d={res.d} g={res.g} onDone={() => setTab('history')} />}
      {tab === 'aliases' && (
        <div className="card">
          <p className="small">Other spellings of this name used in hiring trackers. Imports match on employee ID, name or any alias (case-insensitive).</p>
          <AliasEditor
            value={aliases}
            disabled={yearClosed}
            onSave={(v) =>
              update('Aliases updated', r.id, (d) => {
                d.recruiters.find((x) => x.id === r.id)!.aliases = v
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean);
              })
            }
          />
        </div>
      )}
    </Page>
  );
}

function AliasEditor({ value, onSave, disabled }: { value: string; onSave: (v: string) => void; disabled: boolean }) {
  const [v, setV] = useState(value);
  return (
    <div className="row">
      <input style={{ flex: 1 }} value={v} onChange={(e) => setV(e.target.value)} placeholder="e.g. Eli, Elizabeth J" disabled={disabled} />
      <button className="b" onClick={() => onSave(v)} disabled={disabled}>
        Save
      </button>
    </div>
  );
}

function Mini({ title, rows }: { title: string; rows: string[] }) {
  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {rows.length ? (
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {rows.map((x, i) => (
            <li key={i} className="small">
              {x}
            </li>
          ))}
        </ul>
      ) : (
        <span className="muted small">None recorded.</span>
      )}
    </div>
  );
}

function GrowthTab({ r }: { r: Recruiter }) {
  const { data, year, period, update, yearClosed } = useApp();
  const list = data.growth.filter((g) => g.recruiterId === r.id && g.year === year).sort((a, b) => (a.period < b.period ? 1 : -1));
  const [edit, setEdit] = useState<GrowthAssessment | null>(null);
  const blank = (): GrowthAssessment => ({ id: uid('G'), recruiterId: r.id, year, period: period.key === 'YTD' ? String(year) : `${year}-${period.key}`, ratings: { projects: null, selfDev: null, training: null, behaviours: null, feedback: null }, comment: '' });
  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Growth ratings (1–10)</h2>
        {!yearClosed && (
          <button className="b" onClick={() => setEdit(blank())}>
            + New assessment
          </button>
        )}
      </div>
      <p className="small muted">Ratings are your judgement, supported by evidence in Projects, Training and Feedback. They never change the delivery score.</p>
      {edit && (
        <div className="card" style={{ background: 'var(--cream-l)' }}>
          <div className="form">
            <label>
              Period label
              <input value={edit.period} onChange={(e) => setEdit({ ...edit, period: e.target.value })} />
            </label>
            {GROWTH_KEYS.map((k) => (
              <label key={k}>
                {GROWTH_LABELS[k]}
                <input
                  type="number"
                  min={1}
                  max={10}
                  step={1}
                  value={edit.ratings[k] ?? ''}
                  onChange={(e) => setEdit({ ...edit, ratings: { ...edit.ratings, [k]: e.target.value === '' ? null : Math.max(1, Math.min(10, Number(e.target.value))) } })}
                />
              </label>
            ))}
            <label style={{ gridColumn: '1/-1' }}>
              Evidence / comment
              <textarea value={edit.comment} onChange={(e) => setEdit({ ...edit, comment: e.target.value })} />
            </label>
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <button
              className="b"
              onClick={() => {
                update('Growth assessment saved', `${r.id} ${edit.period}`, (d) => {
                  const i = d.growth.findIndex((g) => g.id === edit.id);
                  if (i >= 0) d.growth[i] = edit;
                  else d.growth.push(edit);
                });
                setEdit(null);
              }}
            >
              Save
            </button>
            <button className="b ghost" onClick={() => setEdit(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {list.length === 0 ? (
        <Empty>No growth assessment for {year} yet.</Empty>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Period</th>
              {GROWTH_KEYS.map((k) => (
                <th key={k} className="n">
                  {GROWTH_LABELS[k]}
                </th>
              ))}
              <th>Comment</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map((g) => (
              <tr key={g.id}>
                <td>{g.period}</td>
                {GROWTH_KEYS.map((k) => (
                  <td key={k} className="n">
                    {g.ratings[k] ?? '—'}
                  </td>
                ))}
                <td className="small">{g.comment}</td>
                <td>{!yearClosed && <button className="link" onClick={() => setEdit(structuredClone(g))}>Edit</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function DevTab({ r }: { r: Recruiter }) {
  const { data, year, update, yearClosed } = useApp();
  const col = useCollection('devPlans', 'Development plan');
  const rows = data.devPlans.filter((p) => p.recruiterId === r.id && p.year === year);
  const [ci, setCi] = useState<{ id: string; note: string; rating: string } | null>(null);
  return (
    <>
      <RecordTable<DevPlan>
        title="Development plan"
        rows={rows}
        readOnly={col.readOnly}
        cols={[
          { key: 'area', label: 'Competency / development area', type: 'text', required: true },
          { key: 'baseline', label: 'Baseline (1–10)', type: 'number', min: 1, max: 10 },
          { key: 'target', label: 'Target (1–10)', type: 'number', min: 1, max: 10 },
          { key: 'current', label: 'Current (1–10)', type: 'number', min: 1, max: 10 },
          { key: 'owner', label: 'Owner', type: 'text' },
          { key: 'dueDate', label: 'Due', type: 'date' },
          { key: 'status', label: 'Status', type: 'select', options: ['open', 'completed'] },
          { key: 'trainingSupport', label: 'Training support', type: 'text' },
          { key: 'evidence', label: 'Evidence for baseline', type: 'long' },
          { key: 'actions', label: 'Action plan', type: 'long' },
          { key: 'completionEvidence', label: 'Completion evidence (required to show improvement)', type: 'long' },
        ]}
        blank={() => ({ id: uid('DP'), recruiterId: r.id, year, area: '', baseline: null, target: null, current: null, evidence: '', actions: '', owner: '', dueDate: null, trainingSupport: '', checkIns: [], completionEvidence: '', status: 'open' })}
        onSave={col.onSave}
        onDelete={col.onDelete}
      />
      {rows.length > 0 && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Progress check-ins</h2>
          {rows.map((p) => (
            <div key={p.id} style={{ marginBottom: 10 }}>
              <b>{p.area}</b>{' '}
              {p.status === 'completed' && !p.completionEvidence && <span className="pill o">completed without evidence — improvement not shown</span>}
              <ul className="small" style={{ margin: '4px 0 0 18px', padding: 0 }}>
                {p.checkIns.map((c, i) => (
                  <li key={i}>
                    {c.date} · {c.currentRating ?? '—'}/10 · {c.note}
                  </li>
                ))}
                {!p.checkIns.length && <li className="muted">No check-ins yet.</li>}
              </ul>
              {!yearClosed &&
                (ci?.id === p.id ? (
                  <div className="row" style={{ marginTop: 4 }}>
                    <input type="number" min={1} max={10} placeholder="Rating" style={{ width: 80 }} value={ci.rating} onChange={(e) => setCi({ ...ci, rating: e.target.value })} />
                    <input style={{ flex: 1 }} placeholder="What changed, with evidence" value={ci.note} onChange={(e) => setCi({ ...ci, note: e.target.value })} />
                    <button
                      className="b"
                      onClick={() => {
                        update('Development check-in', p.id, (d) => {
                          const x = d.devPlans.find((q) => q.id === p.id)!;
                          x.checkIns.push({ date: todayISO(), currentRating: ci.rating ? Number(ci.rating) : null, note: ci.note });
                          if (ci.rating) x.current = Number(ci.rating);
                        });
                        setCi(null);
                      }}
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <button className="link small" onClick={() => setCi({ id: p.id, note: '', rating: '' })}>
                    + Add check-in
                  </button>
                ))}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
