import { dimensionRanking, getClienteCategoriaMap, monthlySeries, totalsFiltered, tpv } from "@/data/tpv";
import type { CategoriaCliente, Filtros, TsRowK } from "@/data/tpv";

export class DashboardService {
  /**
   * Computes KPI values and MoM (month-over-month) comparison stats.
   */
  public static getKPIs(filtros: Filtros) {
    const mesesAno = typeof filtros.ano === "number" ? (tpv.meta.mesesPorAno[String(filtros.ano)] ?? []) : [];
    const mesesEfetivos = filtros.meses.length > 0 ? filtros.meses : mesesAno;

    const { tpv: tpvAtual, tx: txAtual } = totalsFiltered(filtros);

    // Clientes ativos: contagem de clientes com TPV no período filtrado
    const clientes = dimensionRanking(tpv.clienteTs, filtros).length;
    const ufsAtivas = dimensionRanking(tpv.ufTs, { ...filtros, uf: "todos" }).length;

    // Comparação MoM (mês anterior) — usa último mês do período como referência
    let tpvAnterior: number | undefined;
    let txAnterior: number | undefined;
    let clientesAnt: number | undefined;

    if (typeof filtros.ano === "number" && mesesEfetivos.length > 0) {
      const ultimoMes = mesesEfetivos[mesesEfetivos.length - 1];
      if (ultimoMes !== undefined) {
        let mesPrev = ultimoMes - 1;
        let anoPrev = filtros.ano;
        if (mesPrev < 1) {
          mesPrev = 12;
          anoPrev = filtros.ano - 1;
        }
        if (anoPrev === filtros.ano || tpv.meta.anos.includes(anoPrev)) {
          const fPrev: Filtros = {
            ano: anoPrev,
            meses: [mesPrev],
            segmento: filtros.segmento,
            uf: filtros.uf,
          };
          const totPrev = totalsFiltered(fPrev);
          tpvAnterior = totPrev.tpv;
          txAnterior = totPrev.tx;
          clientesAnt = dimensionRanking(tpv.clienteTs, fPrev).length;
        }
      }
    }

    return { tpvAtual, tpvAnterior, txAtual, txAnterior, clientes, clientesAnt, ufsAtivas };
  }

  /**
   * Fetches dimension ranking lists sliced by limit and formatted for recharts series.
   */
  public static getRankings(
    source: keyof Pick<typeof tpv, "categoriaTs" | "proprietarioTs" | "municipioTs" | "ufTs" | "clienteTs" | "segmentoTs">,
    filtros: Filtros,
    limit = 8,
  ) {
    const arr = dimensionRanking(tpv[source] as TsRowK[], filtros);
    return arr.slice(0, limit).map((s) => ({ name: s.name, value: s.tpv }));
  }

  /**
   * Retrieves top active clients with mapped categories, ticket values, LTV, growth, status, and last purchase dates.
   */
  public static getTopClientes(filtros: Filtros, limit = 10) {
    const catMap = getClienteCategoriaMap();
    return dimensionRanking(tpv.clienteTs, filtros)
      .slice(0, limit)
      .map((c) => {
        const ticket = c.tx > 0 ? c.tpv / c.tx : 0;
        
        // Generate stable mock values based on the name hash to remain consistent on filter updates
        const hash = c.name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const ltv = c.tpv * (1.25 + (hash % 10) / 20); // LTV is always higher than current TPV
        const growth = ((hash % 40) - 15) + (hash % 10) / 10; // e.g. -15% to +25%
        const inadimplencia = (hash % 5) === 0 ? (hash % 4) + 0.5 : 0; // 0% or low values
        const pedidos = c.tx * 12 + (hash % 8); // Estimated number of orders

        // Status mapping based on growth & inadimplencia
        let status: "Ativo" | "Em risco" | "Alerta" = "Ativo";
        if (growth < -5) {
          status = "Em risco";
        } else if (inadimplencia > 2) {
          status = "Alerta";
        }

        // Última compra date calculation
        const mesUltima = filtros.meses.length > 0 ? Math.max(...filtros.meses) : 6;
        const diaUltima = (hash % 28) + 1;
        const anoUltima = typeof filtros.ano === "number" ? filtros.ano : 2026;
        const ultimaCompra = `${String(diaUltima).padStart(2, "0")}/${String(mesUltima).padStart(2, "0")}/${anoUltima}`;

        return {
          name: c.name,
          tpv: c.tpv,
          tx: c.tx,
          ticket,
          categoria: catMap.get(c.name) as CategoriaCliente | undefined,
          ltv,
          growth,
          inadimplencia,
          status,
          ultimaCompra,
          pedidos,
        };
      });
  }

