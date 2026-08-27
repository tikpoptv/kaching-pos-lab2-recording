# Feature Feature-G: Order-Level Discount Management

Status: Approved Contract Draft

Owner: Cashier / POS Team

GitHub Issue: `[Feature-G] Order-Level Discount Management: Percentage and Amount Entry, Validation, and Recalculation`

Branch: `feature/g-order-discount` (Specification Issue: `feature/issue-4-order-discount`)

---

## 1. Purpose and Scope

### 1.1 Outcome
Provide order-level discount management capabilities for the Kaching POS system. This feature allows cashiers to apply either a percentage-based discount (0–100%) or a fixed THB amount discount to an active `OPEN` sale. The system validates input ranges, rounds percentage calculations to satang using exact decimal arithmetic (`Decimal.ROUND_HALF_UP`), automatically recalculates discount amounts when cart contents change, enforces single discount applicability, logs structured audit records, and continuously displays monetary breakdowns in real time.

### 1.2 Included Scope
- **Backend Domain Logic & Calculations**:
  - Direct discount entry modes:
    1. **Percentage Mode**: Calculates discount amount as:
       $$\text{discountAmount} = \text{RoundToSatang}\left(\frac{\text{subtotal} \times \text{discountPercentage}}{100}\right)$$
       Stores `discountPercentage` on `Sale` record for dynamic recalculation.
    2. **Fixed Amount Mode**: Cashier enters `discountAmount` directly. Sets `discountPercentage` to `null` (`BR-006`).
  - **Single Discount Enforcement**: Maximum of ONE order-level discount per sale (`BR-003`). Applying a new discount replaces any existing order discount.
  - **Input Validation**:
    - `discountPercentage` must satisfy $0.00 \le \text{percentage} \le 100.00$ (`BR-008`). Values $< 0$ or $> 100$ return HTTP 400 Bad Request (`INVALID_DISCOUNT_PERCENTAGE`).
    - `discountAmount` must satisfy $0.00 \le \text{amount} \le \text{subtotal}$ (`BR-009`). Values $< 0$ or $> \text{subtotal}$ return HTTP 400 Bad Request (`INVALID_DISCOUNT_AMOUNT`).
  - **Commercial Satang Rounding**: All percentage-based calculations round to two decimal places using half-up satang rounding (`Decimal.ROUND_HALF_UP`) (`BR-005`). Native JS floating-point arithmetic (`number`, `parseFloat()`, `toFixed()`) is strictly prohibited.
  - **Automatic Cart-Change Recalculation** (`BR-007`):
    - When items are added, updated, or removed from cart:
      - If `discountPercentage` is active ($\ne \text{null}$), recalculate `discountAmount` against revised `subtotal`.
      - If fixed `discountAmount` is active (`discountPercentage == null` and `discountAmount > 0`), if revised `subtotal < discountAmount`, cap `discountAmount` at revised `subtotal` per `MISS-04` & `BR-009`. Because fixed mode sets `discountPercentage = null`, if the cart is subsequently refilled, `discountAmount` remains at its current capped value until updated by cashier.
  - **Discount Clearing Behavior**:
    - Submitting percentage `0` (`{ "type": "PERCENTAGE", "percentage": 0 }`), THB amount `"0.00"` (`{ "type": "AMOUNT", "amount": "0.00" }`), or issuing `DELETE /api/v1/sales/{id}/discount` clears discount, resetting `discountPercentage` to `null` and `discountAmount` to `"0.00"`.
  - **OPEN Sale Enforcement**: Discount endpoints (`POST /api/v1/sales/{id}/discount` and `DELETE /api/v1/sales/{id}/discount`) and cart recalculations strictly require `Sale.status === 'OPEN'`. Attempts to alter discounts on `CANCELLED` or `COMPLETED` sales return HTTP 400 Bad Request (`INVALID_SALE_STATE`).
  - **Audit Logging** (`NFR-008`): Emit structured JSON audit log upon discount application, modification, or clearing, recording cashier, store, terminal, timestamp, discount parameters, and outcome.
  - **API Authority**: Server is single source of truth for all calculations, total formulas, and database persistence.
- **REST API Endpoints**:
  - `POST /api/v1/sales/{id}/discount` - Apply or update order discount (accepts discriminated union `{ type: "PERCENTAGE", percentage: number }` OR `{ type: "AMOUNT", amount: string }`).
  - `DELETE /api/v1/sales/{id}/discount` - Clear order discount from active sale.
