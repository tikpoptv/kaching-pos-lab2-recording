import React from "react";
import DiscountForm from "./DiscountForm.js";

interface TotalsSummaryPanelProps {
  subtotal: string;
  discountPercentage?: string | null;
  discountAmount: string;
  vatAmount: string;
  totalAmount: string;
  isUpdating?: boolean;
  vatRateLabel?: string;
  onApplyDiscount?: (payload: { type: "PERCENTAGE" | "AMOUNT"; percentage?: number; amount?: string }) => Promise<void>;
  onClearDiscount?: () => Promise<void>;
  disabled?: boolean;
}

function formatThb(valueStr: string): string {
  const num = Number(valueStr);
  if (isNaN(num)) return "฿0.00";
  return new Intl.NumberFormat("en-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export default function TotalsSummaryPanel({
  subtotal,
  discountPercentage = null,
  discountAmount,
  vatAmount,
  totalAmount,
  isUpdating = false,
  vatRateLabel = "VAT (7% included)",
  onApplyDiscount,
  onClearDiscount,
  disabled = false,
}: TotalsSummaryPanelProps) {
  return (
    <div
      className="card border-0 shadow-sm mb-4"
      style={{
        opacity: isUpdating ? 0.6 : 1,
        pointerEvents: isUpdating ? "none" : "auto",
        transition: "opacity 0.15s ease-in-out",
      }}
      data-testid="totals-summary-panel"
    >
      <div className="card-body p-4">
        <h2 className="h5 fw-bold mb-3">Order Summary</h2>

        <div className="d-flex justify-content-between align-items-center mb-2" data-testid="subtotal-row">
          <span className="text-secondary">Subtotal</span>
          <span
            className="fw-semibold text-end"
            style={{ fontVariantNumeric: "tabular-nums" }}
            aria-label={`Subtotal ${subtotal} Baht`}
            data-testid="subtotal-value"
          >
            {formatThb(subtotal)}
          </span>
        </div>

        {/* Feature-G Order Discount Entry Form */}
        {onApplyDiscount && onClearDiscount && (
          <DiscountForm
            subtotal={subtotal}
            activeDiscountPercentage={discountPercentage}
            activeDiscountAmount={discountAmount}
            onApplyDiscount={onApplyDiscount}
            onClearDiscount={onClearDiscount}
            disabled={disabled || isUpdating}
          />
        )}

        <div className="d-flex justify-content-between align-items-center mb-2" data-testid="discount-row">
          <span className="text-secondary">
            Discount
            {discountPercentage && Number(discountPercentage) > 0 ? ` (${discountPercentage}%)` : ""}
          </span>
          <span
            className="fw-semibold text-end"
            style={{ fontVariantNumeric: "tabular-nums" }}
            aria-label={`Discount ${discountAmount} Baht`}
            data-testid="discount-value"
          >
            {formatThb(discountAmount)}
          </span>
        </div>

        <div className="d-flex justify-content-between align-items-center mb-3" data-testid="vat-row">
          <span className="text-secondary">{vatRateLabel}</span>
          <span
            className="fw-semibold text-end"
            style={{ fontVariantNumeric: "tabular-nums" }}
            aria-label={`VAT 7 percent included ${vatAmount} Baht`}
            data-testid="vat-value"
          >
            {formatThb(vatAmount)}
          </span>
        </div>

        <hr className="my-3" />

        <div className="d-flex justify-content-between align-items-center" data-testid="total-row">
          <span className="h5 fw-bold mb-0">Total Amount</span>
          <span
            className="h4 fw-bold text-end mb-0"
            style={{ fontVariantNumeric: "tabular-nums", color: "#B33100" }}
            aria-live="polite"
            aria-label={`Updated total amount: ${totalAmount} Baht`}
            data-testid="total-value"
          >
            {formatThb(totalAmount)}
          </span>
        </div>
      </div>
    </div>
  );
}
