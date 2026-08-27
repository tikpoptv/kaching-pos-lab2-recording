import express, { Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";
import { salesRouter } from "./sales/sales.router.js";

export const app = express();

app.disable("x-powered-by");
app.use(cors());
app.use(express.json());

app.use("/api/v1/sales", salesRouter);

app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "Kaching API" });
});

app.get("/api/products", async (_req: Request, res: Response) => {
  try {
    const products = await getPrisma().product.findMany({
      where: { active: true },
      select: { id: true, code: true, barcode: true, name: true, price: true },
      orderBy: { code: "asc" },
    });
    res.status(200).json(
      products.map((product) => ({
        ...product,
        price: product.price.toFixed(2),
      })),
    );
  } catch (error) {
    console.error("Unable to list products", error);
    res.status(500).json({
      code: "PRODUCT_CATALOG_UNAVAILABLE",
      title: "Product catalog unavailable",
      message: "The product catalog could not be loaded.",
      retryable: true,
    });
  }
});

export default app;

