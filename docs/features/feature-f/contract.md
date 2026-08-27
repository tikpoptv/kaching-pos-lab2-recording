# Feature Feature-F: VAT-Inclusive Pricing and Total Calculation

Status: Approved Contract Draft

Owner: Cashier / POS Team

GitHub Issue: `[Feature-F] VAT-Inclusive Pricing and Total Calculation: Subtotal, VAT Calculation, and Final Amount`

Branch: `feature-f-vat-inclusive-pricing-and-total` (Specification Issue: `feature/issue-3-vat-total-calculation`)

---

## 1. Purpose and Scope

### 1.1 Outcome
Provide high-precision, continuous monetary calculation and display capabilities for the Kaching POS system. This feature calculates cart extended line amounts, subtotal, VAT extraction from VAT-inclusive item prices using a configurable demo VAT rate, and final sale amount using exact decimal arithmetic. Monetary results are serialized as 2-decimal strings over API boundaries and rendered in real time in the checkout summary panel.

### 1.2 Included Scope
- **Backend Calculation Engine**:
  - Decimal arithmetic engine using `Prisma.Decimal` in database models and `decimal.js` in memory to eliminate floating-point representation errors (`SDS Section 6.1, 7.2`). Native JavaScript numbers (`number`), `parseFloat()`, `Number()`, and native floating-point division expressions (such as `7 / 107`) are strictly prohibited in financial calculations.
  - Extended Line Amount calculation for each cart item:
    $$\text{extendedAmount} = \text{unitPriceSnapshot} \times \text{quantity}$$
  - Subtotal calculation: exact sum of line item extended amounts before order-level discounts:
    $$\text{Subtotal} = \sum_{i=1}^{n} \text{extendedAmount}_i$$
  - Configurable Demo VAT Rate: Support a configurable demo VAT rate parameter (default 7.00%).
    > [!IMPORTANT]
    > **Legal Disclaimer**: The 7.00% rate is a configurable demo parameter defined for demonstration and testing of system calculation logic. It is not asserted as a statutory or legally binding tax rate.
  - Aggregate Order-Level VAT Extraction Formula (from VAT-inclusive pricing per `BR-001`):
    > [!CAUTION]
    > VAT MUST be extracted exclusively at the aggregate order/subtotal level. Extracting VAT per item line ($\sum \text{VAT}_i$) and summing them is strictly prohibited to prevent cumulative satang discrepancies.
    $$\text{Taxable Total} = \max(0, \text{Subtotal} - \text{Discount Amount})$$
    $$\text{VAT Amount} = \text{RoundToSatang}\left(\text{Taxable Total} \times \frac{\text{VAT Rate}}{100 + \text{VAT Rate}}\right)$$
    *(For the default 7.00% demo rate, executed via Decimal object chaining: `taxableTotal.mul(7).div(107)`)*
  - Commercial Satang Rounding: Half-up rounding to exactly two decimal places (`Decimal.ROUND_HALF_UP` / `.toDecimalPlaces(2, Decimal.ROUND_HALF_UP)`) for all percentage-based tax calculations (`BR-005`). Native `Number.prototype.toFixed()` is strictly prohibited.
  - Final Sale Amount calculation:
    $$\text{Final Sale Amount} = \text{Subtotal} - \text{Discount Amount}$$
  - API Decimal Serialization: Serializing all monetary fields (`subtotal`, `discountAmount`, `vatAmount`, `totalAmount`, `unitPriceSnapshot`, `extendedAmount`) as strings formatted with 2 decimal places (e.g. `"100.00"`) (`NFR-010`).
- **Client User Interface**:
  - Continuous totals summary panel located in the right region of the checkout screen (`FR-004`, `docs/system/ui_spec.md`).
  - Real-time display of Subtotal, Discount Amount, Included VAT Amount (indicating demo rate, e.g. "VAT (7% included)"), and Final Sale Amount.
  - Robust handling of loading/in-flight states and automatic UI state rollback to last-confirmed server state upon API mutation failures.
  - Monetary values displayed using THB currency formatting and tabular numerals (`font-variant-numeric: tabular-nums`) (`NFR-010`).

### 1.3 Explicit Exclusions
- Order-level discount entry UI, percentage/amount input validation, and discount recalculation rules (reserved for Feature-G). Domain calculation service accepts optional `discountAmount` (default `"0.00"`) for seamless Feature-G interface integration.
- Full Tax Invoice generation or printing (system outputs abbreviated receipt totals only).
- Multi-currency conversions (system operates strictly in Thai Baht THB).
- Offline calculation or local state persistence (`NFR-012`).

