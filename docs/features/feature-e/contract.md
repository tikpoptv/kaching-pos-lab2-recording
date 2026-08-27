# Feature Feature-E: Cart and Sale-Item Management

Status: Approved Contract Draft

Owner: Cashier / POS Team

GitHub Issue: `[Feature-E] Cart and Sale-Item Management: Barcode Scan, Manual Entry, Quantity Change, and Item Removal`

Branch: `4-feature-e-cart-and-sale-item-management` (Specification branch: `feature/issue-2-cart-management`)

---

## 1. Purpose and Scope

### 1.1 Outcome
Provide cart item management capabilities for the Kaching POS system. Cashiers can add products to an active `OPEN` sale via USB barcode scanner or manual barcode entry, search products by code or name, adjust item quantities (+ / - / direct input), and remove line items from the cart.

### 1.2 Included Scope
- **Database Architecture**: Introduce `SaleItem` entity in Prisma schema (`id` UUID, `saleId` UUID FK, `productId` UUID FK, `codeSnapshot`, `nameSnapshot`, `unitPriceSnapshot` Decimal(12,2), `quantity` Int, `extendedAmount` Decimal(12,2), `createdAt`, `updatedAt`). Enforce database unique constraint `@@unique([saleId, productId])`.
- **REST API Endpoints**:
  - `POST /api/v1/sales/{id}/items` - Add product by barcode or `productId` to cart (atomically increments quantity if item already exists in the sale).
  - `GET /api/v1/products` - Search active product catalog by partial product code or name.
  - `PATCH /api/v1/sales/{id}/items/{itemId}` - Update item quantity (enforces $1 \le \text{quantity} \le 9,999$).
  - `DELETE /api/v1/sales/{id}/items/{itemId}` - Remove line item from cart.
- **Client User Interface**:
  - Auto-focused barcode scanner input field supporting USB keyboard-wedge barcode scanners and manual typing (`FR-043`).
  - Product search modal dialog searching active catalog products by partial code or name with keyboard navigation (`FR-043`).
  - Cart table displaying product code, product name, unit price snapshot, quantity controls (+ / - buttons and inline input), extended line total, and remove button (`FR-003`).

### 1.3 Explicit Exclusions
- Item-level or line-item discounts (`BR-003`).
- Synchronous inventory balance checking or blocking at checkout (`BR-016`). Physical presence of item at counter is sufficient to sell.
- Order-level discount processing and total VAT/subtotal recalculation logic (reserved for Feature-F and Feature-G).
- Modification of cart items on sales with status other than `OPEN` (`BR-014`).

---

## 2. Requirements Traceability

| Source ID | Requirement Summary | Design & Contract Section | Test Coverage ID |
|---|---|---|---|
| `FR-003` | Display cart items with code, name, unit price, quantity, line total, and remove action | Section 1.2, 3.2 (AC-E-01, AC-E-03), 4.1 | `STS-E-01`, `STS-E-03`, `STS-E-09` |
| `FR-043` | Support barcode scanning, manual barcode entry, and product search by code or name | Section 1.2, 3.1, 3.2 (AC-E-01, AC-E-04), 4.1, 5.2 | `STS-E-01`, `STS-E-04`, `STS-E-08` |
| `BR-002` | Scanning duplicate product increments quantity and updates line total | Section 3.2 (AC-E-02), 5.1, 6.2 | `STS-E-02` |
| `BR-016` | No inventory checking or blocking at checkout; counter presence is sufficient | Section 1.3, 3.2 (AC-E-05) | `STS-E-05` |
| `NFR-001` | Response time under 2,000 ms for 95% of requests | Section 5.1, 5.2, 5.3, 5.4 | `STS-E-01`, `STS-E-02`, `STS-E-03` |
| `NFR-010` | Standardized THB monetary formatting (tabular numerals, 2 decimal places) | Section 4.1, 5.1, 5.3 | `STS-E-01`, `STS-E-03` |
| `NFR-016` | Usability & Accessibility: WCAG 2.1 AA, keyboard focus restoration, Escape key support, $\ge 44 \times 44$ px touch targets | Section 4.1, 4.2 | `STS-E-08`, `STS-E-09`, `STS-E-10` |

---

## 3. User Workflow and Acceptance Criteria

### 3.1 Workflows Overview

