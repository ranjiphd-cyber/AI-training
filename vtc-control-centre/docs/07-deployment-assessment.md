# 07 — Deployment Assessment (no prices invented; no IT approval claimed)

| Criterion | A. Microsoft low-code (Power Apps + Dataverse + Power Automate, Power Pages for externals) | B. Custom app in organisation-approved cloud | C. Independently hosted custom app |
|---|---|---|---|
| Identity & security | Strong if Volvo is on Entra ID; inherits tenant controls | Strong; integrates with corporate IdP; reuses approved cloud controls | Must build/prove controls independently |
| External users (SRM, partners, trainers) | Power Pages / B2B guests — licensing per external user to be checked | OIDC with B2B/B2C or partner federation | Same as B, with more self-operation |
| Institution-level isolation | Dataverse business units/row security — workable, complex | Implemented in app (as now) + DB | Same as B |
| Transactional booking integrity | **Weak**: no exclusion constraints; concurrency in flows is hard to guarantee | **Strong**: PostgreSQL constraints + serializable tx (already built) | Strong |
| Workflow flexibility | Good for simple flows; versioned policy binding is harder | Full control | Full control |
| Email | Native Outlook/Exchange connectors | Corporate relay or approved provider via adapter | Third-party provider |
| Data ownership & portability | Dataverse export possible; logic locked to platform | Full (SQL + source) | Full |
| Licensing / implementation cost | Licences per user incl. externals — **quotation required** | Cloud consumption + build — **estimate required** | Hosting + build + ops — **estimate required** |
| Recurring operations | Low infra effort; platform governance | Moderate; managed DB/app services | Highest |
| Maintainability | Citizen-developer friendly; complex logic becomes brittle | Engineering team needed; tests in repo | Same as B |
| Backup & recovery | Platform-managed | Managed DB PITR + tested restore | Self-managed |
| Auditability | Platform audit + custom | Append-only in-DB audit (built) + cloud logs | Same, self-managed |
| Vendor dependence | High | Moderate (portable code; cloud services swappable) | Low vendor, high operator dependence |

## Recommendation (provisional)

**Option B**, provided Volvo IT has an approved cloud landing zone with managed PostgreSQL and enterprise identity.
Reason: the hardest confirmed requirements — conflict-free booking under concurrency, version-bound approvals,
mandatory certificate authorisation and atomic audit — are already implemented against PostgreSQL and verified;
Option A would need re-engineering of exactly those guarantees. Option C adds operational risk without benefit
unless no approved cloud exists.

Assumptions: managed PostgreSQL ≥ 15 with `btree_gist` is available; external users can be federated; data-residency
requirements (India) can be met in-region.

## Still required before any decision
- Volvo IT security architecture review and landing-zone confirmation.
- Licensing check for Option A external users (quotation).
- Cloud cost estimate for B (app service, managed DB, storage, logs) — quotation.
- Data-residency and privacy assessment with legal (DPDP Act 2023 applicability to be confirmed by counsel).
- Email relay/provider decision (D-08) and IdP decision (D-06).