---

## 2. Requirements Traceability

| Source ID | Requirement Summary | Design & Contract Section | Test Coverage ID |
|---|---|---|---|
| `FR-004` | Right-region summary panel continuously displaying Subtotal, Discount, VAT Amount, and Final Sale Amount | Section 1.2, 3.2 (AC-F-01), 4.1 | `STS-F-01`, `STS-F-07` |
| `BR-001` | Product selling prices in THB include VAT | Section 1.2, 3.2 (AC-F-02), 6.1 | `STS-F-02` |
| `BR-002` | Subtotal equals exact sum of extended line item amounts before discount | Section 1.2, 3.2 (AC-F-02), 6.1 | `STS-F-02`, `STS-F-03`, `STS-F-10` |
| `BR-005` | Percentage-based calculations (VAT portion) rounded to nearest satang (half-up, 2 decimals) | Section 1.2, 3.2 (AC-F-03), 6.1 | `STS-F-04`, `STS-F-05`, `STS-F-11` |
| `BR-010` | Final Sale Amount equals Subtotal minus Discount Amount | Section 1.2, 3.2 (AC-F-04), 6.1 | `STS-F-06` |
| `NFR-001` | Totals recalculation response time under 2,000 ms for 95% of requests | Section 5.1, 5.2 | `STS-F-01` |
| `NFR-010` | Standardized THB monetary formatting (tabular numerals, 2 decimal places, 2-decimal string API payloads) | Section 1.2, 4.1, 5.1 | `STS-F-01`, `STS-F-07` |

---

## 3. User Workflow and Acceptance Criteria

### 3.1 Workflows Overview

#### 1. Cart Item Mutation & Continuous Recalculation Workflow
1. Cashier scans a product, modifies item quantity, or removes an item in the cart (`Feature-E`).
2. Client UI dims totals in `TotalsSummaryPanel` (in-flight loading state) and sends cart mutation request (`POST`, `PATCH`, `DELETE`) to the API.
3. Server executes domain calculation service `calculateSaleTotals(items, discountAmount = "0.00", vatRate = "7.00")` using `Prisma.Decimal`:
   - Calculates extended line amounts for all active items in the sale.
   - Sums extended line amounts to compute `subtotal`.
   - Computes `taxableTotal = max(0, subtotal - discountAmount)`.
   - Extracts `vatAmount` at aggregate order level via `taxableTotal.mul(new Decimal(vatRate)).div(new Decimal(100).add(new Decimal(vatRate))).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)`.
   - Computes `totalAmount = subtotal - discountAmount`.
4. Server updates `Sale` aggregate in PostgreSQL and returns updated sale DTO with items array and 2-decimal string fields.
5. Client UI summary panel updates Subtotal, Included VAT, and Final Sale Amount continuously with tabular numerals.
6. **Failure / Rollback Path**: If API call fails or network drops, Client UI rolls back cart items and `TotalsSummaryPanel` values to last-confirmed server state, announcing error via `aria-live="assertive"`.

#### 2. Sale Retrieval Workflow
1. Cashier opens checkout or refreshes page.
2. Client invokes `GET /api/v1/sales/{id}`.
3. Server returns sale JSON object containing calculated decimal strings (`subtotal`, `discountAmount`, `vatAmount`, `totalAmount`) and cart `items`.
4. Client renders totals in the right-region summary panel.

#### 3. Empty Cart Reset Workflow
1. Cashier removes all items from cart or starts a new sale.
2. Server calculates totals for 0 items: `subtotal = "0.00"`, `discountAmount = "0.00"`, `vatAmount = "0.00"`, `totalAmount = "0.00"`.
3. Client UI summary panel displays `"0.00"` for all monetary fields.

### 3.2 Acceptance Criteria

- **AC-F-01 (Continuous Totals Update)**: GIVEN items in cart, WHEN items are added, updated, or removed, THEN Subtotal, Included VAT Amount, and Final Sale Amount update continuously in the summary panel (`FR-004`).
- **AC-F-02 (VAT-Inclusive Subtotal Calculation)**: GIVEN product prices in THB including VAT (`BR-001`), THEN Subtotal equals the exact sum of line item extended amounts ($\sum \text{unitPriceSnapshot} \times \text{quantity}$) before discount (`BR-002`).
- **AC-F-03 (Satang Rounding & Rounding Boundaries)**: GIVEN monetary calculations, THEN VAT extraction is rounded to the nearest satang using half-up rounding (`BR-005`):
  - Fractional satang $\ge 0.005$ rounds UP to the next satang (e.g. $6.545 \rightarrow 6.55$).
  - Fractional satang $< 0.005$ rounds DOWN (e.g. $6.544 \rightarrow 6.54$).
