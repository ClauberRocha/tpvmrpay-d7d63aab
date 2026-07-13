import { describe, it, expect } from "vitest";

import { monthlySeries, totalsFiltered, tpv, type Filtros } from "@/data/tpv";

const sumSeries = (f: Filtros) =>
  monthlySeries(f).reduce((acc, p) => acc + p.tpv, 0);

const approxEq = (a: number, b: number, eps = 1) => Math.abs(a - b) <= eps;

describe("Evolução do TPV — agregação bate com totalsFiltered", () => {
  it("Jan–Jun/26 sem filtros", () => {
    const f: Filtros = { ano: 2026, meses: [1, 2, 3, 4, 5, 6], segmento: "todos", uf: "todos" };
    const s = sumSeries(f);
    const t = totalsFiltered(f).tpv;
    expect(s).toBeGreaterThan(0);
    expect(approxEq(s, t)).toBe(true);
  });

  it("ano completo (todos os meses) para cada ano disponível", () => {
    for (const ano of tpv.meta.anos) {
      const f: Filtros = { ano, meses: [], segmento: "todos", uf: "todos" };
      expect(approxEq(sumSeries(f), totalsFiltered(f).tpv)).toBe(true);
    }
  });

  it("ano='todos' sem filtros", () => {
    const f: Filtros = { ano: "todos", meses: [], segmento: "todos", uf: "todos" };
    expect(approxEq(sumSeries(f), totalsFiltered(f).tpv)).toBe(true);
  });

  it("mês único (Jun/26)", () => {
    const f: Filtros = { ano: 2026, meses: [6], segmento: "todos", uf: "todos" };
    expect(approxEq(sumSeries(f), totalsFiltered(f).tpv)).toBe(true);
  });

  it("intervalo parcial (Q1/26)", () => {
    const f: Filtros = { ano: 2026, meses: [1, 2, 3], segmento: "todos", uf: "todos" };
    expect(approxEq(sumSeries(f), totalsFiltered(f).tpv)).toBe(true);
  });

  it("filtrado por UF", () => {
    const uf = tpv.meta.ufs[0];
    const f: Filtros = { ano: 2026, meses: [], segmento: "todos", uf };
    expect(approxEq(sumSeries(f), totalsFiltered(f).tpv)).toBe(true);
  });

  it("filtrado por segmento", () => {
    const segmento = tpv.meta.segmentos[0];
    const f: Filtros = { ano: 2026, meses: [], segmento, uf: "todos" };
    expect(approxEq(sumSeries(f), totalsFiltered(f).tpv)).toBe(true);
  });
});