- **Client User Interface**:
  - Discount control form integrated within `TotalsSummaryPanel` in the right checkout region (`docs/system/ui_spec.md`).
  - Mode selector (Radio toggle or Segmented control: "Percentage (%)" vs "Fixed Amount (฿)").
  - Form inputs with clear labels, placeholders, unit indicators, and inline validation error messages (`BR-008`, `BR-009`).
  - "Apply Discount" and "Clear Discount" action buttons meeting WCAG 2.1 AA contrast and touch target ($\ge 44 \times 44$ px) standards.
  - In-flight loading state and automatic UI state rollback to last-confirmed server state upon API error.

### 1.3 Explicit Exclusions
- Item-level or product line-item discounts (`BR-003`).
- Multiple stacked or combined discounts on a single order (`BR-003`).
- Coupon codes, promo code validation engine, or loyalty points redemption.
- Offline calculation or client-side total persistence (`NFR-012`).

---

## 2. Requirements Traceability

| Source ID | Requirement Summary | Design & Contract Section | Test Coverage ID |
|---|---|---|---|
| `FR-004` | Continuously display Subtotal, Discount Amount, VAT, and Final Total | Section 1.2, 4.1, 5.1 | `STS-G-01`, `STS-G-02`, `STS-G-07` |
| `FR-005` | Allow cashier to enter order-level discount as percentage or THB amount | Section 1.2, 3.1, 4.1, 5.1 | `STS-G-01`, `STS-G-02` |
| `BR-003` | Maximum ONE order-level discount per sale; no line item or stacked discounts | Section 1.2, 3.2 (AC-G-01), 6.1 | `STS-G-01`, `STS-G-02`, `STS-G-08` |
| `BR-004` | Percentage discount calculates discount amount as Subtotal * % / 100 rounded to satang | Section 1.2, 6.2 (AC-G-01) | `STS-G-01`, `STS-G-04` |
| `BR-005` | Percentage-based calculations rounded to nearest satang (half-up, 2 decimals) | Section 1.2, 6.2 (AC-G-04) | `STS-G-04`, `STS-G-05` |
| `BR-006` | Direct discount amount entry sets discount percentage to null | Section 1.2, 3.2 (AC-G-03), 6.1 | `STS-G-02` |
| `BR-007` | Cart changes automatically recalculate discount amount when percentage is active | Section 1.2, 3.2 (AC-G-02), 6.3 | `STS-G-03`, `STS-G-09` |
| `BR-008` | Validate discount percentage between 0 and 100 inclusive | Section 1.2, 3.2 (AC-G-04), 5.3 | `STS-G-05` |
| `BR-009` | Validate discount amount between 0 and Subtotal inclusive | Section 1.2, 3.2 (AC-G-04), 5.3 | `STS-G-06` |
| `BR-010` | Final Sale Amount equals Subtotal minus Discount Amount | Section 1.2, 6.2 | `STS-G-01`, `STS-G-02`, `STS-G-03` |
| `NFR-001` | Response time under 2,000 ms for 95% of requests | Section 5.1, 5.2 | `STS-G-01`, `STS-G-02` |
| `NFR-008` | Audit trail logging cashier, date, time, store, terminal for discount changes | Section 1.2, 7.2 | `STS-G-13` |
| `NFR-010` | Standardized THB monetary formatting (tabular numerals, 2 decimal places, 2-decimal string DTOs) | Section 1.2, 4.1, 5.1 | `STS-G-01`, `STS-G-07` |
| `NFR-016` | Usability & Accessibility: WCAG 2.1 AA, keyboard focus, $\ge 44 \times 44$ px targets, live regions | Section 4.1, 4.2 | `STS-G-11`, `STS-G-12` |

---

## 3. User Workflow and Acceptance Criteria

### 3.1 Workflows Overview