  /**
   * Retrieves clients with missing transaction months, computing churn score chances.
   */
  public static getClientesInativos(filtros: Filtros) {
    const ano = filtros.ano;
    const universo = new Set<string>();
    for (const r of tpv.clienteTs) {
      if (ano === "todos" || r.ano === ano) {
        universo.add(r.k);
      }
    }

    const mesesAno =
      typeof ano === "number"
        ? tpv.meta.mesesPorAno[String(ano)] ?? []
        : Array.from(new Set(tpv.clienteTs.map((r) => r.mes))).sort((a, b) => a - b);
    const mesesSel = filtros.meses.length > 0 ? filtros.meses : mesesAno;

    const ativos = new Map<string, Set<number>>();
    for (const r of tpv.clienteTs) {
      if (ano !== "todos" && r.ano !== ano) continue;
      if (!mesesSel.includes(r.mes)) continue;
      if (r.tpv <= 0) continue;
      const set = ativos.get(r.k) ?? new Set<number>();
      set.add(r.mes);
      ativos.set(r.k, set);
    }

    const inativos: { name: string; meses: Record<number, boolean>; faltas: number; churnScore: number }[] = [];
    for (const name of universo) {
      const set = ativos.get(name) ?? new Set<number>();
      const meses: Record<number, boolean> = {};
      let faltas = 0;
      for (const m of mesesSel) {
        const ok = set.has(m);
        meses[m] = ok;
        if (!ok) faltas++;
      }
      if (faltas > 0) {
        let churnScore = Math.round((faltas / mesesSel.length) * 100);
        if (faltas === mesesSel.length) {
          churnScore = 92;
        } else if (churnScore > 92) {
          churnScore = 90;
        } else if (churnScore < 10) {
          churnScore = 15;
        }
        inativos.push({ name, meses, faltas, churnScore });
      }
    }

    inativos.sort((a, b) => b.faltas - a.faltas || a.name.localeCompare(b.name));
    return { rows: inativos, mesesSel, totalClientes: universo.size };
  }

  /**
   * Calculates targets (Meta vs Realizado) on daily, weekly, monthly, and yearly scales.
   */
  public static getAtingimentoMeta(filtros: Filtros) {
    const { tpv: realizado } = totalsFiltered(filtros);

    // Goal bases depending on period
    const mesesAno = typeof filtros.ano === "number" ? (tpv.meta.mesesPorAno[String(filtros.ano)] ?? []) : [];
    const mesesEfetivos = filtros.meses.length > 0 ? filtros.meses : mesesAno;
    const nMeses = mesesEfetivos.length || 12;

    // Monthly base goal: R$ 350.000,00 per month
    const metaMensal = 350000;
    const metaAnual = metaMensal * 12;
    const metaSemanal = metaMensal / 4;
    const metaDiaria = metaMensal / 30;

    // Target based on selected months
    const metaPeriodo = metaMensal * nMeses;
    const pct = metaPeriodo > 0 ? (realizado / metaPeriodo) * 100 : 0;
    const faltam = Math.max(0, metaPeriodo - realizado);
    
    // Status semaphore: 🟢 >= 95%, 🟡 >= 75% e < 95%, 🔴 < 75%
    let semaforo: "verde" | "amarelo" | "vermelho" = "vermelho";
    if (pct >= 95) {
      semaforo = "verde";
    } else if (pct >= 75) {
      semaforo = "amarelo";
    }

    // Forecasting: projection if trend continues
    const projections = {
      diario: { meta: metaDiaria, realizado: realizado / (nMeses * 30) },
      semanal: { meta: metaSemanal, realizado: realizado / (nMeses * 4) },
      mensal: { meta: metaMensal, realizado: realizado / nMeses },
      anual: { meta: metaAnual, realizado: (realizado / nMeses) * 12 },
    };

    return {
      meta: metaPeriodo,
      realizado,
      pct,
      faltam,
      semaforo,
      projections,
    };
  }

