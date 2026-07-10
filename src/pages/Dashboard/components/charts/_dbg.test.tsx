import React from "react";
import { describe, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { ShareSegmento } from "@/pages/Dashboard/components/charts/ShareSegmento";
import { DashboardService } from "@/pages/Dashboard/services/DashboardService";

vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactElement }) =>
      React.cloneElement(children, { width: 600, height: 400 }),
  };
});

describe("dbg", () => {
  it("dump", () => {
    vi.spyOn(DashboardService, "getRankings").mockImplementation((_s, f: any) => {
      if (f.ano === 2026) return [{ name: "Varejo", value: 1000 }, { name: "Serviços", value: 500 }];
      return [];
    });
    const { container } = render(<ShareSegmento filtros={{ ano: 2026, meses: [], segmento: "todos", uf: "todos" } as any} />);
    console.log("HTML:", container.innerHTML.slice(0, 3000));
  });
});
