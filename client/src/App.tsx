import { useState } from "react";
import { checkSystem, Product } from "./api.js";

type UiState = "idle" | "loading" | "success" | "error";

const money = new Intl.NumberFormat("en-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 2,
});

export default function App() {
  const [state, setState] = useState<UiState>("idle");
  const [products, setProducts] = useState<Product[]>([]);

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

  return (
    <main className="min-vh-100 bg-light">
      <header className="brand-bar" />
      <div className="container py-5" style={{ maxWidth: 900 }}>
        <section className="mb-4">
          <p className="eyebrow mb-2">KMUTT · Point of Sale</p>
          <h1 className="display-6 fw-bold mb-2">Kaching POS</h1>
          <p className="text-secondary mb-0">Lab 1 baseline: API connectivity and the global product catalog.</p>
        </section>

        <section className="card border-0 shadow-sm">
          <div className="card-body p-4">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <h2 className="h5 mb-1">System readiness</h2>
                <p className="text-secondary mb-0">Verify the API and seeded product data.</p>
              </div>
              <button className="btn btn-kmutt" onClick={handleCheck} disabled={state === "loading"}>
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
                      <thead><tr><th>Code</th><th>Product</th><th>Barcode</th><th className="text-end">Price</th></tr></thead>
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
    </main>
  );
}
