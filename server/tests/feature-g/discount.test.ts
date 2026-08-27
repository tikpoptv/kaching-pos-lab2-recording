import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { Prisma } from "@prisma/client";
import { calculateSaleTotals } from "../../src/sales/sales.service.js";

const saleFindUniqueMock = vi.fn();
const saleUpdateMock = vi.fn();
const saleItemCreateMock = vi.fn();
const saleItemUpdateMock = vi.fn();
const saleItemDeleteMock = vi.fn();
const saleItemFindFirstMock = vi.fn();

vi.mock("../../src/prisma.js", () => ({
  getPrisma: () => ({
    sale: {
      findUnique: saleFindUniqueMock,
      update: saleUpdateMock,
    },
    saleItem: {
      findFirst: saleItemFindFirstMock,
      create: saleItemCreateMock,
      update: saleItemUpdateMock,
      delete: saleItemDeleteMock,
    },
  }),
}));

import { app } from "../../src/app.js";

describe("Feature-G: Order-Level Discount Management Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // STS-G-01: Unit calculation for percentage discount (Subtotal 100.00, % 10.00)
  it("STS-G-01: calculateSaleTotals with 10% discount calculates discount 10.00, VAT 5.89, total 90.00", () => {
    const items = [{ unitPriceSnapshot: new Prisma.Decimal("100.00"), quantity: 1 }];
    const totals = calculateSaleTotals(items, { percentage: "10.00" });

    expect(totals.subtotalStr).toBe("100.00");
    expect(totals.discountPercentageStr).toBe("10.00");
    expect(totals.discountAmountStr).toBe("10.00");
    // Taxable total = 90.00 -> 90 * 7 / 107 = 5.88785... -> 5.89
    expect(totals.vatAmountStr).toBe("5.89");
    expect(totals.totalAmountStr).toBe("90.00");
  });

  // STS-G-02: Unit calculation for fixed amount discount (Subtotal 100.00, amount 15.00)
  it("STS-G-02: calculateSaleTotals with fixed amount 15.00 calculates discount 15.00, VAT 5.56, total 85.00", () => {
    const items = [{ unitPriceSnapshot: new Prisma.Decimal("100.00"), quantity: 1 }];
    const totals = calculateSaleTotals(items, { amount: "15.00" });

    expect(totals.subtotalStr).toBe("100.00");
    expect(totals.discountPercentageStr).toBeNull();
    expect(totals.discountAmountStr).toBe("15.00");
    // Taxable total = 85.00 -> 85 * 7 / 107 = 5.5607... -> 5.56
    expect(totals.vatAmountStr).toBe("5.56");
    expect(totals.totalAmountStr).toBe("85.00");
  });

  // STS-G-04: Satang rounding half-up for percentage discount (45.00 * 7.50% = 3.375 -> 3.38)
  it("STS-G-04: Commercial satang rounding rounds UP when percentage discount generates fraction >= 0.005", () => {
    const items = [{ unitPriceSnapshot: new Prisma.Decimal("45.00"), quantity: 1 }];
    const totals = calculateSaleTotals(items, { percentage: "7.50" });

    // 45.00 * 7.5 / 100 = 3.375 -> rounds UP to 3.38
    expect(totals.discountAmountStr).toBe("3.38");
    // Taxable total = 45.00 - 3.38 = 41.62
    expect(totals.totalAmountStr).toBe("41.62");
  });

  // STS-G-05: Validation failure for invalid percentage (> 100 or < 0)
  it("STS-G-05: POST /api/v1/sales/:id/discount with percentage 105 returns HTTP 400 INVALID_DISCOUNT_PERCENTAGE", async () => {
    const mockSale = {
      id: "sale-1",
      saleNumber: "SALE-001",
      status: "OPEN",
      subtotal: new Prisma.Decimal("100.00"),
      discountPercentage: null,
      discountAmount: new Prisma.Decimal("0.00"),
      vatAmount: new Prisma.Decimal("6.54"),
      totalAmount: new Prisma.Decimal("100.00"),
      version: 1,
      items: [],
    };
    saleFindUniqueMock.mockResolvedValue(mockSale);

    const response = await request(app)
      .post("/api/v1/sales/sale-1/discount")
      .send({ type: "PERCENTAGE", percentage: 105.0 });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_DISCOUNT_PERCENTAGE");
  });

  // STS-G-06: Validation failure for invalid amount (> subtotal or < 0)
  it("STS-G-06: POST /api/v1/sales/:id/discount with amount 150 (subtotal 100) returns HTTP 400 INVALID_DISCOUNT_AMOUNT", async () => {
    const mockSale = {
      id: "sale-1",
      saleNumber: "SALE-001",
      status: "OPEN",
      subtotal: new Prisma.Decimal("100.00"),
      discountPercentage: null,
      discountAmount: new Prisma.Decimal("0.00"),
      vatAmount: new Prisma.Decimal("6.54"),
      totalAmount: new Prisma.Decimal("100.00"),
      version: 1,
      items: [],
    };
    saleFindUniqueMock.mockResolvedValue(mockSale);

    const response = await request(app)
      .post("/api/v1/sales/sale-1/discount")
      .send({ type: "AMOUNT", amount: "150.00" });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_DISCOUNT_AMOUNT");
  });

  // STS-G-07 & STS-G-13: Successful percentage discount application & audit log
  it("STS-G-07: POST /api/v1/sales/:id/discount applies 10% discount and returns updated sale DTO with audit log", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const mockSaleBefore = {
      id: "sale-1",
      saleNumber: "SALE-001",
      status: "OPEN",
      storeId: "store-01",
      terminalId: "term-01",
      cashierId: "cashier-1",
      subtotal: new Prisma.Decimal("100.00"),
      discountPercentage: null,
      discountAmount: new Prisma.Decimal("0.00"),
      vatAmount: new Prisma.Decimal("6.54"),
      totalAmount: new Prisma.Decimal("100.00"),
      version: 1,
      createdAt: new Date("2026-08-27T10:15:00.000Z"),
      updatedAt: new Date("2026-08-27T10:15:00.000Z"),
      items: [],
    };

    const mockSaleAfter = {
      ...mockSaleBefore,
      discountPercentage: new Prisma.Decimal("10.00"),
      discountAmount: new Prisma.Decimal("10.00"),
      vatAmount: new Prisma.Decimal("5.89"),
      totalAmount: new Prisma.Decimal("90.00"),
      version: 2,
      updatedAt: new Date("2026-08-27T10:35:00.000Z"),
    };

    saleFindUniqueMock.mockResolvedValue(mockSaleBefore);
    saleUpdateMock.mockResolvedValue(mockSaleAfter);

    const response = await request(app)
      .post("/api/v1/sales/sale-1/discount")
      .send({ type: "PERCENTAGE", percentage: 10.0 });

    expect(response.status).toBe(200);
    expect(response.body.discountPercentage).toBe("10.00");
    expect(response.body.discountAmount).toBe("10.00");
    expect(response.body.vatAmount).toBe("5.89");
    expect(response.body.totalAmount).toBe("90.00");

    expect(consoleSpy).toHaveBeenCalled();
    const auditLogCall = consoleSpy.mock.calls.find((call) =>
      call[0].includes("ORDER_DISCOUNT_MUTATED")
    );
    expect(auditLogCall).toBeDefined();
    const parsedLog = JSON.parse(auditLogCall![0]);
    expect(parsedLog.event).toBe("ORDER_DISCOUNT_MUTATED");
    expect(parsedLog.action).toBe("APPLY_PERCENTAGE");
    expect(parsedLog.discountPercentage).toBe("10.00");
    expect(parsedLog.discountAmount).toBe("10.00");

    consoleSpy.mockRestore();
  });

  // STS-G-08: Single discount rule - applying new discount replaces existing discount
  it("STS-G-08: Applying a fixed amount discount replaces existing percentage discount", async () => {
    const mockSaleBefore = {
      id: "sale-1",
      saleNumber: "SALE-001",
      status: "OPEN",
      subtotal: new Prisma.Decimal("100.00"),
      discountPercentage: new Prisma.Decimal("10.00"),
      discountAmount: new Prisma.Decimal("10.00"),
      vatAmount: new Prisma.Decimal("5.89"),
      totalAmount: new Prisma.Decimal("90.00"),
      version: 2,
      createdAt: new Date("2026-08-27T10:15:00.000Z"),
      updatedAt: new Date("2026-08-27T10:35:00.000Z"),
      items: [
        {
          id: "item-1",
          saleId: "sale-1",
          productId: "prod-1",
          codeSnapshot: "PROD-001",
          nameSnapshot: "Item 1",
          unitPriceSnapshot: new Prisma.Decimal("100.00"),
          quantity: 1,
          extendedAmount: new Prisma.Decimal("100.00"),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };

    const mockSaleAfter = {
      ...mockSaleBefore,
      discountPercentage: null,
      discountAmount: new Prisma.Decimal("20.00"),
      vatAmount: new Prisma.Decimal("5.23"),
      totalAmount: new Prisma.Decimal("80.00"),
      version: 3,
      updatedAt: new Date("2026-08-27T10:36:00.000Z"),
    };

    saleFindUniqueMock.mockResolvedValue(mockSaleBefore);
    saleUpdateMock.mockResolvedValue(mockSaleAfter);

    const response = await request(app)
      .post("/api/v1/sales/sale-1/discount")
      .send({ type: "AMOUNT", amount: "20.00" });

    expect(response.status).toBe(200);
    expect(response.body.discountPercentage).toBeNull();
    expect(response.body.discountAmount).toBe("20.00");
    expect(response.body.totalAmount).toBe("80.00");
  });

  // STS-G-10: OPEN Sale enforcement - returns HTTP 400 when sale status is CANCELLED
  it("STS-G-10: POST /api/v1/sales/:id/discount returns HTTP 400 INVALID_SALE_STATE when sale is CANCELLED", async () => {
    const mockSaleCancelled = {
      id: "sale-1",
      saleNumber: "SALE-001",
      status: "CANCELLED",
      subtotal: new Prisma.Decimal("100.00"),
      discountPercentage: null,
      discountAmount: new Prisma.Decimal("0.00"),
      vatAmount: new Prisma.Decimal("0.00"),
      totalAmount: new Prisma.Decimal("0.00"),
      version: 2,
      items: [],
    };

    saleFindUniqueMock.mockResolvedValue(mockSaleCancelled);

    const response = await request(app)
      .post("/api/v1/sales/sale-1/discount")
      .send({ type: "PERCENTAGE", percentage: 10.0 });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_SALE_STATE");
  });

  // STS-G-12: DELETE /api/v1/sales/:id/discount clears active discount
  it("STS-G-12: DELETE /api/v1/sales/:id/discount clears discount and resets discountPercentage to null", async () => {
    const mockSaleActiveDisc = {
      id: "sale-1",
      saleNumber: "SALE-001",
      status: "OPEN",
      subtotal: new Prisma.Decimal("100.00"),
      discountPercentage: new Prisma.Decimal("10.00"),
      discountAmount: new Prisma.Decimal("10.00"),
      vatAmount: new Prisma.Decimal("5.89"),
      totalAmount: new Prisma.Decimal("90.00"),
      version: 2,
      createdAt: new Date("2026-08-27T10:15:00.000Z"),
      updatedAt: new Date("2026-08-27T10:35:00.000Z"),
      items: [],
    };

    const mockSaleCleared = {
      ...mockSaleActiveDisc,
      discountPercentage: null,
      discountAmount: new Prisma.Decimal("0.00"),
      vatAmount: new Prisma.Decimal("6.54"),
      totalAmount: new Prisma.Decimal("100.00"),
      version: 3,
      updatedAt: new Date("2026-08-27T10:36:00.000Z"),
    };

    saleFindUniqueMock.mockResolvedValue(mockSaleActiveDisc);
    saleUpdateMock.mockResolvedValue(mockSaleCleared);

    const response = await request(app).delete("/api/v1/sales/sale-1/discount");

    expect(response.status).toBe(200);
    expect(response.body.discountPercentage).toBeNull();
    expect(response.body.discountAmount).toBe("0.00");
    expect(response.body.totalAmount).toBe("100.00");
  });
});
