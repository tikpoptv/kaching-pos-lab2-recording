import { Prisma, Sale, SaleStatus, SaleItem } from "@prisma/client";
import { getPrisma } from "../prisma.js";

export class SaleNotFoundError extends Error {
  constructor(public id: string) {
    super(`No sale exists with ID '${id}'.`);
    this.name = "SaleNotFoundError";
  }
}

export class SaleVersionConflictError extends Error {
  constructor() {
    super("The sale has been modified by another process. Please refresh and try again.");
    this.name = "SaleVersionConflictError";
  }
}

export class InvalidSaleStateError extends Error {
  constructor(public currentStatus: string, action: string = "cancelled") {
    super(`Sale cannot be ${action} because its current status is '${currentStatus}'. Only 'OPEN' sales may be ${action === "cancelled" ? "cancelled" : "modified"}.`);
    this.name = "InvalidSaleStateError";
  }
}

export class MissingVersionFieldError extends Error {
  constructor() {
    super("The 'version' field is required for cancelling a sale.");
    this.name = "MissingVersionFieldError";
  }
}

export class ProductNotFoundError extends Error {
  constructor(public identifier: string) {
    super(`No active product found matching '${identifier}'.`);
    this.name = "ProductNotFoundError";
  }
}

export class InvalidQuantityError extends Error {
  constructor() {
    super("Quantity must be an integer between 1 and 9,999 inclusive.");
    this.name = "InvalidQuantityError";
  }
}

export class ItemNotFoundError extends Error {
  constructor(public itemId: string, public saleId: string) {
    super(`No cart item with ID '${itemId}' exists in sale '${saleId}'.`);
    this.name = "ItemNotFoundError";
  }
}

export interface SaleItemDto {
  id: string;
  saleId: string;
  productId: string;
  codeSnapshot: string;
  nameSnapshot: string;
  unitPriceSnapshot: string;
  quantity: number;
  extendedAmount: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaleDto {
  id: string;
  saleNumber: string;
  status: SaleStatus;
  storeId: string | null;
  terminalId: string | null;
  cashierId: string | null;
  subtotal: string;
  discountAmount: string;
  vatAmount: string;
  totalAmount: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  items: SaleItemDto[];
}

export function formatSaleItemDto(item: SaleItem): SaleItemDto {
  return {
    id: item.id,
    saleId: item.saleId,
    productId: item.productId,
    codeSnapshot: item.codeSnapshot,
    nameSnapshot: item.nameSnapshot,
    unitPriceSnapshot: item.unitPriceSnapshot.toFixed(2),
    quantity: item.quantity,
    extendedAmount: item.extendedAmount.toFixed(2),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export function formatSaleDto(sale: Sale & { items?: SaleItem[] }): SaleDto {
  return {
    id: sale.id,
    saleNumber: sale.saleNumber,
    status: sale.status,
    storeId: sale.storeId,
    terminalId: sale.terminalId,
    cashierId: sale.cashierId,
    subtotal: sale.subtotal.toFixed(2),
    discountAmount: sale.discountAmount.toFixed(2),
    vatAmount: sale.vatAmount.toFixed(2),
    totalAmount: sale.totalAmount.toFixed(2),
    version: sale.version,
    createdAt: sale.createdAt.toISOString(),
    updatedAt: sale.updatedAt.toISOString(),
    items: sale.items ? sale.items.map(formatSaleItemDto) : [],
  };
}

export async function createSale(): Promise<SaleDto> {
  const prisma = getPrisma();
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");

  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  
  const countToday = await prisma.sale.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  const sequence = String(countToday + 1).padStart(4, "0");
  const saleNumber = `SALE-${dateStr}-${sequence}`;

  const sale = await prisma.sale.create({
    data: {
      saleNumber,
      status: SaleStatus.OPEN,
      subtotal: new Prisma.Decimal("0.00"),
      discountAmount: new Prisma.Decimal("0.00"),
      vatAmount: new Prisma.Decimal("0.00"),
      totalAmount: new Prisma.Decimal("0.00"),
      version: 1,
    },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return formatSaleDto(sale);
}

export async function getSaleById(id: string): Promise<SaleDto> {
  const prisma = getPrisma();
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!sale) {
    throw new SaleNotFoundError(id);
  }

  return formatSaleDto(sale);
}

export async function cancelSale(id: string, version: number): Promise<SaleDto> {
  const prisma = getPrisma();
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!sale) {
    throw new SaleNotFoundError(id);
  }

  if (sale.status !== SaleStatus.OPEN) {
    throw new InvalidSaleStateError(sale.status);
  }

  if (sale.version !== version) {
    throw new SaleVersionConflictError();
  }

  const updated = await prisma.sale.update({
    where: { id, version },
    data: {
      status: SaleStatus.CANCELLED,
      version: { increment: 1 },
    },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  // Log structured JSON audit entry per NFR-008 & SDS Section 9.4
  console.log(
    JSON.stringify({
      event: "SALE_CANCELLED",
      saleId: updated.id,
      saleNumber: updated.saleNumber,
      actor: "cashier",
      role: "Cashier",
      storeId: updated.storeId ?? "store-01",
      terminalId: updated.terminalId ?? "term-01",
      correlationId: "req-local",
      outcome: "SUCCESS",
      timestamp: updated.updatedAt.toISOString(),
    })
  );

  return formatSaleDto(updated);
}

export async function addItemToSale(
  saleId: string,
  payload: { barcode?: string; productId?: string }
): Promise<{ item: SaleItemDto; isNew: boolean }> {
  const prisma = getPrisma();

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
  });

  if (!sale) {
    throw new SaleNotFoundError(saleId);
  }

  if (sale.status !== SaleStatus.OPEN) {
    throw new InvalidSaleStateError(sale.status, "modified");
  }

  const identifier = payload.barcode || payload.productId;
  if (!identifier) {
    throw new ProductNotFoundError("empty");
  }

  const orConditions: Prisma.ProductWhereInput[] = [];
  if (payload.barcode) {
    orConditions.push({ barcode: payload.barcode });
  }
  if (payload.productId) {
    orConditions.push({ id: payload.productId });
  }

  const product = await prisma.product.findFirst({
    where: {
      active: true,
      OR: orConditions,
    },
  });

  if (!product) {
    throw new ProductNotFoundError(identifier);
  }

  // Check if item already exists in this sale
  const existingItem = await prisma.saleItem.findUnique({
    where: {
      saleId_productId: {
        saleId,
        productId: product.id,
      },
    },
  });

  if (existingItem) {
    const newQty = existingItem.quantity + 1;
    if (newQty > 9999) {
      throw new InvalidQuantityError();
    }

    const newExtended = existingItem.unitPriceSnapshot.mul(newQty);
    const updated = await prisma.saleItem.update({
      where: { id: existingItem.id },
      data: {
        quantity: newQty,
        extendedAmount: newExtended,
      },
    });

    return { item: formatSaleItemDto(updated), isNew: false };
  } else {
    const newItem = await prisma.saleItem.create({
      data: {
        saleId,
        productId: product.id,
        codeSnapshot: product.code,
        nameSnapshot: product.name,
        unitPriceSnapshot: product.price,
        quantity: 1,
        extendedAmount: product.price,
      },
    });

    return { item: formatSaleItemDto(newItem), isNew: true };
  }
}

export async function updateSaleItemQuantity(
  saleId: string,
  itemId: string,
  quantity: number
): Promise<SaleItemDto> {
  const prisma = getPrisma();

  if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > 9999) {
    throw new InvalidQuantityError();
  }

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
  });

