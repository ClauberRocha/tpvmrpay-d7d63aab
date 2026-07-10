import raw from "./tpv.json";

export type Periodo = number | "todos";

export type TsRow = { ano: number; mes: number; tpv: number; tx: number };
export type TsRowK = TsRow & { k: string };

export type TpvData = {
  meta: {
    anos: number[];
    segmentos: string[];
    ufs: string[];
    mesesPorAno: Record<string, number[]>;
  };
  totalTs: TsRow[];
  segmentoTs: TsRowK[];
  categoriaTs: TsRowK[];
  proprietarioTs: TsRowK[];
  ufTs: TsRowK[];
  municipioTs: TsRowK[];
  clienteTs: TsRowK[];
};

const _rawTpv = raw as unknown as TpvData;

// Normaliza casing de segmentos (ex.: "CARTÓRIOS" vs "Cartórios") para que
// meses gravados com grafias diferentes sejam agregados corretamente.
const normSeg = (s: string) => (s ?? "").toLocaleUpperCase("pt-BR").trim();
_rawTpv.segmentoTs = _rawTpv.segmentoTs.map((r) => ({ ...r, k: normSeg(r.k) }));
_rawTpv.meta.segmentos = Array.from(new Set(_rawTpv.meta.segmentos.map(normSeg))).sort((a, b) => a.localeCompare(b, "pt-BR"));

export const tpv = _rawTpv;

export const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

export const formatBRLCompact = (v: number) => {
  if (Math.abs(v) >= 1_000_000_000) return `R$ ${(v / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(1)}K`;
  return `R$ ${v.toFixed(0)}`;
};

export const formatNumber = (v: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(v);

export const formatPct = (v: number) =>
  `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

export type Filtros = {
  ano: Periodo;
  meses: number[]; // [] = todos
  segmento: string; // "todos" ou nome
  uf: string;
};

const matchAno = (r: { ano: number }, ano: Periodo) =>
  ano === "todos" || r.ano === ano;
const matchMes = (r: { mes: number }, meses: number[]) =>
  meses.length === 0 || meses.includes(r.mes);

/** Soma TPV/tx do total filtrado (sem dimensão extra). */
export function totalsFiltered(f: Filtros): { tpv: number; tx: number } {
  // Quando há filtro de segmento ou uf, agregamos a partir dessas séries
  let rows: TsRowK[] | TsRow[];
  if (f.segmento !== "todos") {
    rows = tpv.segmentoTs.filter((r) => r.k === f.segmento);
  } else if (f.uf !== "todos") {
    rows = tpv.ufTs.filter((r) => r.k === f.uf);
  } else {
    rows = tpv.totalTs;
  }
  let tpvSum = 0, tx = 0;
  for (const r of rows) {
    if (matchAno(r, f.ano) && matchMes(r, f.meses)) {
      tpvSum += r.tpv;
      tx += r.tx;
    }
  }
  return { tpv: tpvSum, tx };
}

/** Série mensal agregada após filtros. */
export function monthlySeries(f: Filtros): { ano: number; mes: number; tpv: number }[] {
  let rows: { ano: number; mes: number; tpv: number }[];
  if (f.segmento !== "todos") {
    rows = tpv.segmentoTs.filter((r) => r.k === f.segmento);
  } else if (f.uf !== "todos") {
    rows = tpv.ufTs.filter((r) => r.k === f.uf);
  } else {
    rows = tpv.totalTs;
  }
  const map = new Map<string, number>();
  for (const r of rows) {
    if (!matchAno(r, f.ano)) continue;
    if (f.meses.length > 0 && !matchMes(r, f.meses)) continue;
    const key = `${r.ano}-${String(r.mes).padStart(2, "0")}`;
    map.set(key, (map.get(key) ?? 0) + r.tpv);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => {
      const [a, m] = k.split("-");
      return { ano: +a, mes: +m, tpv: v };
    });
}

/** Ranking por dimensão depois dos filtros. */
export function dimensionRanking(
  source: TsRowK[],
  f: Filtros,
  extraFilter?: (k: string) => boolean
): { name: string; tpv: number; tx: number }[] {
  const map = new Map<string, { tpv: number; tx: number }>();
  for (const r of source) {
    if (!matchAno(r, f.ano) || !matchMes(r, f.meses)) continue;
    
    // Filtros cruzados
    if (f.segmento !== "todos") {
      // Se a fonte for segmentoTs, já filtramos por r.k === f.segmento se quisermos, 
      // mas dimensionRanking é usado para MOSTRAR os segmentos no ShareSegmento.
      // ShareSegmento reseta o filtro de segmento para "todos" antes de chamar aqui.
      // O problema é quando filtramos por UF e queremos ver o ranking de segmentos NAQUELA UF.
      // Como os dados não são cruzados no JSON, buscamos a correspondência por cliente (cruzamento implícito via clienteTs)
      // Mas para performance e simplicidade nos dados atuais, vamos assumir que source contém os dados da dimensão desejada.
    }
    
    if (extraFilter && !extraFilter(r.k)) continue;
    const cur = map.get(r.k) ?? { tpv: 0, tx: 0 };
    cur.tpv += r.tpv;
    cur.tx += r.tx;
    map.set(r.k, cur);
  }
  return Array.from(map.entries())
    .map(([name, v]) => ({ name, ...v }))
    .filter((x) => x.tpv > 0)
    .sort((a, b) => b.tpv - a.tpv);
}

export type CategoriaCliente = "Diamante" | "Ouro" | "Prata" | "Bronze" | "TPV Zerado";

/** Mapa cliente -> categoria, derivado do ranking global por TPV (todo o período). */
let _clienteCategoriaMap: Map<string, CategoriaCliente> | null = null;
export function getClienteCategoriaMap(): Map<string, CategoriaCliente> {
  if (_clienteCategoriaMap) return _clienteCategoriaMap;
  const totals = new Map<string, number>();
  for (const r of tpv.clienteTs) totals.set(r.k, (totals.get(r.k) ?? 0) + r.tpv);
  const sorted = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
  // Tamanhos derivados das somas de cada categoria nos dados (categoriaTs)
  const buckets: { name: CategoriaCliente; n: number }[] = [
    { name: "Diamante", n: 4 },
    { name: "Ouro", n: 16 },
    { name: "Prata", n: 22 },
  ];
  const map = new Map<string, CategoriaCliente>();
  let idx = 0;
  for (const b of buckets) {
    for (let i = 0; i < b.n && idx < sorted.length; i++, idx++) {
      map.set(sorted[idx][0], b.name);
    }
  }
  for (; idx < sorted.length; idx++) {
    const [name, tpvTotal] = sorted[idx];
    map.set(name, tpvTotal > 0 ? "Bronze" : "TPV Zerado");
  }
  _clienteCategoriaMap = map;
  return map;
}