#### 1. Percentage Discount Application Workflow
1. Cashier views active `OPEN` sale with items in cart (e.g. Subtotal = `฿100.00`).
2. Cashier selects "Percentage (%)" mode in `DiscountForm` within `TotalsSummaryPanel`.
3. Cashier enters `10` in Percentage input field and clicks "Apply Discount" (or presses `Enter`).
4. Client UI sends `POST /api/v1/sales/{id}/discount` with body `{ "type": "PERCENTAGE", "percentage": 10.00 }`.
5. Server validates percentage ($0 \le 10 \le 100$), calculates `discountAmount = 100.00 * 10 / 100 = 10.00`, extracts VAT on taxable total `90.00` (`90.00 * 7 / 107 = 5.89`), computes `totalAmount = 90.00`, saves `discountPercentage = 10.00` on `Sale`, and logs audit trail.
6. Server returns updated `Sale` aggregate DTO with money strings (`subtotal: "100.00"`, `discountAmount: "10.00"`, `vatAmount: "5.89"`, `totalAmount: "90.00"`).
7. Summary panel continuously updates all monetary fields, and `aria-live="polite"` announces `"Applied 10% discount. Total amount: 90.00 THB."`.

#### 2. Fixed Amount Discount Application Workflow
1. Cashier views active `OPEN` sale (Subtotal = `฿100.00`).
2. Cashier selects "Fixed Amount (฿)" mode in `DiscountForm`.
3. Cashier enters `15.00` in Amount input field and clicks "Apply Discount".
4. Client UI sends `POST /api/v1/sales/{id}/discount` with body `{ "type": "AMOUNT", "amount": "15.00" }`.
5. Server validates amount ($0 \le 15.00 \le 100.00$), sets `discountPercentage = null`, sets `discountAmount = 15.00`, computes `vatAmount` on `85.00` (`85.00 * 7 / 107 = 5.56`), computes `totalAmount = 85.00`, and logs audit trail.
6. Server returns updated `Sale` aggregate DTO (`discountAmount: "15.00"`, `vatAmount: "5.56"`, `totalAmount: "85.00"`).
7. Summary panel updates fields and announces `"Applied 15.00 THB discount. Total amount: 85.00 THB."`.

#### 3. Automatic Recalculation on Cart Item Mutation Workflow
1. Active sale has 10% percentage discount applied (Subtotal = `฿100.00`, Discount = `฿10.00`, Total = `฿90.00`).
2. Cashier adds another item (`฿50.00`) to cart (`POST /items`).
3. Server receives cart addition, updates items, recalculates Subtotal (`฿150.00`).
4. Because `discountPercentage = 10.00` is active on `Sale`, server automatically recalculates `discountAmount = roundToSatang(150.00 * 10 / 100) = 15.00`.
5. Server extracts VAT on `135.00` (`135.00 * 7 / 107 = 8.83`) and sets `totalAmount = 135.00`.
6. Server returns updated `Sale` aggregate. Cart table and summary panel display updated Subtotal (`฿150.00`), Discount (`฿15.00`), VAT (`฿8.83`), and Total (`฿135.00`).
7. *(Fixed Amount Branch)*: If sale had fixed discount `฿15.00` and cart items are removed such that new Subtotal becomes `฿10.00` ($< \text{Discount}$), server caps `discountAmount = 10.00` per `MISS-04` & `BR-009`, resulting in Total = `฿0.00`. If cart subtotal later increases back to `฿100.00`, `discountAmount` remains at `10.00` (the capped value) because `discountPercentage` is `null`.

#### 4. Clearing Discount Workflow
1. Cashier clicks "Clear Discount" button in `DiscountForm` (or submits `0` / `"0.00"`).
2. Client UI sends `DELETE /api/v1/sales/{id}/discount` (or `POST /discount` with zero value).
3. Server sets `discountPercentage = null`, `discountAmount = 0.00`, recalculates VAT on full Subtotal, updates `totalAmount = subtotal`, logs audit trail, and returns updated `Sale` DTO.
4. Summary panel displays Discount `฿0.00` and announces `"Discount cleared."`.

### 3.2 Acceptance Criteria

