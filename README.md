# Kaching POS Labs

Kaching is the parallel point-of-sale project used to demonstrate the same
Spec-Driven Development (SDD) workflow that students apply to TokTickIT.

This repository contains a completed POS Lab 1 baseline and is prepared for
POS Lab 2 feature development through `lab2-staging` and feature branches.

## Technology stack

- React, TypeScript, Vite, and Bootstrap
- Node.js, Express, and TypeScript
- PostgreSQL and Prisma ORM
- Vitest, Testing Library, and Supertest
- Docker Compose for the local database

## Quick start

Prerequisites: Node.js 20 or newer and Docker Desktop.

```bash
docker compose up -d db
npm install
cp server/.env.example server/.env
cp client/.env.example client/.env
npm run db:migrate
npm run db:seed
npm test
npm run dev
```

The web application runs at <http://localhost:5173> and the API at
<http://localhost:3000>. Stop the database with `docker compose down`.

## Baseline API

- `GET /api/health` - service health
- `GET /api/products` - active global product catalog ordered by product code

## Repository workflow for Lab 2

1. Read `AGENTS.md`, the SRS, System-Level SDS, and the relevant feature contract.
2. Create a GitHub Issue and move it from Backlog to Specified.
3. Branch from `lab2-staging` using `feature/<issue>-<short-name>`.
4. Complete the Feature SDS, UI/API specifications, and test specification.
5. Implement and test the feature in its feature branch.
6. Open a pull request into `lab2-staging`, review it, and merge it.
7. After all selected features pass integration tests, merge `lab2-staging` into `main`.

Lab 2 preparation and templates are in [`docs/lab-02`](docs/lab-02/README.md).
The exact 3-4 feature scope must come from the separate POS Lab 2 brief; it is
intentionally not guessed from the system-wide Feature A-S inventory.
