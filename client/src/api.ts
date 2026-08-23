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

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`);
  if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
  return response.json() as Promise<T>;
}

export async function checkSystem(): Promise<SystemStatus> {
  await getJson<{ status: "ok"; service: string }>("/api/health");
  const products = await getJson<Product[]>("/api/products");
  return { online: true, products };
}
