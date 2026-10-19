/* Data pack: process-improvement projects from "TA year plan India – Strategic Alignment 2026" (deck supplied 19 Oct 2026).
   Applied once per dashboard (recorded in meta.appliedPacks). Text is taken from the deck; where the deck gives no value
   the field is left empty ("Not provided"). Conflicts between slides are recorded as open questions, not resolved. */
(function () {
  'use strict';
  const TA = window.TA;
  const PACK = 'ta-yearplan-2026';
  const SRC = 'TA year plan India – Strategic Alignment 2026 (deck, supplied 19 Oct 2026)';
  const IN_PROGRESS = 'In progress (RAG not assessed)';

  // [name, pillar, owner (deck), scope, completed, remains, planned (as written), deadline, attribution, milestones[[name, date, status]], dependencies]
  const P = [
    ['Leadership, Niche Hiring & Talent Pipeline', 'Unleash Human Potential', 'Kathir',
      'Build a virtual bench for critical and senior leadership roles (MD-1 / MD-2). Proactive mapping for high-impact, low-supply skill areas to future-proof organisational capability. NATS, PMIS.',
      'Created formats, collected data about competition companies – work in progress. NATS is a matured model. PhD scholars.',
      'Collating data, validation. PMIS.', 'Stage 1 – by 30 Sept 2026; Stage 2 – 30 Dec 2026', '2026-12-30', 'Team execution',
      [['Stage 1', '2026-09-30', 'Status not reported'], ['Stage 2', '2026-12-30', 'Planned']]],
    ['University Relations', 'Unleash Human Potential', null,
      'Structured early-talent pipeline: faculty connect, curriculum design – cultivating innovation culture and deep-tech talent from source.',
      'Process and pilots are done. AICTE Professors and PoP program to be strengthened.',
      'Integration of different elements of this program. An app, portal or tool is required so that these programs are not person-dependent.',
      'Except app & portal, will be completed by Dec.', null, 'Not classified', []],
    ['ExcelHER · PwD · Veterans Diversity Pipeline', 'Unleash Human Potential', 'Padma',
      'Dedicated diversity hiring streams to embed measurable inclusion into the talent supply chain, broadening leadership and innovation potential across BUs.',
      'ExcelHER is matured. PwD – do we need further action on this? Veteran program to be formalised. Talent pipeline for blue-collar hiring through MEG.',
      'Decision on PwD hiring and Veteran officer hiring.', 'Dec 26', null, 'Team execution', []],
    ['TA as Talent Advisors', 'People Experience', 'Smruthi',
      'Shift from transactional hiring to consultative TA by measuring culture fitment, onboarding success and 12-month performance – elevating candidate and hiring-manager experience.',
      'Competency building through different modes of training.',
      'Defining what is required to be considered a talent advisor. Assessment, certifications.', 'Stage 1 – 30 Sept', null, 'Team execution',
      [['Stage 1', '2026-09-30', 'Status not reported']]],
    ['Welcome Experience', 'People Experience', 'Mikki',
      'Structured onboarding journey for candidates – personalised touchpoints, buddy system.',
      'Onboarding project stage 2 completed.', 'Infrastructure. Measurement. Stage 3.',
      'Planned Stage 2 completed; Stage 3 depends on fund availability.', null, 'Team execution',
      [['Stage 2', null, 'Done'], ['Stage 3', null, 'Planned']], 'Stage 3 depends on fund availability.'],
    ['Employer Branding & Candidate Engagement', 'People Experience', 'Shreyashi',
      'Social media hiring campaigns, talent communities, reinforcing employer brand / employee referral process. Student ambassador, teachers training, AICTE teachers.',
      'University relations, social media presence. Employee referral process. Student ambassador, teachers training. AICTE teachers.',
      'Talent communities: returning Indians, boomerang employees, communities of niche skills.', '30th Dec.', '2026-12-30', 'Team execution', []],
    ['Market/Talent Intelligence', 'Data-Driven Insights', 'Kathir',
      'Initiative to enable the Talent Acquisition team to update and support the business to make decisions.',
      'Talent intelligence – data collection, reports within the team.', 'How it can be published to the business.', null, null, 'Team execution', []],
    ['AI-Enabled Screening Pilot', 'Data-Driven Insights', 'Ranjith',
      'Pilot to enable better screening using tools.',
      'Starting of pilot.', 'Training bot. Learnings from pilot. Collating information. Decision on continuing pilot.', 'Stage 1 – 01st Sept', null, 'TA Head leadership contribution',
      [['Stage 1', '2026-09-01', 'Status not reported']]],
    ['Recruiter Capability & Competency Metrics', 'Data-Driven Insights', 'Smruthi',
      'Competency framework benchmarking with measurable recruiter performance indicators – linking TA team / hiring-manager capability growth to hiring outcomes and business impact. (Detail slide title: "Capability building".)',
      'Competency framework and behaviour indicators are defined and shared. Clear measurement of performance. Interviewing skills training.',
      'Defining how TA competency impacts business outcome. Performance-to-impact measurement. 100 managers trained on interview skills.', '30th Dec.', '2026-12-30', 'Team execution', []],
    ['Automation Roadmap for TA', 'Sustainable Operational Excellence', 'Ranjith',
      'SAP SuccessFactors–Outlook scheduling integration (Priority 1), HireVue AI video interviewing in India to reduce transactional load and accelerate cycle time.',
      'Identified tools.', 'Evaluation of tools.', 'Dec 30th', '2026-12-30', 'TA Head leadership contribution', []],
    ['Vendor Governance & Evaluation Framework', 'Sustainable Operational Excellence', 'Mikki / Ranjith',
      'Structured vendor assessment with Gate 1 eligibility criteria across three hiring categories. Ripplehire/ERIN for referral optimisation – driving efficiency, governance and cost control.',
      'Details collected from vendors. Eligibility criteria defined.', 'Evaluation.', '30th Dec. New vendor list to be ready by 30th Dec.', '2026-12-30', 'Not classified',
      [['New vendor list ready', '2026-12-30', 'Planned']]],
    ['TA Process Manual & Standardisation', 'Sustainable Operational Excellence', 'Mikki',
      'Fully rewritten TA Process Manual embedding standardised SOPs, Six Sigma discipline and compliance guardrails – simplifying end-to-end hiring operations across all seven BUs.',
      'Documented and standardised all processes within TA.', 'Updates based on changes.', null, null, 'Team execution', []]
  ];

  const QUESTIONS = [
    ['ExcelHER · PwD · Veterans: marked "completed" on the overview slide, but work remains', 'Data conflict', 'Essential', 'Projects – ExcelHER · PwD · Veterans Diversity Pipeline',
      'Slide 3 shows "Padma – completed". The detail slide lists "What remains: decision on PwD hiring and Veteran officer hiring" with planned completion "Dec 26". Recorded as in progress until confirmed.', 'Overview slide: completed', 'Detail slide: remaining decisions, Dec 26'],
    ['Automation Roadmap: marked "completed" on the overview slide, but tool evaluation remains', 'Data conflict', 'Essential', 'Projects – Automation Roadmap for TA',
      'Slide 3 shows "Ranjith – Completed". The detail slide lists "Completed: identified tools; What remains: evaluation of tools; planned Dec 30th". Recorded as in progress until confirmed.', 'Overview slide: completed', 'Detail slide: evaluation remains, Dec 30'],
    ['Who now owns the ExcelHER · PwD · Veterans project?', 'Missing data', 'Important', 'Projects – ExcelHER · PwD · Veterans Diversity Pipeline',
      'The deck names Padma as owner; Padma has left the team.'],
    ['Stage dates passed without a reported status', 'Missing data', 'Important', 'Projects – milestones',
      'Leadership, Niche Hiring & Talent Pipeline Stage 1 (30 Sep 2026), TA as Talent Advisors Stage 1 (30 Sep 2026) and AI-Enabled Screening Pilot Stage 1 (1 Sep 2026): were these achieved?'],
    ['Planned completion dates to confirm', 'Definition to confirm', 'Important', 'Projects',
      'No date given for Market/Talent Intelligence, TA Process Manual and Welcome Experience Stage 3. University Relations says "by Dec" (no day). ExcelHER says "Dec 26" – 26 December 2026 or December 2026?'],
    ['Delivery status (on track / at risk) not stated in the deck', 'Definition to confirm', 'Important', 'Projects',
      'The deck reports what is completed and what remains, not a RAG status. Projects are recorded as "In progress (RAG not assessed)"; update each status in the Projects table.'],
    ['Who agreed the 2026 projects, and when?', 'Missing data', 'Nice to have', 'Projects',
      'Recorded as agreed commitments for 2026 as stated by the TA Head; the approver and date are not in the deck.', null, null, 'Dr. Ranjith TP']
  ];

  const DECISIONS = [
    ['Decide on PwD hiring and Veteran officer hiring', 'ExcelHER · PwD · Veterans Diversity Pipeline – listed under "What remains". The deck also asks whether further action is needed on PwD.'],
    ['Decide whether to continue the AI-enabled screening pilot', 'AI-Enabled Screening Pilot – "decision on continuing pilot" listed under "What remains", after learnings are collated.']
  ];

  function apply() {
    const S = TA.Store;
    const applied = S.state.meta.appliedPacks || [];
    if (applied.indexOf(PACK) >= 0) return false;
    S.recoveryPoint('Before adding projects from the TA year plan 2026 deck');
    const origin = 'Import: ' + SRC;
    let added = 0, skipped = [];
    P.forEach(([name, pillar, owner, scope, done, remains, planned, deadline, attribution, milestones, deps]) => {
      if (TA.findDuplicates('projects', { name }).length) { skipped.push(name); return; }
      const prj = S.add('projects', {
        name, pillar, owner, intendedOutcome: scope, completedToDate: done, remainingWork: remains, plannedCompletionText: planned,
        originalDeadline: deadline, agreement: 'Agreed commitment', agreedWith: null, agreedDate: null, attribution,
        status: IN_PROGRESS, statusAsOf: null, statusComment: 'Status as reported in the TA year plan deck; deck date not stated.',
        dependencies: deps || null, benefitStatus: null, notes: 'Source: ' + SRC + '.'
      }, origin);
      (milestones || []).forEach(([mn, date, status]) => S.add('milestones', { projectId: prj.id, name: mn, plannedDate: date, revisedDate: null, actualDate: null, status, notes: 'From the deck.' }, origin));
      added++;
    });
    QUESTIONS.forEach(([title, type, priority, relatedTo, detail, a, b, owner]) => S.add('questions', { title, type, priority, relatedTo, detail, valueA: a || null, valueB: b || null,
      owner: owner || 'TA Head / project owner', raisedDate: TA.todayIso(), status: 'Open', resolution: null, resolvedDate: null }, origin));
    DECISIONS.forEach(([title, context]) => S.add('decisions', { title, type: 'Decision required', requestedFrom: null, context, options: null, recommendation: null, dueDate: null, status: 'Open', outcome: null, decidedBy: null, decidedDate: null }, origin));
    S.setMeta({ appliedPacks: applied.concat([PACK]) });
    TA.toast('Added ' + added + ' projects from the TA year plan 2026 deck' + (skipped.length ? ' (' + skipped.length + ' already present, skipped)' : ''));
    return true;
  }

  TA.applyDataPacks = apply;
})();
