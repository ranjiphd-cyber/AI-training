/* Data pack: sources of hire and previous companies – lateral hires incl. conversions and FTC (TA Head, 20 Oct 2026).
   Sources: Hiring2026 tracker – Master Tracker (source, specific source, outcome) and Offer Stack (current company), supplied 19–20 Oct 2026.
   The two sheets were matched on requisition ID and offer date outside the dashboard; only company-level counts are stored here –
   no candidate names, contact details or referrer IDs. Company spellings were normalised (e.g. "ABB Business services pvt ltd" = ABB);
   ambiguous names are kept as recorded. Vendor contact names and e-mail addresses in the source are reduced to the agency name. Applied once. */
(function () {
  'use strict';
  const TA = window.TA;
  const PACK = 'hiring-sources-companies-2026-10-20', PACK2 = 'hiring-sources-companies-2026-10-20-upd1';
  // upd1 (TA Head, 20 Oct 2026): leave out rows where the company is not available; merge same/similar company names.
  const WHO = 'TA Head, 20 Oct 2026';
  const SRC = 'Hiring2026 tracker – Master Tracker and Offer Stack sheets (supplied 19–20 Oct 2026); aggregates only';
  const A = {"coverage":{"joinersMatched":303,"joiners":352,"offersMatched":380,"offers":392,"stackRows":464,"stackUnmatched":19},"kind":[{"label":"External market hire","joined":242,"offers":282,"declined":33},{"label":"Conversion – from Volvo payroll (FTC, NATS, GAT, ExcelHER, intern)","joined":79,"offers":81,"declined":2},{"label":"Conversion – consultant / contractor from a partner firm","joined":24,"offers":27,"declined":1},{"label":"Conversion – previous employer not recorded","joined":7,"offers":2,"declined":0}],"external":[{"label":"Bosch","joined":11,"offers":14,"declined":2},{"label":"Volvo Group (internal – rehire or move, not recorded as a conversion)","joined":9,"offers":10,"declined":1},{"label":"Accenture","joined":8,"offers":10,"declined":2},{"label":"ABB","joined":6,"offers":9,"declined":1},{"label":"Infosys","joined":4,"offers":4,"declined":0},{"label":"Mahindra & Mahindra","joined":3,"offers":5,"declined":0},{"label":"Mercedes-Benz R&D India","joined":3,"offers":4,"declined":0},{"label":"TCS","joined":3,"offers":3,"declined":0},{"label":"Renault Nissan","joined":3,"offers":3,"declined":0},{"label":"JCB India","joined":3,"offers":3,"declined":0},{"label":"UD Trucks","joined":3,"offers":3,"declined":0},{"label":"Alstom","joined":2,"offers":4,"declined":0},{"label":"EY","joined":3,"offers":3,"declined":0},{"label":"TVS Motor","joined":2,"offers":4,"declined":1},{"label":"Deloitte","joined":2,"offers":4,"declined":2},{"label":"Schneider Electric","joined":2,"offers":3,"declined":0},{"label":"IBM","joined":2,"offers":3,"declined":1},{"label":"Siemens","joined":2,"offers":3,"declined":1},{"label":"Cognizant","joined":2,"offers":3,"declined":0},{"label":"EXL","joined":2,"offers":2,"declined":0},{"label":"Caterpillar","joined":2,"offers":2,"declined":0},{"label":"HD Hyundai Construction Equipment","joined":2,"offers":2,"declined":0},{"label":"Pierian Services","joined":2,"offers":2,"declined":0},{"label":"Terex India","joined":2,"offers":2,"declined":0},{"label":"Alten","joined":2,"offers":2,"declined":0},{"label":"LAPP India","joined":2,"offers":2,"declined":0},{"label":"Genpact","joined":1,"offers":3,"declined":1},{"label":"Daimler Truck","joined":2,"offers":2,"declined":0},{"label":"Ford","joined":1,"offers":3,"declined":0},{"label":"Not provided","joined":2,"offers":2,"declined":0},{"label":"Triveni Engineering","joined":2,"offers":2,"declined":0},{"label":"HCL","joined":1,"offers":2,"declined":0},{"label":"SLK","joined":1,"offers":2,"declined":1},{"label":"Virtusa","joined":1,"offers":2,"declined":1},{"label":"Timken","joined":1,"offers":2,"declined":1},{"label":"Cummins","joined":1,"offers":2,"declined":1},{"label":"Randstad","joined":1,"offers":2,"declined":0},{"label":"Capgemini","joined":1,"offers":2,"declined":0},{"label":"Toyota","joined":1,"offers":2,"declined":0},{"label":"Not provided (company column holds a person's name)","joined":1,"offers":1,"declined":0},{"label":"Not provided (experience value in the company column)","joined":1,"offers":1,"declined":0},{"label":"LTM","joined":0,"offers":2,"declined":0},{"label":"Monarch Business Solutions","joined":0,"offers":2,"declined":0},{"label":"Other companies – one hire or offer each (128 companies)","joined":94,"offers":128,"declined":17}],"partners":[{"label":"CGI","joined":5,"offers":6,"declined":1},{"label":"Randstad","joined":4,"offers":4,"declined":0},{"label":"HCL","joined":3,"offers":4,"declined":0},{"label":"Ascendum","joined":2,"offers":2,"declined":0},{"label":"Tarang Software Technologies","joined":2,"offers":2,"declined":0},{"label":"Tech Mahindra","joined":2,"offers":2,"declined":0},{"label":"ASM Technologies","joined":1,"offers":2,"declined":0},{"label":"Not provided","joined":1,"offers":1,"declined":0},{"label":"Other partner firms – one each (5 firms)","joined":5,"offers":5,"declined":0}],"specific":[{"label":"Direct – SuccessFactors (careers site)","joined":124,"offers":143,"declined":16},{"label":"Employee referral","joined":51,"offers":57,"declined":3},{"label":"Conversion – FTC / role conversion","joined":44,"offers":43,"declined":0},{"label":"Conversion – Consultant conversion","joined":32,"offers":34,"declined":2},{"label":"Direct – Naukri","joined":22,"offers":32,"declined":6},{"label":"Conversion – NATS conversion","joined":22,"offers":22,"declined":1},{"label":"Direct – LinkedIn","joined":14,"offers":12,"declined":1},{"label":"Vendor – Dominic Lewis","joined":6,"offers":9,"declined":2},{"label":"Conversion – ExcelHER conversion","joined":7,"offers":7,"declined":0},{"label":"Vendor – RGF","joined":4,"offers":6,"declined":1},{"label":"Vendor – Vipany","joined":4,"offers":5,"declined":0},{"label":"Vendor – Quest W","joined":3,"offers":5,"declined":2},{"label":"Direct – Direct approach","joined":3,"offers":3,"declined":0},{"label":"Conversion – GAT conversion","joined":3,"offers":2,"declined":0},{"label":"Direct – Internal job posting / HRBP","joined":2,"offers":2,"declined":0},{"label":"Direct – FTC extension / rehire","joined":2,"offers":2,"declined":0},{"label":"Vendor – Careernet","joined":2,"offers":1,"declined":1},{"label":"Vendor – BOP","joined":1,"offers":1,"declined":1},{"label":"Vendor – Masadir HR","joined":1,"offers":1,"declined":0},{"label":"Conversion – Blue-collar to white-collar","joined":1,"offers":1,"declined":0},{"label":"Vendor – not specified","joined":1,"offers":1,"declined":0},{"label":"Conversion – International transfer (Sweden to India)","joined":1,"offers":1,"declined":0},{"label":"Vendor – Global Stead Consultants","joined":1,"offers":1,"declined":0},{"label":"Direct – NATS conversion / rehire","joined":1,"offers":1,"declined":0}],"distinctExternal":132};
  function apply() {
    const S = TA.Store;
    const applied = S.state.meta.appliedPacks || [];
    if (applied.indexOf(PACK2) >= 0 || applied.indexOf('lateral-scope-2026-10-20-upd1') < 0) return false;
    const first = applied.indexOf(PACK) < 0;
    const ytd = S.get('periods', 'per_ht_2026ytd'); if (!ytd) return false;
    S.recoveryPoint(first ? 'Before adding sources of hire and previous companies' : 'Before merging company names in the previous-company tables');
    const origin = 'Import: ' + SRC, c = A.coverage;
    const cov = 'Joiners and offers without a recorded previous company are left out (' + WHO + '); shares are of joiners with a known company. Same or similar company names are merged.';
    const bd = (title, dimension, rows, notes) => {
      const ex = S.list('breakdowns').find(b => b.title === title && b.periodId === ytd.id);
      if (ex) { S.update('breakdowns', ex.id, { rows, notes }); return; }
      const r = S.add('breakdowns', { title, periodId: ytd.id, dimension, source: SRC, notes }, origin); S.update('breakdowns', r.id, { rows }, { silent: true });
    };
    bd('Lateral hiring by hire type (external vs conversion)', 'Hire type', A.kind,
      'Lateral hires incl. conversions and FTC. "From Volvo payroll" = previous company recorded as Volvo Group (FTC, NATS, GAT, ExcelHER, intern). "Partner firm" = consultant or contractor converted from an external employer. ' + cov);
    bd('Lateral hiring by specific source (channel, agency, conversion type)', 'Specific source', A.specific,
      'From the tracker\'s Specific Source column, grouped. Vendor rows show the agency only. Referral details are not stored.');
    bd('External lateral hires by previous company', 'Previous company', A.external,
      'Non-conversion lateral hires. ' + A.distinctExternal + ' different previous employers among joiners with a known company. Companies with fewer than two hires or offers are grouped. ' + ' ' + cov + ' Two rows are not usable as recorded (a value in the wrong column; a person\'s name in the company column) and are shown as Not provided.');
    bd('Consultant / contractor conversions by partner firm', 'Partner firm', A.partners,
      'Conversions where the previous employer is an external consulting or staffing firm (not Volvo payroll).');
    const y = A.kind, ext = y.find(r => /^External/.test(r.label)), inn = y.find(r => /Volvo payroll/.test(r.label)), par = y.find(r => /Partner firm|partner firm/.test(r.label));
    const pct = (a, b) => TA.fmtPct(a / b * 100);
    const e = A.external.filter(r => !/^Not provided|^Other|^Volvo/.test(r.label)).slice(0, 3);
    const extKnown = A.external.filter(r => !/^Not provided/.test(r.label)).reduce((s, r) => s + r.joined, 0);
    const sp = (l) => A.specific.find(r => r.label === l) || { joined: 0, offers: 0, declined: 0 };
    const sf = sp('Direct – SuccessFactors (careers site)'), nk = sp('Direct – Naukri'), ref = sp('Employee referral');
    const INS = [
      ['External market hires: ' + ext.joined + ' of ' + c.joiners + ' lateral joiners (' + pct(ext.joined, c.joiners) + ')',
        'External market hires ' + ext.joined + '; conversions from Volvo payroll ' + inn.joined + '; consultant/contractor conversions from partner firms ' + par.joined + '; other conversions ' + (c.joiners - ext.joined - inn.joined - par.joined) + ' (1 Jan–14 Oct 2026).',
        'Conversions account for about a third of lateral joiners, so internal pipelines (FTC, NATS, GAT, ExcelHER, consultants) are a material lateral source.', 'Conversion counts follow the tracker\'s Source field.',
        'Review conversion volumes with hiring managers when setting the 2027 lateral plan.'],
      ['Previous employers are widely spread: ' + A.distinctExternal + ' companies; largest ' + e.map(r => r.label + ' ' + r.joined).join(', '),
        'Among ' + extKnown + ' external lateral joiners with a known previous company, the three largest sources are ' + e.map(r => r.label + ' (' + r.joined + ')').join(', ') + ' – together ' + pct(e.reduce((s, r) => s + r.joined, 0), extKnown) + '.',
        'No single company dominates external lateral hiring.', 'Same or similar company names were merged; joiners without a recorded company are left out. Counts per company are small.',
        'Use the company table to target sourcing (e.g. talent maps) rather than to judge recruiters.'],
      ['Careers site (SuccessFactors) is the largest channel: ' + sf.joined + ' lateral joiners; referrals ' + ref.joined,
        'SuccessFactors careers site ' + sf.joined + ' joiners (offer decline ' + pct(sf.declined, sf.offers) + ' of ' + sf.offers + ' offers); employee referrals ' + ref.joined + ' (decline ' + pct(ref.declined, ref.offers) + '); Naukri ' + nk.joined + ' (decline ' + pct(nk.declined, nk.offers) + ' of ' + nk.offers + ' offers).',
        'Referral offers were declined least often; job-portal offers most often among the larger channels.', 'Offer counts per channel are small and pending offers are included in the denominators; differences are indicative only.',
        'Track decline rate by channel monthly once outcomes of pending offers are known.']
    ];
    INS.forEach(([title, obs, interp, unc, act]) => {
      const key = title.split(':')[0];
      const ex = S.list('insights', { archived: true }).find(i => i.generatedBy === 'Hiring2026 tracker aggregates' && i.title.split(':')[0] === key);
      if (ex) { if (ex.observation !== obs || ex.uncertainty !== unc || ex.title !== title) S.update('insights', ex.id, { title, observation: obs, uncertainty: unc }); return; }
      S.add('insights', { title, type: 'Descriptive finding', observation: obs, supportingData: SRC + '; population: lateral hires incl. conversions and FTC, 1 Jan–14 Oct 2026.', method: 'Counts and shares recalculated from the tracker (joiners by joining date; offers and declines by offer date).',
        interpretation: interp, uncertainty: unc, recommendedAction: act, owner: null, reviewDate: null, status: 'New', generatedBy: 'Hiring2026 tracker aggregates' }, origin);
    });
    S.setMeta({ appliedPacks: (S.state.meta.appliedPacks || []).concat(first ? [PACK, PACK2] : [PACK2]) });
    TA.toast(first ? 'Added sources of hire and previous companies (lateral)' : 'Merged company names; rows without a company left out');
    return true;
  }
  const prev = TA.applyDataPacks;
  TA.applyDataPacks = function () { const a = prev ? prev() : false; const b = apply(); return a || b; };
})();
