import { useState, ChangeEvent } from "react";
import { SaleItemDto } from "../api.js";

interface CartTableProps {
  items: SaleItemDto[];
  onUpdateQuantity: (itemId: string, newQuantity: number) => Promise<void>;
  onRemoveItem: (itemId: string) => Promise<void>;
  disabled?: boolean;
}

const moneyFormatter = new Intl.NumberFormat("en-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 2,
});

export default function CartTable({
  items,
  onUpdateQuantity,
  onRemoveItem,
  disabled = false,
}: CartTableProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function handleQtyChange(itemId: string, currentQty: number, delta: number) {
    const targetQty = currentQty + delta;
    if (targetQty < 1 || targetQty > 9999 || disabled || updatingId) return;

    setUpdatingId(itemId);
    try {
      await onUpdateQuantity(itemId, targetQty);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDirectInput(itemId: string, e: ChangeEvent<HTMLInputElement>) {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 1 || val > 9999 || disabled || updatingId) return;

    setUpdatingId(itemId);
    try {
      await onUpdateQuantity(itemId, val);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleRemove(itemId: string) {
    if (disabled || updatingId) return;
    setUpdatingId(itemId);
    try {
      await onRemoveItem(itemId);
    } finally {
      setUpdatingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-5 text-center" data-testid="empty-cart-banner">
          <div className="display-6 text-secondary mb-3">🛒</div>
          <h2 className="h4 fw-bold mb-2">Cart is empty</h2>
          <p className="text-secondary mb-0">
            Scan a product barcode or click <strong>Search Product</strong> to add items to this sale.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card border-0 shadow-sm mb-4">
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table align-middle mb-0" data-testid="cart-table">
            <thead style={{ backgroundColor: "#7B8189", color: "#FFFFFF" }}>
              <tr>
                <th className="py-3 px-4">Code</th>
                <th className="py-3">Product Name</th>
                <th className="py-3 text-end">Unit Price</th>
                <th className="py-3 text-center" style={{ width: 160 }}>Quantity</th>
                <th className="py-3 text-end">Extended Total</th>
                <th className="py-3 text-center" style={{ width: 80 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr
                  key={item.id}
                  style={{ backgroundColor: idx % 2 === 1 ? "#F2F4F5" : "#FFFFFF" }}
                  data-testid={`cart-row-${item.id}`}
                >
                  <td className="fw-semibold px-4">{item.codeSnapshot}</td>
                  <td>{item.nameSnapshot}</td>
                  <td className="text-end font-monospace" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {moneyFormatter.format(Number(item.unitPriceSnapshot))}
                  </td>
                  <td className="text-center">
                    <div className="d-inline-flex align-items-center justify-content-center gap-1">
                      <button
                        type="button"
                        className="btn btn-outline-secondary min-target px-2 fw-bold"
                        style={{ minWidth: 44, minHeight: 44 }}
                        onClick={() => handleQtyChange(item.id, item.quantity, -1)}
                        disabled={disabled || updatingId === item.id || item.quantity <= 1}
                        aria-label={`Decrease quantity of ${item.nameSnapshot}`}
                        data-testid={`qty-minus-${item.id}`}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        className="form-control form-control-sm text-center font-monospace min-target"
                        style={{ width: 55, minHeight: 44, fontVariantNumeric: "tabular-nums" }}
                        min={1}
                        max={9999}
                        value={item.quantity}
                        onChange={(e) => handleDirectInput(item.id, e)}
                        disabled={disabled || updatingId === item.id}
                        aria-label={`Quantity for ${item.nameSnapshot}`}
                        data-testid={`qty-input-${item.id}`}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary min-target px-2 fw-bold"
                        style={{ minWidth: 44, minHeight: 44 }}
                        onClick={() => handleQtyChange(item.id, item.quantity, 1)}
                        disabled={disabled || updatingId === item.id || item.quantity >= 9999}
                        aria-label={`Increase quantity of ${item.nameSnapshot}`}
                        data-testid={`qty-plus-${item.id}`}
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="text-end font-monospace fw-bold" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {moneyFormatter.format(Number(item.extendedAmount))}
                  </td>
                  <td className="text-center">
                    <button
                      type="button"
                      className="btn btn-outline-danger min-target px-2"
                      style={{ minWidth: 44, minHeight: 44 }}
                      onClick={() => handleRemove(item.id)}
                      disabled={disabled || updatingId === item.id}
                      aria-label={`Remove ${item.nameSnapshot} from cart`}
                      data-testid={`remove-item-btn-${item.id}`}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
