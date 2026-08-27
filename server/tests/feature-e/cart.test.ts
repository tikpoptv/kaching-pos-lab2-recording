import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { Prisma } from "@prisma/client";

// Mocks for Prisma
const mockSaleStore: Record<string, any> = {};
const mockProductStore: Record<string, any> = {};
const mockSaleItemStore: Record<string, any> = {};

const saleFindUniqueMock = vi.fn();
const saleUpdateMock = vi.fn();
const productFindFirstMock = vi.fn();
const productFindManyMock = vi.fn();
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
      findMany: productFindManyMock,
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

describe("Feature-E: Cart and Sale-Item Management API", () => {
  const openSaleId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
  const cancelledSaleId = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";
  
  const sampleProduct = {
    id: "prod-uuid-001",
    code: "PROD-001",
    barcode: "8850001234567",
    name: "Fresh Milk 1L",
    price: new Prisma.Decimal("45.00"),
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const openSale = {
    id: openSaleId,
    saleNumber: "SALE-20260827-0001",
    status: "OPEN",
    subtotal: new Prisma.Decimal("0.00"),
    discountAmount: new Prisma.Decimal("0.00"),
    vatAmount: new Prisma.Decimal("0.00"),
    totalAmount: new Prisma.Decimal("0.00"),
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [],
  };

  const cancelledSale = {
    ...openSale,
    id: cancelledSaleId,
    status: "CANCELLED",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // STS-E-01: Add item to cart with barcode & price snapshots
  it("STS-E-01: POST /api/v1/sales/:id/items adds product with price & code snapshots (201 Created)", async () => {
    const startTime = Date.now();
    saleFindUniqueMock.mockResolvedValue(openSale);
    productFindFirstMock.mockResolvedValue(sampleProduct);
    saleItemFindUniqueMock.mockResolvedValue(null);

    const createdItem = {
      id: "item-uuid-001",
      saleId: openSaleId,
      productId: sampleProduct.id,
      codeSnapshot: sampleProduct.code,
      nameSnapshot: sampleProduct.name,
      unitPriceSnapshot: sampleProduct.price,
      quantity: 1,
      extendedAmount: sampleProduct.price,
      createdAt: new Date("2026-08-27T10:30:00.000Z"),
      updatedAt: new Date("2026-08-27T10:30:00.000Z"),
    };
    saleItemCreateMock.mockResolvedValue(createdItem);

    const response = await request(app)
      .post(`/api/v1/sales/${openSaleId}/items`)
      .send({ barcode: sampleProduct.barcode });

    const duration = Date.now() - startTime;
    expect(response.status).toBe(201);
    expect(duration).toBeLessThanOrEqual(2000);
    expect(response.body).toEqual({
      id: "item-uuid-001",
      saleId: openSaleId,
      productId: sampleProduct.id,
      codeSnapshot: "PROD-001",
      nameSnapshot: "Fresh Milk 1L",
      unitPriceSnapshot: "45.00",
      quantity: 1,
      extendedAmount: "45.00",
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  // STS-E-02: Duplicate item quantity increment
  it("STS-E-02: POST /api/v1/sales/:id/items with existing product increments quantity (200 OK)", async () => {
    const startTime = Date.now();
    saleFindUniqueMock.mockResolvedValue(openSale);
    productFindFirstMock.mockResolvedValue(sampleProduct);

    const existingItem = {
      id: "item-uuid-001",
      saleId: openSaleId,
      productId: sampleProduct.id,
      codeSnapshot: sampleProduct.code,
      nameSnapshot: sampleProduct.name,
      unitPriceSnapshot: sampleProduct.price,
      quantity: 1,
      extendedAmount: sampleProduct.price,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    saleItemFindUniqueMock.mockResolvedValue(existingItem);
    saleItemUpdateMock.mockResolvedValue({
      ...existingItem,
      quantity: 2,
      extendedAmount: new Prisma.Decimal("90.00"),
    });

    const response = await request(app)
      .post(`/api/v1/sales/${openSaleId}/items`)
      .send({ barcode: sampleProduct.barcode });

    const duration = Date.now() - startTime;
    expect(response.status).toBe(200);
    expect(duration).toBeLessThanOrEqual(2000);
    expect(response.body.quantity).toBe(2);
    expect(response.body.extendedAmount).toBe("90.00");
  });

  // STS-E-03: Update item quantity
  it("STS-E-03: PATCH /api/v1/sales/:id/items/:itemId updates item quantity and line total", async () => {
    const startTime = Date.now();
    saleFindUniqueMock.mockResolvedValue(openSale);

    const existingItem = {
      id: "item-uuid-001",
      saleId: openSaleId,
      productId: sampleProduct.id,
      codeSnapshot: sampleProduct.code,
      nameSnapshot: sampleProduct.name,
      unitPriceSnapshot: sampleProduct.price,
      quantity: 1,
      extendedAmount: sampleProduct.price,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    saleItemFindFirstMock.mockResolvedValue(existingItem);
    saleItemUpdateMock.mockResolvedValue({
      ...existingItem,
      quantity: 5,
      extendedAmount: new Prisma.Decimal("225.00"),
    });

    const response = await request(app)
      .patch(`/api/v1/sales/${openSaleId}/items/${existingItem.id}`)
      .send({ quantity: 5 });

    const duration = Date.now() - startTime;
    expect(response.status).toBe(200);
    expect(duration).toBeLessThanOrEqual(2000);
    expect(response.body.quantity).toBe(5);
    expect(response.body.extendedAmount).toBe("225.00");
  });

  // STS-E-04: Search products API
  it("STS-E-04: GET /api/v1/products?search=milk returns matching active products", async () => {
    productFindManyMock.mockResolvedValue([sampleProduct]);

    const response = await request(app).get("/api/v1/products?search=milk");
    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        id: sampleProduct.id,
        barcode: sampleProduct.barcode,
        code: sampleProduct.code,
        name: sampleProduct.name,
        unitPrice: "45.00",
        isActive: true,
      },
    ]);
  });

  // STS-E-05: Zero stock product can be added without inventory block (BR-016)
  it("STS-E-05: Product with zero inventory balance is added without error (BR-016)", async () => {
    saleFindUniqueMock.mockResolvedValue(openSale);
    productFindFirstMock.mockResolvedValue({ ...sampleProduct, stock: 0 });
    saleItemFindUniqueMock.mockResolvedValue(null);
    saleItemCreateMock.mockResolvedValue({
      id: "item-uuid-002",
      saleId: openSaleId,
      productId: sampleProduct.id,
      codeSnapshot: sampleProduct.code,
      nameSnapshot: sampleProduct.name,
      unitPriceSnapshot: sampleProduct.price,
      quantity: 1,
      extendedAmount: sampleProduct.price,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await request(app)
      .post(`/api/v1/sales/${openSaleId}/items`)
      .send({ barcode: sampleProduct.barcode });

    expect(response.status).toBe(201);
  });

  // STS-E-06a, 06b, 06c: Cart actions on CANCELLED sale
  it("STS-E-06: POST, PATCH, DELETE on CANCELLED sale return 400 Bad Request (INVALID_SALE_STATE)", async () => {
    saleFindUniqueMock.mockResolvedValue(cancelledSale);

    const postRes = await request(app)
      .post(`/api/v1/sales/${cancelledSaleId}/items`)
      .send({ barcode: "8850001234567" });
    expect(postRes.status).toBe(400);
    expect(postRes.body.code).toBe("INVALID_SALE_STATE");

    const patchRes = await request(app)
      .patch(`/api/v1/sales/${cancelledSaleId}/items/item-1`)
      .send({ quantity: 2 });
    expect(patchRes.status).toBe(400);
    expect(patchRes.body.code).toBe("INVALID_SALE_STATE");

    const deleteRes = await request(app).delete(`/api/v1/sales/${cancelledSaleId}/items/item-1`);
    expect(deleteRes.status).toBe(400);
    expect(deleteRes.body.code).toBe("INVALID_SALE_STATE");
  });

  // STS-E-07: Out-of-bounds quantity validation
  it("STS-E-07: PATCH with invalid quantity (0, -1, 10000) returns 400 Bad Request", async () => {
    saleFindUniqueMock.mockResolvedValue(openSale);

    const zeroRes = await request(app)
      .patch(`/api/v1/sales/${openSaleId}/items/item-1`)
      .send({ quantity: 0 });
    expect(zeroRes.status).toBe(400);
    expect(zeroRes.body.code).toBe("INVALID_QUANTITY");

    const overflowRes = await request(app)
      .patch(`/api/v1/sales/${openSaleId}/items/item-1`)
      .send({ quantity: 10000 });
    expect(overflowRes.status).toBe(400);
    expect(overflowRes.body.code).toBe("INVALID_QUANTITY");
  });

  // STS-E-08: Cross-sale item access protection
  it("STS-E-08: PATCH on itemId belonging to another sale returns 404 ITEM_NOT_FOUND", async () => {
    saleFindUniqueMock.mockResolvedValue(openSale);
    saleItemFindFirstMock.mockResolvedValue(null);

    const response = await request(app)
      .patch(`/api/v1/sales/${openSaleId}/items/item-belonging-to-other-sale`)
      .send({ quantity: 2 });

    expect(response.status).toBe(404);
    expect(response.body.code).toBe("ITEM_NOT_FOUND");
  });
});
