import { supabase } from "@/integrations/supabase/client";
import { perfMark } from "@/lib/perfMetrics";

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

// Mutable shared holder. Starts empty; consumers must ensure loadTpvData()
// (or __setTpvDataForTests) has resolved before reading. The Dashboard route
// gates rendering behind the loader so all sync consumers work as before.
export const tpv: TpvData = {
  meta: { anos: [], segmentos: [], ufs: [], mesesPorAno: {} },
  totalTs: [],
  segmentoTs: [],
  categoriaTs: [],
  proprietarioTs: [],
  ufTs: [],
  municipioTs: [],
  clienteTs: [],
};

let _owners: Record<string, string> = {};
export function getOwners(): Record<string, string> {
  return _owners;
}

const normSeg = (s: string) => (s ?? "").toLocaleUpperCase("pt-BR").trim();

function applyTpvData(data: TpvData) {
  const normalized: TpvData = {
    ...data,
    segmentoTs: data.segmentoTs.map((r) => ({ ...r, k: normSeg(r.k) })),
    meta: {
      ...data.meta,
      segmentos: Array.from(new Set((data.meta.segmentos ?? []).map(normSeg))).sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    },
  };
  Object.assign(tpv, normalized);
  _clienteCategoriaMap = null;
}

let _loadPromise: Promise<void> | null = null;
let _loaded = false;
export function isTpvLoaded() {
  return _loaded;
}

const CACHE_KEY = "mrpay:tpv-cache:v1";

/** Fetches the private TPV dataset via the authenticated edge function. */
export function loadTpvData(): Promise<void> {
  if (_loaded) return Promise.resolve();
  if (_loadPromise) return _loadPromise;
  _loadPromise = (async () => {
    // Try in-session cache first for instant navigations after the first load.
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as { tpv: TpvData; owners: Record<string, string> };
        applyTpvData(parsed.tpv);
        _owners = parsed.owners ?? {};
        _loaded = true;
        perfMark("tpv_cache_hit");
        return;
      }
    } catch { /* ignore cache errors */ }

    perfMark("tpv_fetch_start");
    let step: "session" | "fetch" | "parse" | "apply" = "session";
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new TpvLoadError("session", 0, "Sem sessão ativa (access_token ausente)");

      step = "fetch";
      const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/get-tpv-data`;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
        },
      });
      perfMark("tpv_fetch_end");
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new TpvLoadError("fetch", res.status, body || res.statusText);
      }

      step = "parse";
      const payload = (await res.json()) as { tpv: TpvData; owners: Record<string, string> };

      step = "apply";
      applyTpvData(payload.tpv);
      _owners = payload.owners ?? {};
      _loaded = true;
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload)); } catch { /* quota */ }
    } catch (e) {
      _loadPromise = null;
      if (e instanceof TpvLoadError) throw e;
      throw new TpvLoadError(step, 0, (e as Error)?.message ?? String(e));
    }
  })();
  return _loadPromise;
}

export class TpvLoadError extends Error {
  constructor(public step: string, public status: number, public body: string) {
    super(`[${step}${status ? ` ${status}` : ""}] ${body}`);
    this.name = "TpvLoadError";
  }
}



/** Test-only: inject dataset synchronously without hitting the network. */
export function __setTpvDataForTests(data: TpvData, owners: Record<string, string> = {}) {
  applyTpvData(data);
  _owners = owners;
  _loaded = true;
}

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
  meses: number[];
  segmento: string;
  uf: string;
};

const matchAno = (r: { ano: number }, ano: Periodo) =>
  ano === "todos" || r.ano === ano;
const matchMes = (r: { mes: number }, meses: number[]) =>
  meses.length === 0 || meses.includes(r.mes);

export function totalsFiltered(f: Filtros): { tpv: number; tx: number } {
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

export function dimensionRanking(
  source: TsRowK[],
  f: Filtros,
  extraFilter?: (k: string) => boolean
): { name: string; tpv: number; tx: number }[] {
  const map = new Map<string, { tpv: number; tx: number }>();
  for (const r of source) {
    if (!matchAno(r, f.ano) || !matchMes(r, f.meses)) continue;
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

let _clienteCategoriaMap: Map<string, CategoriaCliente> | null = null;
export function getClienteCategoriaMap(): Map<string, CategoriaCliente> {
  if (_clienteCategoriaMap) return _clienteCategoriaMap;
  const totals = new Map<string, number>();
  for (const r of tpv.clienteTs) totals.set(r.k, (totals.get(r.k) ?? 0) + r.tpv);
  const sorted = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
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
