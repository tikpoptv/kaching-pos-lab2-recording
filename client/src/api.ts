const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Product {
  id: string;
  code: string;
  barcode: string;
  name: string;
  price: string;
}

export interface SystemStatus {
  online: boolean;
  products: Product[];
}

export interface SaleDto {
  id: string;
  saleNumber: string;
  status: "OPEN" | "PAYMENT_PENDING" | "PAYMENT_RECOVERY_PENDING" | "COMPLETED" | "CANCELLED";
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
