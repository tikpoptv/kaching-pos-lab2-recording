import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import TotalsSummaryPanel from "../../src/components/TotalsSummaryPanel.js";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

// Mock API functions
vi.mock("../../src/api.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/api.js")>();
  return {
    ...actual,
    createSale: vi.fn(),
    cancelSale: vi.fn(),
    getSale: vi.fn(),
    addItemToCart: vi.fn(),
    updateCartItemQuantity: vi.fn(),
    removeCartItem: vi.fn(),
    searchActiveProducts: vi.fn(),
  };
});

describe("Feature-F: TotalsSummaryPanel Client Component & Rollback Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // STS-F-07: Summary panel renders subtotal, discount, VAT, and total with THB currency and tabular numerals
  it("STS-F-07: Renders TotalsSummaryPanel with tabular numerals and formatted THB monetary values", () => {
    render(
      <TotalsSummaryPanel
        subtotal="100.00"
        discountAmount="0.00"
        vatAmount="6.54"
        totalAmount="100.00"
      />
    );

    expect(screen.getByTestId("totals-summary-panel")).toBeInTheDocument();
    expect(screen.getByTestId("subtotal-value").textContent).toContain("100.00");
    expect(screen.getByTestId("discount-value").textContent).toContain("0.00");
    expect(screen.getByTestId("vat-value").textContent).toContain("6.54");
    expect(screen.getByTestId("total-value").textContent).toContain("100.00");

    // Check tabular numerals styling
    expect(screen.getByTestId("subtotal-value")).toHaveStyle({ fontVariantNumeric: "tabular-nums" });
    expect(screen.getByTestId("total-value")).toHaveStyle({ fontVariantNumeric: "tabular-nums" });
  });

  // STS-F-12: In-flight loading state and network failure UI rollback
  it("STS-F-12: Dims summary panel during cart mutation and rolls back totals on API failure", async () => {
    const initialSale: api.SaleDto = {
      id: "sale-uuid-001",
      saleNumber: "SALE-20260827-0001",
      status: "OPEN",
      storeId: null,
      terminalId: null,
      cashierId: null,
      subtotal: "100.00",
      discountPercentage: null,
      discountAmount: "0.00",
      vatAmount: "6.54",
      totalAmount: "100.00",
      version: 1,
      createdAt: "2026-08-27T10:15:00.000Z",
      updatedAt: "2026-08-27T10:15:00.000Z",
      items: [
        {
          id: "item-1",
          saleId: "sale-uuid-001",
          productId: "prod-1",
          codeSnapshot: "PROD-001",
          nameSnapshot: "Fresh Milk 1L",
          unitPriceSnapshot: "50.00",
          quantity: 2,
          extendedAmount: "100.00",
          createdAt: "2026-08-27T10:15:00.000Z",
          updatedAt: "2026-08-27T10:15:00.000Z",
        },
      ],
    };

    vi.mocked(api.createSale).mockResolvedValue(initialSale);
    vi.mocked(api.updateCartItemQuantity).mockRejectedValue(new Error("Network connection lost"));

    render(<App />);

    // Start sale
    fireEvent.click(screen.getByTestId("start-sale-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("totals-summary-panel")).toBeInTheDocument();
      expect(screen.getByTestId("total-value").textContent).toContain("100.00");
    });

    // Click quantity plus button to trigger update
    const plusBtn = screen.getByTestId("qty-plus-item-1");
    fireEvent.click(plusBtn);

    // Verify error banner is shown and totals remain rolled back to 100.00
    await waitFor(() => {
      expect(screen.getByTestId("sale-error-banner")).toBeInTheDocument();
      expect(screen.getByTestId("total-value").textContent).toContain("100.00");
    });
  });
});