#### 1. Barcode Scanning Workflow (USB Wedge Scanner)
1. Cashier opens active `OPEN` sale in POS checkout screen.
2. Focus is automatically on the primary Barcode Input field (`BarcodeScannerInput`).
3. USB scanner scans barcode and emits keystrokes followed by `Enter`.
4. System invokes `POST /api/v1/sales/{id}/items` with `{ "barcode": scannedCode }`.
5. If product exists in cart for this sale, quantity atomically increments by 1 (returns `200 OK`); if new, a line item row is created with price & code snapshots (returns `201 Created`).
6. Cart line item total updates immediately, input field clears, and focus automatically restores to `BarcodeScannerInput`.

#### 2. Manual Barcode Entry Workflow
1. Cashier types barcode string into the auto-focused Barcode Input field.
2. Cashier presses `Enter` key or clicks "Add Item" button.
3. System invokes `POST /api/v1/sales/{id}/items` with `{ "barcode": typedCode }`.
4. If product barcode is invalid or inactive, UI displays an inline error toast/banner ("Product not found"), clears input, and restores focus to `BarcodeScannerInput`.

#### 3. Product Search Workflow
1. Cashier clicks "Search Product" button (or presses hotkey `F2` / `Ctrl+K`).
2. Product Search Modal opens, trapping focus (`FocusTrap`) inside the search query input.
3. Cashier types partial product code or name.
4. UI debounces (200ms) and calls `GET /api/v1/products?search={query}&limit=20`.
5. Matching active products display with code, name, and formatted THB price. Cashier can navigate results using `ArrowUp` / `ArrowDown` and select with `Enter` or click.
6. System calls `POST /api/v1/sales/{id}/items` with `{ "productId": selectedId }`.
7. Modal closes, item appears in cart table, focus restores to `BarcodeScannerInput`, and screen reader announces `"Added 1x [Name] to cart"`.

#### 4. Quantity Adjustment Workflow
1. Cashier clicks `+` / `-` buttons or edits quantity number inline in cart table (validated: integer $1 \le q \le 9,999$).
2. System calls `PATCH /api/v1/sales/{id}/items/{itemId}` with `{ "quantity": newQty }`.
3. Extended amount (`unitPriceSnapshot * quantity`) updates immediately.

#### 5. Item Removal Workflow
1. Cashier clicks "Remove" button (trash icon button) on line item row.
2. System calls `DELETE /api/v1/sales/{id}/items/{itemId}`.
3. Line item is removed from cart table and focus restores to `BarcodeScannerInput`.

### 3.2 Acceptance Criteria

- **AC-E-01 (Barcode Scan & Snapshot Capture)**: GIVEN an `OPEN` sale, WHEN a valid product barcode is scanned or entered, THEN a new line item is added capturing price (`unitPriceSnapshot`), code (`codeSnapshot`), and name (`nameSnapshot`), returning `201 Created` within 2,000 ms (`FR-003`, `FR-043`, `NFR-001`).
- **AC-E-02 (Duplicate Product Increment)**: GIVEN a product already in the cart for the active sale, WHEN scanned again or added via search, THEN the existing item quantity atomically increments by 1, returning `200 OK`, and line total updates (`BR-002`).
- **AC-E-03 (Quantity Edit & Line Total Update)**: GIVEN an item in cart, WHEN quantity is modified via `PATCH` ($1 \le q \le 9,999$) or item is removed via `DELETE`, THEN line total (`extendedAmount`) updates immediately (`FR-003`, `BR-002`). Subtotal, VAT, and discounts remain delegated to Feature-F and Feature-G.
- **AC-E-04 (Product Search)**: GIVEN product search input, WHEN typing partial code or name, THEN matching active products (`isActive = true`) are listed for cashier selection with keyboard navigation (`FR-043`).
- **AC-E-05 (No Inventory Block)**: GIVEN item physical presence at counter, THEN POS allows adding item without checking or blocking on stock levels (`BR-016`).
- **AC-E-06 (OPEN Sale Enforcement)**: GIVEN a sale with status other than `OPEN` (`CANCELLED`, `COMPLETED`), WHEN attempting `POST`, `PATCH`, or `DELETE` on cart items, THEN API rejects request with HTTP 400 Bad Request (`INVALID_SALE_STATE`).
- **AC-E-07 (Quantity Boundary Rules)**: GIVEN a cart item, WHEN cashier attempts to set quantity $< 1$ or $> 9,999$ or non-integer via `PATCH`, THEN API rejects with HTTP 400 Bad Request (`INVALID_QUANTITY`). Removal must explicitly use `DELETE`.
- **AC-E-08 (Cross-Sale Item Access Protection)**: GIVEN a valid `itemId`, WHEN attempting `PATCH` or `DELETE` with a `saleId` that does not match the item's parent sale, THEN API rejects with HTTP 404 Not Found (`ITEM_NOT_FOUND`).