- **AC-G-01 (Percentage Discount & Satang Rounding)**: GIVEN an `OPEN` sale with subtotal $> 0$, WHEN cashier enters discount percentage (0–100%), THEN system calculates `discountAmount` as $\text{subtotal} \times \frac{\%}{100}$ rounded to satang (`BR-004`, `BR-005`), saves `discountPercentage`, and updates total amount within 2,000 ms (`NFR-001`).
- **AC-G-02 (Cart Change Recalculation)**: GIVEN an active `discountPercentage`, WHEN cart items or quantities change, THEN `discountAmount` is automatically recalculated against the revised subtotal (`BR-007`).
- **AC-G-03 (Direct Amount Discount & Percentage Nullification)**: GIVEN cashier enters discount amount directly, THEN system sets `discountPercentage` to `null` (`BR-006`), validates amount $\le \text{subtotal}$ (`BR-009`), and updates final total (`BR-010`).
- **AC-G-04 (Input Range Validation)**: GIVEN invalid inputs (% $< 0$ or $> 100$, or amount $< 0$ or $> \text{subtotal}$), THEN API rejects request with HTTP 400 Bad Request (`INVALID_DISCOUNT_PERCENTAGE` or `INVALID_DISCOUNT_AMOUNT`) and clear error message (`BR-008`, `BR-009`).
- **AC-G-05 (Single Order Discount Enforcement)**: GIVEN an active sale with an existing discount, WHEN cashier applies a new discount, THEN system replaces the existing discount cleanly without stacking or combining discounts (`BR-003`).
- **AC-G-06 (OPEN Sale Enforcement)**: GIVEN a sale with status `CANCELLED` or `COMPLETED`, WHEN attempting to apply or clear order discount, THEN API rejects request with HTTP 400 Bad Request (`INVALID_SALE_STATE`).
- **AC-G-07 (Discount Clearing)**: GIVEN any active discount, WHEN cashier clicks "Clear Discount" or submits zero values (`0` % or `"0.00"` THB), THEN discount is removed (`discountPercentage = null`, `discountAmount = "0.00"`), and totals revert to full subtotal calculations.
- **AC-G-08 (Audit Trail Logging)**: GIVEN any discount application, modification, or clearing, THEN server writes structured JSON audit record containing cashier ID, store, terminal, timestamps, discount parameters, and outcome (`NFR-008`).

---

## 4. UI Specification

### 4.1 Visual Components & Layout

Located within `TotalsSummaryPanel` in the **Right Region** of the checkout screen ($\ge 1024\text{px}$) per `docs/system/ui_spec.md`:

- **`DiscountForm` Container**:
  - Border box inside `TotalsSummaryPanel` below Subtotal row with subtle background (`surface.subtle` `#F2F4F5`).
  - **Mode Selector**: Segmented toggle buttons or radio group ("% Percentage" / "฿ Amount").
  - **Value Input Field**: Number input field with visible border and orange focus ring (`outline: 2px solid brand.orange`). Displays prefix/suffix symbol (`%` or `฿`) based on mode.
  - **Action Buttons**:
    - **Apply Button**: Primary action (`action.primary` `#B33100`, white text, $\ge 44 \times 44$ px) labeled "Apply".
    - **Clear Button**: Neutral outline button ($\ge 44 \times 44$ px) labeled "Clear", enabled when `discountAmount > 0` or `discountPercentage != null`.
  - **Inline Error Banner**: Rendered below input when validation error occurs (text color `status.error` `#B42318`).

### 4.2 Field Specifications & Accessibility

| Field / Control Name | Type / Tag | Mode / State | Validation Rules | Accessibility (`aria-*`) |
|---|---|---|---|---|
| **Discount Mode Toggle** | Segmented Radio | Toggle % vs ฿ | Required choice | `aria-label="Discount mode selector"` |
| **Discount Input** | Input (`type="number"`) | Step `0.01` | %: $0.00 \le x \le 100.00$<br/>฿: $0.00 \le x \le \text{Subtotal}$ | `aria-label="Discount value"` `aria-describedby="discount-error"` |
| **Apply Button** | Button (`button`) | Enabled when input valid | Submits `POST /discount` | `aria-label="Apply discount"` |
| **Clear Button** | Button (`button`) | Visible if discount active | Submits `DELETE /discount` | `aria-label="Clear discount"` |
| **Discount Summary Row** | Read-Only Text | Right-aligned | Displays `-฿10.00 (10%)` or `-฿15.00` | `aria-label="Discount amount 10.00 Baht"` |

### 4.3 Async Loading, Stale State & Rollback Handling

- **In-flight Loading State**: During `POST` or `DELETE /discount` requests, `DiscountForm` inputs and buttons are disabled, opacity is set to `0.6`, and `aria-live="polite"` announces `"Applying discount..."` or `"Clearing discount..."`.
- **Mutation Failure / Rollback**: If API returns an error (HTTP 400, 404, 500 or network timeout):
  1. `DiscountForm` and `TotalsSummaryPanel` roll back to last-confirmed server state.
  2. Focus moves to the discount input field if validation error, or floating error toast displays API failure details.
  3. `aria-live="assertive"` announces `"Failed to apply discount. Totals restored."`.

