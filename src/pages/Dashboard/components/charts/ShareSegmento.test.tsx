import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ⚠️ Mocks precisam ser declarados ANTES do import do componente sob teste.
// Substituímos elementos do recharts por versões introspectáveis:
// - ResponsiveContainer: passa width/height fixos.
// - BarChart / Bar / Cell / Pie: renderizam data-attrs para inspeção.
const cellFills: string[] = [];
const barProps: Record<string, unknown>[] = [];

vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactElement }) =>
      React.cloneElement(children, { width: 600, height: 400 }),
    BarChart: ({ children, layout, data }: any) => (
      <div
        data-testid="barchart"
        data-layout={layout}
        data-count={(data ?? []).length}
      >
        {children}
      </div>
    ),
    Bar: ({ children, dataKey }: any) => {
      barProps.push({ dataKey });
      return <div data-testid="bar" data-datakey={dataKey}>{children}</div>;
    },
    Cell: ({ fill }: any) => {
      cellFills.push(fill);
      return <span data-testid="cell" data-fill={fill} />;
    },
    Pie: () => <div data-testid="pie" />,
    Tooltip: ({ formatter }: any) => (
      <div
        data-testid="tooltip"
        data-formatted={formatter ? String(formatter(1234, "value")[0]) : ""}
      />
    ),
    XAxis: (p: any) => <div data-testid="xaxis" data-type={p.type} />,
    YAxis: (p: any) => <div data-testid="yaxis" data-type={p.type} data-datakey={p.dataKey} />,
    LabelList: () => <div data-testid="labellist" />,
    CartesianGrid: () => <div data-testid="grid" />,
  };
});

import { ShareSegmento } from "./ShareSegmento";
import { DashboardService } from "../../services/DashboardService";
import type { Filtros } from "@/data/tpv";

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
    cellFills.length = 0;
    barProps.length = 0;
  });

  it("renderiza gráfico de barras horizontais (não rosca) com dados", () => {
    vi.spyOn(DashboardService, "getRankings").mockImplementation((_s, f: Filtros) => {
      if (f.ano === 2026) {
        return [
          { name: "Varejo", value: 1000 },
          { name: "Serviços", value: 600 },
          { name: "Indústria", value: 400 },
        ];
      }
      return [];
    });

    render(<ShareSegmento filtros={filtros} />);

    expect(screen.getByText("TPV por Segmento")).toBeInTheDocument();

    // Não pode haver Pie/rosca
    expect(screen.queryByTestId("pie")).toBeNull();

    // Deve ser BarChart em layout vertical (barras horizontais)
    const chart = screen.getByTestId("barchart");
    expect(chart).toBeInTheDocument();
    expect(chart.getAttribute("data-layout")).toBe("vertical");
    expect(chart.getAttribute("data-count")).toBe("3");

    // YAxis categórico com dataKey="name" (nomes dos segmentos)
    const yaxis = screen.getByTestId("yaxis");
    expect(yaxis.getAttribute("data-type")).toBe("category");
    expect(yaxis.getAttribute("data-datakey")).toBe("name");

    // XAxis numérico (valores TPV)
    expect(screen.getByTestId("xaxis").getAttribute("data-type")).toBe("number");

    // Bar amarrado ao campo "value"
    expect(barProps[0]).toEqual({ dataKey: "value" });
  });

  it("aplica a cor #51a9cb em todas as barras (Cells)", () => {
    vi.spyOn(DashboardService, "getRankings").mockImplementation((_s, f: Filtros) => {
      if (f.ano === 2026) {
        return [
          { name: "A", value: 100 },
          { name: "B", value: 50 },
          { name: "C", value: 20 },
          { name: "D", value: 10 },
        ];
      }
      return [];
    });

    render(<ShareSegmento filtros={filtros} />);

    const cells = screen.getAllByTestId("cell");
    expect(cells).toHaveLength(4);
    cells.forEach((el) => {
      expect(el.getAttribute("data-fill")).toBe(BAR_COLOR);
    });
    // Todos os fills capturados via prop também devem ser #51a9cb
    expect(cellFills.every((c) => c === BAR_COLOR)).toBe(true);
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

    // percentuais no total (1000/1500 ≈ 66.7%, 500/1500 ≈ 33.3%)
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

    render(<ShareSegmento filtros={filtros} />);
    const tooltip = screen.getByTestId("tooltip");
    // O formatador foi chamado com 1234 e devolveu "R$ 1.234,00" (formatBRL)
    const formatted = tooltip.getAttribute("data-formatted") ?? "";
    expect(formatted).toMatch(/R\$/);
    expect(formatted).toMatch(/1\.234/);
  });

  it("estado vazio: mostra mensagem, não renderiza barras nem cells", () => {
    vi.spyOn(DashboardService, "getRankings").mockReturnValue([]);

    render(<ShareSegmento filtros={filtros} />);

    expect(screen.getAllByText(/Sem dados no período selecionado/i).length).toBeGreaterThan(0);
    expect(screen.queryByTestId("barchart")).toBeNull();
    expect(screen.queryAllByTestId("cell")).toHaveLength(0);
    expect(cellFills).toHaveLength(0);
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
