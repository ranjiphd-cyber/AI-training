| Document control | |
|---|---|
| Project | {{project_id}} - {{client}} |
| Template | 03 Data request |
| Audience | System / data owner |
| Sender | {{sender}} |
| Approver before sending | Process owner and data protection lead (where personal data involved) |
| Status | Draft - pending approval |

# Data request: {{process}} improvement project

**Subject:** Data extract request: {{project_id}}

Hello,

To set a baseline for **{{process}}** we need the extract described below. Please use the approved transfer method: [TBC: secure location]. **Do not send it by e-mail.**

## Fields needed
{{data_requests}}

## Specification
- Period: [start date] to [end date], time zone {{time_zone}}
- Observation unit: one row per [unit]
- Include open or incomplete cases with their status. **Do not filter them out.**
- Leave unknown values blank. **Do not replace them with 0.**
- Exclude personal identifiers (names, e-mails, phone numbers, national IDs). Use the agreed pseudonymised reference instead.

## Please also confirm
- How the timestamps are recorded (system-generated or entered by a person).
- Any known system changes, outages or definition changes during the period.

Needed by: [date]. Lawful basis / data-sharing approval reference: [TBC].
