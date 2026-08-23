# Kaching System Context

This is a concise working context for agent sessions. The authoritative source documents are stored in `docs/reference/` and must be consulted for full detail.

## Purpose and scope

Kaching is a multi-store point-of-sale application for checkout, VAT-inclusive pricing, order-level discounts, cash and credit-card payment, durable sale recording, receipt printing, asynchronous inventory updates, reporting, operations monitoring, auditing, and administration.

## Fixed technology decisions

- React, TypeScript, and Vite frontend
- Node.js, Express, and TypeScript backend
- PostgreSQL with Prisma ORM
- Centralized deployment; terminals require backend connectivity
- RabbitMQ transactional-outbox delivery for inventory updates in later features
- English UI, Thai baht, VAT-inclusive prices, and Asia/Bangkok business time

## Critical business boundaries

- One order-level discount only.
- Exactly one payment method; no split payment.
- No returns or refunds.
- No synchronous stock availability check at checkout.
- No offline sale processing.
- A completed sale and inventory outbox record are written atomically.
- An uncertain card result prevents a second payment until reconciliation.

## Lab 1 baseline

The baseline proves client-to-API connectivity and supplies an active global product catalog. It does not claim to implement the complete Feature A-S inventory. Lab 2 adds only the 3-4 features named by its separate brief.
