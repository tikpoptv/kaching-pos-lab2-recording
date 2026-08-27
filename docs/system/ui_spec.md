# Kaching System-Level UI Specification

Status: Baselined for POS Lab 2. Feature contracts may refine this document but must preserve accessibility and shared visual conventions.

## 1. Typography and Language

- **Font Family**: Use Inter when available, followed by the native system sans-serif stack (`Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`).
- **Scale**:
  - Page title: 36–40px / 1.15 line height.
  - Section title: 20–24px / 1.25 line height.
  - Body text: 16px / 1.5 line height.
  - Supporting text: 14px / 1.45 line height.
- **Formatting**:
  - Monetary values use THB currency, tabular numerals (`font-variant-numeric: tabular-nums`), and exactly two decimal places (satang rounding).
  - Language is English-only. Use sentence case for headings, buttons, labels, and messages.

## 2. Color Tokens

| Token | Value | Use |
|---|---:|---|
| `brand.orange` | `#FA4616` | Brand accents, focus indicators, and selected states |
| `brand.yellow` | `#FFC72C` | Warning/highlight surfaces with dark text |
| `brand.blueGrey` | `#7B8189` | Borders, table headers, and secondary accents |
| `action.primary` | `#B33100` | Primary button background with white text (derived for WCAG AA contrast) |
| `text.primary` | `#24272A` | Body text |
| `surface.default` | `#FFFFFF` | Main work surfaces, cards, and modal dialogs |
| `surface.subtle` | `#F2F4F5` | Secondary panels and striped table rows |
| `status.success` | `#1F7A4D` | Completed sale and approved payment states |
| `status.error` | `#B42318` | Failures, declines, destructive actions, or blocked states |

Color is never the only status indicator. Text or an icon with an accessible label must accompany every status color. All text and controls must meet WCAG 2.1 AA contrast.

## 3. Layout and Responsiveness

- Optimize checkout for desktop and touchscreen at 1280x720 or higher (`NFR-016`).
- **Two-Region Checkout Layout ($\ge 1024\text{px}$)**:
  - **Left Region**: Product search, barcode input, and active cart item table.
  - **Right Region**: Subtotal, order-level discount inputs, VAT breakdown, final total, and action panel.
- **Responsive Layout ($< 1024\text{px}$)**: Stack the action and totals panel below the cart workspace while keeping the final total and primary action reachable without horizontal scrolling.
- Use a maximum 24px page gutter, 16–24px card padding, and an 8px spacing grid.
- Tables may scroll horizontally only when columns cannot be safely collapsed.

## 4. Controls and Fields

- Interactive targets are at least 44x44 CSS pixels (`AGENTS.md`, `SDS Section 6.1`).
- Primary buttons use `action.primary` (`#B33100`); secondary buttons use a neutral outline; destructive buttons (e.g. Cancel Sale) use `status.error` (`#B42318`) and require explicit confirmation.
- Every icon-only button has an accessible name (`aria-label`) and tooltip.
- Editable inputs have a visible border and distinct focus ring (`outline: 2px solid brand.orange`).
- Read-only values (Subtotal, VAT, Final Total, item line totals) use a subtle surface background and remain text-selectable.
- Required fields are identified in their labels; placeholder text is not a label.

## 5. Barcode Scanner and Product Lookup

- The primary barcode input maintains default keyboard focus (auto-focus) automatically to seamlessly accept keyboard-wedge USB barcode scanner input without requiring manual clicks.
- After a product is added or a modal dialog is closed, keyboard focus automatically returns to the barcode scanner input field.
- Manual barcode typing supports submission on `Enter`.
- Product search modal / dropdown provides search by partial product code or name with keyboard selection.

## 6. Tables and Line Items

- Table headers use a dark blue-grey surface (`#7B8189`) with white semibold text.
- Alternate rows use `surface.subtle` (`#F2F4F5`) for zebra striping; hover and keyboard focus are visually distinct.
- Numeric and monetary columns align right; codes, quantities, and prices use tabular numerals (`tabular-nums`).
- Line-item quantity controls (+ / - buttons and direct number input) and item removal actions remain keyboard accessible (`tabindex="0"`).
- Selected rows have both a visible indicator and an announced selected state (`aria-selected`).

## 7. Validation and System States

- **Inline Validation**: Show correctable field errors (e.g. discount % out of range 0–100, or discount amount exceeding subtotal) directly next to or below the affected field, and move focus to the first invalid field upon submission.
- **System / Transaction Errors**: Use persistent top banners or dialogs for transaction, API connectivity, or recovery errors.
- **Loading States**: Buttons enter a loading state (e.g. "Starting sale...", "Adding item..."), disable further interaction to prevent duplicate submissions, and announce status changes via `aria-live="polite"`.
- **Empty States**: When the cart is empty, display an explicit message explaining that the cart is empty and guiding the cashier to scan a barcode or search for a product.
- **Success / Failure Feedback**: Success messages state what completed and preserve the resulting identifier (e.g. Sale #1001). Failure messages state what failed, whether retry is safe, and the next valid action.
- **Payment Safety**: Never invite a cashier to retry payment while a card result is unresolved (`BR-016`, `SDS Section 10.2`).

## 8. Dialogs and Focus Management

- Use dialogs only for confirmation (e.g. Cancel Sale), blocking decisions, and focused workflows.
- Place initial focus on the safest action button (e.g. "Keep Sale"), trap focus (`FocusTrap`) within the dialog while open, support `Escape` key cancellation when safe, and restore focus to the originating control upon closing.
- Destructive confirmation dialogs explicitly name the affected sale number, cashier, store, or terminal.
