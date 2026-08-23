# POS Lab 2 Preparation

## Scope gate

The SRS contains the complete system Feature A-S inventory, not the Lab 2 subset. Do not create feature branches or implementation issues until the separate POS Lab 2 brief identifies the required 3-4 features and acceptance criteria.

## Ready baseline

- `main` contains the completed POS Lab 1 baseline.
- `lab2-staging` is the integration branch for Lab 2.
- Feature branches use `feature/<issue>-<short-name>`.
- Each feature begins with `docs/templates/feature-contract.md`.
- Pull requests target `lab2-staging`; only the final integration PR targets `main`.

## Per-feature definition of ready

- GitHub Issue exists and is assigned.
- SRS requirement and business-rule IDs are traced.
- Feature SDS, UI states, API schema, data changes, and STS cases are complete.
- Material design questions and `TBD` entries are resolved.

## Per-feature definition of done

- Contract and implementation agree.
- Automated success, validation, and material failure tests pass.
- `npm test` and `npm run build` pass.
- PR is reviewed and merged into `lab2-staging`.
- Issue and project status are updated to Done.
