import { useMemo, useState, useEffect } from "react";
import { Target, TrendingUp, AlertTriangle, Pencil, Check, X } from "lucide-react";
import { formatBRLCompact, monthlySeries, totalsFiltered, tpv, type Filtros } from "@/data/tpv";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  filtros: Filtros;
}

const STORAGE_KEY = "tpv-meta-anual";
const DEFAULT_META = 12_000_000;

export function AtingimentoMeta({ filtros }: Props) {
  const [meta, setMeta] = useState<number>(DEFAULT_META);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>("");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const n = Number(saved);
      if (!Number.isNaN(n) && n > 0) setMeta(n);
    }
  }, []);

  const saveMeta = () => {
    const n = Number(draft.replace(/\./g, "").replace(",", "."));
    if (!Number.isNaN(n) && n > 0) {
      setMeta(n);
      localStorage.setItem(STORAGE_KEY, String(n));
    }
    setEditing(false);
  };

  const { realizado, forecast, mesesDecorridos, mesesTotais } = useMemo(() => {
    // Realizado = TPV total no filtro atual
    const { tpv: realizado } = totalsFiltered(filtros);

    // Para forecast: usar série mensal do ano selecionado
    const ano = filtros.ano;
    let mesesDec = 0;
    let mesesTot = 12;
    let forecast = realizado;

    if (typeof ano === "number") {
      const serie = monthlySeries({ ...filtros, meses: [] }).filter((r) => r.ano === ano);
      const mesesDisponiveis = tpv.meta.mesesPorAno[String(ano)] ?? [];
      mesesDec = mesesDisponiveis.length;
      mesesTot = 12;
      const tpvAno = serie.reduce((acc, r) => acc + r.tpv, 0);
      if (mesesDec > 0) {
        forecast = (tpvAno / mesesDec) * mesesTot;
      }
    } else {
      forecast = realizado;
      mesesDec = mesesTot;
    }

    return { realizado, forecast, mesesDecorridos: mesesDec, mesesTotais: mesesTot };
  }, [filtros]);

  const atingimento = meta > 0 ? (realizado / meta) * 100 : 0;
  const projecaoFinal = meta > 0 ? (forecast / meta) * 100 : 0;
  const gap = meta - realizado;

  const status: "ok" | "warning" | "danger" =
    atingimento >= 100 ? "ok" : atingimento >= 80 ? "warning" : "danger";

  const colorClass = {
    ok: "from-success to-success/60",
    warning: "from-primary to-primary-glow",
    danger: "from-destructive to-destructive/60",
  }[status];

  const textColor = {
    ok: "text-success",
    warning: "text-primary",
    danger: "text-destructive",
  }[status];

  const bgColor = {
    ok: "bg-success/10",
    warning: "bg-primary/10",
    danger: "bg-destructive/10",
  }[status];

  return (
    <div className="kpi-card group relative overflow-hidden">
      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Atingimento da Meta
            </span>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {typeof filtros.ano === "number" ? `Ano ${filtros.ano}` : "Histórico"}
              {mesesDecorridos > 0 && typeof filtros.ano === "number" && (
                <> · {mesesDecorridos}/{mesesTotais} meses</>
              )}
            </p>
          </div>
          <div className={cn("rounded-lg p-2", bgColor)}>
            <Target className={cn("h-4 w-4", textColor)} />
          </div>
        </div>

        {/* Valores */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-muted-foreground">Meta</div>
            <div className="flex items-center gap-1 mt-0.5">
              {editing ? (
                <>
                  <Input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveMeta();
                      if (e.key === "Escape") setEditing(false);
                    }}
                    className="h-7 text-sm px-2"
                    placeholder="12000000"
                  />
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={saveMeta} aria-label="Salvar meta">
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditing(false)} aria-label="Cancelar">
                    <X className="h-3 w-3" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="font-semibold text-foreground text-sm">{formatBRLCompact(meta)}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 opacity-50 hover:opacity-100"
                    onClick={() => { setDraft(String(meta)); setEditing(true); }}
                    aria-label="Editar meta"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Realizado</div>
            <div className="font-semibold text-foreground text-sm mt-0.5">{formatBRLCompact(realizado)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Gap</div>
            <div className={cn("font-semibold text-sm mt-0.5", gap > 0 ? "text-destructive" : "text-success")}>
              {gap > 0 ? "−" : "+"}{formatBRLCompact(Math.abs(gap))}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Projeção final
            </div>
            <div className={cn("font-semibold text-sm mt-0.5", textColor)}>
              {projecaoFinal.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Atingimento</span>
            <span className={cn("font-display font-bold text-lg", textColor)}>
              {atingimento.toFixed(1)}%
            </span>
          </div>
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700", colorClass)}
              style={{ width: `${Math.min(100, Math.max(0, atingimento))}%` }}
            />
            {projecaoFinal > atingimento && projecaoFinal <= 100 && (
              <div
                className="absolute top-0 h-full w-0.5 bg-foreground/60"
                style={{ left: `${Math.min(100, projecaoFinal)}%` }}
                title={`Projeção: ${projecaoFinal.toFixed(1)}%`}
              />
            )}
          </div>
        </div>

        {status === "danger" && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/15 px-3 py-2 text-xs text-destructive">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="font-medium">Atenção: atingimento abaixo de 80%</span>
          </div>
        )}
      </div>
    </div>
  );
}
