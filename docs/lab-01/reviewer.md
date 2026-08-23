# Lab 1 Baseline Review

The imported TokTickIT starter scaffold was adapted into the Kaching POS domain before the repository baseline was created.

## Baseline checks

- Ticket categories were replaced by a global POS product catalog.
- Health and product endpoints have automated API tests.
- The React readiness screen has success and failure-state tests.
- Local secrets are excluded and documented through `.env.example` files.
- PostgreSQL is reproducible through Docker Compose, migration, and seed data.
- Lab 2 work starts from `lab2-staging`; feature work never starts directly on `main`.
