import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { Product, searchActiveProducts } from "../api.js";

interface ProductSearchModalProps {
  isOpen: boolean;
  onSelectProduct: (product: Product) => Promise<void>;
  onClose: () => void;
}

const moneyFormatter = new Intl.NumberFormat("en-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 2,
});

export default function ProductSearchModal({
  isOpen,
  onSelectProduct,
  onClose,
}: ProductSearchModalProps) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    setQuery("");
    setSelectedIndex(0);
    loadProducts("");

    // Auto-focus inside modal input when opened
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  }, [isOpen]);

  async function loadProducts(searchQuery: string) {
    setLoading(true);
    try {
      const results = await searchActiveProducts(searchQuery);
      setProducts(results);
      setSelectedIndex(0);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      loadProducts(query);
    }, 200);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  async function handleSelect(product: Product) {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSelectProduct(product);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (products.length > 0 ? (prev + 1) % products.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (products.length > 0 ? (prev - 1 + products.length) % products.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (products.length > 0 && products[selectedIndex]) {
        handleSelect(products[selectedIndex]);
      }
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="modal fade show d-block"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-search-modal-title"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      onKeyDown={handleKeyDown}
      ref={modalRef}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
        <div className="modal-content border-0 shadow">
          <div className="modal-header border-bottom">
            <h5 className="modal-title fw-bold" id="product-search-modal-title">
              🔍 Product Catalog Search
            </h5>
            <button
              type="button"
              className="btn-close min-target"
              onClick={onClose}
              aria-label="Close search modal"
              style={{ minWidth: 44, minHeight: 44 }}
            />
          </div>

          <div className="modal-body p-4">
            <div className="mb-3">
              <label htmlFor="product-search-input" className="form-label fw-bold visually-hidden">
                Search product code or name
              </label>
              <input
                id="product-search-input"
                ref={searchInputRef}
                type="text"
                className="form-control form-control-lg min-target"
                style={{ minHeight: 44, borderColor: "#7B8189" }}
                placeholder="Type partial code or product name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                data-testid="search-query-input"
              />
            </div>

            <div aria-live="polite">
              {loading && <p className="text-secondary my-3">Searching active products...</p>}

              {!loading && products.length === 0 && (
                <div className="alert alert-warning mb-0" role="alert">
                  No active products found matching "{query}".
                </div>
              )}

              {!loading && products.length > 0 && (
                <div className="table-responsive" style={{ maxHeight: 350 }}>
                  <table className="table align-middle table-hover mb-0" data-testid="search-results-table">
                    <thead style={{ backgroundColor: "#7B8189", color: "#FFFFFF" }}>
                      <tr>
                        <th>Code</th>
                        <th>Product Name</th>
                        <th>Barcode</th>
                        <th className="text-end">Unit Price</th>
                        <th className="text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p, idx) => {
                        const isSelected = idx === selectedIndex;
                        return (
                          <tr
                            key={p.id}
                            style={{
                              backgroundColor: isSelected ? "#FFE4DC" : idx % 2 === 1 ? "#F2F4F5" : "#FFFFFF",
                              cursor: "pointer",
                            }}
                            onClick={() => handleSelect(p)}
                          >
                            <td className="fw-semibold">{p.code}</td>
                            <td>{p.name}</td>
                            <td className="text-secondary">{p.barcode}</td>
                            <td className="text-end font-monospace" style={{ fontVariantNumeric: "tabular-nums" }}>
                              {moneyFormatter.format(Number(p.unitPrice ?? p.price))}
                            </td>
                            <td className="text-center">
                              <button
                                type="button"
                                className="btn btn-sm btn-primary min-target px-3"
                                style={{ minHeight: 44, minWidth: 44, backgroundColor: "#B33100" }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelect(p);
                                }}
                                aria-label={`Select ${p.name}`}
                              >
                                Select
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer border-top bg-light">
            <small className="text-secondary me-auto">
              Use <kbd>↑</kbd> <kbd>↓</kbd> to navigate, <kbd>Enter</kbd> to select, <kbd>Esc</kbd> to close.
            </small>
            <button
              type="button"
              className="btn btn-secondary px-4 min-target"
              style={{ minHeight: 44, minWidth: 44 }}
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
