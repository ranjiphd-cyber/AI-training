import { useApp } from '../../store/state';
import { activeRule } from '../../engine/compute';
import { GROWTH_KEYS, GROWTH_LABELS, IN_SCOPE } from '../../types';
import { Page } from '../common';

const v = (x: number | null | undefined) => (x === null || x === undefined ? <i className="muted">not yet decided</i> : x);

export function HowScoring() {
  const { data, year } = useApp();
  const r = activeRule(data, year);
  if (!r) return <Page title="How Scoring Works"><div className="note block">No rule version for {year}.</div></Page>;
  return (
    <Page title="How Scoring Works" sub={`Generated from rule version v${r.version} (${r.status}) for ${year}. It changes when the rules change.`}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>1. Points for every offer</h2>
        <p>Every offer released from 1 January up to the end of the selected period earns points by hiring stream and salary grade (SG; a job level converts as SG = JL + 2):</p>
        <table style={{ maxWidth: 560 }}>
          <tbody>
            {r.categories.map((c) => (
              <tr key={c.code}>
                <td>{c.code}</td>
                <td className="n">{v(c.points)}</td>
                <td className="small muted">{c.womenBonus ? `+${r.womenBonus ?? '?'} for a woman hire` : ''}</td>
              </tr>
            ))}
            <tr>
              <td>FTC without a grade</td>
              <td className="n">{v(r.ftcNoGradePoints)}</td>
              <td />
            </tr>
          </tbody>
        </table>
        <p>
          A declined offer keeps its points plus a decline adjustment of {v(r.declineAdjustment)}. {r.includeExtraPoints ? 'Extra points count once you approve them.' : 'Extra points are not counted.'}
        </p>
      </div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>2. Target to date and attainment</h2>
        <p>
          <b>Target to date = cadence × points of a lateral offer at the person's target grade × working days employed so far ÷ 10.</b> Cadence is the target number of offers per 10 working days. Working days are Monday–Friday minus listed holidays ({r.holidays.length} set), counted from 1 January (or the joining date) to the period end (or the leaving date). A full year is {v(r.workingDaysInYear)} working days.
        </p>
        <p>
          <b>Attainment = points ÷ target to date.</b> {r.leadTeamAverage ? 'Leads are rated on the average of their own attainment and their active team members\' combined attainment.' : 'Leads are rated on their own attainment.'}
        </p>
        <h3>Calculated band</h3>
        <ul>
          {[...r.ratingBands].sort((a, b) => (b.minPct ?? 0) - (a.minPct ?? 0)).map((b) => (
            <li key={b.label}>
              {b.label}: attainment ≥ {v(b.minPct)}%
            </li>
          ))}
        </ul>
        <p>The calculated band is evidence for your decision. The final rating is set by you during calibration (Reviews), and the two are always kept separately.</p>
      </div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>3. Delivery score out of 100</h2>
        <ul>
          <li>
            <b>Offers &amp; complexity ({r.maxima.offers})</b> = {r.maxima.offers} × min(attainment, 100%) {r.offersFormula ? '' : <i className="muted">(formula awaiting your confirmation)</i>}
          </li>
          <li>
            <b>Cycle time ({r.maxima.cycle})</b>: average calendar days from requisition approval to offer, in-scope offers in the period, excluding declined offers. Bands:{' '}
            {r.cycleTime.bands.map((b, i) => (
              <span key={i}>
                {b.upTo === null ? 'above' : `≤ ${b.upTo}`} → {v(b.points)}
                {i < r.cycleTime.bands.length - 1 ? '; ' : ''}
              </span>
            ))}
          </li>
          <li>
            <b>Vendor usage ({r.maxima.vendor})</b>: vendor share of in-scope joiners in the period. Bands:{' '}
            {r.vendor.bands.map((b, i) => (
              <span key={i}>
                {b.upTo === null ? 'above' : `≤ ${b.upTo}%`} → {v(b.points)}
                {i < r.vendor.bands.length - 1 ? '; ' : ''}
              </span>
            ))}
          </li>
        </ul>
        <p>In scope for cycle time, vendor, diversity and declines: {IN_SCOPE.join(', ')}. Programme hiring counts for points but not for these quality measures.</p>
        <p>If a component has no data in the period, it shows "—" (no data), never zero, and no total is produced.</p>
      </div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>4. Growth (1–10) and the matrix</h2>
        <p>
          Growth score = weighted average of {GROWTH_KEYS.map((k) => `${GROWTH_LABELS[k]} (${r.growthWeights[k] ?? '?'})`).join(', ')}. All five ratings are needed. Growth never changes the delivery score.
        </p>
        <p>
          Matrix: delivery axis = attainment % (Medium from {v(r.matrix.deliveryLow)}, High from {v(r.matrix.deliveryHigh)}); growth axis = growth score (Medium from {v(r.matrix.growthLow)}, High from{' '}
          {v(r.matrix.growthHigh)}).
        </p>
      </div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>5. Rounding, missing data and reproducibility</h2>
        <p>
          Values are rounded to {v(r.roundingDecimals)} decimals (half away from zero); attainment is compared with bands at one decimal place. When a rule value is missing, the result says "Blocked" and lists what to decide; no score is invented. Each recorded review freezes its source records, rule version and results, and can be re-verified at any time.
        </p>
      </div>
    </Page>
  );
}
