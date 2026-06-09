import { useMemo } from "react";
import { tpv, type Filtros } from "@/data/tpv";
import { AlertCircle } from "lucide-react";
import owners from "@/data/clienteProprietario.json";

const ownersMap = owners as Record<string, string>;

const MESES_LBL = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function ClientesInativos({ filtros }: { filtros: Filtros }) {
  const { rows, mesesSel, totalClientes } = useMemo(() => {
    const ano = filtros.ano;
    // Universo de clientes: todos que já transacionaram no ano (ou todo histórico)
    const universo = new Set<string>();
    for (const r of tpv.clienteTs) {
      if (ano === "todos" || r.ano === ano) {
        if (filtros.segmento !== "todos") {
          // sem cruzamento direto disponível; mantém universo geral do ano
        }
        universo.add(r.k);
      }
    }

    // Meses considerados: os selecionados, ou todos do ano
    const mesesAno =
      typeof ano === "number"
        ? tpv.meta.mesesPorAno[String(ano)] ?? []
        : Array.from(new Set(tpv.clienteTs.map((r) => r.mes))).sort((a, b) => a - b);
    const mesesSel = filtros.meses.length > 0 ? filtros.meses : mesesAno;

    // Mapa cliente -> Set de meses ativos (no ano filtrado)
    const ativos = new Map<string, Set<number>>();
    for (const r of tpv.clienteTs) {
      if (ano !== "todos" && r.ano !== ano) continue;
      if (!mesesSel.includes(r.mes)) continue;
      if (r.tpv <= 0) continue;
      const set = ativos.get(r.k) ?? new Set<number>();
      set.add(r.mes);
      ativos.set(r.k, set);
    }

    // Clientes inativos: faltou em pelo menos 1 mês selecionado
    const inativos: { name: string; meses: Record<number, boolean>; faltas: number }[] = [];
    for (const name of universo) {
      const set = ativos.get(name) ?? new Set<number>();
      const meses: Record<number, boolean> = {};
      let faltas = 0;
      for (const m of mesesSel) {
        const ok = set.has(m);
        meses[m] = ok;
        if (!ok) faltas++;
      }
      if (faltas > 0) inativos.push({ name, meses, faltas });
    }

    inativos.sort((a, b) => b.faltas - a.faltas || a.name.localeCompare(b.name));
    return { rows: inativos, mesesSel, totalClientes: universo.size };
  }, [filtros]);

  const periodoTxt = mesesSel.map((m) => MESES_LBL[m - 1]).join(", ");
  const totalmenteInativos = rows.filter((r) => r.faltas === mesesSel.length).length;
  const pctInativos = totalClientes > 0 ? (rows.length / totalClientes) * 100 : 0;

  return (
    <div className="panel">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-chart-orange" />
            Matriz de Clientes sem Transações
          </h3>
          <p className="text-xs text-muted-foreground">
            Clientes sem transação (R$ 0,00) por mês · {periodoTxt}
          </p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <div><span className="font-semibold text-foreground">{rows.length}</span> com lacunas</div>
          <div><span className="font-semibold text-chart-orange">{totalmenteInativos}</span> totalmente inativos</div>
        </div>
      </div>

      <div className="max-h-[480px] overflow-auto rounded-xl border border-border/60">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
            <tr className="text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 text-left font-medium">Cliente</th>
              <th className="px-4 py-3 text-left font-medium">Proprietário</th>
              {mesesSel.map((m) => (
                <th key={m} className="px-3 py-3 text-center font-medium">
                  {MESES_LBL[m - 1]}
                </th>
              ))}
              <th className="px-4 py-3 text-right font-medium">Faltas</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={mesesSel.length + 3} className="px-4 py-8 text-center text-muted-foreground">
                  Todos os clientes transacionaram em todos os meses selecionados.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.name} className="border-t border-border/60 hover:bg-muted/30">
                <td className="px-4 py-2.5">
                  <div className="font-medium text-foreground line-clamp-1" title={r.name}>{r.name}</div>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {ownersMap[r.name] ? (
                    <span className="text-xs">{ownersMap[r.name]}</span>
                  ) : (
                    <span className="text-xs italic">não vinculado</span>
                  )}
                </td>
                {mesesSel.map((m) => (
                  <td key={m} className="px-3 py-2.5 text-center">
                    {r.meses[m] ? (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-success/15 text-success text-[11px] font-bold">✓</span>
                    ) : (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-destructive/15 text-destructive text-[11px] font-bold">0</span>
                    )}
                  </td>
                ))}
                <td className="px-4 py-2.5 text-right num-display font-semibold text-foreground">
                  {r.faltas}/{mesesSel.length}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs text-white">
        <span className="font-semibold text-white">Análise: </span>
        {rows.length === 0
          ? `Nenhum cliente inativo no período ${periodoTxt}.`
          : `${rows.length} de ${totalClientes} clientes (${pctInativos.toFixed(1)}%) deixaram de transacionar em ao menos um mês. ${totalmenteInativos} ficaram totalmente inativos em ${periodoTxt}.`}
      </p>
    </div>
  );
}
