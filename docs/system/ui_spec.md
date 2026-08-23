# Kaching System-Level UI Specification

Status: Lab 2 starting baseline. Feature contracts may refine this document but must preserve accessibility and shared visual conventions.

## Typography

- Use Inter when available, followed by the native system sans-serif stack.
- Body text: 16px/1.5; supporting text: 14px/1.45.
- Page title: 36-40px/1.15; section title: 20-24px/1.25.
- Monetary totals use tabular numerals and two decimal places.
- Use sentence case for headings, buttons, labels, and messages.

## Color tokens

| Token | Value | Use |
|---|---:|---|
| `brand.orange` | `#FA4616` | Brand accents and selected indicators |
| `brand.yellow` | `#FFC72C` | Warning/highlight surfaces with dark text |
| `brand.blueGrey` | `#7B8189` | Borders and secondary accents |
| `action.primary` | `#B33100` | Primary action with white text |
| `text.primary` | `#24272A` | Body text |
| `surface.default` | `#FFFFFF` | Main work surfaces |
| `surface.subtle` | `#F2F4F5` | Secondary panels and striped rows |
| `status.success` | `#1F7A4D` | Completed and approved states |
| `status.error` | `#B42318` | Failure, decline, or blocked states |

Color is never the only status indicator. Text or an icon with an accessible label must accompany every status color. All text and controls must meet WCAG 2.1 AA contrast.

## Layout and responsiveness

- Optimize checkout for desktop and touchscreen at 1280x720 or higher.
- At 1024px and above, use the two-region checkout layout: product/cart on the left and totals/actions on the right.
- Below 1024px, stack the action panel below the cart while keeping the final total and primary action reachable without horizontal scrolling.
- Use a maximum 24px page gutter, 16-24px card padding, and an 8px spacing grid.
- Tables may scroll horizontally only when columns cannot be safely collapsed.

## Controls and fields

- Interactive targets are at least 44x44 CSS pixels.
- Primary buttons use `action.primary`; secondary buttons use a neutral outline; destructive buttons use `status.error` and require confirmation.
- Every icon-only button has an accessible name and tooltip.
- Editable inputs have a visible border and focus ring. Read-only values use a subtle surface and remain selectable.
- Required fields are identified in their labels; placeholder text is not a label.

## Tables and line items

- Headers use a dark blue-grey surface with white semibold text.
- Alternate rows use `surface.subtle`; hover and keyboard focus are distinct.
- Numeric and monetary columns align right; codes and quantities use tabular numerals.
- Selected rows have both a visible indicator and an announced selected state.
- Line-item edit and remove actions remain keyboard accessible.

## Validation and system states

- Show correctable field errors next to the affected field and move focus to the first invalid field after submission.
- Use persistent banners or dialogs for transaction, integration, or recovery errors.
- Loading states name the operation and prevent duplicate submission.
- Empty states explain what is empty and provide the next valid action.
- Success messages state what completed and preserve the resulting identifier.
- Failure messages state what failed, whether retry is safe, and the next action.
- Never invite a cashier to retry payment while a card result is unresolved.

## Dialogs

- Use dialogs only for confirmation, blocking decisions, and focused workflows.
- Place initial focus on the dialog heading or safest action, trap focus while open, support Escape when cancellation is safe, and restore focus on close.
- Destructive confirmation names the affected sale, user, store, or terminal.