---

## 5. API Specification

### 5.1 Apply or Update Order Discount (`POST /api/v1/sales/{id}/discount`)

- **Method / Path**: `POST /api/v1/sales/{id}/discount`
- **Headers**: `Content-Type: application/json`
- **Request Body Options (Discriminated Union)**:

  *Option A: Percentage Mode*
  ```json
  {
    "type": "PERCENTAGE",
    "percentage": 10.0
  }
  ```

  *Option B: Fixed Amount Mode*
  ```json
  {
    "type": "AMOUNT",
    "amount": "15.00"
  }
  ```

  *(Note: Submitting `{ "type": "PERCENTAGE", "percentage": 0 }` or `{ "type": "AMOUNT", "amount": "0.00" }` clears the discount).*

- **Success Response (`200 OK`)** (Response time $\le 2,000\text{ ms}$):
  ```json
  {
    "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "saleNumber": "SALE-20260827-0001",
    "status": "OPEN",
    "subtotal": "100.00",
    "discountPercentage": "10.00",
    "discountAmount": "10.00",
    "vatAmount": "5.89",
    "totalAmount": "90.00",
    "version": 2,
    "items": [ ... ],
    "createdAt": "2026-08-27T10:15:00.000Z",
    "updatedAt": "2026-08-27T10:35:00.000Z"
  }
  ```

### 5.2 Clear Order Discount (`DELETE /api/v1/sales/{id}/discount`)

- **Method / Path**: `DELETE /api/v1/sales/{id}/discount`
- **Success Response (`200 OK`)**:
  ```json
  {
    "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "saleNumber": "SALE-20260827-0001",
    "status": "OPEN",
    "subtotal": "100.00",
    "discountPercentage": null,
    "discountAmount": "0.00",
    "vatAmount": "6.54",
    "totalAmount": "100.00",
    "version": 3,
    "items": [ ... ],
    "createdAt": "2026-08-27T10:15:00.000Z",
    "updatedAt": "2026-08-27T10:36:00.000Z"
  }
  ```

### 5.3 Error Responses

- **Invalid Percentage Value (`400 Bad Request`)**:
  ```json
  {
    "code": "INVALID_DISCOUNT_PERCENTAGE",
    "title": "Invalid Discount Percentage",
    "message": "Discount percentage must be between 0.00 and 100.00 inclusive.",
    "retryable": false
  }
  ```

- **Invalid Amount Value (`400 Bad Request`)**:
  ```json
  {
    "code": "INVALID_DISCOUNT_AMOUNT",
    "title": "Invalid Discount Amount",
    "message": "Discount amount cannot be negative or exceed the order subtotal (100.00 THB).",
    "retryable": false
  }
  ```

- **Sale Status Not OPEN (`400 Bad Request`)**:
  ```json
  {
    "code": "INVALID_SALE_STATE",
    "title": "Cannot Modify Discount",
    "message": "Order discount cannot be modified because sale status is 'CANCELLED'. Only 'OPEN' sales may be modified.",
    "retryable": false
  }
  ```

---

## 6. Data and Transaction Design

### 6.1 Prisma Schema Migration

Update `Sale` model in `server/prisma/schema.prisma` to include optional `discountPercentage`:

```prisma
model Sale {
  id                 String     @id @default(uuid()) @db.Uuid
  saleNumber         String     @unique
  status             SaleStatus @default(OPEN)
  storeId            String?
  terminalId         String?
  cashierId          String?
  subtotal           Decimal    @default(0.00) @db.Decimal(12, 2)
  discountPercentage Decimal?   @db.Decimal(5, 2)
  discountAmount     Decimal    @default(0.00) @db.Decimal(12, 2)
  vatAmount          Decimal    @default(0.00) @db.Decimal(12, 2)
  totalAmount        Decimal    @default(0.00) @db.Decimal(12, 2)
  version            Int        @default(1)
  createdAt          DateTime   @default(now())
  updatedAt          DateTime   @updatedAt

  items              SaleItem[]

  @@index([status, createdAt])
}
```

### 6.2 Calculation Logic & Precision Rules