---

## 4. UI Specification

### 4.1 Visual Components
- **`BarcodeScannerInput`**: Single auto-focused input field (`outline: 2px solid brand.orange` on focus) supporting USB scanner wedge & manual entry. Focus automatically restores to this input after every submission or modal close.
- **`ProductSearchModal`**: Dialog modal trapping focus, containing query input field, keyboard-navigable filtered list (`ArrowUp`/`ArrowDown`, `Enter`), loading spinner, empty/no-result states, and `Escape` key close support.
- **`CartTable`**: Table displaying line items:
  - Columns: Code (`codeSnapshot`), Product Name (`nameSnapshot`), Unit Price (`unitPriceSnapshot` formatted THB), Quantity controls (`-`, number input, `+`), Line Total (`extendedAmount` formatted THB), and Remove Button.
  - Table header: `#7B8189` background, white text.
  - Alternating row background: `#F2F4F5`.
  - All interactive touch targets $\ge 44 \times 44$ CSS pixels with visible focus rings.
- **`EmptyCartBanner`**: Displayed when cart has 0 items, guiding cashier to scan barcode or search product.
- **`ErrorToast / InlineBanner`**: Floating banner displaying error messages (e.g. "Product not found for barcode '8850001234567'"), auto-dismissing or dismissible via keyboard.

### 4.2 Screen States & Accessibility

| Screen / Component State | Visual & Interactive Behavior | Focus & Accessibility (`aria-live`) |
|---|---|---|
| **Empty Cart** | Shows `EmptyCartBanner` ("Scan a product barcode or press Search") | Focus on `BarcodeScannerInput` |
| **Barcode Input Active** | Input highlighted (`brand.orange` ring), ready for scanner/typing | Default auto-focus |
| **Barcode Scanning (In-flight)** | Input temporarily disabled, subtle loading indicator | `aria-live="polite"` announces "Adding item..." |
| **Invalid Barcode Error** | Displays red error banner (`status.error` `#B42318`) below input | Text cleared, focus restored to input, announced via `aria-live="assertive"` |
| **Search Modal Open** | Backdrop darkened, modal dialog centered | Focus trapped in query input; `Escape` closes modal |
| **Search Result List** | Lists up to 20 matching active products with price | `ArrowUp`/`ArrowDown` moves highlight, `Enter` selects |
| **Search No Results** | Displays "No active products found matching '[query]'" | Focus remains in query input |
| **Item Added Success** | Cart table updates line item and extended amount | `aria-live="polite"` announces "Added 1x [Name] to cart, line total [Amount] THB" |

---

## 5. API Specification

### 5.1 Add Item to Cart (`POST /api/v1/sales/{id}/items`)

- **Method / Path**: `POST /api/v1/sales/{id}/items`
- **Request Body**:
  ```json
  {
    "barcode": "8850001234567"
  }
  ```
  *OR*
  ```json
  {
    "productId": "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22"
  }
  ```
- **Success Response - New Item Created (`201 Created`)**:
  ```json
  {
    "id": "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
    "saleId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "productId": "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
    "codeSnapshot": "PROD-001",
    "nameSnapshot": "Fresh Milk 1L",
    "unitPriceSnapshot": "45.00",
    "quantity": 1,
    "extendedAmount": "45.00",
    "createdAt": "2026-08-27T10:30:00.000Z",
    "updatedAt": "2026-08-27T10:30:00.000Z"
  }
  ```
- **Success Response - Duplicate Item Incremented (`200 OK`)**:
  ```json
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
  }
  ```
- **Error Response - Product Not Found (`404 Not Found`)**:
  ```json
  {
    "code": "PRODUCT_NOT_FOUND",
    "title": "Product Not Found",
    "message": "No active product found matching barcode '8850001234567'.",
    "retryable": false
  }
  ```
- **Error Response - Sale Not Open (`400 Bad Request`)**:
  ```json
  {
    "code": "INVALID_SALE_STATE",
    "title": "Cannot Modify Cart",
    "message": "Cart items cannot be added because sale status is 'CANCELLED'. Only 'OPEN' sales may be modified.",
    "retryable": false
  }
  ```

### 5.2 Product Search (`GET /api/v1/products`)

