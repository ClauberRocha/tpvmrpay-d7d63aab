import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";

import { formatBRL, formatPct } from "@/data/tpv";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: number;
  previous?: number;
  icon: LucideIcon;
  format?: "currency" | "number";
  accent?: "yellow" | "cyan" | "magenta" | "green" | "violet";
  subtitle?: string;
  comparisonLabel?: string;
}

const accentMap = {
  yellow: "text-primary bg-primary/10",
  cyan: "text-chart-cyan bg-chart-cyan/10",
  magenta: "text-chart-magenta bg-chart-magenta/10",
  green: "text-chart-green bg-chart-green/10",
  violet: "text-chart-violet bg-chart-violet/10",
};

export function KpiCard({ label, value, previous, icon: Icon, format = "currency", accent = "yellow", subtitle, comparisonLabel = "vs. ano anterior" }: KpiCardProps) {
  const hasDelta = previous !== undefined && previous > 0;
  const delta = hasDelta ? ((value - previous!) / previous!) * 100 : 0;
  const positivo = delta >= 0;

  const display =
    format === "currency"
      ? formatBRL(value)
      : new Intl.NumberFormat("pt-BR").format(Math.round(value));

  return (
    <div className="kpi-card group">
      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {label}
          </span>
          <div className={cn("rounded-lg p-2", accentMap[accent])}>
            <Icon className="h-4 w-4" />
          </div>
        </div>

        <div className="num-display font-display text-2xl font-semibold text-foreground lg:text-3xl break-words">
          {display}
        </div>

        <div className="flex items-center gap-2 text-xs">
          {hasDelta ? (
            <>
              <div
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-1 font-semibold",
                  positivo ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                )}
              >
                {positivo ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {formatPct(delta)}
              </div>
              <span className="text-white">{comparisonLabel}</span>
            </>
          ) : (
            <span className="text-muted-foreground">{subtitle ?? ""}</span>
          )}
        </div>
      </div>
    </div>
  );
}
