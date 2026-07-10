import { AlertTriangle, GitCompareArrows, Info, X } from "lucide-react";

import { tpv, type Periodo } from "@/data/tpv";
import { cn } from "@/lib/utils";

const MESES_LBL = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

interface FiltrosProps {
  ano: Periodo;
  setAno: (a: Periodo) => void;
  meses: number[];
  setMeses: (m: number[]) => void;
  segmento: string;
  setSegmento: (s: string) => void;
  uf: string;
  setUf: (u: string) => void;
  /** Meses removidos automaticamente por incompatibilidade com o ano atual. */
  mesesDescartados?: number[];
  onDismissAviso?: () => void;
}

export function Filtros({
  ano, setAno, meses, setMeses, segmento, setSegmento, uf, setUf,
  mesesDescartados = [], onDismissAviso,
}: FiltrosProps) {
  const anos: Periodo[] = ["todos", ...tpv.meta.anos];

  // Meses disponíveis (união se "todos os anos")
  const mesesDisponiveis: number[] = (() => {
    if (ano === "todos") {
      const set = new Set<number>();
      Object.values(tpv.meta.mesesPorAno).forEach((arr) => arr.forEach((m) => set.add(m)));
      return Array.from(set).sort((a, b) => a - b);
    }
    return tpv.meta.mesesPorAno[String(ano)] ?? [];
  })();

  const todosMesesSelecionados = meses.length === 0 || meses.length === mesesDisponiveis.length;

  const toggleMes = (m: number, additive: boolean) => {
    if (additive) {
      // Ctrl/Shift/Cmd-clique = seleção múltipla acumulativa
      if (meses.includes(m)) setMeses(meses.filter((x) => x !== m));
      else setMeses([...meses, m].sort((a, b) => a - b));
      return;
    }
    // Clique simples = seleção única (substitui)
    if (meses.length === 1 && meses[0] === m) setMeses([]); // reclicar = "Todos"
    else setMeses([m]);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex rounded-xl border border-border/60 bg-card p-1">
          {anos.map((a) => (
            <button
              key={String(a)}
              onClick={() => {
                setAno(a);
                setMeses([]); // reset meses ao trocar ano
              }}
              className={cn(
                "rounded-lg px-4 py-1.5 text-xs font-semibold transition-all",
                ano === a
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {a === "todos" ? "Todos os anos" : a}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <SelectChip label="Segmento" value={segmento} onChange={setSegmento} options={tpv.meta.segmentos} />
          <SelectChip label="UF" value={uf} onChange={setUf} options={tpv.meta.ufs} />
        </div>
      </div>

      {/* Filtro de meses */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card/60 p-2">
        <span className="px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Meses
        </span>
        <button
          onClick={() => {
            setAno("todos");
            setMeses([]);
          }}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
            ano === "todos" && todosMesesSelecionados
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
          title="Mostrar todos os meses de todos os anos"
        >
          Todos
        </button>
        <div className="h-4 w-px bg-border/60" />
        {mesesDisponiveis.map((m) => {
          const ativo = meses.includes(m);
          return (
            <button
              key={m}
              onClick={(e) => toggleMes(m, e.shiftKey || e.ctrlKey || e.metaKey)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors min-w-[40px]",
                ativo
                  ? "bg-primary text-primary-foreground ring-2 ring-primary/40 ring-offset-1 ring-offset-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title="Clique = apenas este mês · Shift/Ctrl/Cmd+clique = adicionar ao comparativo"
            >
              {MESES_LBL[m - 1]}
            </button>
          );
        })}

        {/* Badge de normalização: meses foram descartados pela troca de ano */}
        {mesesDescartados.length > 0 && (
          <span
            role="status"
            aria-live="polite"
            className="ml-2 inline-flex items-center gap-1.5 rounded-md border border-chart-orange/50 bg-chart-orange/15 px-2 py-1 text-[10px] font-semibold text-chart-orange"
            title={`Os meses ${mesesDescartados
              .map((m) => MESES_LBL[m - 1])
              .join(", ")} foram removidos porque não existem em ${
              ano === "todos" ? "todos os anos" : ano
            }.`}
          >
            <AlertTriangle className="h-3 w-3" />
            {mesesDescartados.length} {mesesDescartados.length === 1 ? "mês removido" : "meses removidos"} ({mesesDescartados.map((m) => MESES_LBL[m - 1]).join(", ")})
            <button
              type="button"
              onClick={onDismissAviso}
              className="rounded p-0.5 hover:bg-chart-orange/25"
              aria-label="Dispensar aviso"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        )}

        {/* Dica de atalho quando nada está em modo comparação */}
        {meses.length <= 1 && (
          <span className="ml-auto flex items-center gap-1 pr-2 text-[10px] text-muted-foreground">
            <Info className="h-3 w-3" />
            Shift/Ctrl+clique p/ comparar
          </span>
        )}
      </div>

      {/* Painel de status da seleção */}
      {meses.length > 0 && (
        <div
          className={cn(
            "flex flex-wrap items-center gap-2 rounded-xl border p-2 text-xs",
            meses.length >= 2
              ? "border-primary/50 bg-primary/10"
              : "border-border/60 bg-card/40"
          )}
          role="status"
          aria-live="polite"
        >
          {meses.length >= 2 ? (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
              <GitCompareArrows className="h-3 w-3" />
              Modo comparação · {meses.length} meses
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground">
              Filtro ativo · 1 mês
            </span>
          )}

          <div className="flex flex-wrap items-center gap-1.5">
            {meses.map((m, i) => (
              <span key={m} className="flex items-center gap-1">
                <span className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-background/60 px-2 py-0.5 font-semibold text-foreground">
                  {MESES_LBL[m - 1]}
                  <button
                    type="button"
                    onClick={() => setMeses(meses.filter((x) => x !== m))}
                    className="rounded p-0.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                    aria-label={`Remover ${MESES_LBL[m - 1]} da seleção`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
                {i < meses.length - 1 && (
                  <span className="text-primary/70 font-bold">+</span>
                )}
              </span>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setMeses([])}
            className="ml-auto rounded-md px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Limpar seleção
          </button>
        </div>
      )}
    </div>
  );
}


function SelectChip({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="group relative inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-1.5 text-xs">
      <span className="text-muted-foreground">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent pr-4 font-semibold text-foreground outline-none cursor-pointer"
      >
        <option value="todos" className="bg-card">Todos</option>
        {options.map((o) => (
          <option key={o} value={o} className="bg-card">{o}</option>
        ))}
      </select>
    </label>
  );
}
