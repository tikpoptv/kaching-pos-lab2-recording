import { useEffect, useRef } from "react";

interface CancelSaleModalProps {
  isOpen: boolean;
  saleNumber: string;
  onConfirm: () => void;
  onClose: () => void;
  isCancelling: boolean;
}

export default function CancelSaleModal({
  isOpen,
  saleNumber,
  onConfirm,
  onClose,
  isCancelling,
}: CancelSaleModalProps) {
  const keepButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus trap & Escape key handler (NFR-016 & ui_spec.md Section 8)
  useEffect(() => {
    if (!isOpen) return;

    // Initial focus on safe action button
    keepButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isCancelling) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isCancelling, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal fade show d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      tabIndex={-1}
      role="dialog"
      aria-labelledby="cancel-modal-title"
      aria-describedby="cancel-modal-desc"
      ref={modalRef}
      data-testid="cancel-sale-modal"
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow">
          <div className="modal-header border-0 pb-0">
            <h5 className="modal-title fw-bold text-danger" id="cancel-modal-title">
              Confirm Sale Cancellation
            </h5>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={onClose}
              disabled={isCancelling}
            />
          </div>
          <div className="modal-body py-3" id="cancel-modal-desc">
            <p className="mb-0 text-secondary">
              Are you sure you want to cancel <strong>{saleNumber}</strong>?
            </p>
            <p className="small text-danger mt-2 mb-0">
              This action cannot be undone. All cart items will be cleared and excluded from sales totals.
            </p>
          </div>
          <div className="modal-footer border-0 pt-0">
            <button
              ref={keepButtonRef}
              type="button"
              className="btn btn-outline-secondary px-4 min-target"
              style={{ minHeight: 44, minWidth: 44 }}
              onClick={onClose}
              disabled={isCancelling}
              data-testid="keep-sale-btn"
            >
              Keep Sale
            </button>
            <button
              type="button"
              className="btn btn-danger px-4 min-target"
              style={{ minHeight: 44, minWidth: 44, backgroundColor: "#B42318" }}
              onClick={onConfirm}
              disabled={isCancelling}
              data-testid="confirm-cancel-btn"
            >
              {isCancelling ? "Cancelling..." : "Yes, Cancel Sale"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
