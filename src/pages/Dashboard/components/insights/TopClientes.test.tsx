import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

import { TopClientes } from "./TopClientes";

import type { Filtros } from "@/data/tpv";

const mockItems = [
  {
    name: "Cliente Alfa",
    categoria: "Diamante" as const,
    tpv: 1_000_000,
    pedidos: 320,
    ticket: 3125,
    ltv: 5_000_000,
    growth: 12.5,
    inadimplencia: 1.2,
    ultimaCompra: "2026-06-10",
    status: "Ativo" as const,
  },
  {
    name: "Cliente Beta",
    categoria: "Ouro" as const,
    tpv: 600_000,
    pedidos: 180,
    ticket: 3333,
    ltv: 2_500_000,
    growth: -4.3,
    inadimplencia: 0,
    ultimaCompra: "2026-05-01",
    status: "Alerta" as const,
  },
];

vi.mock("../../hooks/useDashboard", () => ({
  useDashboard: () => ({ topClientes: mockItems }),
}));

const exportToCsvMock = vi.fn();
vi.mock("@/utils/exportCsv", () => ({
  exportToCsv: (...args: unknown[]) => exportToCsvMock(...args),
}));

const filtros: Filtros = { ano: 2026, meses: [1, 2], segmento: "todos", uf: "todos" };

describe("TopClientes", () => {
  beforeEach(() => {
    exportToCsvMock.mockClear();
  });

  it("does not render removed column headers (LTV, Inadimp., Última Compra, Status)", () => {
    render(<TopClientes filtros={filtros} />);
    const table = screen.getByRole("table");
    const headers = within(table).getAllByRole("columnheader").map((h) => h.textContent?.trim());

    expect(headers).not.toContain("LTV");
    expect(headers).not.toContain("Inadimp.");
    expect(headers).not.toContain("Última Compra");
    expect(headers).not.toContain("Status");
  });

  it("renders only the expected visible column headers", () => {
    render(<TopClientes filtros={filtros} />);
    const table = screen.getByRole("table");
    const headers = within(table)
      .getAllByRole("columnheader")
      .map((h) => h.textContent?.trim());

    expect(headers).toEqual(["#", "Cliente", "TPV", "Pedidos", "Ticket Médio", "Cresc. ano a ano"]);
  });

  it("exports the full CSV with all columns including the ones removed from the UI", () => {
    render(<TopClientes filtros={filtros} />);
    fireEvent.click(screen.getByRole("button", { name: /exportar completo/i }));

    expect(exportToCsvMock).toHaveBeenCalledTimes(1);
    const [rows, filename, headers] = exportToCsvMock.mock.calls[0];

    expect(filename).toBe("top_clientes_executivo.csv");
    expect(headers).toEqual([
      "Posicao",
      "Cliente",
      "Categoria",
      "TPV_Reais",
      "Pedidos",
      "Ticket_Medio_Reais",
      "Ultima_Compra",
      "Cresc_ano_a_ano",
      "Inadimplencia",
      "LTV_Estimado",
      "Status",
    ]);

    expect(rows).toHaveLength(mockItems.length);
    expect(rows[0]).toEqual([
      1,
      "Cliente Alfa",
      "Diamante",
      1_000_000,
      320,
      3125,
      "2026-06-10",
      "12.5%",
      "1.2%",
      5_000_000,
      "Ativo",
    ]);
    expect(rows[1][10]).toBe("Alerta");
  });

  it("keeps CSV export headers/rows aligned (same length in each mode)", () => {
    render(<TopClientes filtros={filtros} />);
    fireEvent.click(screen.getByRole("button", { name: /exportar completo/i }));

    const [rows, , headers] = exportToCsvMock.mock.calls[0];
    for (const row of rows) {
      expect(row).toHaveLength(headers.length);
    }
  });
});
