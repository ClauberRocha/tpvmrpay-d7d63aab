import { useEffect, useState } from "react";

import { perfBreakdown, perfSubscribe } from "@/lib/perfMetrics";

/**
 * Overlay showing login → dashboard timing breakdown.
 * Visible only when the URL has ?perf=1 or localStorage.mrpay_perf === "1".
 */
export function PerfPanel() {
  const [visible, setVisible] = useState(false);
  const [, force] = useState(0);

  useEffect(() => {
    const enabled =
      new URLSearchParams(window.location.search).get("perf") === "1" ||
      localStorage.getItem("mrpay_perf") === "1";
    setVisible(enabled);
  }, []);

  useEffect(() => {
    if (!visible) return;
    return perfSubscribe(() => force((n) => n + 1));
  }, [visible]);

  if (!visible) return null;

  const b = perfBreakdown();
  const rows: Array<[string, string]> = [
    ["Autenticação", fmt(b.auth_ms)],
    ["Download edge fn", b.cache_hit ? "cache hit" : fmt(b.edge_download_ms)],
    ["Render dashboard", fmt(b.dashboard_render_ms)],
    ["Total login → dashboard", fmt(b.total_login_to_dashboard_ms)],
  ];

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-xl border border-border/60 bg-background/90 p-4 text-xs font-mono shadow-2xl backdrop-blur">
      <div className="mb-2 flex items-center justify-between gap-4 text-primary font-semibold uppercase tracking-wider">
        <span>Perf · login → dashboard</span>
        <button
          onClick={() => setVisible(false)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Fechar painel"
        >
          ×
        </button>
      </div>
      <table className="border-separate border-spacing-x-3 border-spacing-y-0.5">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <td className="text-muted-foreground">{label}</td>
              <td className="text-right text-foreground">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 text-[10px] text-muted-foreground">
        window.__perf() no console para detalhes
      </div>
    </div>
  );
}

function fmt(ms: number | null): string {
  if (ms == null) return "—";
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${ms.toFixed(0)}ms`;
}
