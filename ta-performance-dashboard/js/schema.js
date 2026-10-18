/* Entity schemas and seed data.
   Seed content comes only from the initial reference data in the dashboard brief.
   Anything not supplied is left empty and displayed as "Not provided". */
(function () {
  'use strict';

  const ATTRIBUTION = ['TA Head leadership contribution', 'Team execution', 'Shared business outcome', 'Not classified'];
  const AREAS = ['Talent attraction & recruitment', 'Onboarding', 'Talent-pipeline programmes', 'Team performance & development',
    'Process improvement & projects', 'Self-improvement & leadership', 'Leadership feedback', 'Business value & savings'];

  // Field types: text, textarea, number, date, select, bool, ref (entity link)
  const ENTITIES = {
    periods: {
      label: 'Reporting periods', singular: 'Reporting period', title: 'label',
      fields: [
        { k: 'label', l: 'Period label', t: 'text', req: true },
        { k: 'type', l: 'Period type', t: 'select', o: ['YTD', 'Month', 'Quarter', 'Annual', 'Custom'], req: true },
        { k: 'scope', l: 'Data scope', t: 'select', o: ['Business scorecard', 'Recruiter results', 'Other'], help: 'Periods with different scopes or cut-offs are not compared automatically.' },
        { k: 'start', l: 'Start date', t: 'date', req: true },
        { k: 'end', l: 'End date', t: 'date', req: true },
        { k: 'cutoff', l: 'Source data cut-off', t: 'date' },
        { k: 'source', l: 'Source', t: 'text' },
        { k: 'notes', l: 'Notes', t: 'textarea', full: true }
      ],
      cols: ['label', 'type', 'scope', 'start', 'end', 'cutoff', 'source']
    },
    commitments: {
      label: 'Commitments', singular: 'Commitment', title: 'title',
      fields: [
        { k: 'title', l: 'Commitment', t: 'text', req: true, full: true },
        { k: 'classification', l: 'Classification', t: 'select', o: ['Agreed commitment', 'Proposal', 'Source-reported target (agreement not evidenced)'], req: true,
          help: 'Only mark "Agreed commitment" when the agreement is evidenced (who agreed and when).' },
        { k: 'area', l: 'Area', t: 'select', o: AREAS },
        { k: 'periodId', l: 'Reporting period', t: 'ref', ref: 'periods' },
        { k: 'agreedWith', l: 'Agreed with', t: 'text' },
        { k: 'agreedDate', l: 'Agreed date', t: 'date' },
        { k: 'targetDescription', l: 'Target / success measure', t: 'textarea', full: true },
        { k: 'status', l: 'Status', t: 'select', o: ['Not assessed', 'Not started', 'On track', 'At risk', 'Off track', 'Achieved', 'Partly achieved', 'Not achieved'] },
        { k: 'attribution', l: 'Contribution type', t: 'select', o: ATTRIBUTION },
        { k: 'owner', l: 'Owner', t: 'text' },
        { k: 'source', l: 'Source', t: 'text' },
        { k: 'notes', l: 'Notes', t: 'textarea', full: true }
      ],
      cols: ['title', 'classification', 'area', 'periodId', 'status', 'agreedWith', 'owner']
    },
    programmes: {
      label: 'Programme results', singular: 'Programme result', title: 'name', dupKeys: ['name', 'periodId'],
      fields: [
        { k: 'name', l: 'Programme', t: 'text', req: true },
        { k: 'periodId', l: 'Reporting period', t: 'ref', ref: 'periods', req: true },
        { k: 'group', l: 'Programme group', t: 'select', o: ['Lateral hiring', 'Talent-pipeline programme', 'Internal mobility', 'Other', 'Not classified'],
          help: 'Grouping is used for reporting views; confirm the classification.' },
        { k: 'target', l: 'Target (joiners)', t: 'number', min: 0 },
        { k: 'joined', l: 'Joined (source-reported)', t: 'number', min: 0 },
        { k: 'offers', l: 'Offers (source-reported)', t: 'number', min: 0 },
        { k: 'attribution', l: 'Contribution type', t: 'select', o: ATTRIBUTION },
        { k: 'owner', l: 'Data owner', t: 'text' },
        { k: 'source', l: 'Source', t: 'text' },
        { k: 'dataDate', l: 'Data update date', t: 'date' },
        { k: 'notes', l: 'Notes', t: 'textarea', full: true }
      ],
      cols: ['name', 'group', 'periodId', 'target', 'joined', '_attain', '_gap', 'offers', 'source']
    },
    metrics: {
      label: 'Metric definitions', singular: 'Metric definition', title: 'name', dupKeys: ['name'],
      fields: [
        { k: 'name', l: 'Metric', t: 'text', req: true },
        { k: 'category', l: 'Category', t: 'select', o: ['Hiring volume', 'Offers', 'Requisitions', 'Speed', 'Sourcing mix', 'Diversity & inclusion', 'Experience', 'Onboarding', 'Quality & retention', 'Cost', 'Other'] },
        { k: 'definition', l: 'Definition', t: 'textarea', full: true },
        { k: 'definitionStatus', l: 'Definition status', t: 'select', o: ['Source-provided', 'Proposed – to confirm', 'Not provided'] },
        { k: 'unit', l: 'Unit', t: 'select', o: ['count', '%', 'days', 'score', 'INR', 'hours', 'ratio'], req: true },
        { k: 'direction', l: 'Preferred direction', t: 'select', o: ['Higher is better', 'Lower is better', 'Context-dependent', 'Not provided'] },
        { k: 'calculation', l: 'Calculation', t: 'textarea', full: true, help: 'For recalculation, observations can carry a numerator and denominator.' },
        { k: 'owner', l: 'Metric owner', t: 'text' },
        { k: 'source', l: 'Source system / report', t: 'text' },
        { k: 'notes', l: 'Notes', t: 'textarea', full: true }
      ],
      cols: ['name', 'category', 'unit', 'definitionStatus', 'direction', 'owner', 'source']
    },
    observations: {
      label: 'Metric results', singular: 'Metric result', title: '_obsTitle', dupKeys: ['metricId', 'periodId', 'population'],
      fields: [
        { k: 'metricId', l: 'Metric', t: 'ref', ref: 'metrics', req: true },
        { k: 'periodId', l: 'Reporting period', t: 'ref', ref: 'periods', req: true },
        { k: 'population', l: 'Population', t: 'text', help: 'e.g. all joiners, lateral hires only. Results with different populations are not compared.' },
        { k: 'target', l: 'Target', t: 'number' },
        { k: 'actualReported', l: 'Actual (source-reported)', t: 'number' },
        { k: 'numerator', l: 'Numerator (for recalculation)', t: 'number' },
        { k: 'denominator', l: 'Denominator (for recalculation)', t: 'number' },
        { k: 'calcNote', l: 'Calculation note', t: 'text', full: true },
        { k: 'attribution', l: 'Contribution type', t: 'select', o: ATTRIBUTION },
        { k: 'source', l: 'Source', t: 'text' },
        { k: 'owner', l: 'Data owner', t: 'text' },
        { k: 'dataDate', l: 'Data update date', t: 'date' },
        { k: 'notes', l: 'Notes', t: 'textarea', full: true }
      ],
      cols: ['metricId', 'periodId', 'population', 'target', 'actualReported', '_recalc', 'source', 'dataDate']
    },
    team: {
      label: 'Team members', singular: 'Team member', title: 'name', dupKeys: ['name'], confidential: true,
      fields: [
        { k: 'name', l: 'Name', t: 'text', req: true },
        { k: 'role', l: 'Role', t: 'text' },
        { k: 'employmentStatus', l: 'Employment status', t: 'select', o: ['Active', 'Left', 'On leave', 'Vacancy – replacement hiring underway', 'Not provided'], req: true },
        { k: 'businessCoverage', l: 'Business coverage', t: 'textarea', help: 'Shared coverage is recorded per person; totals are not summed across people.' },
        { k: 'startDate', l: 'Start date in team', t: 'date' },
        { k: 'endDate', l: 'Leaving date', t: 'date' },
        { k: 'goals', l: 'Goals', t: 'textarea', full: true },
        { k: 'resultsSummary', l: 'Results summary', t: 'textarea', full: true },
        { k: 'sourcingIndicators', l: 'Sourcing indicators', t: 'textarea' },
        { k: 'cycleTimeIndicators', l: 'Cycle-time indicators', t: 'textarea' },
        { k: 'roleComplexity', l: 'Role complexity', t: 'textarea', help: 'Context needed before comparing results between people.' },
        { k: 'hiringMix', l: 'Hiring mix', t: 'textarea' },
        { k: 'targetExposure', l: 'Target exposure / tenure context', t: 'textarea' },
        { k: 'coaching', l: 'Coaching notes', t: 'textarea' },
        { k: 'backupCoverage', l: 'Backup coverage', t: 'textarea' },
        { k: 'successionReadiness', l: 'Succession readiness', t: 'select', o: ['Not assessed', 'Ready now', 'Ready in 1–2 years', 'Ready in 3+ years', 'Not applicable'] },
        { k: 'humanReviewBy', l: 'Human review by', t: 'text', help: 'Required before any insight is used in an individual performance assessment.' },
        { k: 'humanReviewDate', l: 'Human review date', t: 'date' },
        { k: 'source', l: 'Source', t: 'text' },
        { k: 'notes', l: 'Notes', t: 'textarea', full: true }
      ],
      cols: ['name', 'role', 'employmentStatus', 'businessCoverage', 'successionReadiness', 'humanReviewDate']
    },
    recruiterResults: {
      label: 'Recruiter results', singular: 'Recruiter result', title: '_rrTitle', confidential: true, dupKeys: ['memberId', 'periodId'],
      fields: [
        { k: 'memberId', l: 'Team member', t: 'ref', ref: 'team', req: true },
        { k: 'periodId', l: 'Reporting period', t: 'ref', ref: 'periods', req: true },
        { k: 'offerTarget', l: 'Offer target', t: 'number', min: 0 },
        { k: 'offers', l: 'Offers (source-reported)', t: 'number', min: 0 },
        { k: 'offerAttainmentReported', l: 'Offer attainment % (source-reported)', t: 'number' },
        { k: 'joinTarget', l: 'Joining target', t: 'number', min: 0 },
        { k: 'joins', l: 'Joins (source-reported)', t: 'number', min: 0 },
        { k: 'joinAttainmentReported', l: 'Joining attainment % (source-reported)', t: 'number' },
        { k: 'source', l: 'Source', t: 'text' },
        { k: 'dataDate', l: 'Data update date', t: 'date' },
        { k: 'notes', l: 'Notes', t: 'textarea', full: true }
      ],
      cols: ['memberId', 'periodId', 'offerTarget', 'offers', 'offerAttainmentReported', '_offerRecalc', 'joinTarget', 'joins', '_joinRecalc']
    },
    devItems: {
      label: 'Development & capability', singular: 'Development item', title: 'title',
      fields: [
        { k: 'subject', l: 'Person', t: 'subject', req: true, help: 'TA Head (self) or a team member.' },
        { k: 'kind', l: 'Type', t: 'select', req: true, o: ['Development goal', 'Learning', 'Certification', 'Leadership behaviour commitment', 'Broader P&C contribution', 'Stakeholder collaboration', 'Succession-building activity', 'Coaching'] },
        { k: 'title', l: 'Title', t: 'text', req: true, full: true },
        { k: 'learningStatus', l: 'Status', t: 'select', o: ['Planned', 'Ongoing', 'Completed', 'Not applicable'], req: true },
        { k: 'startDate', l: 'Start date', t: 'date' },
        { k: 'completionDate', l: 'Completion date', t: 'date' },
        { k: 'applicationAtWork', l: 'Application at work', t: 'textarea', full: true, help: 'Where and how the learning was applied. Attendance or certification alone is not evidence of capability.' },
        { k: 'capabilityEvidence', l: 'Capability evidence', t: 'textarea', full: true },
        { k: 'capabilityStage', l: 'Capability stage', t: 'select', o: ['Not yet evidenced', 'Application in progress', 'Applied at work – evidence recorded', 'Capability demonstrated – reviewer validated'] },
        { k: 'reviewer', l: 'Reviewer', t: 'text' },
        { k: 'reviewDate', l: 'Last review date', t: 'date' },
        { k: 'nextReviewDate', l: 'Next review date', t: 'date' },
        { k: 'projectId', l: 'Linked project', t: 'ref', ref: 'projects' },
        { k: 'notes', l: 'Notes', t: 'textarea', full: true }
      ],
      cols: ['subject', 'kind', 'title', 'learningStatus', 'capabilityStage', 'reviewDate', 'nextReviewDate']
    },
    projects: {
      label: 'Projects & process improvement', singular: 'Project', title: 'name', dupKeys: ['name'],
      fields: [
        { k: 'name', l: 'Project', t: 'text', req: true, full: true },
        { k: 'businessProblem', l: 'Business problem', t: 'textarea', full: true },
        { k: 'intendedOutcome', l: 'Intended outcome', t: 'textarea', full: true },
        { k: 'commitmentId', l: 'Linked commitment', t: 'ref', ref: 'commitments' },
        { k: 'attribution', l: 'Contribution type', t: 'select', o: ATTRIBUTION },
        { k: 'sponsor', l: 'Sponsor', t: 'text' },
        { k: 'owner', l: 'Accountable owner', t: 'text' },
        { k: 'contributors', l: 'Contributors', t: 'text', full: true },
        { k: 'baseline', l: 'Baseline', t: 'textarea' },
        { k: 'target', l: 'Target', t: 'textarea' },
        { k: 'dependencies', l: 'Dependencies', t: 'textarea', full: true },
        { k: 'startDate', l: 'Start date', t: 'date' },
        { k: 'originalDeadline', l: 'Original deadline', t: 'date', help: 'Preserved; later changes are recorded as revisions.' },
        { k: 'revisedDeadline', l: 'Current revised deadline', t: 'date' },
        { k: 'revisionReason', l: 'Reason for latest revision', t: 'text' },
        { k: 'status', l: 'Delivery status', t: 'select', req: true, o: ['Proposed', 'Not started', 'On track', 'At risk', 'Delayed', 'On hold', 'Completed', 'Cancelled'] },
        { k: 'completionDate', l: 'Completion date', t: 'date' },
        { k: 'completionEvidence', l: 'Completion evidence', t: 'textarea', full: true },
        { k: 'benefitStatus', l: 'Benefit realisation status', t: 'select', o: ['Not started', 'Expected – not yet measurable', 'Measuring', 'Partially realised – validated', 'Realised – validated', 'Not realised'],
          help: 'Separate from delivery status: a completed project may not yet have realised benefits.' },
        { k: 'expectedBenefits', l: 'Expected benefits', t: 'textarea', full: true },
        { k: 'realisedBenefits', l: 'Realised benefits (measured)', t: 'textarea', full: true },
        { k: 'benefitValidationEvidence', l: 'Benefit validation evidence', t: 'textarea', full: true },
        { k: 'implementationCost', l: 'Implementation cost (INR)', t: 'number', min: 0 },
        { k: 'risks', l: 'Risks', t: 'textarea' },
        { k: 'decisions', l: 'Decisions', t: 'textarea' },
        { k: 'notes', l: 'Notes', t: 'textarea', full: true }
      ],
      cols: ['name', 'owner', 'sponsor', 'status', 'benefitStatus', 'originalDeadline', 'revisedDeadline', 'attribution']
    },
    milestones: {
      label: 'Project milestones', singular: 'Milestone', title: 'name',
      fields: [
        { k: 'projectId', l: 'Project', t: 'ref', ref: 'projects', req: true },
        { k: 'name', l: 'Milestone', t: 'text', req: true },
        { k: 'plannedDate', l: 'Planned date', t: 'date' },
        { k: 'revisedDate', l: 'Revised date', t: 'date' },
        { k: 'actualDate', l: 'Actual date', t: 'date' },
        { k: 'status', l: 'Status', t: 'select', o: ['Planned', 'In progress', 'Done', 'Missed', 'Cancelled'] },
        { k: 'notes', l: 'Notes', t: 'textarea', full: true }
      ],
      cols: ['projectId', 'name', 'plannedDate', 'revisedDate', 'actualDate', 'status']
    },
    feedback: {
      label: 'Leadership feedback', singular: 'Feedback item', title: '_fbTitle',
      fields: [
        { k: 'provider', l: 'Feedback provider', t: 'text', req: true },
        { k: 'providerRole', l: 'Provider role', t: 'text' },
        { k: 'date', l: 'Date', t: 'date', req: true },
        { k: 'context', l: 'Context', t: 'text', full: true, help: 'e.g. quarterly review, 1:1, business review.' },
        { k: 'theme', l: 'Theme', t: 'select', req: true, o: ['Hiring speed', 'Hiring quality', 'Data accuracy', 'Operational preparedness', 'Team capability', 'Succession', 'Fairness', 'Transparency', 'Accountability', 'Broader P&C participation', 'Other'] },
        { k: 'wordingType', l: 'Wording type', t: 'select', req: true, o: ['Exact wording', 'Paraphrase (labelled)'] },
        { k: 'wording', l: 'Feedback (exact wording or labelled paraphrase)', t: 'textarea', req: true, full: true },
        { k: 'response', l: 'TA Head response', t: 'textarea', full: true },
        { k: 'commitmentType', l: 'Response type', t: 'select', o: ['Proposal', 'Agreed commitment'], help: 'Agreed only when the stakeholder has accepted the action.' },
        { k: 'agreedAction', l: 'Action', t: 'textarea', full: true },
        { k: 'owner', l: 'Action owner', t: 'text' },
        { k: 'dueDate', l: 'Due date', t: 'date' },
        { k: 'progress', l: 'Action progress', t: 'select', o: ['Not started', 'In progress', 'Action completed'] },
        { k: 'closureStatus', l: 'Closure status', t: 'select', req: true, o: ['Open', 'Action completed; stakeholder validation pending', 'Closed – stakeholder validated', 'Closed – not validated (reason recorded)'],
          help: 'Recording an action never closes feedback. Closing as validated requires validator and date.' },
        { k: 'validatedBy', l: 'Validated by (stakeholder)', t: 'text' },
        { k: 'validationDate', l: 'Validation date', t: 'date' },
        { k: 'validationNote', l: 'Validation note / reason', t: 'textarea', full: true },
        { k: 'confidential', l: 'Confidential (exclude provider from leadership outputs unless selected)', t: 'bool', full: true },
        { k: 'notes', l: 'Notes', t: 'textarea', full: true }
      ],
      cols: ['date', 'provider', 'theme', 'wordingType', 'commitmentType', 'progress', 'closureStatus', 'dueDate']
    },
    actions: {
      label: 'Actions', singular: 'Action', title: 'title',
      fields: [
        { k: 'title', l: 'Action', t: 'text', req: true, full: true },
        { k: 'sourceType', l: 'Originated from', t: 'select', o: ['Feedback', 'Insight', 'Project', 'Risk', 'Review note', 'Data quality', 'Decision', 'Other'] },
        { k: 'sourceRef', l: 'Linked record', t: 'text', help: 'Set automatically when created from another record.' },
        { k: 'commitmentType', l: 'Type', t: 'select', o: ['Proposal', 'Agreed commitment'] },
        { k: 'owner', l: 'Owner', t: 'text' },
        { k: 'dueDate', l: 'Due date', t: 'date' },
        { k: 'status', l: 'Status', t: 'select', req: true, o: ['Not started', 'In progress', 'Completed', 'Cancelled'] },
        { k: 'completedDate', l: 'Completed date', t: 'date' },
        { k: 'stakeholderValidation', l: 'Stakeholder validation', t: 'select', o: ['Not required', 'Pending', 'Validated'] },
        { k: 'notes', l: 'Notes', t: 'textarea', full: true }
      ],
      cols: ['title', 'sourceType', 'commitmentType', 'owner', 'dueDate', 'status', 'stakeholderValidation']
    },
    benefits: {
      label: 'Business value & savings', singular: 'Benefit', title: 'title', dupKeys: ['title'],
      fields: [
        { k: 'title', l: 'Benefit', t: 'text', req: true, full: true },
        { k: 'category', l: 'Category', t: 'select', req: true, o: ['Realised financial saving', 'Cost avoidance', 'Productivity capacity released', 'Notional business value', 'Non-financial outcome'] },
        { k: 'calcType', l: 'Calculation method', t: 'select', req: true, o: ['Vendor-fee saving', 'Process time released', 'Automation benefit', 'Comparable programme cost', 'Vacancy-duration value (notional)', 'Manual value', 'Non-financial (no value)'] },
        { k: 'projectId', l: 'Linked project', t: 'ref', ref: 'projects' },
        { k: 'attribution', l: 'Contribution type', t: 'select', o: ATTRIBUTION },
        { k: 'baselinePeriod', l: 'Baseline period', t: 'text' },
        { k: 'comparisonPeriod', l: 'Comparison period', t: 'text' },
        { k: 'baselineVolume', l: 'Baseline volume', t: 'number', help: 'Vendor-fee: vendor hires in baseline. Time: transactions. Vacancy: roles.' },
        { k: 'comparisonVolume', l: 'Comparison volume', t: 'number', help: 'Vendor-fee: vendor hires in comparison period (same population).' },
        { k: 'unitCost', l: 'Unit cost / rate (INR)', t: 'number', help: 'Fee per vendor hire, hourly cost, baseline cost per hire, or daily vacancy value.' },
        { k: 'comparisonUnitCost', l: 'Comparison unit cost (INR)', t: 'number', help: 'Comparable programme cost only.' },
        { k: 'unitQty', l: 'Hours saved per transaction / days reduced per role', t: 'number' },
        { k: 'manualValue', l: 'Manual gross value (INR)', t: 'number', help: 'Manual value only; explain in calculation note.' },
        { k: 'unitCostSource', l: 'Unit cost source', t: 'text' },
        { k: 'unitCostApproved', l: 'Financial inputs explicitly approved', t: 'bool', help: 'Monetary values are shown as unapproved until inputs are approved.' },
        { k: 'counterfactual', l: 'Agreed counterfactual', t: 'textarea', full: true, help: 'Required for cost avoidance.' },
        { k: 'assumptions', l: 'Assumptions', t: 'textarea', full: true },
        { k: 'calcNote', l: 'Calculation note', t: 'textarea', full: true },
        { k: 'implementationCost', l: 'One-off implementation cost (INR)', t: 'number', min: 0 },
        { k: 'recurringCost', l: 'Recurring cost in comparison period (INR)', t: 'number', min: 0 },
        { k: 'expectedValue', l: 'Expected value (INR or hours)', t: 'number' },
        { k: 'outcomeDescription', l: 'Non-financial outcome', t: 'textarea', full: true },
        { k: 'owner', l: 'Benefit owner', t: 'text' },
        { k: 'validationStatus', l: 'Validation status', t: 'select', req: true, o: ['Proposed – not validated', 'Estimated – assumptions stated', 'Under validation', 'Validated', 'Rejected'] },
        { k: 'validatedBy', l: 'Validated by', t: 'text' },
        { k: 'validationDate', l: 'Validation date', t: 'date' },
        { k: 'overlapNote', l: 'Potential overlap with other benefits', t: 'textarea', full: true, help: 'Record overlaps to avoid double counting.' }
      ],
      cols: ['title', 'category', 'calcType', '_gross', '_net', 'validationStatus', 'owner']
    },
    risks: {
      label: 'Risks', singular: 'Risk', title: 'title',
      fields: [
        { k: 'title', l: 'Risk', t: 'text', req: true, full: true },
        { k: 'description', l: 'Description', t: 'textarea', full: true },
        { k: 'area', l: 'Area', t: 'select', o: AREAS },
        { k: 'likelihood', l: 'Likelihood', t: 'select', o: ['Not assessed', 'Low', 'Medium', 'High'] },
        { k: 'impact', l: 'Impact', t: 'select', o: ['Not assessed', 'Low', 'Medium', 'High'] },
        { k: 'mitigation', l: 'Mitigation', t: 'textarea', full: true },
        { k: 'owner', l: 'Owner', t: 'text' },
        { k: 'status', l: 'Status', t: 'select', req: true, o: ['Open', 'Mitigating', 'Closed'] },
        { k: 'reviewDate', l: 'Review date', t: 'date' },
        { k: 'source', l: 'Source', t: 'text', full: true }
      ],
      cols: ['title', 'area', 'likelihood', 'impact', 'owner', 'status', 'reviewDate']
    },
    decisions: {
      label: 'Decisions & support required', singular: 'Decision / support item', title: 'title',
      fields: [
        { k: 'title', l: 'Decision or support needed', t: 'text', req: true, full: true },
        { k: 'type', l: 'Type', t: 'select', req: true, o: ['Decision required', 'Support required', 'Decision made'] },
        { k: 'requestedFrom', l: 'Requested from', t: 'text' },
        { k: 'context', l: 'Context', t: 'textarea', full: true },
        { k: 'options', l: 'Options considered', t: 'textarea', full: true },
        { k: 'recommendation', l: 'Recommendation (proposal)', t: 'textarea', full: true },
        { k: 'dueDate', l: 'Needed by', t: 'date' },
        { k: 'status', l: 'Status', t: 'select', req: true, o: ['Open', 'Decided', 'Withdrawn'] },
        { k: 'outcome', l: 'Outcome', t: 'textarea', full: true },
        { k: 'decidedBy', l: 'Decided by', t: 'text' },
        { k: 'decidedDate', l: 'Decision date', t: 'date' }
      ],
      cols: ['title', 'type', 'requestedFrom', 'dueDate', 'status', 'decidedBy']
    },
    questions: {
      label: 'Data quality & open questions', singular: 'Open question', title: 'title',
      fields: [
        { k: 'title', l: 'Question / issue', t: 'text', req: true, full: true },
        { k: 'type', l: 'Type', t: 'select', req: true, o: ['Data conflict', 'Missing data', 'Definition to confirm', 'Population / compatibility', 'Duplicate / identity', 'Assumption to confirm', 'Other'] },
        { k: 'priority', l: 'Priority', t: 'select', o: ['Essential', 'Important', 'Nice to have'] },
        { k: 'relatedTo', l: 'Related to', t: 'text' },
        { k: 'detail', l: 'Detail', t: 'textarea', full: true },
        { k: 'valueA', l: 'Value A (as recorded)', t: 'text' },
        { k: 'valueB', l: 'Value B (alternative / recalculated)', t: 'text' },
        { k: 'owner', l: 'Confirm with (data owner)', t: 'text' },
        { k: 'raisedDate', l: 'Raised', t: 'date' },
        { k: 'status', l: 'Status', t: 'select', req: true, o: ['Open', 'Awaiting data owner', 'Resolved', 'Accepted as recorded'] },
        { k: 'resolution', l: 'Resolution', t: 'textarea', full: true, help: 'Resolving a question does not change source values; update the record separately so both stay traceable.' },
        { k: 'resolvedDate', l: 'Resolved date', t: 'date' }
      ],
      cols: ['title', 'type', 'priority', 'owner', 'status', 'raisedDate']
    },
    insights: {
      label: 'Insights', singular: 'Insight', title: 'title',
      fields: [
        { k: 'title', l: 'Insight', t: 'text', req: true, full: true },
        { k: 'type', l: 'Insight type', t: 'select', req: true, o: ['Descriptive finding', 'Diagnostic hypothesis', 'Forecast', 'Scenario', 'Recommended action', 'Rule-based alert'] },
        { k: 'observation', l: 'Observation', t: 'textarea', full: true },
        { k: 'supportingData', l: 'Supporting data and period', t: 'textarea', full: true },
        { k: 'method', l: 'Method / calculation', t: 'textarea', full: true },
        { k: 'interpretation', l: 'Interpretation', t: 'textarea', full: true },
        { k: 'uncertainty', l: 'Uncertainty / missing evidence', t: 'textarea', full: true },
        { k: 'recommendedAction', l: 'Recommended action', t: 'textarea', full: true },
        { k: 'owner', l: 'Owner', t: 'text' },
        { k: 'reviewDate', l: 'Review date', t: 'date' },
        { k: 'status', l: 'Status', t: 'select', req: true, o: ['New', 'Accepted', 'Edited', 'Dismissed', 'Converted to action'] },
        { k: 'generatedBy', l: 'Generated by', t: 'text', ro: true }
      ],
      cols: ['title', 'type', 'status', 'owner', 'reviewDate', 'generatedBy']
    },
    reviewNotes: {
      label: 'Review notes', singular: 'Review note', title: 'title',
      fields: [
        { k: 'title', l: 'Meeting / review', t: 'text', req: true, full: true },
        { k: 'date', l: 'Date', t: 'date', req: true },
        { k: 'participants', l: 'Participants', t: 'text', full: true },
        { k: 'context', l: 'Context', t: 'text', full: true },
        { k: 'source', l: 'Source of notes', t: 'select', o: ['Own notes', 'Shared minutes', 'Email summary', 'Other'] },
        { k: 'discussion', l: 'Notes', t: 'textarea', full: true },
        { k: 'decisions', l: 'Decisions recorded', t: 'textarea', full: true },
        { k: 'owners', l: 'Owners', t: 'text' },
        { k: 'followUp', l: 'Follow-up', t: 'textarea', full: true },
        { k: 'confidential', l: 'Confidential', t: 'bool' }
      ],
      cols: ['date', 'title', 'participants', 'source', 'owners']
    }
  };

  const ENTITY_ORDER = ['periods', 'commitments', 'programmes', 'metrics', 'observations', 'team', 'recruiterResults', 'devItems',
    'projects', 'milestones', 'feedback', 'actions', 'benefits', 'risks', 'decisions', 'questions', 'insights', 'reviewNotes'];

  /* ---------------- Seed ---------------- */
  const SRC = 'Dashboard brief – initial reference data';
  const SRC_REC = 'Dashboard brief – recruiter reference';

  function seed(nowIso) {
    let n = 0;
    const id = (p) => p + '_' + (++n).toString(36) + '_seed';
    const base = () => ({ createdAt: nowIso, updatedAt: nowIso, archived: false, deletedAt: null, evidence: [], origin: 'Seed: initial reference data' });
    const s = {};
    ENTITY_ORDER.forEach(e => { s[e] = []; });

    const pBiz = Object.assign(base(), { id: 'per_biz_2026ytd', label: '2026 YTD – Business scorecard', type: 'YTD', scope: 'Business scorecard',
      start: '2026-01-01', end: '2026-10-14', cutoff: '2026-10-14', source: SRC,
      notes: 'Business results, 1 January–14 October 2026.' });
    const pRec = Object.assign(base(), { id: 'per_rec_2026ytd', label: '2026 YTD – Recruiter results', type: 'YTD', scope: 'Recruiter results',
      start: '2026-01-01', end: '2026-10-12', cutoff: '2026-10-12', source: SRC_REC,
      notes: 'Recruiter results cover 1 January–12 October 2026. Not reconciled with the business scorecard by design.' });
    s.periods.push(pBiz, pRec);

    s.commitments.push(Object.assign(base(), { id: id('com'), title: '2026 hiring targets across seven programmes',
      classification: 'Source-reported target (agreement not evidenced)', area: 'Talent attraction & recruitment', periodId: pBiz.id,
      agreedWith: null, agreedDate: null, targetDescription: 'Programme targets as supplied: Lateral 450, Freshers 100, NATS 125, ExcelHER 40, PhD/AICTE 10, Internal 125, Interns 65.',
      status: 'Not assessed', attribution: 'Shared business outcome', owner: null, source: SRC,
      notes: 'Whether targets are full-year or year-to-date is not stated (see open questions).' }));

    const progs = [['Lateral', 450, 351, 'Lateral hiring'], ['Freshers', 100, 62, 'Talent-pipeline programme'], ['NATS', 125, 217, 'Talent-pipeline programme'],
      ['ExcelHER', 40, 40, 'Talent-pipeline programme'], ['PhD/AICTE', 10, 3, 'Talent-pipeline programme'], ['Internal', 125, 145, 'Internal mobility'],
      ['Interns', 65, 67, 'Talent-pipeline programme']];
    progs.forEach(([name, target, joined, group]) => s.programmes.push(Object.assign(base(), {
      id: id('prg'), name, periodId: pBiz.id, group, target, joined, offers: null, attribution: 'Shared business outcome',
      owner: null, source: SRC, dataDate: '2026-10-14', notes: 'Programme grouping is a reporting assumption; confirm.' })));

    const M = (name, category, unit, direction, extra) => Object.assign(base(), { id: id('met'), name, category, unit, direction,
      definition: null, definitionStatus: 'Not provided', calculation: null, owner: null, source: null, notes: null }, extra || {});
    const mTotal = M('Total joined', 'Hiring volume', 'count', 'Higher is better', { source: SRC, role: 'totalJoined',
      calculation: 'Source-reported total. Recalculated check: sum of programme joiners for the same period.' });
    const mR2O = M('Requisition-to-offer time', 'Speed', 'days', 'Lower is better', { source: SRC });
    const mR2J = M('Requisition-to-join time', 'Speed', 'days', 'Lower is better', { source: SRC });
    const mVendor = M('Vendor usage', 'Sourcing mix', '%', 'Context-dependent', { source: SRC,
      notes: 'A change in vendor usage is not, by itself, a monetary saving.' });
    const mRef = M('Employee referrals', 'Sourcing mix', '%', 'Higher is better', { source: SRC });
    const mGender = M('Gender diversity', 'Diversity & inclusion', '%', 'Higher is better', { source: SRC });
    s.metrics.push(mTotal, mR2O, mR2J, mVendor, mRef, mGender);
    // Catalogue of tracked measures with no data supplied yet
    [['Offers made', 'Offers', 'count', 'Higher is better'], ['Offer acceptance rate', 'Offers', '%', 'Higher is better'],
     ['Offer decline rate', 'Offers', '%', 'Lower is better'], ['Open requisitions', 'Requisitions', 'count', 'Context-dependent'],
     ['Requisition ageing', 'Requisitions', 'days', 'Lower is better'], ['Direct sourcing contribution', 'Sourcing mix', '%', 'Context-dependent'],
     ['Candidate experience', 'Experience', 'score', 'Higher is better'], ['Hiring-manager experience', 'Experience', 'score', 'Higher is better'],
     ['Onboarding outcomes', 'Onboarding', '%', 'Higher is better'], ['Quality of hire', 'Quality & retention', 'score', 'Higher is better'],
     ['Early retention', 'Quality & retention', '%', 'Higher is better'], ['Recruitment cost per hire', 'Cost', 'INR', 'Lower is better']]
      .forEach(([nm, c, u, d]) => s.metrics.push(M(nm, c, u, d)));

    const O = (metric, val) => Object.assign(base(), { id: id('obs'), metricId: metric.id, periodId: pBiz.id, population: null, target: null,
      actualReported: val, numerator: null, denominator: null, calcNote: null, attribution: 'Shared business outcome', source: SRC, owner: null,
      dataDate: '2026-10-14', notes: null });
    s.observations.push(O(mTotal, 885), O(mR2O, 53), O(mR2J, 89), O(mVendor, 6), O(mRef, 15), O(mGender, 35));

    const T = (name, status, notes) => Object.assign(base(), { id: id('tm'), name, role: null, employmentStatus: status, businessCoverage: null,
      startDate: null, endDate: null, goals: null, resultsSummary: null, sourcingIndicators: null, cycleTimeIndicators: null, roleComplexity: null,
      hiringMix: null, targetExposure: null, coaching: null, backupCoverage: null, successionReadiness: 'Not assessed', humanReviewBy: null,
      humanReviewDate: null, source: SRC_REC, notes });
    const adarsh = T('Adarsh', 'Not provided', 'Employment status not stated in the reference data.');
    const padma = T('Padma', 'Left', 'Has left the team; replacement hiring underway. Historical records are preserved.');
    const jayaram = T('Jayaram', 'Left', 'Has left the team; replacement hiring underway. Historical records are preserved.');
    s.team.push(adarsh, padma, jayaram);

    s.recruiterResults.push(Object.assign(base(), { id: id('rr'), memberId: adarsh.id, periodId: pRec.id, offerTarget: 85, offers: 117,
      offerAttainmentReported: 100, joinTarget: null, joins: null, joinAttainmentReported: null, source: SRC_REC, dataDate: '2026-10-12',
      notes: 'Source reports 100% attainment; 117 ÷ 85 recalculates to about 138%. Both values retained pending validation.' }));

    s.risks.push(Object.assign(base(), { id: id('rsk'), title: 'Recruiter capacity while two roles are being backfilled',
      description: 'Padma and Jayaram have left; replacement hiring is underway.', area: 'Team performance & development',
      likelihood: 'Not assessed', impact: 'Not assessed', mitigation: null, owner: null, status: 'Open', reviewDate: null, source: SRC }));

    s.actions.push(Object.assign(base(), { id: id('act'), title: 'Complete replacement hiring for the two departed recruiter roles',
      sourceType: 'Risk', sourceRef: null, commitmentType: null, owner: null, dueDate: null, status: 'In progress', completedDate: null,
      stakeholderValidation: 'Not required', notes: 'Owner and due date not provided.' }));

    const Q = (title, type, priority, relatedTo, detail, a, b, owner) => Object.assign(base(), { id: id('q'), title, type, priority, relatedTo,
      detail, valueA: a || null, valueB: b || null, owner: owner || 'TA Partner / data owner', raisedDate: nowIso.slice(0, 10), status: 'Open', resolution: null, resolvedDate: null });
    s.questions.push(
      Q('Adarsh offer attainment: reported 100% vs recalculated ~138%', 'Data conflict', 'Essential', 'Recruiter results – Adarsh',
        '117 offers against a target of 85 calculates to approximately 137.6%. The source reports 100%. Is the reported figure capped, based on a different target, or an error?',
        'Source-reported: 100%', 'Recalculated: 117 ÷ 85 = 137.6%', 'TA Partner / recruiter data owner'),
      Q('Are programme targets full-year 2026 or year-to-date to 14 October?', 'Definition to confirm', 'Essential', 'Programme results',
        'The answer changes how gaps are read (remaining-year gap vs shortfall to date) and whether a run-rate scenario is meaningful.'),
      Q('Recruiter reference data beyond Adarsh\'s offer figures was not included', 'Missing data', 'Essential', 'Team & Development',
        'Please supply the recruiter references (targets, offers, joins, roles, business coverage), including the historical records for Padma and Jayaram.'),
      Q('Targets not provided for cycle time, vendor usage, referrals and gender diversity', 'Missing data', 'Important', 'Deliverables & Metrics',
        'Requisition-to-offer (53 days), requisition-to-join (89 days), vendor usage (6%), referrals (15%) and gender diversity (35%) have no targets, so attainment cannot be assessed.'),
      Q('Populations and definitions for percentage and cycle-time measures', 'Population / compatibility', 'Important', 'Deliverables & Metrics',
        'Vendor, referral and gender percentages – share of which population (joiners, offers; which programmes)? Cycle times – which requisitions (e.g. lateral only, closed in period)?'),
      Q('Does "Total joined" include internal moves and interns?', 'Definition to confirm', 'Important', 'Total joined',
        'The seven programme figures sum to 885, matching the reported total, so the total appears to include Internal (145) and Interns (67). Confirm whether these should count as hires in leadership reporting.',
        'Reported total: 885', 'Sum of programmes: 885'),
      Q('Programme grouping used in reports', 'Assumption to confirm', 'Nice to have', 'Programme results',
        'Reports group Lateral as lateral hiring; Freshers, NATS, ExcelHER, PhD/AICTE and Interns as talent-pipeline programmes; Internal as internal mobility. Confirm or amend.', null, null, 'Dr. Ranjith TP'),
      Q('No prior-period or monthly data supplied', 'Missing data', 'Important', 'Trends',
        'Only one YTD observation exists per measure, so no trend or prior-period comparison can be shown. Supply comparable prior periods (same definition and population) if available.'),
      Q('No financial inputs supplied for benefits', 'Missing data', 'Important', 'Business Value & Savings',
        'No savings, cost avoidance or unit costs were provided, so no financial benefit is reported. Approved inputs (e.g. vendor fee per hire, comparison volumes) are needed before any value is calculated.')
    );
    return s;
  }

  window.TA = window.TA || {};
  Object.assign(window.TA, { ENTITIES, ENTITY_ORDER, ATTRIBUTION, seed, SEED_SOURCE: SRC });
})();