- **Method / Path**: `GET /api/v1/products?search={query}&limit={limit}`
- **Query Parameters**:
  - `search` (optional string): Partial product code or product name.
  - `limit` (optional integer): Max results to return (default 20, max 50).
- **Success Response (`200 OK`)**:
  ```json
  [
    {
      "id": "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
      "barcode": "8850001234567",
      "code": "PROD-001",
      "name": "Fresh Milk 1L",
      "unitPrice": "45.00",
      "isActive": true
    }
  ]
  ```

### 5.3 Update Item Quantity (`PATCH /api/v1/sales/{id}/items/{itemId}`)

- **Method / Path**: `PATCH /api/v1/sales/{id}/items/{itemId}`
- **Request Body**:
  ```json
  {
    "quantity": 3
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "id": "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
    "saleId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "productId": "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
    "codeSnapshot": "PROD-001",
    "nameSnapshot": "Fresh Milk 1L",
    "unitPriceSnapshot": "45.00",
    "quantity": 3,
    "extendedAmount": "135.00",
    "createdAt": "2026-08-27T10:30:00.000Z",
    "updatedAt": "2026-08-27T10:31:00.000Z"
  }
  ```
- **Error Response - Invalid Quantity (`400 Bad Request`)**:
  ```json
  {
    "code": "INVALID_QUANTITY",
    "title": "Invalid Quantity",
    "message": "Quantity must be an integer between 1 and 9,999 inclusive.",
    "retryable": false
  }
  ```
- **Error Response - Sale Not Open (`400 Bad Request`)**:
  ```json
  {
    "code": "INVALID_SALE_STATE",
    "title": "Cannot Modify Cart",
    "message": "Cart items cannot be modified because sale status is 'CANCELLED'. Only 'OPEN' sales may be modified.",
    "retryable": false
  }
  ```
- **Error Response - Item Not Found in Sale (`404 Not Found`)**:
  ```json
  {
    "code": "ITEM_NOT_FOUND",
    "title": "Item Not Found",
    "message": "No cart item with ID 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33' exists in sale 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'.",
    "retryable": false
  }
  ```

### 5.4 Remove Item from Cart (`DELETE /api/v1/sales/{id}/items/{itemId}`)

