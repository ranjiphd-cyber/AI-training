import { Fragment, useMemo } from 'react';
import { useApp } from '../../store/state';
import { computeAll, periodsFor, Row, activeRule } from '../../engine/compute';
import { calendarDays, inRange, matrixMissing, workingDaysBetween } from '../../engine/scoring';
import { GROWTH_KEYS, GROWTH_LABELS, IN_SCOPE, STREAMS } from '../../types';
import { Band, Empty, fmt, Page, pct, Tile, useName } from '../common';
import type { Nav } from '../Shell';

export function useRows() {
  const { data, year, period } = useApp();
  return useMemo(() => computeAll(data, year, period), [data, year, period]);
}

export function Bars({ items, unit = '' }: { items: { label: string; value: number }[]; unit?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const w = 34;
  const h = 140;
  return (
    <svg viewBox={`0 0 ${items.length * w + 10} ${h + 34}`} width="100%" style={{ maxHeight: 200 }} role="img" aria-label={items.map((i) => `${i.label}: ${i.value}${unit}`).join(', ')}>
      {items.map((it, i) => {
        const bh = (it.value / max) * h;
        return (
          <g key={i} transform={`translate(${i * w + 6},0)`}>
            <rect x={2} y={h - bh + 14} width={w - 8} height={bh} rx={3} fill="#9f653c" />
            <text x={w / 2 - 2} y={h - bh + 10} fontSize="10" textAnchor="middle" fill="#2f2118">
              {it.value ? Number(it.value.toFixed(1)) : ''}
            </text>
            <text x={w / 2 - 2} y={h + 28} fontSize="10" textAnchor="middle" fill="#6b5a4c">
              {it.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function NoRule() {
  return <div className="note block">No scoring rule version exists for this year. Open the year in Settings → Years.</div>;
}

export function Overview({ go }: Nav) {
  const { data, year, period } = useApp();
  const { rule, rows } = useRows();
  const name = useName();
  if (!data.recruiters.length)
    return (
      <Page title="Executive Overview" sub={`${year} · ${period.label}`}>
        <Empty>
          No recruiters yet. Start in <button className="link" onClick={() => go('imports')}>Data Imports</button> or{' '}
          <button className="link" onClick={() => go('profiles')}>Recruiter Profiles</button>. No sample data is shown.
        </Empty>
      </Page>
    );
  const active = rows.filter((r) => !r.leaver);
  const leavers = rows.filter((r) => r.leaver);
  const pOffers = data.offers.filter((o) => inRange(o.offerDate, period.start, period.end));
  const scope = pOffers.filter((o) => IN_SCOPE.includes(o.stream));
  const ct = scope.filter((o) => o.status !== 'Declined' && o.reqDate && o.reqDate <= o.offerDate).map((o) => calendarDays(o.reqDate!, o.offerDate));
  const joined = scope.filter((o) => o.status === 'Joined');
  const acc = scope.filter((o) => o.status === 'Joined' || o.status === 'Offered');
  const scored = active.filter((r) => r.delivery.target);
  const tp = scored.reduce((s, r) => s + (r.delivery.weightedPoints ?? 0), 0);
  const tt = scored.reduce((s, r) => s + (r.delivery.target ?? 0), 0);
  const open = data.requisitions.filter((q) => q.status !== 'closed');
  const age = (q: (typeof open)[number]) => calendarDays(q.openDate, period.end);
  const months = periodsFor(year, period.end).filter((p) => p.key.startsWith('M'));
  const blocked = rows.filter((r) => r.delivery.status === 'blocked').length;
  const latest = data.offers.reduce((m, o) => (o.offerDate > m ? o.offerDate : m), '');
  return (
    <Page title="Executive Overview" sub={`${data.orgName} · ${year} · ${period.label} · latest offer on record: ${latest || '—'}`}>
      {!rule && <NoRule />}
      {rule?.status === 'draft' && (
        <div className="note">
          Scores use <b>draft</b> rule version v{rule.version}. Approve it in Settings → Scoring rules to freeze it for reviews.
        </div>
      )}
      {blocked > 0 && <div className="note block">{blocked} recruiter(s) have blocked scores (missing rule values or targets). See Delivery Scorecard.</div>}
      <div className="tiles">
        <Tile k="Offers released (period)" v={pOffers.length} s={`${scope.length} in-scope (lateral, FTC, conversions)`} />
        <Tile k="Team points / target to date" v={`${fmt(tp)} / ${fmt(tt)}`} s={tt ? `Attainment ${pct(tp / tt)}` : 'Targets missing'} c="b" />
        <Tile k="Avg req → offer (in-scope)" v={ct.length ? `${fmt(ct.reduce((a, b) => a + b, 0) / ct.length, 0)} d` : '—'} s={`${ct.length} offer(s) with dates`} c="o" />
        <Tile k="Vendor share of joiners" v={joined.length ? pct(joined.filter((o) => o.viaVendor).length / joined.length) : '—'} s={`${joined.length} in-scope joiner(s)`} c="o" />
        <Tile k="Women share (accepted)" v={acc.length ? pct(acc.filter((o) => o.woman).length / acc.length) : '—'} s={`${acc.length} accepted/joined`} />
        <Tile k="Open requisitions" v={open.length} s={`${open.filter((q) => age(q) > 90).length} older than 90 days`} c="b" />
      </div>
      <div className="grid2">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Offers per month ({year})</h2>
          <Bars items={months.map((m) => ({ label: m.label.slice(0, 3), value: data.offers.filter((o) => inRange(o.offerDate, m.start, m.end)).length }))} />
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Hiring mix (period)</h2>
          {pOffers.length ? (
            <table>
              <tbody>
                {STREAMS.map((s) => {
                  const n = pOffers.filter((o) => o.stream === s).length;
                  return n ? (
                    <tr key={s}>
                      <td>{s}</td>
                      <td style={{ width: '50%' }}>
                        <div className="bar">
                          <i style={{ width: `${(n / pOffers.length) * 100}%` }} />
                        </div>
                      </td>
                      <td className="n">{n}</td>
                    </tr>
                  ) : null;
                })}
              </tbody>
            </table>
          ) : (
            <Empty>No offers in this period.</Empty>
          )}
        </div>
      </div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Ranking — active recruiters and leads</h2>
        <p className="muted small">Leavers are excluded from ranking. Calculated band is separate from the manager-calibrated final rating (Reviews).</p>
        <RankTable rows={[...active].sort((a, b) => (b.delivery.ratingBasis ?? -1) - (a.delivery.ratingBasis ?? -1))} go={go} name={name} />
      </div>
      {leavers.length > 0 && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Leavers (shown separately, not ranked)</h2>
          <RankTable rows={leavers} go={go} name={name} />
        </div>
      )}
    </Page>
  );
}

function RankTable({ rows, go, name }: { rows: Row[]; go: Nav['go']; name: ReturnType<typeof useName> }) {
  const { data } = useApp();
  return (
    <div className="tw">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th className="n">Points</th>
            <th className="n">Target to date</th>
            <th className="n">Own %</th>
            <th className="n">Team %</th>
            <th>Band</th>
            <th className="n">Delivery /100</th>
            <th className="n">Growth /10</th>
            <th>Final rating</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const fr = data.reviews.filter((v) => v.recruiterId === r.recruiter.id && v.finalRating).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
            return (
              <tr key={r.recruiter.id} className="click" onClick={() => go('profiles', r.recruiter.id)}>
                <td>{name(r.recruiter)}</td>
                <td>{r.recruiter.role === 'lead' ? 'Lead' : 'Recruiter'}</td>
                <td className="n">{fmt(r.delivery.weightedPoints, 2)}</td>
                <td className="n">{fmt(r.delivery.target, 1)}</td>
                <td className="n">{pct(r.delivery.attainment)}</td>
                <td className="n">{r.recruiter.role === 'lead' ? pct(r.delivery.teamAttainment) : '—'}</td>
                <td>
                  <Band d={r.delivery} />
                </td>
                <td className="n">{fmt(r.delivery.total)}</td>
                <td className="n">{fmt(r.growth.score)}</td>
                <td>{fr ? <span className="pill b">{fr.finalRating}</span> : <span className="muted">—</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function Scorecard({ go }: Nav) {
  const { year, period } = useApp();
  const { rule, rows } = useRows();
  const name = useName();
  return (
    <Page title="Delivery Scorecard" sub={`${year} · ${period.label} · points are year to date; quality measures are for the selected period`}>
      {!rule ? (
        <NoRule />
      ) : rows.length === 0 ? (
        <Empty>No recruiters yet.</Empty>
      ) : (
        <div className="card tw">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th className="n">Offers YTD</th>
                <th className="n">Points</th>
                <th className="n">Target</th>
                <th className="n">Rating basis</th>
                <th>Band</th>
                <th className="n">Offers /{rule.maxima.offers}</th>
                <th className="n">Cycle /{rule.maxima.cycle}</th>
                <th className="n">Vendor /{rule.maxima.vendor}</th>
                <th className="n">Total /100</th>
                <th className="n">Req→offer d</th>
                <th className="n">Vendor %</th>
                <th className="n">Women %</th>
                <th className="n">Decline %</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ recruiter: r, delivery: d, leaver }) => (
                <tr key={r.id} className="click" onClick={() => go('profiles', r.id)} title={d.missing.join('\n')}>
                  <td>
                    {name(r)} {leaver && <span className="pill">leaver</span>}
                  </td>
                  <td className="n">{d.offersCounted}</td>
                  <td className="n">{fmt(d.weightedPoints, 2)}</td>
                  <td className="n">{fmt(d.target)}</td>
                  <td className="n">{pct(d.ratingBasis)}</td>
                  <td>
                    <Band d={d} />
                  </td>
                  <td className="n">{fmt(d.components.offers)}</td>
                  <td className="n">{fmt(d.components.cycle)}</td>
                  <td className="n">{fmt(d.components.vendor)}</td>
                  <td className="n">{fmt(d.total)}</td>
                  <td className="n">{fmt(d.avgCycleDays, 0)}</td>
                  <td className="n">{fmt(d.vendorPct, 1, '%')}</td>
                  <td className="n">{fmt(d.womenPct, 1, '%')}</td>
                  <td className="n">{fmt(d.declinePct, 1, '%')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted small">— means no data or not yet decided (never zero). Click a row for the full calculation trace.</p>
        </div>
      )}
    </Page>
  );
}

export function GrowthScreen({ go }: Nav) {
  const { data, year } = useApp();
  const { rule, rows } = useRows();
  const name = useName();
  const wMissing = rule ? GROWTH_KEYS.filter((k) => rule.growthWeights[k] === null) : [];
  return (
    <Page title="Growth & Behaviours" sub={`${year} · 1–10 ratings, kept separate from delivery`}>
      {wMissing.length > 0 && <div className="note block">Growth score is blocked until weights are set for: {wMissing.map((k) => GROWTH_LABELS[k]).join(', ')} (Settings → Scoring rules). Individual ratings are still shown.</div>}
      {rows.length === 0 ? (
        <Empty>No recruiters yet.</Empty>
      ) : (
        <div className="card tw">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                {GROWTH_KEYS.map((k) => (
                  <th key={k} className="n">
                    {GROWTH_LABELS[k]}
                  </th>
                ))}
                <th className="n">Growth score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const g = data.growth.filter((x) => x.recruiterId === r.recruiter.id && x.year === year).sort((a, b) => (a.period < b.period ? 1 : -1))[0];
                return (
                  <tr key={r.recruiter.id} className="click" onClick={() => go('profiles', r.recruiter.id)}>
                    <td>{name(r.recruiter)}</td>
                    {GROWTH_KEYS.map((k) => (
                      <td key={k} className="n">
                        {fmt(g?.ratings[k] ?? null, 0)}
                      </td>
                    ))}
                    <td className="n">{fmt(r.growth.score, 2)}</td>
                    <td className="small muted">{r.growth.status === 'scored' ? `Period ${g?.period}` : r.growth.missing.join('; ')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="small muted">Enter ratings on each Recruiter Profile → Growth tab.</p>
        </div>
      )}
    </Page>
  );
}

export function MatrixScreen({ go }: Nav) {
  const { rule, rows } = useRows();
  const name = useName();
  const miss = rule ? matrixMissing(rule) : ['Rule version'];
  const L = ['Low', 'Medium', 'High'];
  return (
    <Page title="Performance Matrix" sub="Delivery (attainment %) × Growth (1–10), 3 × 3">
      {miss.length ? (
        <div className="note block">Matrix blocked — set in Settings → Scoring rules: {miss.join('; ')}.</div>
      ) : (
        <div className="card">
          <div className="matrix">
            {[2, 1, 0].map((g) => (
              <Fragment key={g}>
                <div className="ax">
                  {L[g]} growth
                  <br />
                  {g === 0 ? `< ${rule!.matrix.growthLow}` : g === 1 ? `${rule!.matrix.growthLow}–${rule!.matrix.growthHigh}` : `≥ ${rule!.matrix.growthHigh}`}
                </div>
                {[0, 1, 2].map((d) => {
                  const inCell = rows.filter((r) => !r.leaver && r.matrix && r.matrix.growthLevel === g && r.matrix.deliveryLevel === d);
                  const lbl = rule!.matrix.labels[g * 3 + d];
                  return (
                    <div className="cell" key={`${g}${d}`} style={{ background: g + d >= 3 ? '#e7efda' : g + d <= 1 ? '#fbe6cf' : '#f7f1e3' }}>
                      <b>{lbl || `${L[d]} delivery / ${L[g]} growth`}</b>
                      <div style={{ marginTop: 4 }}>
                        {inCell.map((r) => (
                          <div key={r.recruiter.id}>
                            <button className="link" onClick={() => go('profiles', r.recruiter.id)}>
                              {name(r.recruiter)}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </Fragment>
            ))}
            <div />
            {[0, 1, 2].map((d) => (
              <div className="ax" key={d}>
                {L[d]} delivery {d === 0 ? `< ${rule!.matrix.deliveryLow}%` : d === 1 ? `${rule!.matrix.deliveryLow}–${rule!.matrix.deliveryHigh}%` : `≥ ${rule!.matrix.deliveryHigh}%`}
              </div>
            ))}
          </div>
          {rows.filter((r) => !r.leaver && !r.matrix).length > 0 && (
            <p className="small muted">Not placed (blocked delivery or incomplete growth): {rows.filter((r) => !r.leaver && !r.matrix).map((r) => name(r.recruiter)).join(', ')}</p>
          )}
        </div>
      )}
    </Page>
  );
}

export function MultiYear() {
  const { data } = useApp();
  const name = useName();
  const years = data.years.map((y) => y.year).sort();
  const res = years.map((y) => {
    const per = periodsFor(y, `${y}-12-31`)[0];
    return { y, ...computeAll(data, y, per) };
  });
  if (!data.recruiters.length) return <Page title="Multi-Year Analysis"><Empty>No recruiters yet.</Empty></Page>;
  return (
    <Page title="Multi-Year Analysis" sub="Full-year results per year (closed years are read-only) and prior ratings carried on the recruiter record">
      <div className="card tw">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              {years.map((y) => (
                <th key={y}>{y} band (attainment)</th>
              ))}
              {years.map((y) => (
                <th key={`f${y}`}>{y} final rating</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.recruiters.map((r) => (
              <tr key={r.id}>
                <td>{name(r)}</td>
                {res.map((x) => {
                  const row = x.rows.find((q) => q.recruiter.id === r.id);
                  return <td key={x.y}>{row ? <>{row.delivery.band ?? '—'} <span className="muted small">{pct(row.delivery.ratingBasis)}</span></> : '—'}</td>;
                })}
                {years.map((y) => {
                  const fr = data.reviews.filter((v) => v.recruiterId === r.id && v.year === y && v.type === 'annual' && v.status === 'approved')[0];
                  return <td key={`f${y}`}>{fr?.finalRating ?? '—'}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card small muted">
        Working days in each year use the year's rule version ({years.map((y) => `${y}: ${activeRule(data, y)?.workingDaysInYear ?? '—'}`).join(', ')}). Elapsed working days for {years[years.length - 1]} to date:{' '}
        {workingDaysBetween(`${years[years.length - 1]}-01-01`, `${years[years.length - 1]}-12-31`, activeRule(data, years[years.length - 1])?.holidays ?? [])} in full year (Mon–Fri minus holidays).
      </div>
    </Page>
  );
}