- **AC-F-04 (Final Sale Amount Formula)**: GIVEN Subtotal and Discount Amount, THEN Final Sale Amount equals Subtotal minus Discount Amount (`BR-010`).
- **AC-F-05 (Configurable Demo VAT Extraction)**: GIVEN a configured demo VAT rate (default 7.00%), THEN the VAT portion included in the price is extracted at aggregate order level using $\text{Taxable Total} \times \frac{\text{VAT Rate}}{100 + \text{VAT Rate}}$ without hardcoding as legal tax rate and without per-line extraction.
- **AC-F-06 (Failure & Empty Cart Boundary Behavior)**: GIVEN an empty cart or invalid calculation input, THEN API and UI reset monetary fields cleanly to `"0.00"` without throwing unhandled exceptions or exposing NaN values.
- **AC-F-07 (Stale UI & Rollback Prevention)**: GIVEN an in-flight cart mutation request, WHEN network latency or API error occurs, THEN UI dims totals panel during request and rolls back to last confirmed server state on failure (`FR-004`).

---

## 4. UI Specification

### 4.1 Visual Components & Summary Panel

Located in the **Right Region** of the checkout screen ($\ge 1024\text{px}$) per `docs/system/ui_spec.md`:

- **`TotalsSummaryPanel`**: Card container (`surface.default` `#FFFFFF`, border `#7B8189`) containing:
  - **Subtotal Row**: Label "Subtotal", read-only value formatted in THB with tabular numerals (e.g. `฿100.00`).
  - **Discount Row**: Label "Discount", read-only value formatted in THB (e.g. `฿0.00`).
  - **VAT Breakdown Row**: Label "VAT (7% included)" (reflecting demo VAT rate), read-only extracted VAT value (e.g. `฿6.54`).
  - **Divider Line**: 1px subtle border.
  - **Final Sale Amount Row**: Bold title "Total Amount", prominent text size (20–24px), formatted THB value (e.g. `฿100.00`).

### 4.2 Field Specifications & Accessibility

| Field Name | Type | Alignment | Formatting Rules | Accessibility (`aria-live`) |
|---|---|---|---|---|
| **Subtotal** | Read-Only Text | Right-aligned | THB symbol (`฿`), tabular numerals, 2 decimals | `aria-label="Subtotal 100.00 Baht"` |
| **Discount Amount** | Read-Only Text | Right-aligned | THB symbol (`฿`), tabular numerals, 2 decimals | `aria-label="Discount 0.00 Baht"` |
| **VAT Amount** | Read-Only Text | Right-aligned | THB symbol (`฿`), tabular numerals, 2 decimals | `aria-label="VAT 7 percent included 6.54 Baht"` |
| **Total Amount** | Read-Only Text | Right-aligned | THB symbol (`฿`), bold tabular numerals, 2 decimals | `aria-live="polite"` announces "Updated total amount: 100.00 Baht" |

### 4.3 Async Loading, Stale State & Rollback Handling

- **In-flight Loading State**: When a cart mutation (`POST`, `PATCH`, `DELETE`) is in-flight, `TotalsSummaryPanel` opacity is reduced to `0.6` with `pointer-events: none` to prevent duplicate submissions. `aria-live="polite"` announces `"Updating cart totals..."`.
- **Mutation Failure / Rollback**: If an API request fails (e.g. HTTP 400, 404, 500, or network timeout):
  1. Cart item table and `TotalsSummaryPanel` instantly roll back to the previously confirmed server state (`subtotal`, `vatAmount`, `totalAmount`).
  2. Floating error toast displays failure details.
  3. `aria-live="assertive"` announces `"Cart update failed. Totals restored to previous state."`.

---

## 5. API Specification

### 5.1 Complete Sale DTO Schema

All REST API responses returning `Sale` aggregates serialize monetary fields as 2-decimal strings and include active cart `items`:

