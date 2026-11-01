| Document control | |
|---|---|
| Project | DEMO-TA-SYNTH - Synthetic Demo Co (fictitious) |
| Template | 03 Data request |
| Audience | System / data owner |
| Sender | [Project lead] |
| Approver before sending | Process owner and data protection lead (where personal data involved) |
| Status | Draft - pending approval |

# Data request: Requisition-to-offer improvement project

**Subject:** Data extract request: DEMO-TA-SYNTH

Hello,

To set a baseline for **Requisition-to-offer** we need the extract described below. Please use the approved transfer method: [TBC: secure location]. **Do not send it by e-mail.**

## Fields needed
- first_interview_ts: Why is 'first_interview_ts' missing for 17.5% of records, and can it be captured?
- offer_ts: Why is 'offer_ts' missing for 12.6% of records, and can it be captured?
- offer_accept_ts: Why is 'offer_accept_ts' missing for 30.0% of records, and can it be captured?

## Specification
- Period: [start date] to [end date], time zone Europe/Stockholm
- Observation unit: one row per [unit]
- Include open or incomplete cases with their status. **Do not filter them out.**
- Leave unknown values blank. **Do not replace them with 0.**
- Exclude personal identifiers (names, e-mails, phone numbers, national IDs). Use the agreed pseudonymised reference instead.

## Please also confirm
- How the timestamps are recorded (system-generated or entered by a person).
- Any known system changes, outages or definition changes during the period.

Needed by: [date]. Lawful basis / data-sharing approval reference: [TBC].
