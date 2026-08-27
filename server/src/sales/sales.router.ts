import { Router, Request, Response, NextFunction } from "express";
import {
  createSale,
  getSaleById,
  cancelSale,
  addItemToSale,
  updateSaleItemQuantity,
  removeSaleItem,
  SaleNotFoundError,
  SaleVersionConflictError,
  InvalidSaleStateError,
  MissingVersionFieldError,
  ProductNotFoundError,
  InvalidQuantityError,
  ItemNotFoundError,
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

// Feature-E: Cart Endpoints
salesRouter.post("/:id/items", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { barcode, productId } = req.body;
    const result = await addItemToSale(id, { barcode, productId });
    const statusCode = result.isNew ? 201 : 200;
    res.status(statusCode).json(result.item);
  } catch (error) {
    next(error);
  }
});

salesRouter.patch("/:id/items/:itemId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, itemId } = req.params;
    const { quantity } = req.body;
    const item = await updateSaleItemQuantity(id, itemId, quantity);
    res.status(200).json(item);
  } catch (error) {
    next(error);
  }
});

salesRouter.delete("/:id/items/:itemId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, itemId } = req.params;
    const result = await removeSaleItem(id, itemId);
    res.status(200).json(result);
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
      title: "Cannot Modify Cart",
      message: error.message,
      retryable: false,
    });
  }

  if (error instanceof InvalidQuantityError) {
    return res.status(400).json({
      code: "INVALID_QUANTITY",
      title: "Invalid Quantity",
      message: error.message,
      retryable: false,
    });
  }

  if (error instanceof ProductNotFoundError) {
    return res.status(404).json({
      code: "PRODUCT_NOT_FOUND",
      title: "Product Not Found",
      message: error.message,
      retryable: false,
    });
  }

  if (error instanceof ItemNotFoundError) {
    return res.status(404).json({
      code: "ITEM_NOT_FOUND",
      title: "Item Not Found",
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