```json
{
  "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "saleNumber": "SALE-20260827-0001",
  "status": "OPEN",
  "subtotal": "100.00",
  "discountAmount": "0.00",
  "vatAmount": "6.54",
  "totalAmount": "100.00",
  "version": 1,
  "items": [
    {
      "id": "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
      "saleId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      "productId": "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
      "codeSnapshot": "PROD-001",
      "nameSnapshot": "Fresh Milk 1L",
      "unitPriceSnapshot": "45.00",
      "quantity": 2,
      "extendedAmount": "90.00",
      "createdAt": "2026-08-27T10:30:00.000Z",
      "updatedAt": "2026-08-27T10:31:00.000Z"
    },
    {
      "id": "d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44",
      "saleId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      "productId": "e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55",
      "codeSnapshot": "PROD-002",
      "nameSnapshot": "Drinking Water 500ml",
      "unitPriceSnapshot": "10.00",
      "quantity": 1,
      "extendedAmount": "10.00",
      "createdAt": "2026-08-27T10:32:00.000Z",
      "updatedAt": "2026-08-27T10:32:00.000Z"
    }
  ],
  "createdAt": "2026-08-27T10:15:00.000Z",
  "updatedAt": "2026-08-27T10:32:00.000Z"
}
```

### 5.2 Safe API Error Handling

- All calculation errors or invalid state requests return standard Problem Details JSON payloads without exposing internal stack traces:
  ```json
  {
    "code": "CALCULATION_ERROR",
    "title": "Total Calculation Failed",
    "message": "Unable to calculate sale totals. Please refresh and try again.",
    "retryable": true
  }
  ```

---

## 6. Data and Transaction Design

### 6.1 Domain Engine & Precision Rules

- **Database Model**: `Sale` table stores `subtotal`, `discountAmount`, `vatAmount`, `totalAmount` as PostgreSQL `NUMERIC(12, 2)` mapped to `Prisma.Decimal`.
- **In-Memory Precision**: Calculations use `decimal.js` via `Prisma.Decimal` method chaining (`.mul()`, `.div()`, `.add()`, `.sub()`, `.toDecimalPlaces()`). Native JS numbers (`number`), `parseFloat()`, and expressions like `(7 / 107)` are strictly prohibited.
- **Domain Service Signature**:
  ```typescript
  export function calculateSaleTotals(
    items: Array<{ unitPriceSnapshot: Prisma.Decimal | string; quantity: number }>,
    discountAmount: Prisma.Decimal | string = "0.00",
    vatRate: Prisma.Decimal | string = "7.00"
  ): {
    subtotal: string;
    discountAmount: string;
    vatAmount: string;
    totalAmount: string;
  }
  ```
- **Formula Definitions**:
  1. Extended Line Amount:
     $$\text{extendedAmount} = \text{unitPriceSnapshot} \times \text{quantity}$$
  2. Subtotal:
     $$\text{subtotal} = \sum \text{extendedAmount}$$
  3. Taxable Total:
     $$\text{taxableTotal} = \max(0, \text{subtotal} - \text{discountAmount})$$
  4. Extracted VAT Amount (7.00% demo rate, executed at aggregate order level):
     $$\text{vatRateDecimal} = \text{new Decimal}(vatRate)$$
     $$\text{vatAmount} = \text{taxableTotal}.\text{mul}(\text{vatRateDecimal}).\text{div}(\text{new Decimal}(100).\text{add}(\text{vatRateDecimal}))$$
     $$\text{vatAmount}_{\text{rounded}} = \text{vatAmount}.\text{toDecimalPlaces}(2, \text{Decimal.ROUND\_HALF\_UP}).\text{toFixed}(2)$$
  5. Final Sale Amount:
     $$\text{totalAmount} = \text{subtotal} - \text{discountAmount}$$

### 6.2 Satang Rounding Boundary Examples

| Item Price (VAT-inclusive) | Quantity | Subtotal | Taxable Total | Raw VAT Extraction ($\times \frac{7}{107}$) | Rounded VAT (`ROUND_HALF_UP`) | Final Total |
|---|---|---|---|---|---|---|
| `100.00` | 1 | `100.00` | `100.00` | $6.542056...$ | `6.54` | `100.00` |
| `107.00` | 1 | `107.00` | `107.00` | $7.000000...$ | `7.00` | `107.00` |
| `45.00` | 1 | `45.00` | `45.00` | $2.943925...$ | `2.94` | `45.00` |
| `45.00` | 3 | `135.00` | `135.00` | $8.831775...$ | `8.83` | `135.00` |
| `15.00` | 1 | `15.00` | `15.00` | $0.981308...$ | `0.98` | `15.00` |
| `7.50` | 1 | `7.50` | `7.50` | $0.490654...$ | `0.49` | `7.50` |

---