  if (!sale) {
    throw new SaleNotFoundError(saleId);
  }

  if (sale.status !== SaleStatus.OPEN) {
    throw new InvalidSaleStateError(sale.status, "modified");
  }

  const existingItem = await prisma.saleItem.findFirst({
    where: {
      id: itemId,
      saleId,
    },
  });

  if (!existingItem) {
    throw new ItemNotFoundError(itemId, saleId);
  }

  const newExtended = existingItem.unitPriceSnapshot.mul(quantity);
  const updated = await prisma.saleItem.update({
    where: { id: existingItem.id },
    data: {
      quantity,
      extendedAmount: newExtended,
    },
  });

  return formatSaleItemDto(updated);
}

export async function removeSaleItem(
  saleId: string,
  itemId: string
): Promise<{ success: boolean; message: string; itemId: string }> {
  const prisma = getPrisma();

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
  });

  if (!sale) {
    throw new SaleNotFoundError(saleId);
  }

  if (sale.status !== SaleStatus.OPEN) {
    throw new InvalidSaleStateError(sale.status, "modified");
  }

  const existingItem = await prisma.saleItem.findFirst({
    where: {
      id: itemId,
      saleId,
    },
  });

  if (!existingItem) {
    throw new ItemNotFoundError(itemId, saleId);
  }

  await prisma.saleItem.delete({
    where: { id: existingItem.id },
  });

  return {
    success: true,
    message: "Item removed from cart.",
    itemId,
  };
}

export async function searchActiveProducts(query?: string, limit: number = 20) {
  const prisma = getPrisma();
  const maxLimit = Math.min(limit, 50);

  const whereClause: Prisma.ProductWhereInput = {
    active: true,
  };

  if (query && query.trim() !== "") {
    const trimmed = query.trim();
    whereClause.OR = [
      { code: { contains: trimmed, mode: "insensitive" } },
      { name: { contains: trimmed, mode: "insensitive" } },
      { barcode: { contains: trimmed, mode: "insensitive" } },
    ];
  }

  const products = await prisma.product.findMany({
    where: whereClause,
    take: maxLimit,
    orderBy: { code: "asc" },
  });

  return products.map((p) => ({
    id: p.id,
    barcode: p.barcode,
    code: p.code,
    name: p.name,
    unitPrice: p.price.toFixed(2),
    isActive: p.active,
  }));
}
