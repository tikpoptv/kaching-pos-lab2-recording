import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const findMany = vi.fn();

vi.mock("../../src/prisma.js", () => ({
  getPrisma: () => ({ product: { findMany } }),
}));

import { app } from "../../src/app.js";

describe("GET /api/products", () => {
  beforeEach(() => {
    findMany.mockReset();
  });

  it("returns active products in catalog order", async () => {
    findMany.mockResolvedValue([
      { id: "1", code: "BEV-001", barcode: "8850000000011", name: "Water", price: { toFixed: () => "10.00" } },
    ]);
    const response = await request(app).get("/api/products");
    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { id: "1", code: "BEV-001", barcode: "8850000000011", name: "Water", price: "10.00" },
    ]);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { code: "asc" } }));
  });

  it("returns a safe error when the catalog is unavailable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    findMany.mockRejectedValue(new Error("database details"));
    const response = await request(app).get("/api/products");
    expect(response.status).toBe(500);
    expect(response.body.code).toBe("PRODUCT_CATALOG_UNAVAILABLE");
    expect(JSON.stringify(response.body)).not.toContain("database details");
  });
});
