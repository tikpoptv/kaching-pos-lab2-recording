import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { Prisma } from "@prisma/client";

// Mock Prisma for sales tests
const mockSaleStore: Record<string, any> = {};

const createMock = vi.fn();
const findUniqueMock = vi.fn();
const updateMock = vi.fn();
const countMock = vi.fn();

vi.mock("../../src/prisma.js", () => ({
  getPrisma: () => ({
    sale: {
      create: createMock,
      findUnique: findUniqueMock,
      update: updateMock,
      count: countMock,
    },
  }),
}));

import { app } from "../../src/app.js";

describe("Feature-D: Sale Lifecycle Management API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockSaleStore).forEach((key) => delete mockSaleStore[key]);
  });

  // STS-D-01: Start new sale API test
  it("STS-D-01: POST /api/v1/sales creates a new sale with OPEN status and 201 Created within 2,000 ms", async () => {
    const startTime = Date.now();
    countMock.mockResolvedValue(0);
    createMock.mockImplementation(async ({ data }: any) => {
      const sale = {
        id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        saleNumber: data.saleNumber,
        status: "OPEN",
        storeId: null,
        terminalId: null,
        cashierId: null,
        subtotal: new Prisma.Decimal("0.00"),
        discountAmount: new Prisma.Decimal("0.00"),
        vatAmount: new Prisma.Decimal("0.00"),
        totalAmount: new Prisma.Decimal("0.00"),
        version: 1,
        createdAt: new Date("2026-08-27T10:15:00.000Z"),
        updatedAt: new Date("2026-08-27T10:15:00.000Z"),
      };
      mockSaleStore[sale.id] = sale;
      return sale;
    });

    const response = await request(app).post("/api/v1/sales").send({});
    const duration = Date.now() - startTime;

    expect(response.status).toBe(201);
    expect(duration).toBeLessThanOrEqual(2000);
    expect(response.body).toEqual({
      id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      saleNumber: expect.stringMatching(/^SALE-\d{8}-\d{4}$/),
      status: "OPEN",
      storeId: null,
      terminalId: null,
      cashierId: null,
      subtotal: "0.00",
      discountAmount: "0.00",
      vatAmount: "0.00",
      totalAmount: "0.00",
      version: 1,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  // STS-D-02: Get sale by ID API test
  it("STS-D-02: GET /api/v1/sales/:id returns sale payload or 404 Not Found", async () => {
    const existingSale = {
      id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      saleNumber: "SALE-20260827-0001",
      status: "OPEN",
      storeId: null,
      terminalId: null,
      cashierId: null,
      subtotal: new Prisma.Decimal("0.00"),
      discountAmount: new Prisma.Decimal("0.00"),
      vatAmount: new Prisma.Decimal("0.00"),
      totalAmount: new Prisma.Decimal("0.00"),
      version: 1,
      createdAt: new Date("2026-08-27T10:15:00.000Z"),
      updatedAt: new Date("2026-08-27T10:15:00.000Z"),
    };

    findUniqueMock.mockImplementation(async ({ where }: any) => {
      if (where.id === existingSale.id) return existingSale;
      return null;
    });

    const okResponse = await request(app).get(`/api/v1/sales/${existingSale.id}`);
    expect(okResponse.status).toBe(200);
    expect(okResponse.body.saleNumber).toBe("SALE-20260827-0001");

    const notFoundResponse = await request(app).get("/api/v1/sales/non-existent-id");
    expect(notFoundResponse.status).toBe(404);
    expect(notFoundResponse.body.code).toBe("SALE_NOT_FOUND");
  });

  // STS-D-03: Cancel sale API test
  it("STS-D-03: POST /api/v1/sales/:id/cancel with version 1 transitions sale to CANCELLED within 2,000 ms", async () => {
    const startTime = Date.now();
    const existingSale = {
      id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      saleNumber: "SALE-20260827-0001",
      status: "OPEN",
      storeId: null,
      terminalId: null,
      cashierId: null,
      subtotal: new Prisma.Decimal("0.00"),
      discountAmount: new Prisma.Decimal("0.00"),
      vatAmount: new Prisma.Decimal("0.00"),
      totalAmount: new Prisma.Decimal("0.00"),
      version: 1,
      createdAt: new Date("2026-08-27T10:15:00.000Z"),
      updatedAt: new Date("2026-08-27T10:15:00.000Z"),
    };

    findUniqueMock.mockResolvedValue(existingSale);
    updateMock.mockResolvedValue({
      ...existingSale,
      status: "CANCELLED",
      version: 2,
      updatedAt: new Date("2026-08-27T10:16:30.000Z"),
    });

    const response = await request(app)
      .post(`/api/v1/sales/${existingSale.id}/cancel`)
      .send({ version: 1 });

    const duration = Date.now() - startTime;
    expect(response.status).toBe(200);
    expect(duration).toBeLessThanOrEqual(2000);
    expect(response.body.status).toBe("CANCELLED");
    expect(response.body.version).toBe(2);
  });

  // STS-D-04: Invalid state cancellation test
  it("STS-D-04: POST /api/v1/sales/:id/cancel on non-OPEN sale returns 400 Bad Request", async () => {
    const cancelledSale = {
      id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      saleNumber: "SALE-20260827-0001",
      status: "CANCELLED",
      storeId: null,
      terminalId: null,
      cashierId: null,
      subtotal: new Prisma.Decimal("0.00"),
      discountAmount: new Prisma.Decimal("0.00"),
      vatAmount: new Prisma.Decimal("0.00"),
      totalAmount: new Prisma.Decimal("0.00"),
      version: 2,
      createdAt: new Date("2026-08-27T10:15:00.000Z"),
      updatedAt: new Date("2026-08-27T10:16:30.000Z"),
    };

    findUniqueMock.mockResolvedValue(cancelledSale);

    const response = await request(app)
      .post(`/api/v1/sales/${cancelledSale.id}/cancel`)
      .send({ version: 2 });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_SALE_STATE");
    expect(response.body.message).toContain("Only 'OPEN' sales may be cancelled");
  });

  // STS-D-05 & STS-D-06: Concurrency version conflict & missing version test
  it("STS-D-06: POST /api/v1/sales/:id/cancel returns 409 Conflict on version mismatch, 400 on missing version", async () => {
    const openSale = {
      id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      saleNumber: "SALE-20260827-0001",
      status: "OPEN",
      subtotal: new Prisma.Decimal("0.00"),
      discountAmount: new Prisma.Decimal("0.00"),
      vatAmount: new Prisma.Decimal("0.00"),
      totalAmount: new Prisma.Decimal("0.00"),
      version: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    findUniqueMock.mockResolvedValue(openSale);

    // Version conflict (sending version 1 when server is at version 2)
    const conflictResponse = await request(app)
      .post(`/api/v1/sales/${openSale.id}/cancel`)
      .send({ version: 1 });

    expect(conflictResponse.status).toBe(409);
    expect(conflictResponse.body.code).toBe("SALE_VERSION_CONFLICT");

    // Missing version payload
    const missingVersionResponse = await request(app)
      .post(`/api/v1/sales/${openSale.id}/cancel`)
      .send({});

    expect(missingVersionResponse.status).toBe(400);
    expect(missingVersionResponse.body.code).toBe("MISSING_VERSION_FIELD");
  });
});
