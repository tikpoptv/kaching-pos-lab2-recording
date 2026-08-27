import { SaleDto } from "../api.js";

interface SaleHeaderProps {
  sale: SaleDto | null;
}

export default function SaleHeader({ sale }: SaleHeaderProps) {
  if (!sale) return null;

  const isCancelled = sale.status === "CANCELLED";
  const badgeClass = isCancelled
    ? "bg-danger text-white"
    : "bg-warning text-dark";

  return (
    <header className="card border-0 shadow-sm mb-4" data-testid="sale-header">
      <div className="card-body p-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div className="d-flex align-items-center gap-3">
          <div>
            <span className="eyebrow text-uppercase text-secondary" style={{ fontSize: "0.75rem", letterSpacing: "0.05em" }}>
              Active Sale
            </span>
            <h2 className="h4 fw-bold mb-0 text-dark" data-testid="sale-number">
              {sale.saleNumber}
            </h2>
          </div>
          <span
            className={`badge rounded-pill px-3 py-2 fw-semibold ${badgeClass}`}
            data-testid="sale-status-badge"
            aria-label={`Sale status: ${sale.status}`}
          >
            {sale.status}
          </span>
        </div>
        <div className="text-secondary small text-end">
          <div>Version: {sale.version}</div>
          <div>{new Date(sale.createdAt).toLocaleTimeString("en-TH", { hour: "2-digit", minute: "2-digit" })}</div>
        </div>
      </div>
    </header>
  );
}
