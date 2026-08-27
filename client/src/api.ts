const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Product {
  id: string;
  code: string;
  barcode: string;
  name: string;
  price: string;
  unitPrice?: string;
  isActive?: boolean;
}

export interface SystemStatus {
  online: boolean;
  products: Product[];
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
  status: "OPEN" | "PAYMENT_PENDING" | "PAYMENT_RECOVERY_PENDING" | "COMPLETED" | "CANCELLED";
  storeId: string | null;
  terminalId: string | null;
  cashierId: string | null;
  subtotal: string;
  discountPercentage: string | null;
  discountAmount: string;
  vatAmount: string;
  totalAmount: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  items?: SaleItemDto[];
}

export interface ApiProblemDetails {
  code: string;
  title: string;
  message: string;
  retryable?: boolean;
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`);
  if (!response.ok) {
    let errorData: ApiProblemDetails | null = null;
    try {
      errorData = (await response.json()) as ApiProblemDetails;
    } catch {
      // Ignore JSON parse failure
    }
    throw new Error(errorData?.message ?? `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function postJson<T, R>(path: string, body: T): Promise<R> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    let errorData: ApiProblemDetails | null = null;
    try {
      errorData = (await response.json()) as ApiProblemDetails;
    } catch {
      // Ignore JSON parse failure
    }
    throw new Error(errorData?.message ?? `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<R>;
}

async function patchJson<T, R>(path: string, body: T): Promise<R> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    let errorData: ApiProblemDetails | null = null;
    try {
      errorData = (await response.json()) as ApiProblemDetails;
    } catch {
      // Ignore JSON parse failure
    }
    throw new Error(errorData?.message ?? `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<R>;
}

async function deleteJson<R>(path: string): Promise<R> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    let errorData: ApiProblemDetails | null = null;
    try {
      errorData = (await response.json()) as ApiProblemDetails;
    } catch {
      // Ignore JSON parse failure
    }
    throw new Error(errorData?.message ?? `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<R>;
}

export async function checkSystem(): Promise<SystemStatus> {
  await getJson<{ status: "ok"; service: string }>("/api/health");
  const products = await getJson<Product[]>("/api/products");
  return { online: true, products };
}

export async function createSale(): Promise<SaleDto> {
  return postJson<{}, SaleDto>("/api/v1/sales", {});
}

export async function getSale(id: string): Promise<SaleDto> {
  return getJson<SaleDto>(`/api/v1/sales/${id}`);
}

export async function cancelSale(id: string, version: number): Promise<SaleDto> {
  return postJson<{ version: number }, SaleDto>(`/api/v1/sales/${id}/cancel`, { version });
}

export async function addItemToCart(saleId: string, payload: { barcode?: string; productId?: string }): Promise<SaleItemDto> {
  return postJson<{ barcode?: string; productId?: string }, SaleItemDto>(`/api/v1/sales/${saleId}/items`, payload);
}

export async function updateCartItemQuantity(saleId: string, itemId: string, quantity: number): Promise<SaleItemDto> {
  return patchJson<{ quantity: number }, SaleItemDto>(`/api/v1/sales/${saleId}/items/${itemId}`, { quantity });
}

export async function removeCartItem(saleId: string, itemId: string): Promise<{ success: boolean; itemId: string }> {
  return deleteJson<{ success: boolean; itemId: string }>(`/api/v1/sales/${saleId}/items/${itemId}`);
}

export async function searchActiveProducts(query?: string): Promise<Product[]> {
  const param = query ? `?search=${encodeURIComponent(query)}` : "";
  return getJson<Product[]>(`/api/v1/products${param}`);
}

export async function applyOrderDiscount(
  saleId: string,
  payload: { type: "PERCENTAGE" | "AMOUNT"; percentage?: number; amount?: string }
): Promise<SaleDto> {
  return postJson<{ type: "PERCENTAGE" | "AMOUNT"; percentage?: number; amount?: string }, SaleDto>(
    `/api/v1/sales/${saleId}/discount`,
    payload
  );
}

export async function clearOrderDiscount(saleId: string): Promise<SaleDto> {
  return deleteJson<SaleDto>(`/api/v1/sales/${saleId}/discount`);
}