  /**
   * Computes UF heat intensity, growth ranking (YoY), opportunity index, and commercial density.
   */
  public static getMapaUFData(filtros: Filtros) {
    const f = { ...filtros, uf: "todos" };
    const arr = dimensionRanking(tpv.ufTs, f);
    const max = Math.max(...arr.map((a) => a.tpv), 1);
    const items = arr.map((a) => ({ ...a, intensity: a.tpv / max }));

    // Ranking de crescimento (vs ano anterior, mesmos meses)
    let crescimento: { name: string; atual: number; ant: number; pct: number; abs: number }[] = [];
    if (filtros.ano !== "todos") {
      const anoAtual = filtros.ano as number;
      const anoAnt = anoAtual - 1;
      if (tpv.meta.anos.includes(anoAnt)) {
        const fAtual = { ...filtros, uf: "todos" };
        const fAnt = { ...filtros, ano: anoAnt, uf: "todos" };
        const atual = new Map(dimensionRanking(tpv.ufTs, fAtual).map((x) => [x.name, x.tpv]));
        const ant = new Map(dimensionRanking(tpv.ufTs, fAnt).map((x) => [x.name, x.tpv]));
        const out: { name: string; atual: number; ant: number; pct: number; abs: number }[] = [];
        for (const [name, a] of atual) {
          const p = ant.get(name) ?? 0;
          const abs = a - p;
          const pct = p > 0 ? (abs / p) * 100 : a > 0 ? 100 : 0;
          out.push({ name, atual: a, ant: p, abs, pct });
        }
        crescimento = out.sort((a, b) => b.pct - a.pct);
      }
    }

    // Oportunidade: alto ticket médio com baixa participação no TPV total
    const total = items.reduce((s, x) => s + x.tpv, 0);
    const oportunidade = items
      .map((x) => {
        const ticket = x.tx > 0 ? x.tpv / x.tx : 0;
        const share = total > 0 ? x.tpv / total : 0;
        const score = ticket * (1 - share);
        return { ...x, ticket, share, score };
      })
      .sort((a, b) => b.score - a.score);

    // Densidade comercial: transações por UF
    const densidade = [...items].sort((a, b) => b.tx - a.tx);

    return { items, crescimento, oportunidade, densidade };
  }

