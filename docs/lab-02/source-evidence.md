# POS Lab 2 Source Evidence & Traceability Matrix

Status: Baselined for POS Lab 2 (Features D, E, F, G)

This document maps all specified requirements, architecture decisions, conflicts, missing items, and proposed decisions for POS Lab 2, citing `docs/reference/pos-srs-features-coverage.pdf` (SRS) and `docs/reference/kaching-system-level-sds-v0.1.pdf` (SDS).

---

## 1. Specified Requirements & Architecture Traceability

| Category | Item / Requirement Summary | Source PDF & Section / ID | Application / Implementation Impact |
|---|---|---|---|
| Tech Stack | React, TypeScript, Vite frontend | SDS Section 2.2, 6.1 | Client workspace (`client/`) |
| Tech Stack | Node.js, Express, TypeScript backend | SDS Section 2.2, 4.1 | Server workspace (`server/`) |
| Tech Stack | PostgreSQL persistence with Prisma ORM | SDS Section 2.2, 4.1 | Database schema (`server/prisma/schema.prisma`) |
| Currency & Tax | Prices expressed in Thai Baht (THB) including VAT | SRS BR-001, NFR-010; SDS Section 2.2, 7.2 | Product selling price is VAT-inclusive |
| Monetary Rule | Use PostgreSQL NUMERIC & Prisma Decimal for DB money | SDS Section 6.1, 7.2; AGENTS.md | `Prisma.Decimal` in backend models |
| Monetary Rule | Decimal strings for money at API boundary (2 decimals) | SDS Section 6.2; AGENTS.md | Express API response/request JSON strings |
| Monetary Rule | JS binary floating-point prohibited for financial math | SDS Section 6.1, 7.2 | Commercial satang rounding (`Decimal` math) |
| Connectivity | Online connectivity required; offline sales prohibited | SRS NFR-012; SDS Section 1.3, 5.3, 17 | Terminal disables checkout if API disconnected |
| Stock Checking | No synchronous stock check/block at checkout | SRS BR-016; SDS Section 1.3 | Item presence at counter is sufficient to sell |
| Transaction | Completed sale & inventory outbox committed atomically | SRS FR-026; SDS Section 4.1, 7.4 | Single PostgreSQL transaction for sale completion |
| Feature-D | Sale Lifecycle Management: start, state, cancel | SRS FR-002, FR-006, BR-015; SDS Section 15 | Sale state machine: OPEN, CANCELLED, COMPLETED |
| Feature-E | Cart Management: barcode scan, manual barcode, search | SRS FR-003, FR-043, BR-002, BR-016; SDS Section 10.3 | Product lookup, item list, quantity modification |
| Feature-F | VAT-Inclusive Pricing & Total Calculation | SRS FR-004, BR-001, BR-002, BR-005, BR-010, NFR-010 | Subtotal, 7% VAT portion, satang rounding, total |
| Feature-G | Order-Level Discount Management | SRS FR-004, FR-005, BR-003 to BR-010, NFR-008 | Discount % & amount inputs, validation, recalculation |

---

## 2. Conflicts & Proposed Decisions

| Conflict ID | Topic | Source A | Source B | Conflict Details | Proposed Decision |
|---|---|---|---|---|---|
| **CONF-01** | Repository Structure | SDS v0.1 Section 13.1 (`apps/web`, `apps/api`, `apps/worker`, `packages/*`) | POS Lab 1 Codebase (`client/`, `server/`, root `package.json`) | SDS specifies multi-app monorepo pathing, whereas Lab 1 codebase uses standard npm workspaces with `client/` and `server/`. | **Maintain Lab 1 npm workspace layout (`client/`, `server/`)** to preserve baseline build and test scripts without introducing unnecessary refactoring. |
| **CONF-02** | Requirement Set Versioning | SRS Traceability Matrix (Pages 16, 20, 21, 23: includes FR-039..FR-043, BR-021, NFR-012..NFR-016) | SDS v0.1 Section 1 (Page 1 lists baseline as FR-001..FR-038, BR-001..BR-020, NFR-001..NFR-011) | SDS Section 1 header lags behind SRS, but SDS Section 17 explicitly acknowledges draft additions for alignment. | **Treat SRS as authoritative** for FR-043 (barcode scan/entry/search) and BR-021 (global product catalog/prices) in Lab 2 scope. |

---

## 3. Missing Specifications & Proposed Decisions

| Missing ID | Topic | PDF / Code Reference | Missing Details | Proposed Decision |
|---|---|---|---|---|
| **MISS-01** | Sale & Cart API Schemas | SDS Section 6.3 | SDS lists representative endpoints (`POST /sales`, `PATCH /sales/{id}/items`), but does not specify exact request/response DTO JSON schemas or HTTP status codes for cart updates and discounts. | **Specify exact REST DTO schemas** in feature contracts (`docs/features/<feature-id>/contract.md`) using camelCase and decimal strings. |
| **MISS-02** | Database Models for Sales & Items | `server/prisma/schema.prisma` | Lab 1 Prisma schema contains only `Product`. Schema models for `Sale` and `SaleItem` are missing. | **Define `Sale` and `SaleItem` models** in Prisma schema during Feature-D and Feature-E contract execution, supporting decimal monetary fields. |
| **MISS-03** | Barcode Scanner vs UI Search Input Behavior | SDS Section 10.3 | SDS specifies supporting barcode scanner, manual entry, and product search, but does not define input focus, keydown handling, or modal behavior. | **Use a single auto-focused barcode input** for scanner wedge & manual barcode entry, with an adjacent "Search Product" button launching a search modal/dropdown. |
| **MISS-04** | Fixed Discount Amount Recalculation on Cart Change | SRS BR-006, BR-007, BR-009 | BR-007 specifies recalculating percentage-based discount when cart changes. It does not state whether a manually entered fixed `Discount Amount` should be re-validated if Subtotal falls below it. | **If fixed Discount Amount > new Subtotal**, cap Discount Amount to new Subtotal or reset to zero with a validation notice per BR-009 ($\text{Discount} \le \text{Subtotal}$). |
