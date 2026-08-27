import { Prisma, Sale, SaleStatus } from "@prisma/client";
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
  constructor(public currentStatus: string) {
    super(`Sale cannot be cancelled because its current status is '${currentStatus}'. Only 'OPEN' sales may be cancelled.`);
    this.name = "InvalidSaleStateError";
  }
}

export class MissingVersionFieldError extends Error {
  constructor() {
    super("The 'version' field is required for cancelling a sale.");
    this.name = "MissingVersionFieldError";
  }
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
}

export function formatSaleDto(sale: Sale): SaleDto {
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
  });

  return formatSaleDto(sale);
}

export async function getSaleById(id: string): Promise<SaleDto> {
  const prisma = getPrisma();
  const sale = await prisma.sale.findUnique({
    where: { id },
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