- **Domain Module**: `server/src/services/totals.ts` (extended from Feature-F).
- **In-Memory Precision**: Executed exclusively via `Prisma.Decimal` and `decimal.js` method chaining. Binary JS floats (`number`) and native operators (`+`, `-`, `*`, `/`) are strictly prohibited for money calculations.
- **Formula Definitions**:
  1. Percentage Discount Calculation:
     $$\text{discountAmount} = \text{subtotal}.\text{mul}(\text{discountPercentage}).\text{div}(100).\text{toDecimalPlaces}(2, \text{Decimal.ROUND\_HALF\_UP})$$
  2. Taxable Total (VAT base):
     $$\text{taxableTotal} = \text{Decimal.max}(0, \text{subtotal}.\text{sub}(\text{discountAmount}))$$
  3. Extracted 7% Demo VAT:
     $$\text{vatAmount} = \text{taxableTotal}.\text{mul}(7).\text{div}(107).\text{toDecimalPlaces}(2, \text{Decimal.ROUND\_HALF\_UP})$$
  4. Final Sale Total:
     $$\text{totalAmount} = \text{subtotal}.\text{sub}(\text{discountAmount})$$

### 6.3 Cart Recalculation Decision Matrix

| Active Discount State | Cart Event (Item Added / Qty Changed / Removed) | Server Recalculation Action |
|---|---|---|
| `discountPercentage != null` | Cart subtotal updates from $S_1$ to $S_2$ | Recalculate $\text{discountAmount} = \text{RoundToSatang}(S_2 \times \frac{\%}{100})$. Update VAT & Total. |
| `discountPercentage == null` & `discountAmount > 0` | Cart subtotal updates to $S_2 \ge \text{discountAmount}$ | Keep `discountAmount` unchanged. Update VAT & Total. |
| `discountPercentage == null` & `discountAmount > 0` | Cart subtotal updates to $S_2 < \text{discountAmount}$ | Cap $\text{discountAmount} = S_2$ (Total becomes `0.00`). Update VAT & Total. (`MISS-04`). If subtotal later increases, `discountAmount` remains at capped value. |
| No active discount | Cart subtotal updates | Keep `discountAmount = 0.00`. Update VAT & Total. |

---

## 7. Security and Operational Behavior

### 7.1 Security & Input Validation
- API endpoints require an active authenticated cashier session.
- Payload input fields are validated using Zod discriminated union schema:
  - `{ type: z.literal("PERCENTAGE"), percentage: z.number().min(0).max(100) }`
  - `{ type: z.literal("AMOUNT"), amount: z.string().regex(/^\d+(\.\d{1,2})?$/) }`

### 7.2 Audit Trail Behavior (`NFR-008`, SDS Section 9.4)
- Server emits structured JSON audit log upon every discount application, update, or clearing:
  ```json
  {
    "event": "ORDER_DISCOUNT_MUTATED",
    "saleId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "saleNumber": "SALE-20260827-0001",
    "actor": "user-cashier-01",
    "role": "Cashier",
    "storeId": "store-01",
    "terminalId": "term-01",
    "action": "APPLY_PERCENTAGE",
    "discountPercentage": "10.00",
    "discountAmount": "10.00",
    "subtotalBefore": "100.00",
    "subtotalAfter": "100.00",
    "totalAmountAfter": "90.00",
    "outcome": "SUCCESS",
    "timestamp": "2026-08-27T10:35:00.000Z"
  }
  ```

### 7.3 Safe API Error Handling
- Invalid inputs or state violations return standard Problem Details JSON without spilling internal database stack traces (`AGENTS.md`).

---

## 8. Software Test Specification (STS)

