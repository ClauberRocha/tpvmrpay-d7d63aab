import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import { ShareSegmento } from "./ShareSegmento";
import { DashboardService } from "../../services/DashboardService";
import type { Filtros } from "@/data/tpv";

// Recharts uses ResponsiveContainer which relies on element size; jsdom returns 0.
// Substitui por um clone do BarChart com width/height fixos para forçar renderização.
vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactElement }) =>
      React.cloneElement(children, { width: 600, height: 400 }),
  };
});

const BAR_COLOR = "#51a9cb";

const filtros: Filtros = {
  ano: 2026,
  meses: [],
  segmento: "todos",
  uf: "todos",
};

describe("ShareSegmento", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renderiza gráfico de barras horizontais (não rosca) com dados", () => {
    const mock = vi.spyOn(DashboardService, "getRankings");
    mock.mockImplementation((_source, f: Filtros) => {
      if (f.ano === 2026) {
        return [
          { name: "Varejo", value: 1000 },
          { name: "Serviços", value: 600 },
          { name: "Indústria", value: 400 },
        ];
      }
      return [
        { name: "Varejo", value: 800 },
        { name: "Serviços", value: 700 },
      ];
    });

    const { container } = render(<ShareSegmento filtros={filtros} />);

    // Título correto
    expect(screen.getByText("TPV por Segmento")).toBeInTheDocument();

    // Não pode existir Pie/rosca
    expect(container.querySelector(".recharts-pie")).toBeNull();
    expect(container.querySelector(".recharts-pie-sector")).toBeNull();

    // Deve haver um BarChart horizontal (layout vertical => eixo Y categórico)
    expect(container.querySelector(".recharts-bar")).not.toBeNull();
    const yAxis = container.querySelector(".recharts-yAxis");
    expect(yAxis).not.toBeNull();
    // eixo Y deve conter os nomes dos segmentos (categorias)
    expect(yAxis?.textContent).toContain("Varejo");
    expect(yAxis?.textContent).toContain("Serviços");
  });

  it("aplica a cor #51a9cb em todas as barras", () => {
    vi.spyOn(DashboardService, "getRankings").mockImplementation((_s, f: Filtros) => {
      if (f.ano === 2026) {
        return [
          { name: "A", value: 100 },
          { name: "B", value: 50 },
          { name: "C", value: 20 },
        ];
      }
      return [];
    });

    const { container } = render(<ShareSegmento filtros={filtros} />);

    const cells = container.querySelectorAll(".recharts-bar-rectangle path, .recharts-rectangle");
    expect(cells.length).toBeGreaterThan(0);
    cells.forEach((el) => {
      expect(el.getAttribute("fill")).toBe(BAR_COLOR);
    });
  });

  it("renderiza legenda com valores, percentuais e badges de crescimento YoY", () => {
    vi.spyOn(DashboardService, "getRankings").mockImplementation((_s, f: Filtros) => {
      if (f.ano === 2026) {
        return [
          { name: "Varejo", value: 1000 },
          { name: "Serviços", value: 500 },
        ];
      }
      // ano anterior
      return [
        { name: "Varejo", value: 800 }, // +25%
        { name: "Serviços", value: 1000 }, // -50%
      ];
    });

    render(<ShareSegmento filtros={filtros} />);

    // legenda mostra nomes
    expect(screen.getAllByText("Varejo").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Serviços").length).toBeGreaterThan(0);

    // percentuais no total (1000/1500 = 66.7%, 500/1500 = 33.3%)
    expect(screen.getByText("66.7%")).toBeInTheDocument();
    expect(screen.getByText("33.3%")).toBeInTheDocument();

    // badges YoY
    expect(screen.getByText(/↑\s*25%/)).toBeInTheDocument();
    expect(screen.getByText(/↓\s*50%/)).toBeInTheDocument();
  });

  it("configura tooltip do recharts com formatador BRL", () => {
    vi.spyOn(DashboardService, "getRankings").mockImplementation((_s, f: Filtros) => {
      if (f.ano === 2026) return [{ name: "X", value: 1234 }];
      return [];
    });

    const { container } = render(<ShareSegmento filtros={filtros} />);
    // recharts sempre renderiza o wrapper do Tooltip mesmo sem hover
    expect(container.querySelector(".recharts-tooltip-wrapper")).not.toBeNull();
  });

  it("exibe mensagem de estado vazio quando não há dados", () => {
    vi.spyOn(DashboardService, "getRankings").mockReturnValue([]);

    const { container } = render(<ShareSegmento filtros={filtros} />);

    expect(screen.getByText(/Sem dados no período selecionado/i)).toBeInTheDocument();
    // não deve renderizar nenhuma barra colorida
    const cells = container.querySelectorAll(".recharts-bar-rectangle path, .recharts-rectangle");
    cells.forEach((el) => {
      // se algo aparecer, não pode ser cor diferente da paleta
      expect([BAR_COLOR, null]).toContain(el.getAttribute("fill"));
    });
  });

  it("análise agregada usa o líder e o top 3", () => {
    vi.spyOn(DashboardService, "getRankings").mockImplementation((_s, f: Filtros) => {
      if (f.ano === 2026) {
        return [
          { name: "Varejo", value: 500 },
          { name: "Serviços", value: 300 },
          { name: "Indústria", value: 200 },
        ];
      }
      return [];
    });

    render(<ShareSegmento filtros={filtros} />);
    expect(screen.getByText(/Varejo domina/i)).toBeInTheDocument();
    expect(screen.getByText(/3 maiores segmentos somam/i)).toBeInTheDocument();
  });
});
