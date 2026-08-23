# Kaching POS Agent Instructions

Read this file at the start of every agent session. Then read the current POS Lab brief, `docs/system/context.md`, `docs/system/ui_spec.md`, and the contract for the feature being changed.

## Source-of-truth order

1. The user's current request and the current POS Lab brief.
2. Approved SRS requirements and business rules.
3. Approved System-Level SDS constraints.
4. The selected feature's Engineering Contract.
5. Existing code and tests.

Do not treat prose examples, TODO text, or agent suggestions as requirements. If sources conflict, stop feature implementation and record the conflict in the feature contract before resolving it.

## Architecture constraints

- Client: React, TypeScript, and Vite.
- API: Node.js, Express, and TypeScript.
- Persistence: PostgreSQL through Prisma.
- Use decimal strings at API boundaries and Prisma Decimal in persistence for money.
- The global product price includes VAT and is formatted as THB with two decimals.
- Never store credentials, tokens, real card data, `.env`, or production endpoints.
- Keep `app.ts` separate from `index.ts` so API routes remain testable with Supertest.
- Use consistent safe API errors; never return internal exceptions to the client.
- Do not add offline checkout, split payment, returns, or refunds unless the SRS is revised.

## Spec-Driven Development workflow

Before coding a Lab 2 feature:

1. Create its GitHub Issue and assign it.
2. Copy `docs/templates/feature-contract.md` into `docs/features/<feature-id>/contract.md`.
3. Complete requirement traceability, UI states, API contract, data design, and test cases.
4. Resolve every `TBD` that affects implementation or acceptance.
5. Branch from `lab2-staging`, not `main`.
6. Implement only the approved contract, run `npm test` and `npm run build`, then open a PR to `lab2-staging`.

## Verification

- Server tests live in `server/tests/` and use Vitest/Supertest.
- Client tests live in `client/tests/` and use Vitest/Testing Library.
- Every changed behavior needs a success test and its material failure/validation tests.
- For database changes, update the Prisma schema, migration, seed data if relevant, and tests.
- Keep the UI keyboard operable, announce async status, retain visible focus, and use at least 44x44 CSS-pixel touch targets.