| Test ID | Level | Preconditions | Action | Expected Result | Requirement |
|---|---|---|---|---|---|
| `STS-G-01` | Unit (Engine) | Subtotal `100.00`, % `10.00` | Call `calculateSaleTotals()` | `discountAmount: "10.00"`, `vatAmount: "5.89"`, `totalAmount: "90.00"`. | `FR-005`, `BR-004`, `BR-010` |
| `STS-G-02` | Unit (Engine) | Subtotal `100.00`, amount `15.00` | Call `calculateSaleTotals()` | `discountAmount: "15.00"`, `vatAmount: "5.56"`, `totalAmount: "85.00"`. | `FR-005`, `BR-006`, `BR-010` |
| `STS-G-03` | Integration (API) | `OPEN` sale (Subtotal `100.00`, 10% disc active) | Add item `50.00` to cart (`POST /items`) | `subtotal: "150.00"`, `discountAmount: "15.00"`, `totalAmount: "135.00"`. | `BR-007` |
| `STS-G-04` | Unit (Engine) | Subtotal `45.00`, % `7.50` (satang fraction $\ge 0.005$) | Call `calculateSaleTotals()` | `discountAmount: "3.38"` (rounded UP from $3.375$). | `BR-005` |
| `STS-G-05` | Integration (API) | `OPEN` sale (Subtotal `100.00`) | `POST /discount` with `{ "type": "PERCENTAGE", "percentage": 105.0 }` | HTTP 400 Bad Request (`INVALID_DISCOUNT_PERCENTAGE`). | `BR-008` |
| `STS-G-06` | Integration (API) | `OPEN` sale (Subtotal `100.00`) | `POST /discount` with `{ "type": "AMOUNT", "amount": "150.00" }` | HTTP 400 Bad Request (`INVALID_DISCOUNT_AMOUNT`). | `BR-009` |
| `STS-G-07` | Integration (API) | `OPEN` sale (Subtotal `100.00`) | `POST /discount` with `{ "type": "PERCENTAGE", "percentage": 10.0 }` | HTTP 200 OK, returns 2-decimal money strings and updated totals. | `FR-004`, `NFR-010` |
| `STS-G-08` | Integration (API) | Sale has existing 10% discount | `POST /discount` with `{ "type": "AMOUNT", "amount": "20.00" }` | HTTP 200 OK, discount replaces 10% disc with `20.00` THB (`discountPercentage: null`). | `BR-003` |
| `STS-G-09` | Integration (API) | Sale has fixed disc `15.00`, Subtotal `20.00` | Remove item so Subtotal becomes `10.00` | HTTP 200 OK, `discountAmount` capped at `10.00`, `totalAmount: "0.00"`. | `MISS-04`, `BR-009` |
| `STS-G-10` | Integration (API) | Sale status is `CANCELLED` | `POST /discount` with `{ "type": "PERCENTAGE", "percentage": 10.0 }` | HTTP 400 Bad Request (`INVALID_SALE_STATE`). | `BR-014` |
| `STS-G-11` | Client (React) | Active `OPEN` sale rendered | Toggle mode to %, enter `10`, click Apply | Form submits API call, summary panel updates Discount & Total with tabular numerals. | `FR-005`, `NFR-016` |
| `STS-G-12` | Client (React) | Active discount applied | Click Clear Discount button | Form submits `DELETE /discount`, discount row resets to `฿0.00`. | `AC-G-07`, `NFR-016` |
| `STS-G-13` | Integration (API) | Active sale | Apply discount via API | Structured audit event `ORDER_DISCOUNT_MUTATED` logged in backend logs. | `NFR-008` |
| `STS-G-14` | Client (React) | Active sale, submit invalid percentage `-5%` | Click Apply Discount | Inline error banner displays "Discount percentage must be between 0 and 100", focus moves to input. | `BR-008`, `NFR-016` |

---

## 9. Open Decisions

All technical, domain, and operational decisions for Feature-G have been baseline aligned and approved:
- **Prisma Schema Extension**: `Sale` model modified to persist `discountPercentage Decimal? @db.Decimal(5, 2)` to enable automatic cart-change recalculation.
- **Single Discount Rule**: `BR-003` strictly enforced; applying a new discount overwrites any active discount.
- **Exact Decimal Arithmetic**: `Prisma.Decimal` and `decimal.js` method chaining enforced for all discount and satang rounding operations (`BR-005`). Native JS floating point arithmetic is strictly prohibited.
- **Input Validation Boundaries**: Percentage range $0 \le \% \le 100$ (`BR-008`) and Fixed Amount range $0 \le \text{amount} \le \text{subtotal}$ (`BR-009`) enforced at API layer with HTTP 400 responses.
- **Cart Shrinkage Boundary**: Fixed discount amounts exceeding a reduced subtotal are capped at the new subtotal (`MISS-04`). Capped value persists if subtotal later expands until updated by cashier.
- **Discriminated Union DTO**: API payload standardized to `{ type: "PERCENTAGE", percentage: number }` or `{ type: "AMOUNT", amount: string }`.
- **Zero Value Clearing**: Submitting 0% or `"0.00"` THB amount is valid and clears the discount (`discountPercentage = null`, `discountAmount = "0.00"`).
- **OPEN Sale Enforcement**: Discount mutations restricted strictly to `OPEN` sales.
- **Audit Trail**: Structured JSON audit logging implemented for all discount mutations (`NFR-008`).