- **Method / Path**: `DELETE /api/v1/sales/{id}/items/{itemId}`
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Item removed from cart.",
    "itemId": "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33"
  }
  ```
- **Error Response - Sale Not Open (`400 Bad Request`)**:
  ```json
  {
    "code": "INVALID_SALE_STATE",
    "title": "Cannot Modify Cart",
    "message": "Cart items cannot be removed because sale status is 'CANCELLED'. Only 'OPEN' sales may be modified.",
    "retryable": false
  }
  ```
- **Error Response - Item Not Found in Sale (`404 Not Found`)**:
  ```json
  {
    "code": "ITEM_NOT_FOUND",
    "title": "Item Not Found",
    "message": "No cart item with ID 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33' exists in sale 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'.",
    "retryable": false
  }
  ```

---

## 6. Data and Transaction Design

### 6.1 Prisma Schema Extension

```prisma
model SaleItem {
  id                String   @id @default(uuid()) @db.Uuid
  saleId            String   @db.Uuid
  productId         String   @db.Uuid
  codeSnapshot      String
  nameSnapshot      String
  unitPriceSnapshot Decimal  @db.Decimal(12, 2)
  quantity          Int      @default(1)
  extendedAmount    Decimal  @db.Decimal(12, 2)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  sale    Sale    @relation(fields: [saleId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id])

  @@unique([saleId, productId])
  @@index([saleId])
}
```

### 6.2 Business & Data Rules
1. **Snapshots Preservation**: `codeSnapshot`, `nameSnapshot`, and `unitPriceSnapshot` are copied directly from `Product` when the item is first added to the cart. Subsequent changes to product catalog master data do not alter existing cart items.
2. **Atomic Duplicate Handling**: The database enforces `@@unique([saleId, productId])`. When adding a product that already exists in the sale, the backend executes an atomic upsert/increment:
   $$\text{quantity}_{\text{new}} = \text{quantity}_{\text{existing}} + 1$$
   $$\text{extendedAmount} = \text{unitPriceSnapshot} \times \text{quantity}_{\text{new}}$$
3. **Quantity Constraint**: Quantity must be an integer $1 \le \text{quantity} \le 9,999$. Setting quantity to 0 via PATCH is prohibited.

---

## 7. Security and Operational Behavior

### 7.1 Security & Access Control
- API endpoints require an active authenticated user session.
- Inputs (`barcode`, `productId`, `quantity`) are sanitized and validated via Zod schemas.

### 7.2 Safe API Error Handling
- Database error exceptions (e.g. connection error, Prisma unique constraint violation) are caught and transformed into standardized Problem Details JSON objects (`code`, `title`, `message`, `retryable`).
- Internal stack traces and raw SQL exceptions are never returned in HTTP responses.

---

## 8. Software Test Specification (STS)

| Test ID | Level | Preconditions | Action | Expected Result | Requirement |
|---|---|---|---|---|---|
| `STS-E-01` | Integration (API) | `OPEN` sale exists, Product `PROD-001` active | `POST /api/v1/sales/{id}/items` with `{ "barcode": "PROD-001" }` | HTTP 201 Created, returns `SaleItem` with captured snapshots, `quantity: 1`, `extendedAmount: unitPrice`. | `FR-003`, `FR-043` |
| `STS-E-02` | Integration (API) | Cart already contains `PROD-001` (qty: 1) | `POST /api/v1/sales/{id}/items` with `{ "barcode": "PROD-001" }` | HTTP 200 OK, `quantity` increments to 2, `extendedAmount` doubles. | `BR-002` |
| `STS-E-03` | Integration (API) | Item in cart (qty: 1) | `PATCH /api/v1/sales/{id}/items/{itemId}` with `{ "quantity": 5 }` | HTTP 200 OK, `quantity: 5`, `extendedAmount` updated to `unitPrice * 5`. | `FR-003` |
| `STS-E-04` | Integration (API) | Product catalog populated | `GET /api/v1/products?search=milk` | HTTP 200 OK, returns list of matching active products. | `FR-043` |
| `STS-E-05` | Integration (API) | Product has stock quantity 0 | `POST /api/v1/sales/{id}/items` with product barcode | HTTP 201 Created, item added to cart successfully without stock check error. | `BR-016` |
| `STS-E-06a` | Integration (API) | Sale status is `CANCELLED` | `POST /api/v1/sales/{id}/items` | HTTP 400 Bad Request (`INVALID_SALE_STATE`). | `BR-014` |
| `STS-E-06b` | Integration (API) | Sale status is `CANCELLED` | `PATCH /api/v1/sales/{id}/items/{itemId}` with `{ "quantity": 2 }` | HTTP 400 Bad Request (`INVALID_SALE_STATE`). | `BR-014` |
| `STS-E-06c` | Integration (API) | Sale status is `CANCELLED` | `DELETE /api/v1/sales/{id}/items/{itemId}` | HTTP 400 Bad Request (`INVALID_SALE_STATE`). | `BR-014` |
| `STS-E-07` | Integration (API) | Item in cart (qty: 1) | `PATCH /api/v1/sales/{id}/items/{itemId}` with `{ "quantity": 0 }` or `10000` | HTTP 400 Bad Request (`INVALID_QUANTITY`). | `FR-003` |
| `STS-E-08` | Integration (API) | Item belongs to Sale A | `PATCH /api/v1/sales/{saleB_Id}/items/{itemA_Id}` | HTTP 404 Not Found (`ITEM_NOT_FOUND`). | `AC-E-08` |
| `STS-E-09` | Client (React) | Checkout page rendered | Open search modal, press `ArrowDown` & `Enter` | Item added to cart, search modal closes, focus restored to barcode field. | `FR-043`, `NFR-016` |
| `STS-E-10` | Client (React) | Item in cart | Click Remove button | Item removed from cart table, UI updates, focus restored. | `FR-003`, `NFR-016` |

---

## 9. Open Decisions

All design and technical decisions for Feature-E have been aligned with baseline requirements:
- **Snapshots**: Store `codeSnapshot`, `nameSnapshot`, `unitPriceSnapshot` in `SaleItem` table to preserve historical integrity.
- **Unique Constraint**: `@@unique([saleId, productId])` enforced in Prisma schema for atomic duplicate handling.
- **Barcode Input Focus**: Auto-focus maintained continuously on `BarcodeScannerInput` for seamless scanner wedge integration.
- **Quantity Constraints**: Integer range $1 \le \text{quantity} \le 9,999$ enforced. Item deletion requires explicit `DELETE` call.
- **Inventory Check**: Synchronous stock check explicitly excluded per `BR-016`.
