import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import App from "../../src/App.js";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Feature-D: Client Sale Lifecycle Management UI", () => {
  const mockSale: api.SaleDto = {
    id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    saleNumber: "SALE-20260827-0001",
    status: "OPEN",
    storeId: null,
    terminalId: null,
    cashierId: null,
    subtotal: "0.00",
    discountPercentage: null,
    discountAmount: "0.00",
    vatAmount: "0.00",
    totalAmount: "0.00",
    version: 1,
    createdAt: "2026-08-27T10:15:00.000Z",
    updatedAt: "2026-08-27T10:15:00.000Z",
  };

  it("STS-D-07: Clicking 'Start New Sale' creates an OPEN sale and displays sale header", async () => {
    vi.spyOn(api, "createSale").mockResolvedValue(mockSale);
    render(<App />);

    const startBtn = screen.getByTestId("start-sale-btn");
    expect(startBtn).toBeEnabled();

    await userEvent.click(startBtn);

    await waitFor(() => {
      expect(screen.getByTestId("sale-number")).toHaveTextContent("SALE-20260827-0001");
      expect(screen.getByTestId("sale-status-badge")).toHaveTextContent("OPEN");
    });
    expect(screen.getByTestId("cancel-sale-btn")).toBeInTheDocument();
  });

  it("STS-D-08: Clicking 'Cancel Sale' opens modal and confirmation updates status to CANCELLED", async () => {
    vi.spyOn(api, "createSale").mockResolvedValue(mockSale);
    vi.spyOn(api, "cancelSale").mockResolvedValue({
      ...mockSale,
      status: "CANCELLED",
      version: 2,
    });

    render(<App />);

    // Start sale
    await userEvent.click(screen.getByTestId("start-sale-btn"));
    await waitFor(() => screen.getByTestId("cancel-sale-btn"));

    // Click Cancel Sale button to open modal
    await userEvent.click(screen.getByTestId("cancel-sale-btn"));
    expect(screen.getByTestId("cancel-sale-modal")).toBeInTheDocument();
    expect(screen.getByText(/Confirm Sale Cancellation/i)).toBeInTheDocument();

    // Confirm cancel inside modal
    await userEvent.click(screen.getByTestId("confirm-cancel-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("sale-status-badge")).toHaveTextContent("CANCELLED");
    });
  });

  it("STS-D-09: Displays persistent offline banner and disables sale actions when API is offline", async () => {
    vi.spyOn(api, "checkSystem").mockRejectedValue(new Error("Network Error"));
    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: /check system/i }));

    expect(await screen.findByTestId("offline-banner")).toBeInTheDocument();
    expect(screen.getByTestId("start-sale-btn")).toBeDisabled();
  });

  it("STS-D-10: Pressing Escape key inside CancelSaleModal closes modal and restores focus", async () => {
    vi.spyOn(api, "createSale").mockResolvedValue(mockSale);
    render(<App />);

    // Start sale
    await userEvent.click(screen.getByTestId("start-sale-btn"));
    const cancelBtn = await screen.findByTestId("cancel-sale-btn");

    // Open modal
    await userEvent.click(cancelBtn);
    expect(screen.getByTestId("cancel-sale-modal")).toBeInTheDocument();

    // Initial focus on safe button ("Keep Sale")
    expect(screen.getByTestId("keep-sale-btn")).toHaveFocus();

    // Press Escape key
    fireEvent.keyDown(window, { key: "Escape" });

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByTestId("cancel-sale-modal")).not.toBeInTheDocument();
    });

    // Focus restored to cancel button
    expect(cancelBtn).toHaveFocus();
  });
});
