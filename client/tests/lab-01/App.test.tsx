import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import App from "../../src/App.js";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("App", () => {
  it("renders the Kaching heading", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /Kaching POS/i })).toBeInTheDocument();
  });

  it("shows Online and the seeded products on success", async () => {
    vi.spyOn(api, "checkSystem").mockResolvedValue({
      online: true,
      products: [{ id: "1", code: "BEV-001", barcode: "8850000000011", name: "Water", price: "10.00" }],
    });
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: /check system/i }));
    expect(await screen.findByText(/Online/i)).toBeInTheDocument();
    expect(screen.getByText("Water")).toBeInTheDocument();
  });

  it("shows an Offline message when the API is unavailable", async () => {
    vi.spyOn(api, "checkSystem").mockRejectedValue(new Error("offline"));
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: /check system/i }));
    expect(await screen.findByText(/Offline/i)).toBeInTheDocument();
  });
});
