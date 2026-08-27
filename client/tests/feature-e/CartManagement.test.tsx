import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

describe("Feature-E: Cart and Sale-Item Management Client Component", () => {
  const mockOpenSale: api.SaleDto = {
    id: "sale-uuid-001",
    saleNumber: "SALE-20260827-0001",
    status: "OPEN",
    storeId: null,
    terminalId: null,
    cashierId: null,
    subtotal: "0.00",
    discountAmount: "0.00",
    vatAmount: "0.00",
    totalAmount: "0.00",
    version: 1,
    createdAt: "2026-08-27T10:15:00.000Z",
    updatedAt: "2026-08-27T10:15:00.000Z",
    items: [],
  };

  const mockItem: api.SaleItemDto = {
    id: "item-uuid-001",
    saleId: "sale-uuid-001",
    productId: "prod-uuid-001",
    codeSnapshot: "PROD-001",
    nameSnapshot: "Fresh Milk 1L",
    unitPriceSnapshot: "45.00",
    quantity: 1,
    extendedAmount: "45.00",
    createdAt: "2026-08-27T10:30:00.000Z",
    updatedAt: "2026-08-27T10:30:00.000Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // STS-E-09: Product search modal and selection
  it("STS-E-09: Opens product search modal, searches product, and adds item to cart", async () => {
    vi.mocked(api.createSale).mockResolvedValue(mockOpenSale);
    vi.mocked(api.getSale).mockResolvedValue({
      ...mockOpenSale,
      items: [mockItem],
    });
    vi.mocked(api.searchActiveProducts).mockResolvedValue([
      {
        id: "prod-uuid-001",
        code: "PROD-001",
        barcode: "8850001234567",
        name: "Fresh Milk 1L",
        price: "45.00",
        unitPrice: "45.00",
        isActive: true,
      },
    ]);
    vi.mocked(api.addItemToCart).mockResolvedValue(mockItem);

    render(<App />);

    // Start sale
    const startBtn = screen.getByTestId("start-sale-btn");
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(screen.getByTestId("barcode-input")).toBeInTheDocument();
    });

    // Open search modal
    const searchBtn = screen.getByTestId("open-search-btn");
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(screen.getByTestId("search-query-input")).toBeInTheDocument();
    });

    // Select product from search results
    const selectBtn = screen.getByRole("button", { name: "Select Fresh Milk 1L" });
    fireEvent.click(selectBtn);

    await waitFor(() => {
      expect(api.addItemToCart).toHaveBeenCalledWith("sale-uuid-001", { productId: "prod-uuid-001" });
      expect(screen.getByTestId("cart-table")).toBeInTheDocument();
      expect(screen.getByText("Fresh Milk 1L")).toBeInTheDocument();
    });
  });

  // STS-E-10: Cart table item removal and quantity updates
  it("STS-E-10: Updates item quantity and removes item from cart table", async () => {
    const saleWithItem: api.SaleDto = {
      ...mockOpenSale,
      items: [mockItem],
    };

    vi.mocked(api.createSale).mockResolvedValue(saleWithItem);
    vi.mocked(api.updateCartItemQuantity).mockResolvedValue({
      ...mockItem,
      quantity: 2,
      extendedAmount: "90.00",
    });
    vi.mocked(api.removeCartItem).mockResolvedValue({
      success: true,
      itemId: mockItem.id,
    });
    vi.mocked(api.getSale)
      .mockResolvedValueOnce({
        ...saleWithItem,
        items: [{ ...mockItem, quantity: 2, extendedAmount: "90.00" }],
      })
      .mockResolvedValueOnce({
        ...saleWithItem,
        items: [],
      });

    render(<App />);

    // Start sale
    fireEvent.click(screen.getByTestId("start-sale-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("cart-table")).toBeInTheDocument();
    });

    // Click quantity plus button
    const plusBtn = screen.getByTestId(`qty-plus-${mockItem.id}`);
    fireEvent.click(plusBtn);

    await waitFor(() => {
      expect(api.updateCartItemQuantity).toHaveBeenCalledWith("sale-uuid-001", mockItem.id, 2);
    });

    // Click remove button
    const removeBtn = screen.getByTestId(`remove-item-btn-${mockItem.id}`);
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(api.removeCartItem).toHaveBeenCalledWith("sale-uuid-001", mockItem.id);
      expect(screen.getByTestId("empty-cart-banner")).toBeInTheDocument();
    });
  });
});
