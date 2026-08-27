import { useState, useRef, useEffect } from "react";
import {
  checkSystem,
  createSale,
  cancelSale,
  getSale,
  addItemToCart,
  updateCartItemQuantity,
  removeCartItem,
  Product,
  SaleDto,
} from "./api.js";
import SaleHeader from "./components/SaleHeader.js";
import CancelSaleModal from "./components/CancelSaleModal.js";
import BarcodeScannerInput from "./components/BarcodeScannerInput.js";
import CartTable from "./components/CartTable.js";
import ProductSearchModal from "./components/ProductSearchModal.js";

import TotalsSummaryPanel from "./components/TotalsSummaryPanel.js";

type UiState = "idle" | "loading" | "success" | "error";

const money = new Intl.NumberFormat("en-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 2,
});

export default function App() {
  const [state, setState] = useState<UiState>("idle");
  const [products, setProducts] = useState<Product[]>([]);
  
  // Feature-D & Feature-E & Feature-F Active Sale & Cart State
  const [sale, setSale] = useState<SaleDto | null>(null);
  const [saleLoading, setSaleLoading] = useState(false);
  const [isCartUpdating, setIsCartUpdating] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [saleError, setSaleError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string>("");

  const cancelTriggerRef = useRef<HTMLButtonElement>(null);

  // Global hotkey F2 to open product search modal
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if (e.key === "F2" && sale && sale.status === "OPEN" && !isCancelModalOpen) {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [sale, isCancelModalOpen]);

  async function handleCheck() {
    setState("loading");
    try {
      const result = await checkSystem();
      setProducts(result.products);
      setState("success");
    } catch {
      setProducts([]);
      setState("error");
    }
  }

  async function handleStartSale() {
    setSaleLoading(true);
    setSaleError(null);
    setAnnouncement("");
    try {
      const newSale = await createSale();
      setSale(newSale);
      setAnnouncement(`Started new sale ${newSale.saleNumber}`);
    } catch (err: any) {
      setSaleError(err.message ?? "Unable to start a new sale.");
    } finally {
      setSaleLoading(false);
    }
  }

  async function handleConfirmCancel() {
    if (!sale) return;
    setIsCancelling(true);
    setSaleError(null);
    try {
      const cancelled = await cancelSale(sale.id, sale.version);
      setSale(cancelled);
      setIsCancelModalOpen(false);
      setAnnouncement(`Sale ${cancelled.saleNumber} cancelled.`);
    } catch (err: any) {
      setSaleError(err.message ?? "Unable to cancel sale.");
    } finally {
      setIsCancelling(false);
      cancelTriggerRef.current?.focus();
    }
  }

  async function refreshSale(saleId: string) {
    const updated = await getSale(saleId);
    setSale(updated);
  }

  async function handleScanBarcode(barcode: string) {
    if (!sale || sale.status !== "OPEN") return;
    const previousSaleState = sale;
    setSaleError(null);
    setIsCartUpdating(true);
    try {
      const item = await addItemToCart(sale.id, { barcode });
      await refreshSale(sale.id);
      setAnnouncement(`Added 1x ${item.nameSnapshot} to cart. Line total: ${money.format(Number(item.extendedAmount))}`);
    } catch (err: any) {
      setSale(previousSaleState);
      setSaleError(err.message ?? "Unable to add product. Totals restored to previous state.");
      setAnnouncement("Cart update failed. Totals restored to previous state.");
      throw err;
    } finally {
      setIsCartUpdating(false);
    }
  }

  async function handleSelectSearchProduct(product: Product) {
    if (!sale || sale.status !== "OPEN") return;
    const previousSaleState = sale;
    setSaleError(null);
    setIsCartUpdating(true);
    try {
      const item = await addItemToCart(sale.id, { productId: product.id });
      await refreshSale(sale.id);
      setAnnouncement(`Added 1x ${item.nameSnapshot} to cart from search.`);
    } catch (err: any) {
      setSale(previousSaleState);
      setSaleError(err.message ?? "Unable to add product from search. Totals restored to previous state.");
      setAnnouncement("Cart update failed. Totals restored to previous state.");
    } finally {
      setIsCartUpdating(false);
    }
  }

  async function handleUpdateQuantity(itemId: string, newQty: number) {
    if (!sale || sale.status !== "OPEN") return;
    const previousSaleState = sale;
    setSaleError(null);
    setIsCartUpdating(true);
    try {
      const updatedItem = await updateCartItemQuantity(sale.id, itemId, newQty);
      await refreshSale(sale.id);
      setAnnouncement(`Updated ${updatedItem.nameSnapshot} quantity to ${updatedItem.quantity}.`);
    } catch (err: any) {
      setSale(previousSaleState);
      setSaleError(err.message ?? "Unable to update item quantity. Totals restored to previous state.");
      setAnnouncement("Cart update failed. Totals restored to previous state.");
    } finally {
      setIsCartUpdating(false);
    }
  }

  async function handleRemoveItem(itemId: string) {
    if (!sale || sale.status !== "OPEN") return;
    const previousSaleState = sale;
    setSaleError(null);
    setIsCartUpdating(true);
    try {
      await removeCartItem(sale.id, itemId);
      await refreshSale(sale.id);
      setAnnouncement("Item removed from cart.");
    } catch (err: any) {
      setSale(previousSaleState);
      setSaleError(err.message ?? "Unable to remove item. Totals restored to previous state.");
      setAnnouncement("Cart update failed. Totals restored to previous state.");
    } finally {
      setIsCartUpdating(false);
    }
  }

  const isOffline = state === "error";
  const isOpenSale = sale !== null && sale.status === "OPEN";

  return (
    <main className="min-vh-100 bg-light">
      <header className="brand-bar" style={{ height: 6, backgroundColor: "#FA4616" }} />
      <div className="container py-5" style={{ maxWidth: 1200 }}>
        <section className="mb-4">
          <p className="eyebrow mb-2 text-uppercase fw-bold text-secondary" style={{ fontSize: 14 }}>
            KMUTT · Point of Sale
          </p>
          <h1 className="display-6 fw-bold mb-2">Kaching POS</h1>
          <p className="text-secondary mb-0">POS Lab 2: VAT-Inclusive Pricing and Total Calculation Engine.</p>
        </section>

        {/* Feature-D Active Sale Header */}
        {sale && <SaleHeader sale={sale} />}

        {/* Persistent Offline Warning Banner (NFR-012) */}
        {isOffline && (
          <div className="alert alert-danger mb-4 d-flex align-items-center gap-2" role="alert" data-testid="offline-banner">
            <span className="fw-bold">API Disconnected.</span> Checkout operations and sale creation are currently disabled. Check network connectivity.
          </div>
        )}

        {/* Error Alert Banner */}
        {saleError && (
          <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert" data-testid="sale-error-banner">
            <strong>Notice:</strong> {saleError}
            <button type="button" className="btn-close" onClick={() => setSaleError(null)} aria-label="Close" />
          </div>
        )}

        {/* Screen Reader Announcement Banner */}
        <div className="visually-hidden" aria-live="polite" data-testid="sr-announcements">
          {announcement}
        </div>

        {/* Two-Region Checkout Layout (Left: Cart Workspace | Right: Totals & Actions) */}
        <div className="row g-4 mb-4">
          <div className="col-lg-7 col-xl-8">
            {/* Feature-E Barcode Scanner Input */}
            {isOpenSale && (
              <BarcodeScannerInput
                onScan={handleScanBarcode}
                onOpenSearch={() => setIsSearchModalOpen(true)}
                disabled={isOffline || isCartUpdating}
              />
            )}

            {/* Feature-E Cart Table Workspace */}
            {isOpenSale && (
              <CartTable
                items={sale.items ?? []}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveItem}
                disabled={isOffline || isCartUpdating}
              />
            )}
          </div>

          <div className="col-lg-5 col-xl-4">
            {/* Feature-F Totals Summary Panel */}
            {sale && (
              <TotalsSummaryPanel
                subtotal={sale.subtotal}
                discountAmount={sale.discountAmount}
                vatAmount={sale.vatAmount}
                totalAmount={sale.totalAmount}
                isUpdating={isCartUpdating}
              />
            )}

            {/* Feature-D Sale Action Panel */}
            <section className="card border-0 shadow-sm mb-4">
              <div className="card-body p-4">
                <h2 className="h5 mb-2">Checkout Actions</h2>
                <p className="text-secondary mb-3">Start a new sale or manage the current sale lifecycle.</p>

                <div className="d-flex flex-wrap align-items-center gap-3">
                  <button
                    className="btn px-4 min-target text-white"
                    style={{ minHeight: 44, minWidth: 44, backgroundColor: "#B33100" }}
                    onClick={handleStartSale}
                    disabled={saleLoading || isOpenSale || isOffline}
                    data-testid="start-sale-btn"
                  >
                    {saleLoading ? "Starting sale..." : "Start New Sale"}
                  </button>

                  {isOpenSale && (
                    <button
                      ref={cancelTriggerRef}
                      className="btn btn-danger px-4 min-target text-white"
                      style={{ minHeight: 44, minWidth: 44, backgroundColor: "#B42318" }}
                      onClick={() => setIsCancelModalOpen(true)}
                      disabled={isCancelling || isOffline || isCartUpdating}
                      data-testid="cancel-sale-btn"
                    >
                      Cancel Sale
                    </button>
                  )}
                </div>

                <div className="mt-3" aria-live="polite">
                  {saleLoading && <p className="text-secondary mb-0">Creating a new sale aggregate in backend...</p>}
                  {sale && sale.status === "CANCELLED" && (
                    <p className="text-danger mb-0">
                      Sale {sale.saleNumber} has been cancelled. Click "Start New Sale" to begin a new transaction.
                    </p>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>


        {/* Lab 1 Baseline System Check */}
        <section className="card border-0 shadow-sm">
          <div className="card-body p-4">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <h2 className="h5 mb-1">System readiness</h2>
                <p className="text-secondary mb-0">Verify the API and seeded product data.</p>
              </div>
              <button className="btn btn-outline-secondary min-target" style={{ minHeight: 44 }} onClick={handleCheck} disabled={state === "loading"}>
                {state === "loading" ? "Checking…" : "Check system"}
              </button>
            </div>

            <div className="mt-4" aria-live="polite">
              {state === "idle" && <p className="text-secondary mb-0">Ready to run the baseline check.</p>}
              {state === "loading" && <p className="mb-0">Connecting to Kaching API…</p>}
              {state === "error" && (
                <div className="alert alert-danger mb-0" role="alert">
                  <strong>Offline.</strong> Check that the API and PostgreSQL are running, then try again.
                </div>
              )}
              {state === "success" && (
                <div>
                  <div className="alert alert-success" role="status">
                    <strong>Online.</strong> API and product catalog are ready for POS Lab 2.
                  </div>
                  <div className="table-responsive">
                    <table className="table align-middle mb-0">
                      <thead>
                        <tr><th>Code</th><th>Product</th><th>Barcode</th><th className="text-end">Price</th></tr>
                      </thead>
                      <tbody>
                        {products.map((product) => (
                          <tr key={product.id}>
                            <td className="fw-semibold">{product.code}</td>
                            <td>{product.name}</td>
                            <td className="text-secondary">{product.barcode}</td>
                            <td className="text-end">{money.format(Number(product.price))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Cancel Sale Confirmation Modal Dialog */}
      {sale && (
        <CancelSaleModal
          isOpen={isCancelModalOpen}
          saleNumber={sale.saleNumber}
          onConfirm={handleConfirmCancel}
          onClose={() => {
            setIsCancelModalOpen(false);
            cancelTriggerRef.current?.focus();
          }}
          isCancelling={isCancelling}
        />
      )}

      {/* Feature-E Product Search Modal Dialog */}
      {isOpenSale && (
        <ProductSearchModal
          isOpen={isSearchModalOpen}
          onSelectProduct={handleSelectSearchProduct}
          onClose={() => setIsSearchModalOpen(false)}
        />
      )}
    </main>
  );
}
