import React, { useState } from "react";

interface DiscountFormProps {
  subtotal: string;
  activeDiscountPercentage: string | null;
  activeDiscountAmount: string;
  onApplyDiscount: (payload: { type: "PERCENTAGE" | "AMOUNT"; percentage?: number; amount?: string }) => Promise<void>;
  onClearDiscount: () => Promise<void>;
  disabled?: boolean;
}

export default function DiscountForm({
  subtotal,
  activeDiscountPercentage,
  activeDiscountAmount,
  onApplyDiscount,
  onClearDiscount,
  disabled = false,
}: DiscountFormProps) {
  const [mode, setMode] = useState<"PERCENTAGE" | "AMOUNT">("PERCENTAGE");
  const [inputValue, setInputValue] = useState<string>("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDiscountActive =
    (activeDiscountPercentage !== null && Number(activeDiscountPercentage) > 0) ||
    Number(activeDiscountAmount) > 0;

  function validateInput(): boolean {
    setValidationError(null);
    if (!inputValue || inputValue.trim() === "") {
      setValidationError("Please enter a discount value.");
      return false;
    }

    const numVal = Number(inputValue);
    if (isNaN(numVal)) {
      setValidationError("Please enter a valid numeric value.");
      return false;
    }

    if (mode === "PERCENTAGE") {
      if (numVal < 0 || numVal > 100) {
        setValidationError("Discount percentage must be between 0 and 100.");
        return false;
      }
    } else {
      const subtotalNum = Number(subtotal);
      if (numVal < 0 || numVal > subtotalNum) {
        setValidationError(`Discount amount cannot exceed order subtotal (${subtotal} THB).`);
        return false;
      }
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateInput()) return;

    setIsSubmitting(true);
    try {
      const numVal = Number(inputValue);
      if (mode === "PERCENTAGE") {
        await onApplyDiscount({ type: "PERCENTAGE", percentage: numVal });
      } else {
        await onApplyDiscount({ type: "AMOUNT", amount: numVal.toFixed(2) });
      }
      setInputValue("");
      setValidationError(null);
    } catch (err: any) {
      setValidationError(err.message ?? "Failed to apply discount.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleClear() {
    setIsSubmitting(true);
    setValidationError(null);
    try {
      await onClearDiscount();
      setInputValue("");
    } catch (err: any) {
      setValidationError(err.message ?? "Failed to clear discount.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="p-3 mb-3 rounded"
      style={{ backgroundColor: "#F2F4F5", border: "1px solid #7B8189" }}
      data-testid="discount-form-container"
    >
      <div className="d-flex justify-content-between align-items-center mb-2">
        <span className="fw-semibold small text-uppercase text-secondary">Apply Discount</span>
        {isDiscountActive && (
          <span className="badge bg-success" data-testid="discount-active-badge">
            {activeDiscountPercentage !== null
              ? `${activeDiscountPercentage}% Active`
              : `฿${activeDiscountAmount} Active`}
          </span>
        )}
      </div>

      {/* Mode Selector */}
      <div className="btn-group w-100 mb-2" role="group" aria-label="Discount mode selector" data-testid="discount-mode-group">
        <button
          type="button"
          className={`btn btn-sm ${mode === "PERCENTAGE" ? "btn-dark" : "btn-outline-secondary"}`}
          onClick={() => {
            setMode("PERCENTAGE");
            setValidationError(null);
          }}
          disabled={disabled || isSubmitting}
          data-testid="mode-percentage-btn"
          style={{ minHeight: 36 }}
        >
          Percentage (%)
        </button>
        <button
          type="button"
          className={`btn btn-sm ${mode === "AMOUNT" ? "btn-dark" : "btn-outline-secondary"}`}
          onClick={() => {
            setMode("AMOUNT");
            setValidationError(null);
          }}
          disabled={disabled || isSubmitting}
          data-testid="mode-amount-btn"
          style={{ minHeight: 36 }}
        >
          Fixed Amount (฿)
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="input-group mb-2">
          <span className="input-group-text">{mode === "PERCENTAGE" ? "%" : "฿"}</span>
          <input
            type="number"
            step="0.01"
            className={`form-control ${validationError ? "is-invalid" : ""}`}
            style={{
              outline: "none",
              boxShadow: "none",
              border: validationError ? "1px solid #B42318" : "1px solid #7B8189",
            }}
            placeholder={mode === "PERCENTAGE" ? "e.g. 10" : "e.g. 50.00"}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (validationError) setValidationError(null);
            }}
            disabled={disabled || isSubmitting}
            aria-label="Discount value"
            aria-describedby={validationError ? "discount-error-msg" : undefined}
            data-testid="discount-input"
          />
          <button
            type="submit"
            className="btn text-white min-target"
            style={{
              backgroundColor: "#B33100",
              minHeight: 44,
              minWidth: 44,
            }}
            disabled={disabled || isSubmitting}
            data-testid="apply-discount-btn"
          >
            {isSubmitting ? "..." : "Apply"}
          </button>
        </div>

        {validationError && (
          <div
            id="discount-error-msg"
            className="text-danger small mb-2"
            role="alert"
            data-testid="discount-error-banner"
          >
            {validationError}
          </div>
        )}
      </form>

      {isDiscountActive && (
        <button
          type="button"
          className="btn btn-outline-danger btn-sm w-100 min-target mt-1"
          style={{ minHeight: 44 }}
          onClick={handleClear}
          disabled={disabled || isSubmitting}
          aria-label="Clear discount"
          data-testid="clear-discount-btn"
        >
          Clear Discount
        </button>
      )}
    </div>
  );
}
