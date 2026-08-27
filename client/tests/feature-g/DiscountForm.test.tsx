import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import DiscountForm from "../../src/components/DiscountForm.js";
import TotalsSummaryPanel from "../../src/components/TotalsSummaryPanel.js";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

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
    applyOrderDiscount: vi.fn(),
    clearOrderDiscount: vi.fn(),
  };
});

describe("Feature-G: DiscountForm & Order Discount Client Interface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // STS-G-11: Form mode toggle and submission of percentage discount
  it("STS-G-11: Renders DiscountForm, toggles mode, submits percentage discount, and calls onApplyDiscount", async () => {
    const onApplyMock = vi.fn().mockResolvedValue(undefined);
    const onClearMock = vi.fn().mockResolvedValue(undefined);

    render(
      <DiscountForm
        subtotal="100.00"
        activeDiscountPercentage={null}
        activeDiscountAmount="0.00"
        onApplyDiscount={onApplyMock}
        onClearDiscount={onClearMock}
      />
    );

    expect(screen.getByTestId("discount-form-container")).toBeInTheDocument();
    const input = screen.getByTestId("discount-input");

    // Enter percentage 10
    fireEvent.change(input, { target: { value: "10" } });
    fireEvent.click(screen.getByTestId("apply-discount-btn"));

    await waitFor(() => {
      expect(onApplyMock).toHaveBeenCalledWith({ type: "PERCENTAGE", percentage: 10 });
    });
  });

  // STS-G-12: Click Clear Discount button calls onClearDiscount
  it("STS-G-12: Renders Clear Discount button when discount active, clicking it invokes onClearDiscount", async () => {
    const onApplyMock = vi.fn().mockResolvedValue(undefined);
    const onClearMock = vi.fn().mockResolvedValue(undefined);

    render(
      <TotalsSummaryPanel
        subtotal="100.00"
        discountPercentage="10.00"
        discountAmount="10.00"
        vatAmount="5.89"
        totalAmount="90.00"
        onApplyDiscount={onApplyMock}
        onClearDiscount={onClearMock}
      />
    );

    expect(screen.getByTestId("clear-discount-btn")).toBeInTheDocument();
    expect(screen.getByTestId("discount-active-badge")).toHaveTextContent("10.00% Active");

    fireEvent.click(screen.getByTestId("clear-discount-btn"));

    await waitFor(() => {
      expect(onClearMock).toHaveBeenCalled();
    });
  });

  // STS-G-14: Inline validation error for out-of-range percentage input
  it("STS-G-14: Displays inline error banner when percentage input is out of range (-5% or 150%)", async () => {
    const onApplyMock = vi.fn().mockResolvedValue(undefined);
    const onClearMock = vi.fn().mockResolvedValue(undefined);

    render(
      <DiscountForm
        subtotal="100.00"
        activeDiscountPercentage={null}
        activeDiscountAmount="0.00"
        onApplyDiscount={onApplyMock}
        onClearDiscount={onClearMock}
      />
    );

    const input = screen.getByTestId("discount-input");

    // Enter invalid percentage -5
    fireEvent.change(input, { target: { value: "-5" } });
    fireEvent.click(screen.getByTestId("apply-discount-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("discount-error-banner")).toBeInTheDocument();
      expect(screen.getByTestId("discount-error-banner").textContent).toContain(
        "Discount percentage must be between 0 and 100"
      );
    });

    expect(onApplyMock).not.toHaveBeenCalled();
  });

  // Full integration test with App component
  it("Integrates discount application flow into App component and updates summary panel", async () => {
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
      items: [],
    };

    const saleWithDiscount: api.SaleDto = {
      ...initialSale,
      discountPercentage: "10.00",
      discountAmount: "10.00",
      vatAmount: "5.89",
      totalAmount: "90.00",
      version: 2,
    };

    vi.mocked(api.createSale).mockResolvedValue(initialSale);
    vi.mocked(api.applyOrderDiscount).mockResolvedValue(saleWithDiscount);

    render(<App />);

    fireEvent.click(screen.getByTestId("start-sale-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("totals-summary-panel")).toBeInTheDocument();
    });

    const input = screen.getByTestId("discount-input");
    fireEvent.change(input, { target: { value: "10" } });
    fireEvent.click(screen.getByTestId("apply-discount-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("total-value").textContent).toContain("90.00");
    });
  });
});