  /**
   * Calculates mathematical projection and 80/20 division statistics for insights.
   */
  public static getStrategicInsights(filtros: Filtros, taxaPct: number) {
    const macroF = { ...filtros, segmento: "todos", uf: "todos" };
    const serie = monthlySeries(macroF);
    const total = serie.reduce((s, p) => s + p.tpv, 0);
    const media = serie.length ? total / serie.length : 0;

    const meses2026 = tpv.meta.mesesPorAno["2026"] ?? [];
    const ultimoMes2026 = meses2026.length ? Math.max(...meses2026) : 0;
    const tpv2025PorMes = new Map<number, number>();
    for (const r of tpv.totalTs) {
      if (r.ano === 2025) tpv2025PorMes.set(r.mes, (tpv2025PorMes.get(r.mes) ?? 0) + r.tpv);
    }
    const TAXA = taxaPct / 100;
    const projetar = (mes: number) => {
      const base = tpv2025PorMes.get(mes) ?? 0;
      return base * Math.pow(1 + TAXA, mes);
    };
    const m1 = ((ultimoMes2026) % 12) + 1;
    const m2 = (m1 % 12) + 1;
    const m3 = (m2 % 12) + 1;
    const proj1 = projetar(m1);
    const proj2 = projetar(m2);
    const proj3 = projetar(m3);

    let slope = 0;
    if (serie.length >= 2) {
      const n = serie.length;
      const xs = serie.map((_, i) => i);
      const ys = serie.map((p) => p.tpv);
      const mx = xs.reduce((a, b) => a + b, 0) / n;
      const my = ys.reduce((a, b) => a + b, 0) / n;
      const num = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0);
      const den = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
      slope = den > 0 ? num / den : 0;
    }
    const ultimo = serie[serie.length - 1];

    const MESES_LBL = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const labelProj1 = `${MESES_LBL[m1 - 1]}/26`;
    const labelProj2 = `${MESES_LBL[m2 - 1]}/26`;
    const labelProj3 = `${MESES_LBL[m3 - 1]}/26`;

    const clientes = dimensionRanking(tpv.clienteTs, filtros);
    const totalClientes = clientes.reduce((s, c) => s + c.tpv, 0);
    let acc = 0;
    let n80 = 0;
    for (const c of clientes) {
      acc += c.tpv;
      n80++;
      if (acc / totalClientes >= 0.8) break;
    }
    const pct80 = clientes.length > 0 ? (n80 / clientes.length) * 100 : 0;
    const top5Clientes = clientes.slice(0, 5);
    const top5Soma = top5Clientes.reduce((s, c) => s + c.tpv, 0);
    const top5Pct = totalClientes > 0 ? (top5Soma / totalClientes) * 100 : 0;

    const segs = dimensionRanking(tpv.segmentoTs, { ...filtros, segmento: "todos" });
    const totalSeg = segs.reduce((s, x) => s + x.tpv, 0);
    const segLider = segs[0];
    const segLiderPct = segLider && totalSeg > 0 ? (segLider.tpv / totalSeg) * 100 : 0;

    const ufs = dimensionRanking(tpv.ufTs, { ...filtros, uf: "todos" });
    const totalUF = ufs.reduce((s, x) => s + x.tpv, 0);
    const ufLider = ufs[0];
    const ufLiderPct = ufLider && totalUF > 0 ? (ufLider.tpv / totalUF) * 100 : 0;
    const ufsBaixaCobertura = ufs.filter((u) => u.tpv / totalUF < 0.02);

    const props = dimensionRanking(tpv.proprietarioTs, filtros);
    const totalProp = props.reduce((s, x) => s + x.tpv, 0);
    const propLider = props[0];
    const propLiderPct = propLider && totalProp > 0 ? (propLider.tpv / totalProp) * 100 : 0;
    const propBaixaPerf = props.filter((p) => p.tpv / totalProp < 0.05);

    const cats = dimensionRanking(tpv.categoriaTs, filtros);
    const diamante = cats.find((c) => c.name === "Diamante");
    const totalCat = cats.reduce((s, x) => s + x.tpv, 0);
    const diamPct = diamante && totalCat > 0 ? (diamante.tpv / totalCat) * 100 : 0;

    return {
      total,
      media,
      slope,
      ultimo,
      proj1,
      proj2,
      proj3,
      labelProj1,
      labelProj2,
      labelProj3,
      clientes,
      n80,
      pct80,
      top5Clientes,
      top5Pct,
      segLider,
      segLiderPct,
      ufLider,
      ufLiderPct,
      ufsBaixaCobertura,
      propLider,
      propLiderPct,
      propBaixaPerf,
      diamante,
      diamPct,
    };
  }
}
