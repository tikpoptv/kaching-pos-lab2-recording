import { useState, useRef, useEffect, FormEvent } from "react";

interface BarcodeScannerInputProps {
  onScan: (barcode: string) => Promise<void>;
  onOpenSearch: () => void;
  disabled?: boolean;
}

export default function BarcodeScannerInput({
  onScan,
  onOpenSearch,
  disabled = false,
}: BarcodeScannerInputProps) {
  const [barcode, setBarcode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus barcode scanner input on mount and after operations
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = barcode.trim();
    if (!trimmed || isSubmitting || disabled) return;

    setIsSubmitting(true);
    try {
      await onScan(trimmed);
      setBarcode("");
    } finally {
      setIsSubmitting(false);
      // Always restore focus to barcode input field
      inputRef.current?.focus();
    }
  }

  return (
    <div className="card border-0 shadow-sm mb-4">
      <div className="card-body p-4">
        <label htmlFor="barcode-scanner-input" className="form-label fw-bold mb-2">
          Barcode Scanner / Product Entry
        </label>
        <form onSubmit={handleSubmit} className="d-flex flex-wrap align-items-center gap-3">
          <div className="flex-grow-1 min-w-200">
            <input
              id="barcode-scanner-input"
              ref={inputRef}
              type="text"
              className="form-control form-control-lg min-target"
              style={{
                minHeight: 44,
                borderColor: "#7B8189",
                outlineColor: "#FA4616",
              }}
              placeholder="Scan barcode or type product code..."
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              disabled={disabled || isSubmitting}
              autoFocus
              data-testid="barcode-input"
            />
          </div>
          <button
            type="submit"
            className="btn px-4 min-target text-white"
            style={{ minHeight: 44, minWidth: 44, backgroundColor: "#B33100" }}
            disabled={disabled || isSubmitting || !barcode.trim()}
            data-testid="add-barcode-btn"
          >
            {isSubmitting ? "Adding..." : "Add Item"}
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary px-4 min-target"
            style={{ minHeight: 44, minWidth: 44 }}
            onClick={onOpenSearch}
            disabled={disabled}
            data-testid="open-search-btn"
          >
            🔍 Search Product (F2)
          </button>
        </form>
      </div>
    </div>
  );
}
