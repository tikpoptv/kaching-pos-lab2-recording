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

## Lab 1 baseline and Lab 2 scope

- **Lab 1 Baseline**: Proves client-to-API connectivity and supplies an active global product catalog (`Product` model).
- **Lab 2 Scope**: Implements the core checkout engine consisting of four targeted features:
  - **Feature-D**: Sale Lifecycle Management (Start sale, maintain state, cancel sale before completion).
  - **Feature-E**: Cart and Sale-Item Management (Barcode scan, manual entry, product search, quantity adjustment, item removal).
  - **Feature-F**: VAT-Inclusive Pricing and Total Calculation (Subtotal calculation, 7% VAT portion extraction, satang rounding, final total).
  - **Feature-G**: Order-Level Discount Management (Discount % and THB amount entry, validation, satang rounding, automatic recalculation on cart change).

