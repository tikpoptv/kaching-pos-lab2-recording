import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { Prisma } from "@prisma/client";
import { calculateSaleTotals } from "../../src/sales/sales.service.js";

// Mocks for Prisma
const saleFindUniqueMock = vi.fn();
const saleUpdateMock = vi.fn();
const productFindFirstMock = vi.fn();
const saleItemFindUniqueMock = vi.fn();
const saleItemFindFirstMock = vi.fn();
const saleItemCreateMock = vi.fn();
const saleItemUpdateMock = vi.fn();
const saleItemDeleteMock = vi.fn();

vi.mock("../../src/prisma.js", () => ({
  getPrisma: () => ({
    sale: {
      findUnique: saleFindUniqueMock,
      update: saleUpdateMock,
    },
    product: {
      findFirst: productFindFirstMock,
    },
    saleItem: {
      findUnique: saleItemFindUniqueMock,
      findFirst: saleItemFindFirstMock,
      create: saleItemCreateMock,
      update: saleItemUpdateMock,
      delete: saleItemDeleteMock,
    },
  }),
}));

import { app } from "../../src/app.js";

describe("Feature-F: VAT-Inclusive Pricing and Total Calculation Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // STS-F-01: Single item calculation (unit price 100.00, qty 1)
  it("STS-F-01: calculateSaleTotals for single 100.00 item returns Subtotal 100.00, VAT 6.54, Total 100.00", () => {
    const items = [{ unitPriceSnapshot: new Prisma.Decimal("100.00"), quantity: 1 }];
    const totals = calculateSaleTotals(items);

    expect(totals.subtotalStr).toBe("100.00");
    expect(totals.discountAmountStr).toBe("0.00");
    expect(totals.vatAmountStr).toBe("6.54");
    expect(totals.totalAmountStr).toBe("100.00");
  });

  // STS-F-02: Item price 107.00, qty 1 -> exact 7.00 VAT
  it("STS-F-02: calculateSaleTotals for 107.00 item returns exact VAT 7.00", () => {
    const items = [{ unitPriceSnapshot: new Prisma.Decimal("107.00"), quantity: 1 }];
    const totals = calculateSaleTotals(items);

    expect(totals.subtotalStr).toBe("107.00");
    expect(totals.vatAmountStr).toBe("7.00");
    expect(totals.totalAmountStr).toBe("107.00");
  });

  // STS-F-03: Multiple items sum (45.00 x 2 + 10.00 x 1)
  it("STS-F-03: calculateSaleTotals for multiple items (45.00x2 + 10.00x1) sums Subtotal to 100.00", () => {
    const items = [
      { unitPriceSnapshot: new Prisma.Decimal("45.00"), quantity: 2 },
      { unitPriceSnapshot: new Prisma.Decimal("10.00"), quantity: 1 },
    ];
    const totals = calculateSaleTotals(items);

    expect(totals.subtotalStr).toBe("100.00");
    expect(totals.vatAmountStr).toBe("6.54");
    expect(totals.totalAmountStr).toBe("100.00");
  });

  // STS-F-04: Satang rounding half-up (fraction >= 0.005 rounds UP)
  it("STS-F-04: Commercial satang rounding rounds UP when fraction is >= 0.005", () => {
    // 7.50 * 7 / 107 = 0.490654... -> 0.49
    // Price 15.00 * 7 / 107 = 0.9813... -> 0.98
    // Price 85.00 * 7 / 107 = 5.56074... -> 5.56
    // Price 77.00 * 7 / 107 = 5.03738... -> 5.04
    const items = [{ unitPriceSnapshot: new Prisma.Decimal("77.00"), quantity: 1 }];
    const totals = calculateSaleTotals(items);

    // 77 * 7 / 107 = 5.037383... -> rounded half-up = 5.04
    expect(totals.vatAmountStr).toBe("5.04");
  });

  // STS-F-05: Satang rounding half-down (fraction < 0.005 rounds DOWN)
  it("STS-F-05: Commercial satang rounding rounds DOWN when fraction is < 0.005", () => {
    const items = [{ unitPriceSnapshot: new Prisma.Decimal("45.00"), quantity: 1 }];
    const totals = calculateSaleTotals(items);

    // 45 * 7 / 107 = 2.943925... -> fraction .003925 < .005 -> rounds DOWN to 2.94
    expect(totals.vatAmountStr).toBe("2.94");
  });

  // STS-F-06: API DTO response serialization with 2-decimal strings & cart items array
  it("STS-F-06: GET /api/v1/sales/:id returns 2-decimal string money fields and items array", async () => {
    const mockSale = {
      id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      saleNumber: "SALE-20260827-0001",
      status: "OPEN",
      storeId: null,
      terminalId: null,
      cashierId: null,
      subtotal: new Prisma.Decimal("100.00"),
      discountAmount: new Prisma.Decimal("0.00"),
      vatAmount: new Prisma.Decimal("6.54"),
      totalAmount: new Prisma.Decimal("100.00"),
      version: 1,
      createdAt: new Date("2026-08-27T10:15:00.000Z"),
      updatedAt: new Date("2026-08-27T10:15:00.000Z"),
      items: [
        {
          id: "item-1",
          saleId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          productId: "prod-1",
          codeSnapshot: "PROD-001",
          nameSnapshot: "Fresh Milk 1L",
          unitPriceSnapshot: new Prisma.Decimal("50.00"),
          quantity: 2,
          extendedAmount: new Prisma.Decimal("100.00"),
          createdAt: new Date("2026-08-27T10:15:00.000Z"),
          updatedAt: new Date("2026-08-27T10:15:00.000Z"),
        },
      ],
    };

    saleFindUniqueMock.mockResolvedValue(mockSale);

    const response = await request(app).get("/api/v1/sales/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
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
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      items: [
        {
          id: "item-1",
          saleId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          productId: "prod-1",
          codeSnapshot: "PROD-001",
          nameSnapshot: "Fresh Milk 1L",
          unitPriceSnapshot: "50.00",
          quantity: 2,
          extendedAmount: "100.00",
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      ],
    });
  });

  // STS-F-08: Empty cart (0 items) resets totals to 0.00
  it("STS-F-08: calculateSaleTotals for empty items array returns all 0.00 strings", () => {
    const totals = calculateSaleTotals([]);

    expect(totals.subtotalStr).toBe("0.00");
    expect(totals.discountAmountStr).toBe("0.00");
    expect(totals.vatAmountStr).toBe("0.00");
    expect(totals.totalAmountStr).toBe("0.00");
  });

  // STS-F-09: Max monetary boundary (Subtotal 999,999,999.99 THB)
  it("STS-F-09: calculateSaleTotals handles maximum monetary boundary without overflow", () => {
    const items = [{ unitPriceSnapshot: new Prisma.Decimal("999999999.99"), quantity: 1 }];
    const totals = calculateSaleTotals(items);

    expect(totals.subtotalStr).toBe("999999999.99");
    expect(totals.totalAmountStr).toBe("999999999.99");
    // 999999999.99 * 7 / 107 = 65420560.7470... -> 65420560.75
    expect(totals.vatAmountStr).toBe("65420560.75");
  });

  // STS-F-10: 50 items aggregate VAT extraction vs line VAT sum
  it("STS-F-10: Extracts VAT at aggregate order level across 50 items", () => {
    const items = Array.from({ length: 50 }, (_, i) => ({
      unitPriceSnapshot: new Prisma.Decimal((10 + (i % 7) * 3.33).toFixed(2)),
      quantity: 1,
    }));

    const totals = calculateSaleTotals(items);
    const expectedSubtotal = items.reduce(
      (acc, item) => acc.add(new Prisma.Decimal(item.unitPriceSnapshot).mul(item.quantity)),
      new Prisma.Decimal("0.00")
    );

    expect(totals.subtotal.toString()).toBe(expectedSubtotal.toString());
    const expectedVat = expectedSubtotal
      .mul(7)
      .div(107)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    expect(totals.vatAmountStr).toBe(expectedVat.toFixed(2));
  });

  // STS-F-11: Precision check verifying Decimal method chaining
  it("STS-F-11: Preserves exact Decimal precision during calculation", () => {
    const items = [{ unitPriceSnapshot: "33.33", quantity: 3 }];
    const totals = calculateSaleTotals(items);

    // 33.33 * 3 = 99.99
    expect(totals.subtotalStr).toBe("99.99");
    // 99.99 * 7 / 107 = 6.541401869... -> rounds DOWN to 6.54
    expect(totals.vatAmountStr).toBe("6.54");
  });
});
