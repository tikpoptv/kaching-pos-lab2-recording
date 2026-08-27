import { Router, Request, Response, NextFunction } from "express";
import {
  createSale,
  getSaleById,
  cancelSale,
  SaleNotFoundError,
  SaleVersionConflictError,
  InvalidSaleStateError,
  MissingVersionFieldError,
} from "./sales.service.js";

export const salesRouter = Router();

salesRouter.post("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const sale = await createSale();
    res.status(201).json(sale);
  } catch (error) {
    next(error);
  }
});

salesRouter.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const sale = await getSaleById(id);
    res.status(200).json(sale);
  } catch (error) {
    next(error);
  }
});

salesRouter.post("/:id/cancel", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { version } = req.body;

    if (version === undefined || version === null || typeof version !== "number") {
      throw new MissingVersionFieldError();
    }

    const sale = await cancelSale(id, version);
    res.status(200).json(sale);
  } catch (error) {
    next(error);
  }
});

// Error handling middleware for sales routes
salesRouter.use((error: Error, _req: Request, res: Response, next: NextFunction) => {
  if (error instanceof MissingVersionFieldError) {
    return res.status(400).json({
      code: "MISSING_VERSION_FIELD",
      title: "Invalid Request Payload",
      message: error.message,
      retryable: false,
    });
  }

  if (error instanceof InvalidSaleStateError) {
    return res.status(400).json({
      code: "INVALID_SALE_STATE",
      title: "Cannot Cancel Sale",
      message: error.message,
      retryable: false,
    });
  }

  if (error instanceof SaleNotFoundError) {
    return res.status(404).json({
      code: "SALE_NOT_FOUND",
      title: "Sale Not Found",
      message: error.message,
      retryable: false,
    });
  }

  if (error instanceof SaleVersionConflictError) {
    return res.status(409).json({
      code: "SALE_VERSION_CONFLICT",
      title: "Sale State Conflict",
      message: error.message,
      retryable: true,
    });
  }

  next(error);
});