## 7. Security and Operational Behavior

- API endpoints validate monetary formats and restrict output strings to exact 2-decimal formats.
- Errors are logged via structured backend logs without spilling database connection details or stack traces to client responses.

---

## 8. Software Test Specification (STS)

| Test ID | Level | Preconditions | Action | Expected Result | Requirement |
|---|---|---|---|---|---|
| `STS-F-01` | Unit (Server Engine) | Item unit price `100.00`, qty `1` | Execute `calculateSaleTotals()` | Subtotal `"100.00"`, VAT `"6.54"`, Total `"100.00"`. | `FR-004`, `BR-001`, `BR-005` |
| `STS-F-02` | Unit (Server Engine) | Item `107.00`, qty `1` | Execute `calculateSaleTotals()` | Subtotal `"107.00"`, VAT `"7.00"`, Total `"107.00"`. | `BR-001`, `BR-002` |
| `STS-F-03` | Unit (Server Engine) | Item A `45.00` (qty 2), Item B `10.00` (qty 1) | Execute `calculateSaleTotals()` | Subtotal `"100.00"`, VAT `"6.54"`, Total `"100.00"`. | `BR-002` |
| `STS-F-04` | Unit (Server Engine) | Half-up boundary test (raw VAT fraction $\ge 0.005$) | Execute `calculateSaleTotals()` with price generating $\ge 0.005$ satang fraction | VAT is rounded UP to nearest satang. | `BR-005` |
| `STS-F-05` | Unit (Server Engine) | Half-up boundary test (raw VAT fraction $< 0.005$) | Execute `calculateSaleTotals()` with price generating $< 0.005$ satang fraction | VAT is rounded DOWN to nearest satang. | `BR-005` |
| `STS-F-06` | Integration (API) | `OPEN` sale with cart items | `GET /api/v1/sales/{id}` or cart mutation | Response JSON contains 2-decimal string money fields (`subtotal`, `vatAmount`, `totalAmount`) and cart `items`. | `NFR-010`, `FR-004` |
| `STS-F-07` | Client (React) | Cart contains items | Render `TotalsSummaryPanel` | Displays Subtotal, Discount, Included VAT (7%), and Total with THB currency and tabular numerals. | `FR-004`, `NFR-010` |
| `STS-F-08` | Unit (Server Engine) | Empty cart (0 items) | Execute `calculateSaleTotals()` | Subtotal `"0.00"`, Discount `"0.00"`, VAT `"0.00"`, Total `"0.00"`. | `AC-F-06` |
| `STS-F-09` | Unit (Server Engine) | Max monetary boundary (Subtotal `999,999,999.99` THB) | Execute `calculateSaleTotals()` | Calculates without `DECIMAL(12,2)` overflow, VAT `"65,420,560.75"`. | `SDS Section 6.1` |
| `STS-F-10` | Unit (Server Engine) | 50 diverse items in cart | Compare aggregate VAT vs sum of line VATs | Aggregate VAT is extracted from total subtotal; line item VAT sum is NOT used. | `BR-001`, `BR-005` |
| `STS-F-11` | Unit (Server Engine) | Precision check | Inspect calculation trace | `Decimal` method chaining is used; no native JS float division `7 / 107` occurs. | `SDS Section 6.1` |
| `STS-F-12` | Client (React) | Cart mutation in-flight & simulated network failure | Trigger `PATCH /items/{id}` with 500 error | UI dims during request, then rolls back cart items and `TotalsSummaryPanel` to previous server state. | `AC-F-07`, `FR-004` |

---

## 9. Open Decisions

All technical and design decisions for Feature-F are baseline aligned and approved:
- **Decimal Math Engine**: `Prisma.Decimal` and `decimal.js` method chaining enforced for monetary calculations (`BR-005`). Native JS `number` and native `7 / 107` float division strictly prohibited.
- **Aggregate Order Extraction**: VAT extraction is strictly performed on aggregate order taxable total, avoiding cumulative per-line satang discrepancies.
- **Demo VAT Rate**: Configurable demo VAT rate (default 7.00%) specified without asserting statutory legal status.
- **Satang Rounding Boundary**: Commercial half-up satang rounding (`ROUND_HALF_UP`) to 2 decimal places confirmed (`BR-005`).
- **2-Decimal String Serialization**: API boundary money fields serialized strictly as 2-decimal strings (`NFR-010`).
- **UI Loading & Rollback**: `TotalsSummaryPanel` loading states and rollback handling upon API error explicitly specified.
