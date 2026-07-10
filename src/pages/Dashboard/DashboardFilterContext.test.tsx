import { describe, it, expect, beforeEach } from "vitest";
import { act, render } from "@testing-library/react";
import { useEffect } from "react";

import { DashboardFilterProvider, useDashboardFilter } from "./DashboardFilterContext";
import { tpv, type Periodo } from "@/data/tpv";

type Ctx = ReturnType<typeof useDashboardFilter>;

// Captura o valor do contexto para inspecionar/mutar de fora do React
function CaptureCtx({ onReady }: { onReady: (ctx: Ctx) => void }) {
  const ctx = useDashboardFilter();
  useEffect(() => {
    onReady(ctx);
  });
  return null;
}

function renderProvider() {
  let latest: Ctx | undefined;
  const utils = render(
    <DashboardFilterProvider>
      <CaptureCtx onReady={(c) => { latest = c; }} />
    </DashboardFilterProvider>
  );
  return {
    ...utils,
    get ctx() {
      if (!latest) throw new Error("contexto ainda não pronto");
      return latest;
    },
  };
}

const ULTIMO_ANO = tpv.meta.anos[tpv.meta.anos.length - 1] as number;
const OUTRO_ANO = tpv.meta.anos.find((a) => a !== ULTIMO_ANO) as number | undefined;

describe("DashboardFilterContext — sincronização ano ⇄ meses", () => {
  beforeEach(() => localStorage.clear());

  it("inicializa com o último ano disponível e sem meses (= Todos)", () => {
    const h = renderProvider();
    expect(h.ctx.ano).toBe(ULTIMO_ANO);
    expect(h.ctx.meses).toEqual([]);
    expect(h.ctx.filtros.meses).toEqual([]);
    expect(h.ctx.mesesDescartados).toEqual([]);
  });

  it("descarta meses inválidos ao trocar para um ano que não os contém", () => {
    if (!OUTRO_ANO) return; // dataset com um único ano — teste inaplicável
    const h = renderProvider();

    const mesesUltimo = tpv.meta.mesesPorAno[String(ULTIMO_ANO)] ?? [];
    const mesesOutro = new Set(tpv.meta.mesesPorAno[String(OUTRO_ANO)] ?? []);
    const mesExclusivoUltimo = mesesUltimo.find((m) => !mesesOutro.has(m));
    if (mesExclusivoUltimo == null) return; // anos com o mesmo conjunto — inaplicável

    act(() => h.ctx.setMeses([mesExclusivoUltimo]));
    expect(h.ctx.meses).toEqual([mesExclusivoUltimo]);

    act(() => h.ctx.setAno(OUTRO_ANO));

    // Interseção vazia → meses limpos e aviso de normalização preenchido
    expect(h.ctx.meses).toEqual([]);
    expect(h.ctx.mesesDescartados).toContain(mesExclusivoUltimo);
    // filtros expostos nunca contêm meses inválidos
    expect(h.ctx.filtros.meses).toEqual([]);
    expect(h.ctx.filtros.ano).toBe(OUTRO_ANO);
  });

  it("mantém a interseção quando alguns meses ainda existem no novo ano", () => {
    if (!OUTRO_ANO) return;
    const h = renderProvider();
    const mesesUltimo = tpv.meta.mesesPorAno[String(ULTIMO_ANO)] ?? [];
    const mesesOutro = new Set(tpv.meta.mesesPorAno[String(OUTRO_ANO)] ?? []);
    const comum = mesesUltimo.find((m) => mesesOutro.has(m));
    const exclusivo = mesesUltimo.find((m) => !mesesOutro.has(m));
    if (comum == null || exclusivo == null) return;

    act(() => h.ctx.setMeses([comum, exclusivo].sort((a, b) => a - b)));
    act(() => h.ctx.setAno(OUTRO_ANO));

    expect(h.ctx.meses).toEqual([comum]);
    expect(h.ctx.mesesDescartados).toEqual([exclusivo]);
    expect(h.ctx.filtros.meses).toEqual([comum]);
  });

  it("colapsa para [] quando todos os meses disponíveis estão selecionados", () => {
    const h = renderProvider();
    const disponiveis = tpv.meta.mesesPorAno[String(ULTIMO_ANO)] ?? [];
    act(() => h.ctx.setMeses([...disponiveis]));
    // efeito de sincronização deve colapsar para []
    expect(h.ctx.meses).toEqual([]);
    expect(h.ctx.filtros.meses).toEqual([]);
  });

  it("ação explícita do usuário limpa o aviso de normalização", () => {
    if (!OUTRO_ANO) return;
    const h = renderProvider();
    const mesesUltimo = tpv.meta.mesesPorAno[String(ULTIMO_ANO)] ?? [];
    const exclusivo = mesesUltimo.find(
      (m) => !(tpv.meta.mesesPorAno[String(OUTRO_ANO)] ?? []).includes(m)
    );
    if (exclusivo == null) return;

    act(() => h.ctx.setMeses([exclusivo]));
    act(() => h.ctx.setAno(OUTRO_ANO));
    expect(h.ctx.mesesDescartados.length).toBeGreaterThan(0);

    act(() => h.ctx.setMeses([])); // gesto explícito
    expect(h.ctx.mesesDescartados).toEqual([]);
  });

  it("dismissAvisoNormalizacao limpa o aviso sem alterar meses", () => {
    if (!OUTRO_ANO) return;
    const h = renderProvider();
    const exclusivo = (tpv.meta.mesesPorAno[String(ULTIMO_ANO)] ?? []).find(
      (m) => !(tpv.meta.mesesPorAno[String(OUTRO_ANO)] ?? []).includes(m)
    );
    if (exclusivo == null) return;

    act(() => h.ctx.setMeses([exclusivo]));
    act(() => h.ctx.setAno(OUTRO_ANO));
    const mesesAntes = h.ctx.meses;
    act(() => h.ctx.dismissAvisoNormalizacao());
    expect(h.ctx.mesesDescartados).toEqual([]);
    expect(h.ctx.meses).toEqual(mesesAntes);
  });

  it("filtros expostos nunca contêm ano/meses inconsistentes com os metadados", () => {
    const h = renderProvider();
    // tenta setar meses inválidos direto — normalizarFiltros descarta na exposição
    act(() => h.ctx.setMeses([13, 99, 6]));
    expect(h.ctx.filtros.meses.every((m) => m >= 1 && m <= 12)).toBe(true);
    expect(h.ctx.filtros.meses).not.toContain(13);
    expect(h.ctx.filtros.meses).not.toContain(99);
  });

  it("ano='todos' aceita união de meses de todos os anos", () => {
    const h = renderProvider();
    act(() => h.ctx.setAno("todos" as Periodo));
    const uniao = Array.from(
      new Set(Object.values(tpv.meta.mesesPorAno).flat())
    );
    // um mês qualquer da união deve ser aceito e não descartado
    const alvo = uniao[0];
    act(() => h.ctx.setMeses([alvo]));
    expect(h.ctx.meses).toEqual([alvo]);
    expect(h.ctx.mesesDescartados).toEqual([]);
  });
});
